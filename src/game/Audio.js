class AudioSynth {
  constructor() {
    this.ctx = null;
  }

  init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  playNote(frequency, duration = 0.8) {
    this.init();
    const time = this.ctx.currentTime;
    
    // Core tone (triangle)
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(frequency, time);

    // Harmonic overlay (sine wave at double pitch for octave warmth)
    const osc2 = this.ctx.createOscillator();
    const gain2 = this.ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(frequency * 2, time);

    // Set gain envelopes
    gain.gain.setValueAtTime(0, time);
    gain.gain.linearRampToValueAtTime(0.25, time + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

    gain2.gain.setValueAtTime(0, time);
    gain2.gain.linearRampToValueAtTime(0.1, time + 0.02);
    gain2.gain.exponentialRampToValueAtTime(0.001, time + duration);

    osc.connect(gain);
    osc2.connect(gain2);
    
    gain.connect(this.ctx.destination);
    gain2.connect(this.ctx.destination);

    osc.start(time);
    osc2.start(time);
    osc.stop(time + duration);
    osc2.stop(time + duration);
  }

  playClick() {
    this.init();
    const time = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, time);
    osc.frequency.exponentialRampToValueAtTime(150, time + 0.05);

    gain.gain.setValueAtTime(0.08, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.05);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    
    osc.start(time);
    osc.stop(time + 0.05);
  }

  playBuzzer() {
    this.init();
    const time = this.ctx.currentTime;
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc1.type = 'sawtooth';
    osc1.frequency.setValueAtTime(100, time);
    
    osc2.type = 'square';
    osc2.frequency.setValueAtTime(101.5, time); // detuned hum

    gain.gain.setValueAtTime(0.15, time);
    gain.gain.linearRampToValueAtTime(0.15, time + 0.4);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.5);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(this.ctx.destination);
    
    osc1.start(time);
    osc2.start(time);
    osc1.stop(time + 0.5);
    osc2.stop(time + 0.5);
  }

  playGearGrind() {
    this.init();
    const time = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();
    
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(45, time);
    
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(180, time);

    gain.gain.setValueAtTime(0, time);
    gain.gain.linearRampToValueAtTime(0.12, time + 0.05);
    gain.gain.linearRampToValueAtTime(0.12, time + 0.2);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.3);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);
    
    osc.start(time);
    osc.stop(time + 0.3);
  }

  playSuccess() {
    this.init();
    const time = this.ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6 (Ascending Major Triad)
    
    notes.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, time + idx * 0.1);
      
      gain.gain.setValueAtTime(0, time + idx * 0.1);
      gain.gain.linearRampToValueAtTime(0.15, time + idx * 0.1 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, time + idx * 0.1 + 0.7);
      
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      
      osc.start(time + idx * 0.1);
      osc.stop(time + idx * 0.1 + 0.7);
    });
  }

  playVictory() {
    this.init();
    const time = this.ctx.currentTime;
    const melody = [
      { freq: 261.63, delay: 0.0, dur: 0.4 }, // C4
      { freq: 329.63, delay: 0.3, dur: 0.4 }, // E4
      { freq: 392.00, delay: 0.6, dur: 0.4 }, // G4
      { freq: 523.25, delay: 0.9, dur: 0.6 }, // C5
      { freq: 493.88, delay: 1.5, dur: 0.4 }, // B4
      { freq: 523.25, delay: 1.9, dur: 2.0 }  // C5 (Epic long final chord)
    ];

    melody.forEach((note) => {
      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();

      osc1.type = 'sawtooth';
      osc2.type = 'triangle';
      
      osc1.frequency.setValueAtTime(note.freq, time + note.delay);
      osc2.frequency.setValueAtTime(note.freq * 1.008, time + note.delay); // detune for thickness

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(900, time + note.delay);
      filter.frequency.exponentialRampToValueAtTime(250, time + note.delay + note.dur);

      gain.gain.setValueAtTime(0, time + note.delay);
      gain.gain.linearRampToValueAtTime(0.10, time + note.delay + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, time + note.delay + note.dur);

      osc1.connect(filter);
      osc2.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      osc1.start(time + note.delay);
      osc2.start(time + note.delay);
      
      osc1.stop(time + note.delay + note.dur);
      osc2.stop(time + note.delay + note.dur);
    });
  }
}

export const audio = new AudioSynth();
