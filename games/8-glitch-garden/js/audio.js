/* GLITCH GARDEN — procedural audio (Web Audio API). No external audio files. */
(function () {
  'use strict';
  var GG = window.GG;
  var ctx = null, master = null, musicGain = null, sfxGain = null;
  var unlocked = false, musicOn = false, timer = null, step = 0, nextTime = 0;
  var vol = { music: 0.7, sfx: 0.8, mute: false };

  // C major flavoured progression: C  Am  F  G
  var CHORDS = [
    { root: 48, tones: [60, 64, 67, 72] },
    { root: 45, tones: [57, 60, 64, 69] },
    { root: 41, tones: [53, 57, 60, 65] },
    { root: 43, tones: [55, 59, 62, 67] }
  ];
  var MELODY = [0, 2, 1, 3, 2, 1, 3, 2, 0, 3, 2, 1, 2, 3, 1, 2];
  var BPM = 112;

  function hz(m) { return 440 * Math.pow(2, (m - 69) / 12); }

  function applyVolumes() {
    if (!ctx) return;
    var t = ctx.currentTime;
    var m = vol.mute ? 0 : 1;
    master.gain.setTargetAtTime(m, t, 0.02);
    musicGain.gain.setTargetAtTime(vol.music * 0.32, t, 0.03);
    sfxGain.gain.setTargetAtTime(vol.sfx * 0.55, t, 0.03);
  }

  function tone(type, f, t0, dur, peak, dest, f2) {
    var o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t0);
    if (f2) o.frequency.exponentialRampToValueAtTime(f2, t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(peak, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(dest || sfxGain);
    o.start(t0); o.stop(t0 + dur + 0.03);
  }

  function scheduleMusic() {
    if (!ctx || !musicOn) return;
    var spb = 60 / BPM / 2; // eighth notes
    while (nextTime < ctx.currentTime + 0.4) {
      var bar = Math.floor(step / 16) % CHORDS.length;
      var s = step % 16;
      var ch = CHORDS[bar];
      var t = nextTime;
      if (s % 4 === 0) tone('triangle', hz(ch.root), t, spb * 3.6, 0.55, musicGain);
      var mi = MELODY[s];
      if (s % 2 === 0 || s % 8 === 5) tone('sine', hz(ch.tones[mi] + (s === 14 ? 12 : 0)), t, spb * 1.7, 0.4, musicGain);
      if (s % 8 === 4) tone('square', hz(ch.tones[(mi + 2) % 4] + 12), t, spb * 0.8, 0.06, musicGain);
      step++; nextTime += spb;
    }
  }

  GG.audio = {
    setVolumes: function (music, sfx, mute) {
      vol.music = GG.clamp(music / 100, 0, 1);
      vol.sfx = GG.clamp(sfx / 100, 0, 1);
      vol.mute = !!mute;
      applyVolumes();
    },
    // Must be called from a user gesture (click / key / touch)
    unlock: function () {
      try {
        if (!ctx) {
          var AC = window.AudioContext || window.webkitAudioContext;
          if (!AC) return;
          ctx = new AC();
          master = ctx.createGain(); musicGain = ctx.createGain(); sfxGain = ctx.createGain();
          musicGain.connect(master); sfxGain.connect(master); master.connect(ctx.destination);
          applyVolumes();
        }
        if (ctx.state === 'suspended') ctx.resume();
        unlocked = true;
        if (musicOn && !timer) GG.audio.startMusic();
      } catch (e) { /* audio unavailable: game continues silently */ }
    },
    startMusic: function () {
      musicOn = true;
      if (!ctx || !unlocked) return;
      if (timer) return;
      nextTime = ctx.currentTime + 0.08;
      timer = setInterval(scheduleMusic, 90);
      scheduleMusic();
    },
    stopMusic: function () {
      musicOn = false;
      if (timer) { clearInterval(timer); timer = null; }
    },
    info: function () { return ctx ? { state: ctx.state, master: master.gain.value, music: musicGain.gain.value, sfx: sfxGain.gain.value, scheduling: !!timer } : null; },
    suspend: function () { if (ctx && ctx.state === 'running') ctx.suspend(); },
    resume: function () { if (ctx && unlocked && ctx.state === 'suspended') ctx.resume(); },
    play: function (name) {
      if (!ctx || !unlocked || vol.mute || vol.sfx <= 0) return;
      var t = ctx.currentTime + 0.001;
      try {
        switch (name) {
          case 'click': tone('triangle', 520, t, 0.08, 0.5, null, 700); break;
          case 'jump': tone('square', 300, t, 0.16, 0.18, null, 720); break;
          case 'land': tone('sine', 140, t, 0.08, 0.35, null, 80); break;
          case 'coin': tone('square', 988, t, 0.07, 0.16); tone('square', 1319, t + 0.07, 0.16, 0.16); break;
          case 'star': [784, 988, 1175, 1568].forEach(function (f, i) { tone('triangle', f, t + i * 0.07, 0.25, 0.4); }); break;
          case 'hurt': tone('sawtooth', 380, t, 0.35, 0.3, null, 70); break;
          case 'check': tone('triangle', 660, t, 0.12, 0.4); tone('triangle', 990, t + 0.1, 0.22, 0.4); break;
          case 'crumble': tone('sawtooth', 120, t, 0.25, 0.14, null, 50); break;
          case 'win': [523, 659, 784, 1047, 784, 1047, 1319].forEach(function (f, i) { tone('triangle', f, t + i * 0.12, 0.3, 0.45); tone('sine', f / 2, t + i * 0.12, 0.3, 0.3); }); break;
          case 'lose': [440, 392, 349, 262].forEach(function (f, i) { tone('triangle', f, t + i * 0.16, 0.3, 0.4); }); break;
        }
      } catch (e) { /* ignore audio errors */ }
    }
  };
})();
