/* =========================================================================
   OUR MUSEUM • GENERATIVE ROMANTIC PIANO SOUND ENGINE
   ========================================================================= */

export class RomanticAudioEngine {
  constructor() {
    this.ctx = null;
    this.isPlaying = false;
    this.timer = null;
    this.gainMaster = null;
    this.delay = null;
    this.delayFeedback = null;
  }

  init() {
    if (this.ctx) return;
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    this.ctx = new AudioCtx();

    this.gainMaster = this.ctx.createGain();
    this.gainMaster.gain.setValueAtTime(0.001, this.ctx.currentTime);
    this.gainMaster.connect(this.ctx.destination);

    // Warm ambient acoustic delay / museum hall simulation
    this.delay = this.ctx.createDelay();
    this.delay.delayTime.value = 0.38;
    this.delayFeedback = this.ctx.createGain();
    this.delayFeedback.gain.value = 0.35;
    this.delay.connect(this.delayFeedback);
    this.delayFeedback.connect(this.delay);
    this.delay.connect(this.gainMaster);
  }

  playPianoNote(freq, time, duration = 2.4, velocity = 0.25) {
    if (!this.ctx) return;
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const noteGain = this.ctx.createGain();

    osc1.type = 'triangle';
    osc1.frequency.setValueAtTime(freq, time);

    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(freq * 2, time);

    const subGain = this.ctx.createGain();
    subGain.gain.setValueAtTime(0.3, time);
    osc2.connect(subGain);
    subGain.connect(noteGain);

    osc1.connect(noteGain);
    noteGain.connect(this.gainMaster);
    noteGain.connect(this.delay);

    noteGain.gain.setValueAtTime(0.0001, time);
    noteGain.gain.exponentialRampToValueAtTime(velocity, time + 0.02);
    noteGain.gain.exponentialRampToValueAtTime(velocity * 0.45, time + 0.4);
    noteGain.gain.exponentialRampToValueAtTime(0.0001, time + duration);

    osc1.start(time);
    osc2.start(time);
    osc1.stop(time + duration);
    osc2.stop(time + duration);
  }

  playInteractiveChord(chordFreqs = [261.63, 329.63, 392.00, 523.25, 659.25]) {
    this.init();
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    const now = this.ctx ? this.ctx.currentTime : 0;
    chordFreqs.forEach((freq, idx) => {
      this.playPianoNote(freq, now + idx * 0.08, 3.2, 0.28);
    });
  }

  start() {
    if (this.isPlaying) return;
    this.init();
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    this.isPlaying = true;
    this.gainMaster.gain.linearRampToValueAtTime(0.28, this.ctx.currentTime + 2.0);

    const progressions = [
      [261.63, 329.63, 392.00, 493.88, 587.33], // Cmaj9
      [246.94, 293.66, 392.00, 440.00, 587.33], // G/B
      [220.00, 261.63, 329.63, 392.00, 523.25], // Am9
      [174.61, 261.63, 329.63, 349.23, 440.00]  // Fmaj7
    ];

    let chordIndex = 0;
    let noteInChord = 0;

    const scheduleNotes = () => {
      if (!this.isPlaying) return;
      const now = this.ctx.currentTime;
      const currentChord = progressions[chordIndex];

      const noteFreq = currentChord[noteInChord % currentChord.length];
      this.playPianoNote(noteFreq, now, 2.8, 0.22);

      if (noteInChord === 0) {
        this.playPianoNote(currentChord[0] * 0.5, now, 3.5, 0.32);
      }

      noteInChord++;
      if (noteInChord >= 4) {
        noteInChord = 0;
        chordIndex = (chordIndex + 1) % progressions.length;
      }

      this.timer = setTimeout(scheduleNotes, 680);
    };

    scheduleNotes();
  }

  stop() {
    this.isPlaying = false;
    if (this.timer) clearTimeout(this.timer);
    if (this.gainMaster && this.ctx) {
      this.gainMaster.gain.linearRampToValueAtTime(0.0001, this.ctx.currentTime + 0.8);
    }
  }

  toggle() {
    if (this.isPlaying) {
      this.stop();
      return false;
    } else {
      this.start();
      return true;
    }
  }
}

export const audioEngine = new RomanticAudioEngine();

