import { buildAmbientPhrase, createGameSound } from './game-sound.js';
import { createSampleSound } from './sample-sound.js';

const AMBIENT_GAIN = .35;
const REVEAL_EVENTS = new Set(['unlock-theme', 'coupon-reveal']);

export function createTabletopSound(shell, button) {
  let context, fx, revealFx, samples, master, timer, phrase = 0, active = new Set(), started = false;
  let epoch = 0, resumePending = null, pageActive = true, unavailable = false;
  let revealEpoch = 0;
  let muted = false;
  try { muted = localStorage.getItem('lucky-link.muted') === 'yes'; } catch { /* Session-only. */ }
  function allowed() { return !muted && !document.hidden && pageActive; }
  function update() {
    button.setAttribute('aria-pressed', String(muted)); button.setAttribute('aria-label', muted ? 'Turn on soundtrack' : 'Mute soundtrack');
    shell.dataset.music = muted ? 'muted' : unavailable ? 'unavailable' : started && allowed() && context?.state === 'running' ? 'playing' : 'idle';
    shell.dataset.ambient = samples?.ambient ? 'playing' : 'stopped';
  }
  function ambience() { if (started && allowed() && context?.state === 'running') samples?.startAmbience(); update(); }
  function playPhrase() {
    if (!allowed() || context?.state !== 'running') return;
    const now = context.currentTime, notes = buildAmbientPhrase(phrase++);
    for (const note of notes) {
      const oscillator=context.createOscillator(),filter=context.createBiquadFilter(),gain=context.createGain(),pan=context.createStereoPanner?.(),at=now+note.at;
      oscillator.type=note.type;oscillator.frequency.value=note.frequency;filter.type='lowpass';filter.frequency.value=note.role==='pad'?1300:note.role==='pulse'?3200:7200;
      gain.gain.setValueAtTime(.0001,at);gain.gain.exponentialRampToValueAtTime(note.gain,at+(note.role==='pad' ? .42 : .018));gain.gain.exponentialRampToValueAtTime(.0001,at+note.duration);
      oscillator.connect(filter).connect(gain);if(pan){pan.pan.value=note.pan;gain.connect(pan).connect(master);}else gain.connect(master);active.add(oscillator);
      oscillator.onended=()=>{oscillator.disconnect();filter.disconnect();gain.disconnect();pan?.disconnect();active.delete(oscillator);};
      oscillator.start(at);oscillator.stop(at+note.duration+.02);
    }
  }
  function stop() {
    epoch++; revealEpoch++; clearInterval(timer); timer = null; fx?.stop(); revealFx?.stop(); samples?.stop();
    for (const oscillator of active) { try { oscillator.stop(); } catch { /* Already ended. */ } oscillator.disconnect(); }
    if (master && context) { master.gain.cancelScheduledValues(context.currentTime); master.gain.setValueAtTime(AMBIENT_GAIN, context.currentTime); }
    active = new Set(); void context?.suspend().catch(() => {}); update();
  }
  function stopReveal() {
    revealEpoch++; revealFx?.stop(); samples?.stopEvents(REVEAL_EVENTS);
    if (master && context) {
      const now = context.currentTime;
      master.gain.cancelScheduledValues(now); master.gain.setValueAtTime(master.gain.value, now);
      master.gain.linearRampToValueAtTime(AMBIENT_GAIN, now + .15);
      samples?.restoreAmbient();
    }
  }
  async function unlock() {
    if (!allowed()) return false;
    const ticket = epoch;
    try {
      const Context = globalThis.AudioContext || globalThis.webkitAudioContext;
      if (!Context) { unavailable = true; update(); return false; }
      if (!context) {
        context = new Context(); fx = createGameSound(context, { limit: 16 }); revealFx = createGameSound(context, { limit: 8 });
        master = context.createGain(); master.gain.value = AMBIENT_GAIN; master.connect(context.destination);
        shell.dataset.audioAssets = 'loading';
        samples = createSampleSound(context, { onState(state) { shell.dataset.audioAssets = state; ambience(); } });
      }
      if (context.state !== 'running') {
        resumePending ||= context.resume().finally(() => { resumePending = null; });
        await resumePending;
      }
      if (ticket !== epoch || !allowed()) {
        if (!allowed()) void context.suspend().catch(() => {});
        return false;
      }
      if (context.state !== 'running') return false;
      unavailable = false; started = true;
      if (!timer) { playPhrase(); timer = setInterval(playPhrase, 6800); }
      ambience(); return true;
    } catch { unavailable = true; update(); return false; }
  }
  button.addEventListener('click', () => {
    muted = !muted; try { localStorage.setItem('lucky-link.muted', muted ? 'yes' : 'no'); } catch { /* Preference remains in session. */ }
    if (muted) stop(); else void unlock(); update();
  });
  document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); else if (started && !muted) void unlock(); });
  window.addEventListener('pagehide', () => { pageActive = false; stop(); });
  window.addEventListener('pageshow', () => { pageActive = true; if (started && !muted) void unlock(); });
  shell.dataset.audioAssets = 'idle';
  update();
  return { unlock, stopReveal, play(event, id, count, options) {
    if (!allowed()) return;
    const ceremonial = REVEAL_EVENTS.has(event);
    const ticket = epoch, revealTicket = revealEpoch, requestedAt = performance.now();
    void unlock().then(ok => {
      // Scene lifetime cancels a reveal; ordinary contact sounds still expire quickly.
      if (!ok || !allowed() || ticket !== epoch || (ceremonial && revealTicket !== revealEpoch) || (!ceremonial && performance.now() - requestedAt > 220)) return;
      if (event === 'unlock-theme') {
        samples?.duckAmbient(5.2);
        const now = context.currentTime;
        master.gain.cancelScheduledValues(now); master.gain.setValueAtTime(master.gain.value, now);
        master.gain.linearRampToValueAtTime(.035, now + .08);
        master.gain.setValueAtTime(.035, now + 3.4);
        master.gain.linearRampToValueAtTime(AMBIENT_GAIN, now + 5.2);
        revealFx.stop();
      }
      let result = 'missing';
      try { result = samples.play(event, id, count, options); } catch { samples.stop(); }
      if (!ceremonial && (result === 'limited' || result === 'unknown')) return;
      // The musical score complements recorded textures; a decoded clink must not replace it.
      const melody = ceremonial && revealFx.play(event, id, count);
      const played = melody || result === 'played' || (!ceremonial && fx.play(event, id, count, options));
      if (played) {
        shell.dataset.soundEngine = melody && result === 'played' ? 'layered' : result === 'played' ? 'samples' : 'fallback';
        if (result === 'played') shell.dataset.sampleCount = String(Number(shell.dataset.sampleCount || 0) + 1);
        shell.dataset.lastSound = event; shell.dataset.soundHistory = [...(shell.dataset.soundHistory||'').split(',').filter(Boolean),event].slice(-24).join(','); shell.dataset.soundCount = String(Number(shell.dataset.soundCount || 0) + 1);
      }
    });
  } };
}
