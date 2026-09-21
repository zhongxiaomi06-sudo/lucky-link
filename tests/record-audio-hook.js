// Test-only parallel audio tap. Keeps every original game output connected to its destination.
(() => {
  const original = AudioNode.prototype.connect;
  const buses = new Map();
  AudioNode.prototype.connect = function (destination, ...args) {
    const result = original.call(this, destination, ...args);
    if (destination === this.context.destination) {
      let bus = buses.get(this.context);
      if (!bus) {
        const stream = this.context.createMediaStreamDestination();
        const analyser = this.context.createAnalyser();
        const mix = this.context.createGain();
        original.call(mix, stream);
        original.call(mix, analyser);
        bus = { context: this.context, stream, analyser, mix, sources: 0 };
        buses.set(this.context, bus);
      }
      original.call(this, bus.mix);
      bus.sources += 1;
    }
    return result;
  };
  const clock = () => (performance.timeOrigin + performance.now()) / 1000;
  window.recordingAudit = {
    status() {
      return [...buses.values()].map(b => {
        const data = new Float32Array(b.analyser.fftSize);
        b.analyser.getFloatTimeDomainData(data);
        return { state: b.context.state, sources: b.sources, time: b.context.currentTime,
          rms: Math.sqrt(data.reduce((s, n) => s + n * n, 0) / data.length) };
      });
    },
    start() {
      const bus = [...buses.values()].find(b => b.context.state === 'running');
      if (!bus || bus.sources < 2) throw new Error('Game music and sound outputs are not both captured');
      this.chunks = [];
      this.events = [];
      const shell = document.querySelector('[data-lab-shell]');
      this.observer = new MutationObserver(() => this.events.push({ event: shell.dataset.lastSound,
        material: shell.dataset.soundMaterial, epoch: clock(), contextTime: bus.context.currentTime }));
      this.observer.observe(shell, { attributes: true, attributeFilter: ['data-sound-count'] });
      this.recorder = new MediaRecorder(bus.stream.stream, { mimeType: 'audio/webm;codecs=opus', audioBitsPerSecond: 192000 });
      this.recorder.ondataavailable = e => { if (e.data.size) this.chunks.push(e.data); };
      this.started = clock();
      this.contextStarted = bus.context.currentTime;
      this.recorder.start(250);
      return { epoch: this.started, context: this.contextStarted, sources: bus.sources };
    },
    stop() {
      this.stopped = clock();
      this.observer.disconnect();
      return new Promise(resolve => {
        this.recorder.onstop = async () => {
          const bytes = new Uint8Array(await new Blob(this.chunks).arrayBuffer());
          let binary = '';
          for (let i = 0; i < bytes.length; i += 8192) binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
          resolve({ base64: btoa(binary), started: this.started, stopped: this.stopped, bytes: bytes.length, events: this.events });
        };
        this.recorder.stop();
      });
    }
  };
})();
