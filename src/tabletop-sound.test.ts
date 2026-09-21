import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createTabletopSound } from './tabletop-sound.js';

// Execute the real controller, sample scheduler and score against observable audio nodes.
// Browser waveform/recording evidence is produced separately by audio-v41-audit.py.
class Param {
  value = 0;
  events: Array<{ kind: string; value: number; time: number }> = [];
  setValueAtTime(value: number, time: number) { this.events.push({ kind: 'set', value, time }); }
  linearRampToValueAtTime(value: number, time: number) { this.events.push({ kind: 'linear', value, time }); }
  exponentialRampToValueAtTime(value: number, time: number) { this.events.push({ kind: 'exponential', value, time }); }
  cancelScheduledValues(time: number) { this.events = this.events.filter(event => event.time < time); }
}

class AudioNodeStub {
  gain = new Param(); frequency = new Param(); pan = new Param(); playbackRate = new Param();
  threshold = new Param(); knee = new Param(); ratio = new Param(); attack = new Param(); release = new Param();
  type = ''; loop = false; started = false; stopped = false;
  onended?: () => void;
  outputs: unknown[] = [];
  constructor(readonly context: AudioContextStub, readonly kind = 'node') {}
  connect(next: unknown) { this.outputs.push(next); return next; }
  disconnect() { this.outputs = []; }
  start() { this.started = true; }
  stop(at?: number) {
    if (at === undefined || at <= this.context.currentTime) { this.stopped = true; this.onended?.(); }
  }
}

class AudioContextStub {
  static instances: AudioContextStub[] = [];
  static resumeDelay = 0;
  state = 'suspended'; destination = {};
  nodes: AudioNodeStub[] = [];
  get currentTime() { return performance.now() / 1000; }
  constructor() { AudioContextStub.instances.push(this); }
  node(kind = 'node') { const node = new AudioNodeStub(this, kind); this.nodes.push(node); return node; }
  createGain() { return this.node('gain'); }
  createBiquadFilter() { return this.node(); }
  createDynamicsCompressor() { return this.node(); }
  createStereoPanner() { return this.node(); }
  createOscillator() { return this.node('tone'); }
  createBufferSource() { return this.node('sample'); }
  decodeAudioData() { return Promise.resolve({ duration: 7 }); }
  suspend() { this.state = 'suspended'; return Promise.resolve(); }
  resume() {
    return new Promise<void>(resolve => setTimeout(() => { this.state = 'running'; resolve(); }, AudioContextStub.resumeDelay));
  }
}

class ButtonStub extends EventTarget { setAttribute() {} }
const flush = () => vi.advanceTimersByTimeAsync(0);

function fixture() {
  const shell = { dataset: {} as Record<string, string> }, button = new ButtonStub();
  return { shell, button, sound: createTabletopSound(shell, button) };
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'performance'] });
  AudioContextStub.instances = []; AudioContextStub.resumeDelay = 0;
  vi.stubGlobal('AudioContext', AudioContextStub);
  vi.stubGlobal('document', Object.assign(new EventTarget(), { hidden: false }));
  vi.stubGlobal('window', new EventTarget());
  const values = new Map();
  vi.stubGlobal('localStorage', { getItem: (key: string) => values.get(key), setItem: (key: string, value: string) => values.set(key, value) });
  vi.stubGlobal('fetch', async () => ({ ok: true, arrayBuffer: async () => new ArrayBuffer(8) }));
});
afterEach(() => { vi.clearAllTimers(); vi.useRealTimers(); vi.unstubAllGlobals(); });

