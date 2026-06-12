// SoundManager.ts - Web Audio API Synthetic Synthesizer with Howler.js wrapper support
import { Howl } from "howler";

class SoundManagerImpl {
  private ctx: AudioContext | null = null;
  private scribeNode: OscillatorNode | null = null;
  private scribeGain: GainNode | null = null;
  private heartbeatInterval: any = null;
  private backgroundMusic: Howl | null = null;

  constructor() {
    // AudioContext will be initialized on first user interaction to comply with browser autoplay policies
  }

  private initContext() {
    if (!this.ctx) {
      // @ts-ignore
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume();
    }
  }

  // Scribe sound (arcane crackling noise)
  public playScribe() {
    this.initContext();
    if (!this.ctx) return;

    if (this.scribeNode) return; // Already playing

    try {
      // Create noise buffer (chalk-like inscribing crackle)
      const bufferSize = this.ctx.sampleRate * 1.5;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      const noiseSource = this.ctx.createBufferSource();
      noiseSource.buffer = buffer;
      noiseSource.loop = true;

      // Bandpass filter to make it sound like scratching
      const filter = this.ctx.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.setValueAtTime(800, this.ctx.currentTime);
      filter.Q.setValueAtTime(3, this.ctx.currentTime);

      // Lowpass filter for softness
      const lowpass = this.ctx.createBiquadFilter();
      lowpass.type = "lowpass";
      lowpass.frequency.setValueAtTime(1200, this.ctx.currentTime);

      this.scribeGain = this.ctx.createGain();
      this.scribeGain.gain.setValueAtTime(0.01, this.ctx.currentTime); // very subtle background scratching

      noiseSource.connect(filter);
      filter.connect(lowpass);
      lowpass.connect(this.scribeGain);
      this.scribeGain.connect(this.ctx.destination);

      noiseSource.start();
      // Keep track of the source as our node
      this.scribeNode = noiseSource as any;
    } catch (e) {
      console.warn("Failed to start scribe synthesis", e);
    }
  }

  public stopScribe() {
    if (this.scribeNode) {
      try {
        this.scribeNode.stop();
      } catch (e) {}
      this.scribeNode = null;
    }
    this.scribeGain = null;
  }

  // Seal Sound (magical chime)
  public playSeal() {
    this.initContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    try {
      // Crystal bell resonance: FM synthesis
      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const modulationGain = this.ctx.createGain();
      const mainGain = this.ctx.createGain();

      osc1.type = "sine";
      osc1.frequency.setValueAtTime(523.25, now); // C5 chime

      osc2.type = "triangle";
      osc2.frequency.setValueAtTime(1046.5, now); // Harmonic modulator

      modulationGain.gain.setValueAtTime(300, now);
      modulationGain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);

      mainGain.gain.setValueAtTime(0.08, now);
      mainGain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

      osc2.connect(modulationGain);
      modulationGain.connect(osc1.frequency);
      osc1.connect(mainGain);
      mainGain.connect(this.ctx.destination);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 0.7);
      osc2.stop(now + 0.7);
    } catch (e) {
      console.warn("Failed to play seal chime", e);
    }
  }

  // Cast Sound (fireball/magic blast sweep)
  public playCast() {
    this.initContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    try {
      // Noise component
      const bufferSize = this.ctx.sampleRate * 0.8;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(1000, now);
      filter.frequency.exponentialRampToValueAtTime(80, now + 0.5);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      // Bass sweep component
      const osc = this.ctx.createOscillator();
      const oscGain = this.ctx.createGain();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(150, now);
      osc.frequency.exponentialRampToValueAtTime(40, now + 0.4);

      oscGain.gain.setValueAtTime(0.08, now);
      oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

      osc.connect(oscGain);
      oscGain.connect(this.ctx.destination);

      noise.start(now);
      osc.start(now);
      noise.stop(now + 0.7);
      osc.stop(now + 0.5);
    } catch (e) {
      console.warn("Failed to play cast blast", e);
    }
  }

  // Hit Impact Sound
  public playHit() {
    this.initContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = "triangle";
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.linearRampToValueAtTime(70, now + 0.2);

      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.3);
    } catch (e) {
      console.warn("Failed to play hit sfx", e);
    }
  }

  // Overtime ticking heartbeat (repeats based on player HP level)
  public startHeartbeat(hp: number) {
    this.initContext();
    if (!this.ctx) return;

    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    // Ticking speed is dynamic based on HP
    const intervalTime = hp <= 20 ? 400 : (hp <= 50 ? 700 : 1000);

    const tick = () => {
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      try {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = "sine";
        osc.frequency.setValueAtTime(75, now);
        osc.frequency.exponentialRampToValueAtTime(10, now + 0.15);

        gain.gain.setValueAtTime(0.18, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now);
        osc.stop(now + 0.2);
      } catch (e) {}
    };

    tick();
    this.heartbeatInterval = setInterval(tick, intervalTime);
  }

  public stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  // Inversion Successful block
  public playInversionSuccess() {
    this.initContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(440, now); // A4
      osc.frequency.setValueAtTime(554.37, now + 0.08); // C#5
      osc.frequency.setValueAtTime(659.25, now + 0.16); // E5
      osc.frequency.setValueAtTime(880, now + 0.24); // A5

      gain.gain.setValueAtTime(0.07, now);
      gain.gain.setValueAtTime(0.07, now + 0.24);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.5);
    } catch (e) {}
  }

  // Inversion failure block
  public playInversionFail() {
    this.initContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(180, now);
      osc.frequency.linearRampToValueAtTime(90, now + 0.3);

      gain.gain.setValueAtTime(0.06, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

      const filter = this.ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(400, now);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.4);
    } catch (e) {}
  }

  // Background music wrapper using Howler.js
  public startAmbientBGM() {
    if (this.backgroundMusic) return;

    try {
      // Synthesize sound URL loop, or load from a royalty-free URL
      this.backgroundMusic = new Howl({
        src: ["https://actions.google.com/sounds/v1/ambiences/humming_background.ogg"],
        html5: true,
        loop: true,
        volume: 0.12,
      });
      this.backgroundMusic.play();
    } catch (e) {
      console.warn("Howler BGM failed to start", e);
    }
  }

  public stopAmbientBGM() {
    if (this.backgroundMusic) {
      this.backgroundMusic.stop();
      this.backgroundMusic = null;
    }
  }
}

export const SoundManager = new SoundManagerImpl();
export default SoundManager;
