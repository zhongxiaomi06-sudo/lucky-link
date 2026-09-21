"""Read-only projected coordinates guide native pointer gestures, never mutate game state."""
from pathlib import Path
import json
import sys
from playwright.sync_api import sync_playwright, expect

evidence = Path(__file__).resolve().parents[1] / 'evidence' / 'styling-v7'
with sync_playwright() as p:
    browser = p.chromium.launch(headless=True, args=['--use-angle=metal','--enable-gpu'])
    page = browser.new_page(viewport={'width':390,'height':844}, is_mobile=True, has_touch=True, device_scale_factor=1)
    if '--muted' in sys.argv: page.add_init_script("localStorage.setItem('lucky-link.muted','yes')")
    page.add_init_script("""
      window.feedbackSamples = [];
      window.audioStartup = [];
      const NativeAudio = window.AudioContext;
      if (NativeAudio) window.AudioContext = new Proxy(NativeAudio, {construct(target, args) {
        const start = performance.now(); const context = Reflect.construct(target, args);
        window.audioStartup.push(performance.now() - start); window.observedAudio = context; return context;
      }});
      const observe = (event) => {
        const source = event.target.closest(event.type === 'pointerdown' ? '[data-box-slot]' : '[data-material-id]');
        if (!source) return;
        const started = performance.now();
        requestAnimationFrame(() => window.feedbackSamples.push(performance.now() - started));
      };
      document.addEventListener('pointerdown', observe, true);
      document.addEventListener('click', observe, true);
    """)
    errors = []
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.goto('http://127.0.0.1:5114/3d-lab.html?debug', wait_until='networkidle')
    shell = page.locator('[data-lab-shell]')
    expect(shell).to_have_attribute('data-render-ready','true')
    initial_audio = page.evaluate('window.observedAudio?.state ?? "not-created"')
    assert initial_audio in ['suspended','not-created'], initial_audio
    assert shell.get_attribute('data-music') != 'playing'
    for _ in range(20):
        slot = page.locator('[data-box-slot="0"]').bounding_box()
        page.mouse.move(slot['x']+22,slot['y']+22); page.mouse.down()
        expect(shell).to_have_attribute('data-holding','true')
        page.wait_for_timeout(35); page.mouse.up()
        page.locator('[data-action="cancel-pickup"]').click()
    page.locator('[data-action="collection"]').click()
    for name in ['Blue eye','Aqua drop','Cloud pearl']: page.get_by_role('button', name=f'Add {name}', exact=True).click()
    page.get_by_role('button', name='Close bead collection', exact=True).click()
    page.wait_for_timeout(500)
    def data(key): return json.loads(shell.get_attribute('data-' + key))
    def drag(source, destination):
        page.mouse.move(source['x'],source['y']); page.mouse.down()
        expect(shell).to_have_attribute('data-holding','true')
        page.mouse.move(destination['x'],destination['y'],steps=14); page.mouse.up()
        page.wait_for_timeout(450)
    drag(data('bead-points')[1],data('box-center'))
    expect(shell).to_have_attribute('data-composition','blue-eye,pearl')
    expect(shell).to_have_attribute('data-box-contents','aqua-drop')
    # Returning switches the box to set-aside automatically.
    slot = page.locator('[data-box-slot="0"]').bounding_box()
    drag({'x':slot['x']+22,'y':slot['y']+22},data('cord-targets')[-1])
    expect(shell).to_have_attribute('data-composition','blue-eye,pearl,aqua-drop')
    expect(shell).to_have_attribute('data-box-contents','')
    drag(data('bead-points')[2],data('cord-targets')[0])
    expect(shell).to_have_attribute('data-composition','aqua-drop,blue-eye,pearl')
    page.locator('[data-action="undo"]').click()
    expect(shell).to_have_attribute('data-composition','blue-eye,pearl,aqua-drop')
    page.wait_for_timeout(800)
    samples=[]
    for _ in range(10):
        page.wait_for_timeout(1000)
        samples.append(int(page.locator('[data-fps]').inner_text()))
    gpu = page.locator('[data-canvas]').evaluate("c => {const g=c.getContext('webgl2');const e=g.getExtension('WEBGL_debug_renderer_info');return e?g.getParameter(e.UNMASKED_RENDERER_WEBGL):'unavailable'}")
    latency = page.evaluate('window.feedbackSamples')
    report={'native_drag_return_reuse_reorder_undo':'pass','fps_samples_10s':samples,'average_reported_fps':sum(samples)/len(samples),'feedback_next_frame_ms':latency,'feedback_max_ms':max(latency),'audio_context_startup_ms':page.evaluate('window.audioStartup'),'initial_audio_state':initial_audio,'music_after_gesture':shell.get_attribute('data-music'),'muted_diagnostic':'--muted' in sys.argv,'gpu':gpu,'viewport':[390,844],'errors':errors,'note':'Desktop headless Chromium sample, not iPhone evidence or a 60fps guarantee. Feedback uses the next animation-frame callback, not a physical display measurement.'}
    evidence.mkdir(parents=True,exist_ok=True)
    (evidence/('spatial-muted-diagnostic.json' if '--muted' in sys.argv else 'spatial-performance.json')).write_text(json.dumps(report,indent=2)+'\n')
    print(json.dumps(report),flush=True)
    assert not errors,errors
    assert max(latency) <= 100,latency
    browser.close()