describe('tabletop reveal audio lifecycle', () => {
  it('forwards physical contact material, energy and position to decoded samples', async () => {
    const { sound } = fixture();void sound.unlock();await flush();
    const context=AudioContextStub.instances[0],boundary=context.nodes.length;
    sound.play('impact','pearl',0,{materialFamily:'metal',intensity:.9,x:1});await flush();
    const added=context.nodes.slice(boundary);
    expect(added.some(node=>node.kind==='sample'&&node.started&&node.playbackRate.value>1)).toBe(true);
    expect(added.some(node=>node.type==='lowpass'&&node.frequency.value>8000)).toBe(true);
    expect(added.some(node=>node.pan.value>.5)).toBe(true);
    const sources=context.nodes.filter(node=>node.started).length;
    sound.play('impact','pearl',0,{materialFamily:'metal',intensity:0,x:1});await flush();
    expect(context.nodes.filter(node=>node.started)).toHaveLength(sources);
  });

  it('retains material spectrum and position when sample fetch fails', async () => {
    vi.stubGlobal('fetch',async()=>({ok:false}));
    const {sound}=fixture();void sound.unlock();await flush();
    const context=AudioContextStub.instances[0],boundary=context.nodes.length;
    sound.play('impact','pearl',0,{materialFamily:'metal',intensity:.9,x:0});await flush();
    const added=context.nodes.slice(boundary);
    expect(added.some(node=>node.kind==='tone'&&node.started&&node.frequency.value===1050)).toBe(true);
    expect(added.some(node=>node.pan.value<-.5)).toBe(true);
    expect(added.some(node=>node.type==='lowpass'&&node.frequency.value>8000)).toBe(true);
  });
  it('layers the musical score with decoded samples and restores the original background level', async () => {
    const { sound } = fixture();
    expect(AudioContextStub.instances).toHaveLength(0);
    void sound.unlock(); await flush();
    const context = AudioContextStub.instances[0];
    const background = context.nodes.find(node => node.kind === 'gain' && node.outputs.includes(context.destination))!;
    const originalGain = background.gain.value, before = context.nodes.length;
    sound.play('unlock-theme', 'ice-module-penguin'); await flush();
    const added = context.nodes.slice(before);
    expect(added.some(node => node.kind === 'tone' && node.started)).toBe(true);
    expect(added.some(node => node.kind === 'sample' && node.started)).toBe(true);
    expect(background.gain.events.some(event => event.value < originalGain)).toBe(true);
    expect(background.gain.events.at(-1)?.value).toBe(originalGain);
  });

  it('plays an active reveal after slow audio recovery but drops stale contact sounds', async () => {
    AudioContextStub.resumeDelay = 1900;
    const { sound } = fixture();
    sound.play('unlock-theme', 'ice-module-penguin');
    sound.play('impact', 'pearl');
    await vi.advanceTimersByTimeAsync(1900);
    const context = AudioContextStub.instances[0];
    expect(context.nodes.some(node => node.kind === 'tone' && node.started && node.frequency.value === 98)).toBe(true);
    expect(context.nodes.filter(node => node.kind === 'sample' && node.started && !node.loop)).toHaveLength(6);
  });

  it('cancels queued reveal audio when the scene closes before recovery', async () => {
    AudioContextStub.resumeDelay = 1900;
    const { sound } = fixture();
    sound.play('unlock-theme', 'ice-module-penguin'); sound.stopReveal();
    await vi.advanceTimersByTimeAsync(1900);
    const context = AudioContextStub.instances[0];
    expect(context.nodes.some(node => node.kind === 'tone' && node.started && node.frequency.value === 98)).toBe(false);
    expect(context.nodes.filter(node => node.kind === 'sample' && node.started && !node.loop)).toHaveLength(0);
    expect(context.nodes.some(node => node.kind === 'tone' && node.started)).toBe(true);
  });

  it('stops active reveal voices while keeping background and ordinary interaction voices alive', async () => {
    const { sound } = fixture(); void sound.unlock(); await flush();
    const context = AudioContextStub.instances[0];
    sound.play('thread', 'pearl'); await flush();
    const existing = context.nodes.filter(node => node.started), boundary = context.nodes.length;
    sound.play('unlock-theme', 'ice-module-penguin'); await flush();
    const revealVoices = context.nodes.slice(boundary).filter(node => node.started);
    sound.stopReveal();
    expect(revealVoices.length).toBeGreaterThan(0);
    expect(revealVoices.every(node => node.stopped)).toBe(true);
    expect(existing.every(node => !node.stopped)).toBe(true);
  });
});
