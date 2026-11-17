/* CHALLENGE CARAVAN — Mini-game 3: EXPEDITION SNAP (observation / precision) */
(function () {
  'use strict';
  var CC = window.CC, clamp = CC.clamp, TAU = Math.PI * 2;

  /* ---- discovery catalogue: draw(c, s, v) centred on 0,0; v=1 → look-alike decoy ---- */
  var ITEMS = [
    { id: 'idol', name: 'Golden Idol', ny: [0.55, 0.78], draw: function (c, s, v) { var g = v ? '#b8c4cc' : '#ffc43a', d = v ? '#4a5560' : '#8a3d00'; c.fillStyle = g; c.strokeStyle = d; c.lineWidth = s * 0.07; c.beginPath(); c.moveTo(-s * .3, s * .5); c.lineTo(-s * .22, -s * .05); c.lineTo(s * .22, -s * .05); c.lineTo(s * .3, s * .5); c.closePath(); c.fill(); c.stroke(); c.beginPath(); c.arc(0, -s * .22, s * .24, 0, TAU); c.fill(); c.stroke(); c.fillStyle = d; c.fillRect(-s * .12, -s * .27, s * .08, s * .08); c.fillRect(s * .04, -s * .27, s * .08, s * .08); if (!v) { c.fillStyle = '#d6342a'; c.fillRect(-s * .2, -s * .52, s * .4, s * .1); } } },
    { id: 'parrot', name: 'Red Parrot', ny: [0.3, 0.55], draw: function (c, s, v) { var b = v ? '#2fa05a' : '#e53b30', w = v ? '#ffd34d' : '#1f7ac9'; c.strokeStyle = '#3a1d06'; c.lineWidth = s * 0.06; c.fillStyle = w; c.beginPath(); c.moveTo(-s * .1, s * .1); c.lineTo(-s * .45, s * .55); c.lineTo(-s * .05, s * .4); c.closePath(); c.fill(); c.stroke(); c.fillStyle = b; c.beginPath(); c.ellipse(0, 0, s * .28, s * .38, 0, 0, TAU); c.fill(); c.stroke(); c.fillStyle = w; c.beginPath(); c.ellipse(-s * .12, s * .05, s * .12, s * .22, .3, 0, TAU); c.fill(); c.stroke(); c.fillStyle = b; c.beginPath(); c.arc(s * .05, -s * .36, s * .2, 0, TAU); c.fill(); c.stroke(); c.fillStyle = '#ffc43a'; c.beginPath(); c.moveTo(s * .2, -s * .4); c.lineTo(s * .45, -s * .3); c.lineTo(s * .2, -s * .24); c.closePath(); c.fill(); c.stroke(); c.fillStyle = '#fff'; c.beginPath(); c.arc(s * .08, -s * .4, s * .06, 0, TAU); c.fill(); c.fillStyle = '#111'; c.beginPath(); c.arc(s * .09, -s * .4, s * .03, 0, TAU); c.fill(); } },
    { id: 'compass', name: 'Lost Compass', ny: [0.7, 0.9], draw: function (c, s, v) { c.strokeStyle = v ? '#4a5560' : '#8a3d00'; c.lineWidth = s * .09; c.fillStyle = v ? '#b8c4cc' : '#ffc43a'; c.beginPath(); c.arc(0, 0, s * .42, 0, TAU); c.fill(); c.stroke(); c.fillStyle = '#fff6dc'; c.beginPath(); c.arc(0, 0, s * .3, 0, TAU); c.fill(); c.fillStyle = v ? '#2f6a8a' : '#d6342a'; c.beginPath(); c.moveTo(0, -s * .26); c.lineTo(s * .08, 0); c.lineTo(-s * .08, 0); c.closePath(); c.fill(); c.fillStyle = '#333'; c.beginPath(); c.moveTo(0, s * .26); c.lineTo(s * .08, 0); c.lineTo(-s * .08, 0); c.closePath(); c.fill(); } },
    { id: 'lantern', name: 'Paper Lantern', ny: [0.38, 0.6], draw: function (c, s, v) { c.strokeStyle = '#3a1d06'; c.lineWidth = s * .06; c.fillStyle = '#ffc43a'; c.fillRect(-s * .12, -s * .5, s * .24, s * .08); c.strokeRect(-s * .12, -s * .5, s * .24, s * .08); c.fillStyle = v ? '#1f7ac9' : '#e53b30'; c.beginPath(); c.ellipse(0, -s * .05, s * .3, s * .38, 0, 0, TAU); c.fill(); c.stroke(); c.strokeStyle = 'rgba(255,255,255,.55)'; c.beginPath(); c.moveTo(0, -s * .42); c.lineTo(0, s * .32); c.moveTo(-s * .17, -s * .38); c.quadraticCurveTo(-s * .24, -s * .05, -s * .17, s * .28); c.moveTo(s * .17, -s * .38); c.quadraticCurveTo(s * .24, -s * .05, s * .17, s * .28); c.stroke(); c.fillStyle = '#ffc43a'; c.fillRect(-s * .12, s * .32, s * .24, s * .08); c.strokeStyle = '#3a1d06'; c.strokeRect(-s * .12, s * .32, s * .24, s * .08); c.beginPath(); c.moveTo(0, s * .4); c.lineTo(0, s * .55); c.stroke(); } },
    { id: 'turtle', name: 'Sea Turtle', ny: [0.5, 0.64], draw: function (c, s, v) { var sh = v ? '#b86a3a' : '#2fa05a'; c.strokeStyle = '#0f4a24'; c.lineWidth = s * .06; c.fillStyle = v ? '#d99a6a' : '#7ae582'; [[-.3, -.3], [.3, -.3], [-.3, .3], [.3, .3]].forEach(function (p) { c.beginPath(); c.ellipse(p[0] * s, p[1] * s, s * .17, s * .1, p[0] * p[1] * 3, 0, TAU); c.fill(); c.stroke(); }); c.beginPath(); c.arc(s * .4, 0, s * .15, 0, TAU); c.fill(); c.stroke(); c.fillStyle = sh; c.beginPath(); c.ellipse(0, 0, s * .36, s * .3, 0, 0, TAU); c.fill(); c.stroke(); c.strokeStyle = 'rgba(0,0,0,.35)'; c.beginPath(); c.moveTo(-s * .2, 0); c.lineTo(s * .2, 0); c.moveTo(0, -s * .22); c.lineTo(0, s * .22); c.stroke(); } },
    { id: 'key', name: 'Bronze Key', ny: [0.7, 0.9], draw: function (c, s, v) { c.strokeStyle = '#3a1d06'; c.lineWidth = s * .06; c.fillStyle = v ? '#b8c4cc' : '#d9923a'; c.beginPath(); c.arc(-s * .26, 0, s * .2, 0, TAU); c.fill(); c.stroke(); c.fillStyle = 'rgba(255,255,255,.0)'; c.fillStyle = '#4a3a22'; c.beginPath(); c.arc(-s * .26, 0, s * .08, 0, TAU); c.fill(); c.fillStyle = v ? '#b8c4cc' : '#d9923a'; c.fillRect(-s * .08, -s * .06, s * .5, s * .12); c.strokeRect(-s * .08, -s * .06, s * .5, s * .12); c.fillRect(s * .22, s * .06, s * .08, s * .18); c.strokeRect(s * .22, s * .06, s * .08, s * .18); c.fillRect(s * .36, s * .06, s * .08, s * .13); c.strokeRect(s * .36, s * .06, s * .08, s * .13); } },
    { id: 'butterfly', name: 'Blue Butterfly', ny: [0.34, 0.7], draw: function (c, s, v) { var w1 = v ? '#ff9a3c' : '#3ca8ff', w2 = v ? '#ffd34d' : '#9ad8ff'; c.strokeStyle = '#102a4a'; c.lineWidth = s * .05; [-1, 1].forEach(function (k) { c.fillStyle = w1; c.beginPath(); c.ellipse(k * s * .26, -s * .14, s * .24, s * .3, k * .5, 0, TAU); c.fill(); c.stroke(); c.fillStyle = w2; c.beginPath(); c.ellipse(k * s * .2, s * .2, s * .17, s * .2, -k * .4, 0, TAU); c.fill(); c.stroke(); c.fillStyle = '#fff'; c.beginPath(); c.arc(k * s * .3, -s * .18, s * .06, 0, TAU); c.fill(); }); c.fillStyle = '#102a4a'; c.beginPath(); c.ellipse(0, 0, s * .06, s * .3, 0, 0, TAU); c.fill(); c.beginPath(); c.moveTo(0, -s * .28); c.lineTo(-s * .12, -s * .48); c.moveTo(0, -s * .28); c.lineTo(s * .12, -s * .48); c.stroke(); } },
    { id: 'glyph', name: 'Sun Glyph', ny: [0.45, 0.7], draw: function (c, s, v) { c.strokeStyle = '#3a2a10'; c.lineWidth = s * .07; c.fillStyle = v ? '#8a8f94' : '#b9ab88'; c.beginPath(); c.arc(0, 0, s * .42, 0, TAU); c.fill(); c.stroke(); c.strokeStyle = v ? '#3a4650' : '#6a4a10'; c.lineWidth = s * .07; c.beginPath(); c.arc(0, 0, s * .15, 0, TAU); c.stroke(); for (var i = 0; i < 8; i++) { var a = i * TAU / 8; c.beginPath(); c.moveTo(Math.cos(a) * s * .22, Math.sin(a) * s * .22); c.lineTo(Math.cos(a) * (v ? s * .3 : s * .34), Math.sin(a) * (v ? s * .3 : s * .34)); c.stroke(); } } },
    { id: 'shell', name: 'Spiral Shell', ny: [0.58, 0.82], draw: function (c, s, v) { c.strokeStyle = '#7a4a22'; c.lineWidth = s * .06; c.fillStyle = v ? '#c9d4dc' : '#ffe9c2'; c.beginPath(); c.moveTo(-s * .38, s * .22); c.quadraticCurveTo(-s * .45, -s * .35, s * .05, -s * .4); c.quadraticCurveTo(s * .45, -s * .35, s * .38, s * .1); c.quadraticCurveTo(s * .3, s * .38, -s * .1, s * .34); c.closePath(); c.fill(); c.stroke(); c.beginPath(); c.moveTo(s * .18, -s * .06); c.quadraticCurveTo(s * .02, -s * .24, -s * .12, -s * .06); c.quadraticCurveTo(-s * .14, s * .14, s * .08, s * .14); c.stroke(); c.fillStyle = v ? '#8aa0b0' : '#ff9a8a'; c.beginPath(); c.ellipse(-s * .3, s * .22, s * .1, s * .06, 0, 0, TAU); c.fill(); } }
  ];
  CC.SNAP_ITEMS = ITEMS;

  function Snap(host, o) { this.host = host; this.o = o; this.diff = o.diff; this.needsCountdown = false; this.touch = false; }
  var P = Snap.prototype;
  P.setTouch = function (t) { this.touch = t; };

  P.init = function () {
    var d = this.diff, seed = (Date.now() ^ (this.o.destId * 15485863)) >>> 0;
    this.seed = seed;
    var rnd = CC.rng(seed ^ 0x9e3779b9);
    var count = [0, 4, 5, 6][d];
    var pool = ITEMS.slice().sort(function () { return rnd() - 0.5; }).slice(0, count);
    this.targets = pool.map(function (it) { return { item: it, nx: 0, ny: 0, found: false, perfect: false }; });
    this.decoys = [];
    var nd = [0, 0, 3, 5][d];
    for (var i = 0; i < nd; i++) this.decoys.push({ item: pool[Math.floor(rnd() * pool.length)], nx: 0, ny: 0 });
    this.place(rnd);
    this.shots = 0; this.misses = 0; this.perfects = 0; this.found = 0; this.hints = 0; this.maxHints = d === 1 ? 3 : 2;
    this.film = count + 3; this.timeMax = [0, 120, 110, 100][d]; this.timeLeft = this.timeMax; this.score = 0;
    this.rxN = 0.5; this.ryN = 0.55; this.hintT = 0; this.hintPos = null; this.flash = 0; this.rings = []; this.marks = []; this.done = false; this.lastSec = -1; this.t = 0; this.shake = 0;
    this.buildList();
    var self = this;
    this._btnSnap = document.getElementById('snap-btn'); this._btnHint = document.getElementById('snap-hint');
    this._snapFn = function () { if (CC.Game.running && !self.done) self.snapAt(self.rxN * self.w, self.ryN * self.h); };
    this._hintFn = function () { self.useHint(); };
    this._btnSnap.addEventListener('click', this._snapFn); this._btnHint.addEventListener('click', this._hintFn);
    this.updateHintBtn();
    this.host.hud({ score: 0, aux: this.fmtTime(), lbl1: 'Score', lbl2: 'Time', obj: this.objective() });
  };
  P.place = function (rnd) {
    var all = this.targets.concat(this.decoys), placed = [], minD = 0.17;
    all.forEach(function (o) {
      var tries = 0, ok = false, ax = 0.5, ay = 0.5;
      while (tries++ < 120 && !ok) {
        ax = 0.09 + rnd() * 0.82; ay = o.item.ny[0] + rnd() * (o.item.ny[1] - o.item.ny[0]);
        ay = clamp(ay, 0.3, 0.9);
        ok = placed.every(function (p) { var dx = (p[0] - ax), dy = (p[1] - ay) * 0.75; return Math.sqrt(dx * dx + dy * dy) > minD * (tries > 80 ? 0.6 : 1); });
      }
      o.nx = ax; o.ny = ay; placed.push([ax, ay]);
    });
  };
  P.buildList = function () {
    var ul = document.getElementById('snap-list'); ul.innerHTML = '';
    this.targets.forEach(function (t, i) {
      var li = document.createElement('li'); li.dataset.i = i;
      var cv = document.createElement('canvas'); cv.width = 56; cv.height = 56; cv.className = 'snap-ico'; cv.setAttribute('aria-hidden', 'true');
      var c = cv.getContext('2d'); c.translate(28, 28); try { t.item.draw(c, 44, 0); } catch (e) { /* ignore */ }
      var sp = document.createElement('span'); sp.textContent = t.item.name;
      var ck = document.createElement('i'); ck.className = 'ico ico-check'; ck.setAttribute('aria-hidden', 'true');
      li.appendChild(cv); li.appendChild(sp); li.appendChild(ck); ul.appendChild(li);
    });
    this.listEl = ul;
  };
  P.markFound = function (i) {
    var li = this.listEl && this.listEl.children[i]; if (!li) return;
    li.classList.add('found'); li.setAttribute('aria-label', this.targets[i].item.name + ', found');
  };
  P.fmtTime = function () { var s = Math.max(0, Math.ceil(this.timeLeft)); return Math.floor(s / 60) + ':' + ('0' + (s % 60)).slice(-2); };
  P.objective = function () { return 'Found ' + this.found + ' / ' + this.targets.length + ' · Film ' + Math.max(0, this.film - this.shots); };
  P.updateHintBtn = function () {
    var left = this.maxHints - this.hints;
    this._btnHint.querySelector('span').textContent = 'HINT (' + left + ')';
    this._btnHint.disabled = left <= 0;
  };

  /* ---- geometry ---- */
  P.R = function () { return clamp(Math.min(this.w, this.h) * 0.105, 40, 86); };
  P.S = function () { return clamp(Math.min(this.w, this.h) * 0.078 * (1 - 0.1 * (this.diff - 1)), 34, 66); };
  P.resize = function (w, h) { this.w = w; this.h = h; this.bg = null; this.fg = null; };

  /* ---- input ---- */
  P.onKey = function (type, e) {
    if (type !== 'down') return;
    var ae = document.activeElement;
    if (ae && ae.closest && ae.closest('.btn') && (e.key === ' ' || e.key === 'Enter')) return; // the focused button handles it
    if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) this._snapFn();
    else if ((e.key === 'h' || e.key === 'H') && !e.repeat) this.useHint();
  };
  P.pt = function (e) { var r = document.getElementById('play').getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
  P.onPointer = function (type, e) {
    var p = this.pt(e);
    if (type === 'down') { this.pd = { x: p[0], y: p[1], t: performance.now(), moved: 0 }; this.rxN = clamp(p[0] / this.w, 0, 1); this.ryN = clamp(p[1] / this.h, 0, 1); }
    else if (type === 'move') {
      if (e.pointerType === 'mouse' || this.pd) { this.rxN = clamp(p[0] / this.w, 0, 1); this.ryN = clamp(p[1] / this.h, 0, 1); }
      if (this.pd) this.pd.moved = Math.max(this.pd.moved, Math.hypot(p[0] - this.pd.x, p[1] - this.pd.y));
    } else if (type === 'up') {
      var s = this.pd; this.pd = null;
      if (s && s.moved < 14 && performance.now() - s.t < 420) { this.rxN = clamp(p[0] / this.w, 0, 1); this.ryN = clamp(p[1] / this.h, 0, 1); this.snapAt(p[0], p[1]); }
    } else this.pd = null;
  };

  /* ---- actions ---- */
  P.snapAt = function (x, y) {
    if (this.done || this.shots >= this.film) return;
    this.shots++;
    var R = this.R(), self = this, hit = null, best = 1e9;
    this.targets.forEach(function (t, i) {
      if (t.found) return;
      var dx = t.nx * self.w - x, dy = t.ny * self.h - y, d = Math.hypot(dx, dy);
      if (d <= R * 0.85 && d < best) { best = d; hit = i; }
    });
    CC.Audio.sfx('shutter');
    if (!CC.UI.reducedMotion()) this.flash = 1;
    var shotCount = this.shots;
    if (hit !== null) {
      var t = this.targets[hit], perfect = best <= R * 0.38;
      t.found = true; t.perfect = perfect; this.found++; if (perfect) this.perfects++;
      var pts = 100 + (perfect ? 50 : 0); this.score += pts;
      this.rings.push({ x: t.nx * this.w, y: t.ny * this.h, life: 0.7, max: 0.7, c: perfect ? '#fff3a6' : '#7ae582' });
      this.host.floatText(t.nx * this.w, t.ny * this.h - this.S() * 0.6, perfect ? 'PERFECT! +' + pts : 'Found! +' + pts, perfect ? 'gold' : 'good');
      CC.Audio.sfx(perfect ? 'perfect' : 'found');
      this.markFound(hit);
    } else {
      this.misses++;
      var dec = this.decoys.some(function (d) { return Math.hypot(d.nx * self.w - x, d.ny * self.h - y) <= R * 0.85; });
      this.marks.push({ x: x, y: y, life: 0.8 });
      this.shake = 0.25;
      this.host.floatText(x, y - R * 0.6, dec ? 'Look-alike!' : 'Nothing there', 'bad');
      CC.Audio.sfx('miss');
    }
    this.host.hud({ score: this.score, obj: this.objective() });
    if (this.found === this.targets.length) this.end(true);
    else if (this.shots >= this.film) this.end(false, 'film');
  };
  P.useHint = function () {
    if (this.done || !CC.Game.running || this.hints >= this.maxHints) return;
    var rem = this.targets.filter(function (t) { return !t.found; }); if (!rem.length) return;
    var t = rem[0], R = this.R();
    var a = Math.random() * TAU, off = R * 0.9 * Math.random();
    this.hintPos = { x: t.nx * this.w + Math.cos(a) * off, y: t.ny * this.h + Math.sin(a) * off }; this.hintT = 3.2;
    this.hints++; this.updateHintBtn(); CC.Audio.sfx('found');
    this.host.banner('Look near the glowing ring: ' + t.item.name, 2200);
  };
  P.end = function (all, why) {
    if (this.done) return; this.done = true;
    var n = this.targets.length, acc = this.shots ? this.found / this.shots : 0;
    var success = all || this.found >= Math.ceil(n * 0.6);
    var timeBonus = all ? Math.round(this.timeLeft * 2) : 0, filmBonus = all ? (this.film - this.shots) * 20 : 0;
    this.score = Math.max(0, this.score + timeBonus + filmBonus - this.hints * 40);
    var perf = clamp(0.6 * (this.found / n) + 0.3 * acc + 0.1 * (this.perfects / n) - this.hints * 0.05, 0, 1);
    this.host.hud({ score: this.score });
    if (all) { CC.Audio.sfx('success'); this.host.banner('All discoveries photographed!', 1600, 'good'); }
    else this.host.banner(why === 'film' ? 'Out of film!' : 'Time’s up!', 1400, success ? '' : 'bad');
    this.host.finish({
      success: success, perf: perf, score: this.score, stat2: { label: 'Accuracy', value: Math.round(acc * 100) + '%' },
      flags: { snaps: this.shots, perfects: this.perfects, allOnTarget: all && this.misses === 0 },
      opts: [{ label: 'Every shot on target', done: all && this.misses === 0 }, { label: '2+ perfect shots', done: this.perfects >= 2 }, { label: 'No hints', done: this.hints === 0 }],
      failTitle: 'Film Developed…', failMsg: 'You found ' + this.found + ' of ' + n + '. Find at least ' + Math.ceil(n * 0.6) + ' to continue — try again!', delay: 1100
    });
  };

  /* ---- update ---- */
  P.update = function (dt) {
    if (!this.w || this.done) { this.t += dt; return; }
    this.t += dt;
    var keys = CC.Game.keys, sp = Math.min(this.w, this.h) * 0.9 * dt, dx = 0, dy = 0;
    if (keys.ArrowLeft || keys.a || keys.A) dx -= 1; if (keys.ArrowRight || keys.d || keys.D) dx += 1;
    if (keys.ArrowUp || keys.w || keys.W) dy -= 1; if (keys.ArrowDown || keys.s || keys.S) dy += 1;
    if (dx || dy) { var m = Math.hypot(dx, dy); this.rxN = clamp(this.rxN + dx / m * sp / this.w, 0, 1); this.ryN = clamp(this.ryN + dy / m * sp / this.h, 0, 1); }
    this.timeLeft -= dt;
    var s = Math.ceil(this.timeLeft);
    if (s !== this.lastSec) { this.lastSec = s; this.host.hud({ aux: this.fmtTime() }); if (s <= 10 && s > 0) CC.Audio.sfx('tick'); }
    if (this.timeLeft <= 0) { this.timeLeft = 0; this.end(false, 'time'); }
    if (this.hintT > 0) this.hintT -= dt;
    if (this.flash > 0) this.flash = Math.max(0, this.flash - dt * 5);
    if (this.shake > 0) this.shake = Math.max(0, this.shake - dt);
    for (var i = this.rings.length - 1; i >= 0; i--) { this.rings[i].life -= dt; if (this.rings[i].life <= 0) this.rings.splice(i, 1); }
    for (var j = this.marks.length - 1; j >= 0; j--) { this.marks[j].life -= dt; if (this.marks[j].life <= 0) this.marks.splice(j, 1); }
  };

  /* ---- scene drawing ---- */
  function leaf(c, x, y, len, ang, col1, col2) {
    c.save(); c.translate(x, y); c.rotate(ang);
    var g = c.createLinearGradient(0, 0, len, 0); g.addColorStop(0, col1); g.addColorStop(1, col2); c.fillStyle = g;
    c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(len * 0.45, -len * 0.28, len, 0); c.quadraticCurveTo(len * 0.45, len * 0.28, 0, 0); c.fill();
    c.strokeStyle = 'rgba(0,60,20,.35)'; c.lineWidth = Math.max(1, len * 0.03); c.beginPath(); c.moveTo(0, 0); c.lineTo(len * 0.95, 0); c.stroke(); c.restore();
  }
  function palm(c, x, y, h, lean) {
    c.strokeStyle = '#7a4a22'; c.lineWidth = h * 0.07; c.lineCap = 'round'; c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + lean * 0.3, y - h * 0.5, x + lean, y - h); c.stroke();
    c.strokeStyle = 'rgba(0,0,0,.2)'; c.lineWidth = h * 0.02; for (var k = 1; k < 6; k++) { var t = k / 6; c.beginPath(); var px = x + lean * t * t + lean * 0.3 * t * (1 - t), py = y - h * t; c.moveTo(px - h * 0.035, py); c.lineTo(px + h * 0.035, py); c.stroke(); }
    for (var a = -2; a <= 2; a++) { leaf(c, x + lean, y - h, h * 0.55, -1.57 + a * 0.62 + (lean > 0 ? 0.1 : -0.1), '#1f8a4c', '#58d36f'); }
    c.lineCap = 'butt';
  }
  P.drawBG = function () {
    var w = this.w, h = this.h, dpr = CC.Game.DPR, cv = document.createElement('canvas'); cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
    var c = cv.getContext('2d'); c.scale(dpr, dpr);
    var rnd = CC.rng(this.seed), hy = h * 0.4;
    var sky = c.createLinearGradient(0, 0, 0, hy); sky.addColorStop(0, '#4cb8f2'); sky.addColorStop(1, '#c8f0ff'); c.fillStyle = sky; c.fillRect(0, 0, w, hy + 2);
    c.fillStyle = 'rgba(255,240,170,.9)'; c.beginPath(); c.arc(w * 0.82, hy * 0.38, Math.min(w, h) * 0.07, 0, TAU); c.fill();
    c.fillStyle = 'rgba(255,255,255,.9)'; for (var i = 0; i < 5; i++) { var cx = rnd() * w, cy = hy * (0.12 + rnd() * 0.5), cr = Math.min(w, h) * (0.04 + rnd() * 0.04); for (var k = 0; k < 4; k++) { c.beginPath(); c.arc(cx + k * cr * 0.9, cy + (k % 2) * cr * 0.2, cr * (k === 1 ? 1.2 : 0.9), 0, TAU); c.fill(); } }
    // mountains
    [['#79b7a0', 0.16, 0.012], ['#4f9d7c', 0.1, 0.02]].forEach(function (m, li) {
      c.fillStyle = m[0]; c.beginPath(); c.moveTo(0, hy + 2);
      for (var x = 0; x <= w + 20; x += Math.max(10, w / 28)) c.lineTo(x, hy - h * m[1] * (0.35 + 0.65 * Math.abs(Math.sin(x * m[2] + li * 2 + (rnd() * 0.2)))));
      c.lineTo(w, hy + 2); c.closePath(); c.fill();
    });
    // sea
    var sea = c.createLinearGradient(0, hy, 0, hy + h * 0.13); sea.addColorStop(0, '#2ab5e0'); sea.addColorStop(1, '#0f86c0'); c.fillStyle = sea; c.fillRect(0, hy, w, h * 0.13);
    c.strokeStyle = 'rgba(255,255,255,.5)'; c.lineWidth = 2; for (i = 0; i < 12; i++) { var sx = rnd() * w, sy = hy + 6 + rnd() * h * 0.11; c.beginPath(); c.moveTo(sx, sy); c.lineTo(sx + 12 + rnd() * 24, sy); c.stroke(); }
    c.fillStyle = '#2f8f6a'; for (i = 0; i < 3; i++) { var ix = w * (0.1 + 0.28 * i + rnd() * 0.1); c.beginPath(); c.ellipse(ix, hy + 4, w * 0.05, h * 0.016, 0, Math.PI, 0); c.fill(); }
    // ground
    var gr = c.createLinearGradient(0, hy + h * 0.08, 0, h); gr.addColorStop(0, '#46c274'); gr.addColorStop(1, '#1f8a4c'); c.fillStyle = gr;
    c.beginPath(); c.moveTo(0, hy + h * 0.1); c.quadraticCurveTo(w * 0.3, hy + h * 0.04, w * 0.6, hy + h * 0.1); c.quadraticCurveTo(w * 0.85, hy + h * 0.14, w, hy + h * 0.08); c.lineTo(w, h); c.lineTo(0, h); c.closePath(); c.fill();
    // cliff + waterfall + ruins (right)
    var cg = c.createLinearGradient(w * 0.62, 0, w, 0); cg.addColorStop(0, '#b3743c'); cg.addColorStop(1, '#8a5426'); c.fillStyle = cg;
    c.beginPath(); c.moveTo(w * 0.64, h * 0.66); c.lineTo(w * 0.66, h * 0.3); c.lineTo(w * 0.72, h * 0.2); c.lineTo(w * 0.82, h * 0.16); c.lineTo(w * 0.94, h * 0.2); c.lineTo(w, h * 0.26); c.lineTo(w, h * 0.7); c.closePath(); c.fill();
    c.strokeStyle = 'rgba(60,30,10,.35)'; c.lineWidth = 3; for (i = 0; i < 7; i++) { c.beginPath(); var yy = h * (0.25 + i * 0.06); c.moveTo(w * 0.66, yy); c.lineTo(w * (0.7 + rnd() * 0.28), yy + 6); c.stroke(); }
    c.fillStyle = '#2fa05a'; c.beginPath(); c.ellipse(w * 0.82, h * 0.17, w * 0.14, h * 0.035, 0, 0, TAU); c.fill();
    var wf = c.createLinearGradient(0, h * 0.26, 0, h * 0.64); wf.addColorStop(0, 'rgba(255,255,255,.95)'); wf.addColorStop(1, 'rgba(180,235,255,.9)'); c.fillStyle = wf; c.fillRect(w * 0.7, h * 0.26, w * 0.045, h * 0.4);
    c.fillStyle = 'rgba(255,255,255,.7)'; c.beginPath(); c.ellipse(w * 0.722, h * 0.66, w * 0.05, h * 0.03, 0, 0, TAU); c.fill();
    c.fillStyle = '#19b8e6'; c.beginPath(); c.ellipse(w * 0.72, h * 0.69, w * 0.15, h * 0.05, 0, 0, TAU); c.fill(); c.strokeStyle = 'rgba(255,255,255,.7)'; c.lineWidth = 2; c.stroke();
    // ruin arch
    var ax = w * 0.87, ay = h * 0.34, aw = Math.min(w, h) * 0.2;
    c.fillStyle = '#a9a28a'; c.strokeStyle = '#4a4636'; c.lineWidth = 3;
    c.fillRect(ax - aw * 0.55, ay - aw * 0.1, aw * 1.1, aw * 0.95); c.strokeRect(ax - aw * 0.55, ay - aw * 0.1, aw * 1.1, aw * 0.95);
    var dg = c.createRadialGradient(ax, ay + aw * 0.35, 4, ax, ay + aw * 0.35, aw * 0.5); dg.addColorStop(0, '#fff2a8'); dg.addColorStop(1, '#ff8a1f'); c.fillStyle = dg;
    c.beginPath(); c.moveTo(ax - aw * 0.25, ay + aw * 0.85); c.lineTo(ax - aw * 0.25, ay + aw * 0.3); c.arc(ax, ay + aw * 0.3, aw * 0.25, Math.PI, 0); c.lineTo(ax + aw * 0.25, ay + aw * 0.85); c.closePath(); c.fill(); c.stroke();
    c.strokeStyle = 'rgba(70,60,40,.5)'; c.lineWidth = 2; for (i = 1; i < 5; i++) { c.beginPath(); c.moveTo(ax - aw * 0.55, ay + aw * 0.2 * i - aw * 0.1); c.lineTo(ax - aw * 0.27, ay + aw * 0.2 * i - aw * 0.1); c.moveTo(ax + aw * 0.27, ay + aw * 0.2 * i - aw * 0.1); c.lineTo(ax + aw * 0.55, ay + aw * 0.2 * i - aw * 0.1); c.stroke(); }
    // steps
    for (i = 0; i < 4; i++) { c.fillStyle = i % 2 ? '#bdb59a' : '#aaa288'; c.strokeStyle = '#4a4636'; c.lineWidth = 2; var sw = aw * (1.6 - i * 0.18), sy2 = ay + aw * 0.85 + i * aw * 0.12; c.fillRect(ax - sw / 2, sy2, sw, aw * 0.12); c.strokeRect(ax - sw / 2, sy2, sw, aw * 0.12); }
    // path
    c.fillStyle = '#ecd69c'; c.beginPath(); c.moveTo(w * 0.34, h); c.quadraticCurveTo(w * 0.4, h * 0.72, w * 0.62, h * 0.6); c.quadraticCurveTo(w * 0.7, h * 0.74, w * 0.62, h * 0.8); c.quadraticCurveTo(w * 0.52, h * 0.88, w * 0.62, h); c.closePath(); c.fill();
    // palms & bushes
    var base = Math.min(w, h);
    [[0.08, 0.62, 0.34, 50], [0.22, 0.52, 0.26, -30], [0.47, 0.5, 0.22, 24], [0.56, 0.58, 0.28, -40], [0.95, 0.82, 0.4, -50]].forEach(function (p) { palm(c, w * p[0], h * p[1] + h * 0.1, base * p[2], p[3] * base / 600); });
    var clutter = Math.round(w * h / 9000);
    var tcols = ['#ffd34d', '#ff5a7a', '#fff', '#b57bff', '#ff8a1f', '#46ccff'];
    for (i = 0; i < clutter; i++) {
      var x = rnd() * w, y = hy + h * 0.1 + rnd() * (h * 0.9 - hy), r = base * (0.008 + rnd() * 0.02), kind = rnd();
      if (kind < 0.4) { c.fillStyle = tcols[Math.floor(rnd() * tcols.length)]; c.beginPath(); c.arc(x, y, r * 0.8, 0, TAU); c.fill(); c.fillStyle = '#ffec99'; c.beginPath(); c.arc(x, y, r * 0.35, 0, TAU); c.fill(); }
      else if (kind < 0.7) { c.fillStyle = '#2a9a58'; c.beginPath(); c.ellipse(x, y, r * 2.2, r * 1.3, 0, 0, TAU); c.fill(); c.fillStyle = '#58d36f'; c.beginPath(); c.ellipse(x - r * 0.4, y - r * 0.4, r * 1.2, r * 0.7, 0, 0, TAU); c.fill(); }
      else { c.fillStyle = '#9aa3a8'; c.beginPath(); c.ellipse(x, y, r * 1.6, r * 1.1, 0, 0, TAU); c.fill(); c.fillStyle = '#c4ccd0'; c.beginPath(); c.ellipse(x - r * 0.3, y - r * 0.3, r * 0.8, r * 0.5, 0, 0, TAU); c.fill(); }
    }
    return cv;
  };
  P.drawFG = function () {
    var w = this.w, h = this.h, dpr = CC.Game.DPR, cv = document.createElement('canvas'); cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
    var c = cv.getContext('2d'); c.scale(dpr, dpr);
    var rnd = CC.rng(this.seed ^ 0xabcdef), self = this, S = this.S(), items = this.targets.concat(this.decoys);
    function near(x, y) { return items.some(function (t) { return Math.hypot(t.nx * w - x, t.ny * h - y) < S * 1.5; }); }
    var base = Math.min(w, h), n = Math.round((w + h) / 38);
    for (var i = 0; i < n; i++) {
      var edge = rnd(), x, y, ang;
      if (edge < 0.45) { x = rnd() * w; y = h + base * 0.02; ang = -Math.PI / 2 + (rnd() - 0.5) * 1.6; }
      else if (edge < 0.72) { x = -base * 0.01; y = h * (0.5 + rnd() * 0.5); ang = (rnd() - 0.5) * 1.4; }
      else { x = w + base * 0.01; y = h * (0.5 + rnd() * 0.5); ang = Math.PI + (rnd() - 0.5) * 1.4; }
      var len = base * (0.14 + rnd() * 0.16);
      var ex = x + Math.cos(ang) * len, ey = y + Math.sin(ang) * len;
      if (near(ex, ey) || near((x + ex) / 2, (y + ey) / 2)) continue;
      leaf(c, x, y, len, ang, '#12683a', rnd() < 0.5 ? '#2fb061' : '#1f8a4c');
    }
    return cv;
  };

  /* ---- render ---- */
  P.render = function (c, w, h) {
    this.w = w; this.h = h;
    if (!this.bg) { this.bg = this.drawBG(); this.fg = this.drawFG(); }
    var S = this.S(), R = this.R(), self = this;
    var sx = this.shake > 0 ? Math.sin(this.t * 90) * 3 * this.shake : 0;
    c.save(); c.translate(sx, 0);
    c.drawImage(this.bg, 0, 0, w, h);
    // sparkles on water
    c.fillStyle = '#fff';
    for (var i = 0; i < 8; i++) { var a = 0.5 + 0.5 * Math.sin(this.t * 2 + i * 1.7); if (CC.UI.reducedMotion()) a = 0.6; c.globalAlpha = a * 0.8; var px = (i * 0.137 + 0.05) % 1 * w * 0.6, py = h * 0.42 + (i % 3) * h * 0.035; c.fillRect(px - 2, py - 1, 6, 2); c.fillRect(px, py - 3, 2, 6); }
    c.globalAlpha = 1;
    // decoys then targets
    this.decoys.forEach(function (d) { c.save(); c.translate(d.nx * w, d.ny * h); d.item.draw(c, S * 0.95, 1); c.restore(); });
    this.targets.forEach(function (t) {
      c.save(); c.translate(t.nx * w, t.ny * h); c.fillStyle = 'rgba(0,0,0,.18)'; c.beginPath(); c.ellipse(0, S * 0.42, S * 0.4, S * 0.1, 0, 0, TAU); c.fill(); t.item.draw(c, S, 0); c.restore();
      if (t.found) {
        c.strokeStyle = t.perfect ? '#ffe066' : '#7ae582'; c.lineWidth = 4; c.setLineDash([8, 5]); c.beginPath(); c.arc(t.nx * w, t.ny * h, S * 0.72, 0, TAU); c.stroke(); c.setLineDash([]);
        c.fillStyle = '#2fa05a'; c.strokeStyle = '#fff'; c.lineWidth = 3; c.beginPath(); c.arc(t.nx * w + S * 0.6, t.ny * h - S * 0.6, S * 0.24, 0, TAU); c.fill(); c.stroke();
        c.strokeStyle = '#fff'; c.lineWidth = 3.5; c.beginPath(); c.moveTo(t.nx * w + S * 0.5, t.ny * h - S * 0.6); c.lineTo(t.nx * w + S * 0.58, t.ny * h - S * 0.5); c.lineTo(t.nx * w + S * 0.72, t.ny * h - S * 0.72); c.stroke();
      }
    });
    c.drawImage(this.fg, 0, 0, w, h);
    // hint ring
    if (this.hintT > 0 && this.hintPos) {
      var pr = R * (1.6 + 0.2 * Math.sin(this.t * 6)); c.strokeStyle = 'rgba(255,255,255,.95)'; c.lineWidth = 5; c.setLineDash([12, 8]); c.beginPath(); c.arc(this.hintPos.x, this.hintPos.y, pr, 0, TAU); c.stroke(); c.setLineDash([]);
      c.strokeStyle = '#ff8a1f'; c.lineWidth = 3; c.beginPath(); c.arc(this.hintPos.x, this.hintPos.y, pr + 6, 0, TAU); c.stroke();
    }
    // rings + miss marks
    this.rings.forEach(function (r) { var k = 1 - r.life / r.max; c.globalAlpha = 1 - k; c.strokeStyle = r.c; c.lineWidth = 6; c.beginPath(); c.arc(r.x, r.y, S * (0.5 + k * 1.3), 0, TAU); c.stroke(); });
    c.globalAlpha = 1;
    this.marks.forEach(function (m) { c.globalAlpha = clamp(m.life * 1.6, 0, 1); c.strokeStyle = '#fff'; c.lineWidth = 9; c.lineCap = 'round'; c.beginPath(); c.moveTo(m.x - 14, m.y - 14); c.lineTo(m.x + 14, m.y + 14); c.moveTo(m.x + 14, m.y - 14); c.lineTo(m.x - 14, m.y + 14); c.stroke(); c.strokeStyle = '#d6342a'; c.lineWidth = 5; c.stroke(); c.lineCap = 'butt'; });
    c.globalAlpha = 1;
    // camera frame
    var rx = this.rxN * w, ry = this.ryN * h;
    if (!this.done) {
      c.fillStyle = 'rgba(8,30,60,.28)'; c.beginPath(); c.rect(0, 0, w, h); c.arc(rx, ry, R, 0, TAU, true); c.fill('evenodd');
      c.strokeStyle = '#fff'; c.lineWidth = 4; c.beginPath(); c.arc(rx, ry, R, 0, TAU); c.stroke();
      c.strokeStyle = '#3a1d06'; c.lineWidth = 2; c.beginPath(); c.arc(rx, ry, R + 3, 0, TAU); c.stroke();
      c.strokeStyle = '#ffd34d'; c.lineWidth = 5; var q = R * 0.28;
      [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(function (k) { var x0 = rx + k[0] * R * 0.78, y0 = ry + k[1] * R * 0.78; c.beginPath(); c.moveTo(x0, y0 - k[1] * q); c.lineTo(x0, y0); c.lineTo(x0 - k[0] * q, y0); c.stroke(); });
      c.strokeStyle = 'rgba(255,255,255,.9)'; c.lineWidth = 2.5; c.beginPath(); c.moveTo(rx - R * 0.18, ry); c.lineTo(rx + R * 0.18, ry); c.moveTo(rx, ry - R * 0.18); c.lineTo(rx, ry + R * 0.18); c.stroke();
      c.strokeStyle = 'rgba(255,224,102,.8)'; c.lineWidth = 2; c.setLineDash([4, 5]); c.beginPath(); c.arc(rx, ry, R * 0.38, 0, TAU); c.stroke(); c.setLineDash([]);
    }
    if (this.flash > 0) { c.fillStyle = 'rgba(255,255,255,' + (this.flash * 0.7) + ')'; c.fillRect(0, 0, w, h); }
    c.restore();
  };
  P.destroy = function () {
    if (this._btnSnap && this._snapFn) this._btnSnap.removeEventListener('click', this._snapFn);
    if (this._btnHint && this._hintFn) this._btnHint.removeEventListener('click', this._hintFn);
    var ul = document.getElementById('snap-list'); if (ul) ul.innerHTML = '';
    this.bg = this.fg = null; this.targets = []; this.decoys = [];
  };
  CC.MiniGames.snap = Snap;
})();
