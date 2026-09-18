(function () {
  let audio = null;
  function getAudio() {
    if (!audio) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return null;
      audio = new AudioCtx();
    }
    if (audio.state === 'suspended') audio.resume();
    return audio;
  }

  // A short burst of random samples, used as the base for the splash.
  function makeNoiseBuffer(ctx, seconds) {
    const length = Math.max(1, Math.floor(ctx.sampleRate * seconds));
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    return buffer;
  }

  const SOUNDS = {
    // A quick seagull squawk: a raspy sawtooth tone that dives in pitch,
    // pushed through a narrow bandpass filter for a nasal, bird-like edge.
    flap: function () {
      try {
        const ctx = getAudio();
        if (!ctx) return;
        const now = ctx.currentTime;
        const duration = 0.14;

        const osc = ctx.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(1900, now);
        osc.frequency.exponentialRampToValueAtTime(1100, now + 0.04);
        osc.frequency.exponentialRampToValueAtTime(650, now + duration);

        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(1400, now);
        filter.Q.setValueAtTime(3, now);

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.linearRampToValueAtTime(0.18, now + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + duration + 0.02);
      } catch (error) {}
    },

    // A beach bell ding: a sine fundamental plus a quieter, slightly
    // inharmonic overtone for a bell-like shimmer, ringing out and fading.
    score: function () {
      try {
        const ctx = getAudio();
        if (!ctx) return;
        const now = ctx.currentTime;
        const duration = 0.4;

        const fundamental = ctx.createOscillator();
        fundamental.type = 'sine';
        fundamental.frequency.setValueAtTime(1318.5, now);

        const fundamentalGain = ctx.createGain();
        fundamentalGain.gain.setValueAtTime(0.0001, now);
        fundamentalGain.gain.linearRampToValueAtTime(0.14, now + 0.008);
        fundamentalGain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

        const overtone = ctx.createOscillator();
        overtone.type = 'sine';
        overtone.frequency.setValueAtTime(1318.5 * 2.4, now);

        const overtoneGain = ctx.createGain();
        overtoneGain.gain.setValueAtTime(0.0001, now);
        overtoneGain.gain.linearRampToValueAtTime(0.05, now + 0.008);
        overtoneGain.gain.exponentialRampToValueAtTime(0.0001, now + duration * 0.6);

        fundamental.connect(fundamentalGain);
        fundamentalGain.connect(ctx.destination);
        overtone.connect(overtoneGain);
        overtoneGain.connect(ctx.destination);

        fundamental.start(now);
        fundamental.stop(now + duration + 0.02);
        overtone.start(now);
        overtone.stop(now + duration * 0.6 + 0.02);
      } catch (error) {}
    },

    // A splash on crash: filtered noise sweeping toward a muffled low end,
    // plus a soft low thump for the moment of impact.
    crash: function () {
      try {
        const ctx = getAudio();
        if (!ctx) return;
        const now = ctx.currentTime;
        const duration = 0.4;

        const noiseBuffer = makeNoiseBuffer(ctx, duration);
        const noise = ctx.createBufferSource();
        noise.buffer = noiseBuffer;

        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(2600, now);
        filter.frequency.exponentialRampToValueAtTime(300, now + duration);

        const noiseGain = ctx.createGain();
        noiseGain.gain.setValueAtTime(0.15, now);
        noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

        const thump = ctx.createOscillator();
        thump.type = 'sine';
        thump.frequency.setValueAtTime(160, now);
        thump.frequency.exponentialRampToValueAtTime(60, now + 0.2);

        const thumpGain = ctx.createGain();
        thumpGain.gain.setValueAtTime(0.0001, now);
        thumpGain.gain.linearRampToValueAtTime(0.05, now + 0.01);
        thumpGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);

        noise.connect(filter);
        filter.connect(noiseGain);
        noiseGain.connect(ctx.destination);

        thump.connect(thumpGain);
        thumpGain.connect(ctx.destination);

        noise.start(now);
        noise.stop(now + duration + 0.02);
        thump.start(now);
        thump.stop(now + 0.24);
      } catch (error) {}
    }
  };

  window.SOUNDS = SOUNDS;
})();
