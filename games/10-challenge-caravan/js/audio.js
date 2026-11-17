/* CHALLENGE CARAVAN — Audio manager (pure WebAudio synthesis, no asset files) */
(function () {
  'use strict';
  var CC = window.CC;
  var ctx = null, master = null, musicGain = null, sfxGain = null, noiseBuf = null;
  var timer = null, nextTime = 0, step = 0, playing = false, duck = 1;
  var BPM = 112, STEP = 60 / BPM / 2; // eighth note
  var CHORDS = [[0, 4, 7], [-3, 0, 4], [-7, -3, 0], [-5, -1, 2]]; // C Am F G (semitones from C)
  var PENTA = [0, 2, 4, 7, 9, 12, 14, 16];
  function hz(semi) { return 261.63 * Math.pow(2, semi / 12); }
  function settings() { return CC.Save.data.settings; }

  function ensure() {
    if (ctx) return true;
    try {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      ctx = new AC();
      master = ctx.createGain(); master.gain.value = 0.9; master.connect(ctx.destination);
      musicGain = ctx.createGain(); musicGain.connect(master);
      sfxGain = ctx.createGain(); sfxGain.connect(master);
      var len = ctx.sampleRate * 0.5, b = ctx.createBuffer(1, len, ctx.sampleRate), d = b.getChannelData(0);
      for (var i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      noiseBuf = b;
      Audio.applySettings();
      return true;
    } catch (e) { ctx = null; return false; }
  }

  function tone(t, f, dur, type, vol, f2, dest) {
    try {
      var o = ctx.createOscillator(), g = ctx.createGain();
      o.type = type || 'sine';
      o.frequency.setValueAtTime(f, t);
      if (f2) o.frequency.exponentialRampToValueAtTime(Math.max(20, f2), t + dur);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol), t + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g); g.connect(dest || sfxGain);
      o.start(t); o.stop(t + dur + 0.05);
    } catch (e) { /* ignore */ }
  }
  function noise(t, dur, vol, freq, dest) {
    try {
      var s = ctx.createBufferSource(), g = ctx.createGain(), f = ctx.createBiquadFilter();
      s.buffer = noiseBuf; f.type = 'bandpass'; f.frequency.value = freq || 3000; f.Q.value = 0.8;
      g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      s.connect(f); f.connect(g); g.connect(dest || sfxGain);
      s.start(t); s.stop(t + dur + 0.05);
    } catch (e) { /* ignore */ }
  }

  var SFX = {
    click: function (t) { tone(t, 520, 0.08, 'triangle', 0.35, 760); },
    back: function (t) { tone(t, 420, 0.1, 'triangle', 0.3, 280); },
    welcome: function (t) { [0, 4, 7, 12].forEach(function (s, i) { tone(t + i * 0.08, hz(s), 0.35, 'triangle', 0.35); }); noise(t, 0.4, 0.05, 6000); },
    collect: function (t, o) { var c = (o && o.combo) || 0; tone(t, 760 + c * 70, 0.1, 'square', 0.16, 1100 + c * 90); },
    hit: function (t) { tone(t, 180, 0.28, 'sawtooth', 0.35, 60); noise(t, 0.2, 0.25, 500); },
    jump: function (t) { tone(t, 300, 0.18, 'sine', 0.3, 640); },
    boost: function (t) { tone(t, 330, 0.5, 'sawtooth', 0.18, 990); noise(t, 0.4, 0.1, 2000); },
    checkpoint: function (t) { [0, 7, 12].forEach(function (s, i) { tone(t + i * 0.09, hz(s + 12), 0.25, 'triangle', 0.3); }); },
    rotate: function (t) { tone(t, 210, 0.07, 'square', 0.2, 150); noise(t, 0.05, 0.1, 1200); },
    lit: function (t) { tone(t, 880, 0.18, 'sine', 0.22, 1320); },
    locked: function (t) { tone(t, 120, 0.16, 'square', 0.25, 90); },
    shutter: function (t) { noise(t, 0.05, 0.4, 5000); noise(t + 0.07, 0.08, 0.35, 3000); },
    perfect: function (t) { [0, 4, 7, 12, 16].forEach(function (s, i) { tone(t + i * 0.06, hz(s + 12), 0.25, 'triangle', 0.3); }); },
    miss: function (t) { tone(t, 220, 0.22, 'triangle', 0.3, 140); },
    found: function (t) { [0, 7].forEach(function (s, i) { tone(t + i * 0.08, hz(s + 12), 0.22, 'triangle', 0.32); }); },
    success: function (t) { [0, 4, 7, 12, 16, 19].forEach(function (s, i) { tone(t + i * 0.1, hz(s + 12), 0.4, 'triangle', 0.34); }); },
    fail: function (t) { [7, 4, 0, -5].forEach(function (s, i) { tone(t + i * 0.16, hz(s), 0.35, 'sine', 0.3); }); },
    unlock: function (t) { [0, 4, 7, 11, 14, 19].forEach(function (s, i) { tone(t + i * 0.07, hz(s + 12), 0.5, 'sine', 0.28); }); noise(t, 0.6, 0.06, 8000); },
    travel: function (t) { noise(t, 1.2, 0.12, 800); tone(t, 200, 1.2, 'triangle', 0.12, 420); },
    reveal: function (t) { [0, 5, 9, 12, 17].forEach(function (s, i) { tone(t + i * 0.08, hz(s + 12), 0.5, 'triangle', 0.3); }); },
    tick: function (t) { tone(t, 660, 0.06, 'square', 0.15); },
    go: function (t) { tone(t, 880, 0.35, 'square', 0.22, 880); },
    count: function (t) { tone(t, 440, 0.15, 'square', 0.2); }
  };

  function scheduleStep(t, s) {
    var bar = Math.floor(s / 8) % 4, ch = CHORDS[bar], beat = s % 8;
    var m = musicGain;
    if (beat % 4 === 0) tone(t, hz(ch[0] - 12), STEP * 3.4, 'triangle', 0.5, 0, m);
    if (beat === 4) tone(t, hz(ch[2] - 12), STEP * 2.5, 'triangle', 0.35, 0, m);
    if (beat % 2 === 1) noise(t, 0.04, 0.12, 8000, m);
    if (beat === 0 || beat === 4) noise(t, 0.07, 0.18, 220, m);
    // arpeggio
    var arp = ch[(beat * 2) % 3] + (beat % 4 < 2 ? 0 : 12);
    tone(t, hz(arp), STEP * 1.6, 'triangle', 0.26, 0, m);
    // melody
    if (beat % 2 === 0 && ((s * 7 + bar * 3) % 5) !== 0) {
      var note = PENTA[(s * 5 + bar * 2 + (s >> 3)) % PENTA.length];
      tone(t, hz(note + 12), STEP * 1.8, 'sine', 0.22, 0, m);
    }
  }
  function pump() {
    if (!ctx || !playing) return;
    while (nextTime < ctx.currentTime + 0.18) {
      scheduleStep(nextTime, step);
      nextTime += STEP; step++;
    }
  }

  var Audio = {
    unlocked: false,
    init: function () {
      if (!ensure()) return;
      this.unlocked = true;
      try { if (ctx.state === 'suspended') { var p = ctx.resume(); if (p && p.catch) p.catch(function () {}); } } catch (e) { /* ignore */ }
    },
    applySettings: function () {
      if (!ctx) return;
      var s = settings(), t = ctx.currentTime;
      try {
        musicGain.gain.setTargetAtTime(s.music ? 0.38 * s.musicVol * duck : 0, t, 0.05);
        sfxGain.gain.setTargetAtTime(s.sfx ? 0.9 * s.sfxVol : 0, t, 0.02);
      } catch (e) { /* ignore */ }
    },
    setDuck: function (v) { duck = v; this.applySettings(); },
    sfx: function (name, opts) {
      try {
        if (!this.unlocked || !ctx || !settings().sfx || !SFX[name]) return;
        if (ctx.state === 'suspended') return;
        SFX[name](ctx.currentTime + 0.005, opts);
      } catch (e) { /* ignore */ }
    },
    musicStart: function () {
      if (!ensure()) return;
      if (playing) return;
      playing = true; step = 0; nextTime = ctx.currentTime + 0.1;
      timer = setInterval(pump, 40);
    },
    musicStop: function () { playing = false; if (timer) { clearInterval(timer); timer = null; } },
    suspend: function () { try { if (ctx && ctx.state === 'running') { var p = ctx.suspend(); if (p && p.catch) p.catch(function () {}); } } catch (e) { /* ignore */ } },
    resume: function () { try { if (ctx && ctx.state === 'suspended' && this.unlocked) { var p = ctx.resume(); if (p && p.catch) p.catch(function () {}); } } catch (e) { /* ignore */ } },
    /* keep music running only while setting says so */
    syncMusic: function () {
      if (!this.unlocked) return;
      if (settings().music) { this.musicStart(); this.resume(); this.applySettings(); } else { this.musicStop(); this.applySettings(); }
    }
  };
  CC.Audio = Audio;
})();
