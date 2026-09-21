import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { createOrbitPlayback, fitShowcaseOrbit } from './showcase-orbit.js';

// Input may arrive after a frame timestamp was assigned but before its callback runs.
export const elapsedSeconds = (now, started) => Math.max(0, now - started) / 1000;

/** Full-azimuth orbit. Manual gestures always own the camera until an explicit action. */
export function createSphericalCamera(camera, canvas, shell, reducedMotion) {
  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.dampingFactor = .09;
  controls.enablePan = false;
  controls.rotateSpeed = .68;
  controls.zoomSpeed = .7;
  controls.minDistance = 4.8;
  controls.maxDistance = 13.8;
  controls.minPolarAngle = .40;
  controls.maxPolarAngle = 1.46;
  controls.touches.ONE = THREE.TOUCH.ROTATE;
  controls.touches.TWO = THREE.TOUCH.DOLLY_ROTATE;
  const homeTarget = new THREE.Vector3(.32, 1.2, .75);
  const offset = new THREE.Vector3();
  let tour;
  let transition;
  let down;
  let moved = false;
  let suppressTapUntil = 0;
  let gestureCount = 0;
  let lastYaw;
  let travel = 0;
  let showcaseShot;

  function showcaseStatus() {
    const clock=showcaseShot?.clock;
    shell.dataset.showcaseMotion=!clock ? 'idle' : clock.running ? 'playing' : clock.phase===1 ? 'complete' : 'paused';
    shell.dataset.showcaseDegrees=String(Math.round((clock?.phase || 0)*360));
    const b=document.querySelector('[data-action="showcase-spin"]');
    const label=clock?.running ? 'Pause' : clock?.phase===1 ? 'Replay' : clock?.phase ? 'Resume' : 'Rotate';
    if(b) { b.setAttribute('aria-pressed',String(Boolean(clock?.running))); if(b.textContent!==label) b.textContent=label; }
  }

  function stop() {
    showcaseShot?.clock.pause();
    tour = undefined;
    transition = undefined;
    shell.dataset.cameraMode = 'orbit';
    document.querySelector('[data-action="tour"]')?.setAttribute('aria-pressed', 'false');
    document.querySelector('[data-action="tour"]')?.replaceChildren('Follow chain');
    showcaseStatus();
  }

  controls.addEventListener('start', () => { stop(); gestureCount += 1; });
  canvas.addEventListener('pointerdown', (event) => {
    if (down) moved = true;
    else moved = false;
    down = { x: event.clientX, y: event.clientY };
  });
  canvas.addEventListener('pointermove', (event) => {
    if (down && Math.hypot(event.clientX - down.x, event.clientY - down.y) > 7) moved = true;
  });
  canvas.addEventListener('pointerup', () => {
    if (moved) suppressTapUntil = performance.now() + 250;
    down = undefined;
  });
  canvas.addEventListener('pointercancel', () => { down = undefined; suppressTapUntil = performance.now() + 250; });

  function home(immediate = false) {
    stop();
    showcaseShot=undefined;
    controls.minDistance=4.8; controls.maxDistance=13.8;
    showcaseStatus();
    camera.clearViewOffset();
    // Drain the previous gesture's damping before selecting an absolute home pose.
    controls.enableDamping = false;
    controls.update();
    controls.enableDamping = true;
    const radius = camera.aspect < .7 ? (canvas.clientHeight < 680 ? 12.6 : 11.8) : 10.2;
    const position = new THREE.Vector3().setFromSpherical(new THREE.Spherical(radius, .92, .05)).add(homeTarget);
    if (immediate || reducedMotion) {
      controls.target.copy(homeTarget);
      camera.position.copy(position);
      controls.update();
    } else {
      transition = { started: performance.now(), position, target: homeTarget.clone(), from: camera.position.clone(), fromTarget: controls.target.clone() };
    }
  }

  function follow(points) {
    if (tour) { stop(); return; }
    stop();
    const angle = controls.getAzimuthalAngle();
    tour = { started: performance.now(), angle, curve: new THREE.CatmullRomCurve3(points), from: camera.position.clone(), fromTarget: controls.target.clone() };
    shell.dataset.cameraMode = 'tour';
    document.querySelector('[data-action="tour"]')?.setAttribute('aria-pressed', 'true');
    document.querySelector('[data-action="tour"]')?.replaceChildren('Stop tour');
  }

  function update(now) {
    if (transition) {
      const t = Math.min(1, elapsedSeconds(now, transition.started) / .85);
      const ease = t * t * (3 - 2 * t);
      camera.position.lerpVectors(transition.from, transition.position, ease);
      controls.target.lerpVectors(transition.fromTarget, transition.target, ease);
      if (t === 1) transition = undefined;
    }
    if (tour) {
      const seconds = elapsedSeconds(now, tour.started);
      const phase = (seconds % 32) / 32;
      const detail = Math.sin(phase * Math.PI) ** 4;
      const target = homeTarget.clone().lerp(tour.curve.getPointAt(phase), detail * .88);
      const theta = tour.angle + phase * Math.PI * 2;
      const radius = THREE.MathUtils.lerp(11.0, 4.8, detail);
      offset.setFromSpherical(new THREE.Spherical(radius, 1.02 + Math.sin(phase * Math.PI * 2) * .15, theta));
      const blend = Math.min(1, seconds / 1.1);
      camera.position.lerpVectors(tour.from, offset.add(target), blend);
      controls.target.lerpVectors(tour.fromTarget, target, blend);
    }
    if(showcaseShot?.clock.running && !transition) {
      const shot=showcaseShot, phase=shot.clock.step(now);
      camera.position.setFromSpherical(new THREE.Spherical(shot.radius,shot.phi,shot.angle+phase*Math.PI*2)).add(shot.target);
      controls.target.copy(shot.target);
      showcaseStatus();
    }
    controls.update();
    const yaw = controls.getAzimuthalAngle();
    if (lastYaw !== undefined) travel += Math.abs(Math.atan2(Math.sin(yaw - lastYaw), Math.cos(yaw - lastYaw)));
    lastYaw = yaw;
    const heading = (THREE.MathUtils.radToDeg(yaw) + 360) % 360;
    shell.dataset.cameraYaw = heading.toFixed(1);
    shell.dataset.cameraTravel = THREE.MathUtils.radToDeg(travel).toFixed(1);
    shell.dataset.cameraRadius = camera.position.distanceTo(controls.target).toFixed(2);
    shell.dataset.cameraGestures = String(gestureCount);
    const compass = document.querySelector('[data-compass]');
    if (compass) compass.style.setProperty('--heading', `${-heading}deg`);
    const label = document.querySelector('[data-view-label]');
    if (label) label.textContent = ['Lakeside', 'Garden', 'Atelier', 'Sunroom'][Math.floor((heading + 45) / 90) % 4];
  }

  function reveal() {
    home(true);
    // Reserve real screen space for the score sheet; keep the whole chain above it.
    const landscape = camera.aspect > 1.3;
    camera.setViewOffset(canvas.clientWidth, canvas.clientHeight, landscape ? canvas.clientWidth * .17 : 0, landscape ? 0 : canvas.clientHeight * .15, canvas.clientWidth, canvas.clientHeight);
    const target = homeTarget.clone();
    const position = new THREE.Vector3().setFromSpherical(new THREE.Spherical(landscape ? 10.2 : 13.6, .92, .05)).add(target);
    if (reducedMotion) { camera.position.copy(position); controls.target.copy(target); controls.update(); return; }
    transition = { started: performance.now(), position, target, from: camera.position.clone(), fromTarget: controls.target.clone() };
  }

  function moveToShowcase(theta, immediate=false) {
    const shot=showcaseShot;
    const position=new THREE.Vector3().setFromSpherical(new THREE.Spherical(shot.radius,shot.phi,theta)).add(shot.target);
    controls.enableDamping=false; controls.update(); controls.enableDamping=true;
    if(immediate || reducedMotion) {
      camera.position.copy(position); controls.target.copy(shot.target); controls.update();
    } else transition={started:performance.now(),position,target:shot.target.clone(),from:camera.position.clone(),fromTarget:controls.target.clone()};
  }
  function frameShowcase(bounds, rect, autoStart=false, preserve=false) {
    const wasRunning=showcaseShot?.clock.running;
    const yaw=controls.getAzimuthalAngle();
    if(!preserve || !showcaseShot) {
      stop(); showcaseShot={clock:createOrbitPlayback(),angle:.18};
    }
    const width=canvas.clientWidth,height=canvas.clientHeight;
    camera.clearViewOffset();
    Object.assign(showcaseShot,fitShowcaseOrbit(camera,bounds,{width,height},rect));
    camera.setViewOffset(width,height,width/2-(rect.x+rect.width/2),height/2-(rect.y+rect.height/2),width,height);
    controls.minDistance=showcaseShot.radius*.65; controls.maxDistance=Math.max(13.8,showcaseShot.radius*1.6);
    if(preserve) showcaseShot.angle=yaw-showcaseShot.clock.phase*Math.PI*2;
    moveToShowcase(preserve ? yaw : showcaseShot.angle,true);
    if(autoStart || (preserve && wasRunning)) showcaseShot.clock.start(performance.now());
    shell.dataset.cameraMode='showcase'; showcaseStatus();
  }
  function toggleShowcase() {
    if(!showcaseShot) return;
    if(showcaseShot.clock.running) { stop(); return; }
    const clock=showcaseShot.clock;
    if(clock.phase===1) clock.reset();
    showcaseShot.angle=controls.getAzimuthalAngle()-clock.phase*Math.PI*2;
    moveToShowcase(controls.getAzimuthalAngle());
    clock.start(performance.now()+(reducedMotion ? 0 : 850));
    shell.dataset.cameraMode='showcase'; showcaseStatus();
  }
  function frontShowcase() {
    if(!showcaseShot) return;
    stop(); showcaseShot.clock.reset(); showcaseShot.angle=.18;
    moveToShowcase(.18); showcaseStatus();
  }
  return { controls, home, reveal, follow, stop, update, frameShowcase, toggleShowcase, frontShowcase,
    canTap: () => performance.now() > suppressTapUntil && !moved,
    get touring() { return Boolean(tour || showcaseShot?.clock.running || transition); } };
}
