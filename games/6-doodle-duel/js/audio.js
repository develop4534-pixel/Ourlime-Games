/* DOODLE DUEL — procedural audio (original; no sample files). Every call is failure-safe:
   if WebAudio is missing, blocked or interrupted the game silently continues. */
(function (root) {
  'use strict';
  var ctx = null, master = null, musicG = null, sfxG = null, noiseBuf = null;
  var st = { music: 0.5, sfx: 0.8, muted: false, wantMusic: false, ready: false };
  var timer = null, step = 0, nextT = 0;
  var drawNode = null;

  function ensure() {
    if (st.ready) return true;
    try {
      var AC = root.AudioContext || root.webkitAudioContext;
      if (!AC) return false;
      ctx = new AC();
      master = ctx.createGain(); master.gain.value = 0.9;
      var comp = ctx.createDynamicsCompressor(); // keeps sudden effects from getting harsh/loud
      comp.threshold.value = -18; comp.ratio.value = 6;
      musicG = ctx.createGain(); sfxG = ctx.createGain();
      musicG.connect(master); sfxG.connect(master); master.connect(comp); comp.connect(ctx.destination);
      var len = ctx.sampleRate * 0.5, b = ctx.createBuffer(1, len, ctx.sampleRate), d = b.getChannelData(0);
      for (var i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      noiseBuf = b; st.ready = true; apply();
      ctx.onstatechange = function () { /* interruption recovery handled in resume() */ };
      return true;
    } catch (e) { st.ready = false; return false; }
  }
  function apply() {
    if (!st.ready) return;
    try {
      var m = st.muted ? 0 : 1;
      musicG.gain.value = m * st.music * 0.22;
      sfxG.gain.value = m * st.sfx * 0.7;
    } catch (e) { }
  }
  function resume() {
    try {
      if (!ensure()) return;
      if (ctx.state === 'suspended' || ctx.state === 'interrupted') ctx.resume().catch(function () { });
      if (st.wantMusic) startMusic();
    } catch (e) { }
  }
  function suspend() { try { if (ctx && ctx.state === 'running') ctx.suspend().catch(function () { }); } catch (e) { } }

  function tone(f, t0, dur, type, vol, glideTo, dest) {
    try {
      var o = ctx.createOscillator(), g = ctx.createGain();
      o.type = type || 'sine'; o.frequency.setValueAtTime(f, t0);
      if (glideTo) o.frequency.exponentialRampToValueAtTime(glideTo, t0 + dur);
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(vol || 0.3, t0 + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      o.connect(g); g.connect(dest || sfxG); o.start(t0); o.stop(t0 + dur + 0.03);
    } catch (e) { }
  }
  function noise(t0, dur, freq, vol) {
    try {
      var s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
      s.buffer = noiseBuf; f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = 1.2;
      g.gain.setValueAtTime(vol, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      s.connect(f); f.connect(g); g.connect(sfxG); s.start(t0); s.stop(t0 + dur + 0.02);
    } catch (e) { }
  }

  var N = { C4: 261.63, D4: 293.66, E4: 329.63, G4: 392, A4: 440, C5: 523.25, D5: 587.33, E5: 659.25, G5: 783.99, A5: 880, C6: 1046.5 };
  var FX = {
    tap: function (t) { tone(520, t, 0.07, 'triangle', 0.22, 760); },
    back: function (t) { tone(440, t, 0.08, 'triangle', 0.2, 300); },
    pick: function (t) { tone(660, t, 0.09, 'square', 0.1, 880); },
    correct: function (t) { [N.C5, N.E5, N.G5, N.C6].forEach(function (f, i) { tone(f, t + i * 0.085, 0.22, 'triangle', 0.3); }); },
    wrong: function (t) { tone(220, t, 0.28, 'sawtooth', 0.14, 110); tone(165, t + 0.05, 0.3, 'square', 0.08, 80); },
    expired: function (t) { tone(330, t, 0.18, 'triangle', 0.2, 250); tone(250, t + 0.16, 0.3, 'triangle', 0.2, 160); },
    tick: function (t) { tone(1200, t, 0.04, 'square', 0.08); },
    warn: function (t) { tone(880, t, 0.09, 'square', 0.12); tone(880, t + 0.12, 0.09, 'square', 0.12); },
    roundEnd: function (t) { tone(N.G4, t, 0.14, 'triangle', 0.25); tone(N.C5, t + 0.12, 0.26, 'triangle', 0.25); },
    win: function (t) { [N.C5, N.E5, N.G5, N.C6, N.G5, N.C6].forEach(function (f, i) { tone(f, t + i * 0.11, 0.3, 'triangle', 0.28); }); },
    lose: function (t) { [N.G4, N.E4, N.D4, N.C4].forEach(function (f, i) { tone(f, t + i * 0.16, 0.34, 'triangle', 0.24); }); },
    join: function (t) { tone(N.E5, t, 0.1, 'sine', 0.22); tone(N.A5, t + 0.09, 0.14, 'sine', 0.22); },
    leave: function (t) { tone(N.A4, t, 0.1, 'sine', 0.2); tone(N.E4, t + 0.09, 0.14, 'sine', 0.2); },
    undo: function (t) { tone(600, t, 0.12, 'triangle', 0.2, 300); },
    clear: function (t) { noise(t, 0.25, 1800, 0.35); },
    react: function (t) { tone(N.G5, t, 0.08, 'sine', 0.2); tone(N.C6, t + 0.06, 0.1, 'sine', 0.2); }
  };
  function play(name) {
    if (st.muted || st.sfx <= 0) return;
    try {
      if (!ensure()) return;
      if (ctx.state !== 'running') { ctx.resume().catch(function () { }); }
      var f = FX[name]; if (f) f(ctx.currentTime + 0.01);
    } catch (e) { }
  }

  // continuous pencil scratch while drawing (very quiet)
  function drawStart() {
    if (st.muted || st.sfx <= 0) return;
    try {
      if (!ensure() || drawNode) return;
      var s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
      s.buffer = noiseBuf; s.loop = true; f.type = 'bandpass'; f.frequency.value = 2400; f.Q.value = 0.8; g.gain.value = 0.0001;
      g.gain.exponentialRampToValueAtTime(0.06, ctx.currentTime + 0.05);
      s.connect(f); f.connect(g); g.connect(sfxG); s.start();
      drawNode = { s: s, g: g };
    } catch (e) { drawNode = null; }
  }
  function drawStop() {
    try {
      if (!drawNode) return;
      var n = drawNode; drawNode = null;
      n.g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.06);
      n.s.stop(ctx.currentTime + 0.08);
    } catch (e) { drawNode = null; }
  }

  // gentle looping chiptune-ish music (pentatonic, 8-step bass + arp)
  var BASS = [130.81, 130.81, 196, 196, 220, 220, 174.61, 196];
  var ARP = [N.C5, N.E5, N.G5, N.E5, N.A5, N.G5, N.E5, N.D5, N.C5, N.E5, N.G5, N.C6, N.A5, N.G5, N.E5, N.G5];
  function sched() {
    if (!st.ready || !st.wantMusic) return;
    try {
      while (nextT < ctx.currentTime + 0.4) {
        var i = step % 16;
        if (i % 2 === 0) tone(BASS[(i / 2) % 8], nextT, 0.34, 'triangle', 0.5, null, musicG);
        tone(ARP[i], nextT, 0.16, 'sine', 0.32, null, musicG);
        nextT += 0.19; step++;
      }
    } catch (e) { }
  }
  function startMusic() {
    st.wantMusic = true;
    try {
      if (!ensure()) return;
      if (timer) return;
      nextT = ctx.currentTime + 0.1; step = 0;
      timer = setInterval(sched, 120);
    } catch (e) { }
  }
  function stopMusic() { st.wantMusic = false; if (timer) { clearInterval(timer); timer = null; } }

  function set(o) {
    if (o.music != null) st.music = o.music;
    if (o.sfx != null) st.sfx = o.sfx;
    if (o.muted != null) st.muted = !!o.muted;
    apply();
  }

  // recover from interruptions (call/phone lock/tab switch)
  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', function () { if (document.hidden) suspend(); else resume(); });
  }

  root.AUDIO = { resume: resume, play: play, set: set, startMusic: startMusic, stopMusic: stopMusic, drawStart: drawStart, drawStop: drawStop, state: function () { return ctx ? ctx.state : 'none'; } };
})(typeof self !== 'undefined' ? self : this);
