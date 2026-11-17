/* CHALLENGE CARAVAN — Mini-game 1: CARAVAN DASH (speed / reaction / precision) */
(function () {
  'use strict';
  var CC = window.CC, clamp = CC.clamp;
  var THEMES = {
    jungle: { g1: '#39b26a', g2: '#2a9a58', road: '#e2c283', edge: '#8a6a34', crown: ['#1f8a4c', '#4ccf7c'], trunk: '#7a4a22', sky: '#7be3ff' },
    mountain: { g1: '#7aa88a', g2: '#639272', road: '#c8c2b2', edge: '#6b6455', crown: ['#2f6a50', '#58a07c'], trunk: '#5a4630', sky: '#cfe9f5', snow: true },
    dusk: { g1: '#5a49a8', g2: '#463a8e', road: '#d4bff0', edge: '#6a4aa8', crown: ['#7a3fc0', '#c08bff'], trunk: '#3a2a5a', sky: '#b9a0ff' }
  };
  function themeFor(id) { return id === 3 ? THEMES.mountain : id === 7 ? THEMES.dusk : THEMES.jungle; }
  function hash(n) { n = (n ^ 61) ^ (n >>> 16); n = n + (n << 3); n = n ^ (n >>> 4); n = Math.imul(n, 0x27d4eb2d); n = n ^ (n >>> 15); return (n >>> 0) / 4294967296; }

  function Dash(host, o) {
    this.host = host; this.o = o; this.diff = o.diff; this.theme = themeFor(o.destId);
    this.needsCountdown = true;
    this.touch = false;
  }
  var P = Dash.prototype;

  P.init = function () {
    var d = this.diff, rnd = CC.rng((Date.now() ^ (this.o.destId * 7919)) >>> 0);
    this.D = [0, 380, 450, 520][d];
    this.v0 = 4.3 + d * 0.15; this.v1 = 6.4 + d * 0.3;
    this.z = 0; this.lane = 1; this.laneX = 1; this.jumpT = 0; this.jumpDur = 0.62;
    this.lives = 3; this.invuln = 0; this.slow = 0; this.boost = 0;
    this.score = 0; this.combo = 0; this.bestMul = 1; this.maxCombo = 0; this.tokens = 0; this.hits = 0; this.cps = 0;
    this.state = 'run'; this.t = 0; this.parts = []; this.texts = []; this.cpDone = {};
    this.items = []; this.tokensTotal = 0;
    this.checkpoints = [this.D / 3, this.D * 2 / 3];
    this.safeBottom = this.touch ? 96 : 28;
    var z = 15, free = 1, prevWide = false;
    var gapBase = 4.5 - d * 0.35;
    while (z < this.D - 12) {
      var nearCp = this.checkpoints.some(function (c) { return Math.abs(z - c) < 4.5; });
      var p = z / this.D;
      if (nearCp) { z += 3; continue; }
      free = clamp(free + (rnd() < 0.4 ? 0 : rnd() < 0.5 ? -1 : 1), 0, 2);
      var kind, roll = rnd(), wide = false;
      if (d >= 2 && p > 0.2 && !prevWide && roll < 0.1 + d * 0.02) { kind = 'wide'; wide = true; }
      else if (roll < 0.14) kind = 'none';
      else kind = rnd() < 0.55 ? 'rock' : 'log';
      var gap = gapBase + rnd() * 2.2;
      if (wide || prevWide) gap = Math.max(gap, 5.4);
      if (kind === 'wide') {
        this.items.push({ t: 'wide', z: z, lane: -1 });
        for (var k = 0; k < 3; k++) this.items.push({ t: 'tok', z: z - 0.5 + k * 0.5, lane: 1, air: true });
        this.tokensTotal += 3;
      } else if (kind !== 'none') {
        var lanes = [0, 1, 2].filter(function (l) { return l !== free; });
        var blockCount = (d >= 2 && rnd() < 0.35 + d * 0.08) ? 2 : 1;
        if (blockCount === 1) lanes = [lanes[rnd() < 0.5 ? 0 : 1]];
        for (var q = 0; q < lanes.length; q++) {
          var kk = kind;
          if (kind === 'log' && q === 1) kk = 'log';
          this.items.push({ t: kk, z: z, lane: lanes[q], seed: rnd() });
        }
        if (kind === 'log' && rnd() < 0.5) {
          var al = lanes[0];
          for (var a = 0; a < 3; a++) this.items.push({ t: 'tok', z: z - 0.5 + a * 0.5, lane: al, air: true });
          this.tokensTotal += 3;
        }
      }
      // token line in the gap after this row
      var room = gap - 2.4;
      if (room > 0.7) {
        var n = Math.min(6, Math.floor(room / 0.75) + 1), tl = rnd() < 0.7 ? free : Math.floor(rnd() * 3);
        for (var i = 0; i < n; i++) this.items.push({ t: 'tok', z: z + 1.4 + i * 0.75, lane: tl });
        this.tokensTotal += n;
      }
      if (p > 0.12 && rnd() < 0.09 && room > 1) this.items.push({ t: 'boost', z: z + 1.4 + (room > 2 ? 1.5 : 0), lane: clamp(free + (rnd() < 0.5 ? 1 : -1), 0, 2) });
      prevWide = wide;
      z += gap;
    }
    this.items.sort(function (a, b) { return a.z - b.z; });
    this.host.hud({ score: 0, aux: '♥♥♥', lbl1: 'Score', lbl2: 'Lives', obj: this.objective() });
    this.lastHud = '';
  };
  P.setTouch = function (t) { this.touch = t; this.safeBottom = t ? 96 : 28; };
  P.objective = function () {
    var pct = Math.min(100, Math.round(this.z / this.D * 100));
    return 'Reach the flag ' + pct + '%' + (this.combo >= 5 ? ' · Combo x' + this.mul() : '');
  };
  P.mul = function () { return Math.min(4, 1 + Math.floor(this.combo / 5)); };
  P.speed = function () {
    var p = clamp(this.z / this.D, 0, 1), v = this.v0 + (this.v1 - this.v0) * p;
    var m = 1;
    if (this.boost > 0) m *= 1.45;
    if (this.slow > 0) m *= 1 - 0.45 * clamp(this.slow / 0.9, 0, 1);
    return v * m;
  };
  P.resize = function (w, h) { this.w = w; this.h = h; };

  /* ---- input ---- */
  P.move = function (d) {
    if (this.state !== 'run') return;
    var nl = clamp(this.lane + d, 0, 2);
    if (nl !== this.lane) { this.lane = nl; CC.Audio.sfx('click'); }
  };
  P.jump = function () {
    if (this.state !== 'run' || this.jumpT > 0) return;
    this.jumpT = this.jumpDur; CC.Audio.sfx('jump');
  };
  P.onKey = function (type, e) {
    if (type !== 'down' || e.repeat) return;
    var k = e.key;
    if (k === 'ArrowLeft' || k === 'a' || k === 'A') this.move(-1);
    else if (k === 'ArrowRight' || k === 'd' || k === 'D') this.move(1);
    else if (k === 'ArrowUp' || k === 'w' || k === 'W' || k === ' ' || k === 'Spacebar') this.jump();
  };
  P.onAction = function (a) { if (a === 'left') this.move(-1); else if (a === 'right') this.move(1); else if (a === 'jump') this.jump(); };
  P.onPointer = function (type, e) {
    if (type === 'down') { this.pd = { x: e.clientX, y: e.clientY, t: performance.now(), ox: e.clientX, oy: e.clientY, moved: false }; return; }
    var s = this.pd; if (!s) return;
    if (type === 'move') {
      var dx = e.clientX - s.ox, dy = e.clientY - s.oy;
      if (Math.abs(dx) > 34 && Math.abs(dx) > Math.abs(dy)) { this.move(dx > 0 ? 1 : -1); s.ox = e.clientX; s.oy = e.clientY; s.moved = true; }
      else if (dy < -42 && Math.abs(dy) > Math.abs(dx)) { this.jump(); s.ox = e.clientX; s.oy = e.clientY; s.moved = true; }
    } else if (type === 'up') {
      if (!s.moved && performance.now() - s.t < 300 && Math.abs(e.clientX - s.x) < 12 && Math.abs(e.clientY - s.y) < 12) {
        var r = e.currentTarget ? e.currentTarget.getBoundingClientRect() : { left: 0, width: this.w };
        var rel = (e.clientX - r.left) / (r.width || this.w);
        if (rel < 0.38) this.move(-1); else if (rel > 0.62) this.move(1); else this.jump();
      }
      this.pd = null;
    } else this.pd = null;
  };

  /* ---- update ---- */
  P.burst = function (x, y, col, n, spd) {
    if (CC.UI.reducedMotion()) n = Math.ceil(n / 3);
    for (var i = 0; i < n && this.parts.length < 80; i++) {
      var a = Math.random() * 6.283, s = (0.4 + Math.random()) * (spd || 90);
      this.parts.push({ x: x, y: y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 30, life: 0.5 + Math.random() * 0.4, c: col, r: 2 + Math.random() * 3 });
    }
  };
  P.addText = function (x, y, txt, col) { if (this.texts.length < 8) this.texts.push({ x: x, y: y, t: txt, life: 0.9, c: col || '#fff' }); };
  P.layout = function () {
    var w = this.w, h = this.h;
    this.laneW = clamp(Math.min(w * 0.27, h * 0.3), 44, 170);
    this.cx = w / 2;
    this.py = h - this.safeBottom - this.laneW * 0.62;
    this.ppu = Math.max(20, this.py / 8.6);
  };
  P.screenY = function (z) { return this.py - (z - this.z) * this.ppu; };
  P.laneScreenX = function (l) { return this.cx + (l - 1) * this.laneW; };

  P.update = function (dt) {
    if (!this.w) return;
    this.layout();
    this.t += dt;
    var run = this.state === 'run';
    if (this.jumpT > 0) this.jumpT = Math.max(0, this.jumpT - dt);
    if (this.invuln > 0) this.invuln -= dt;
    if (this.slow > 0) this.slow -= dt;
    if (this.boost > 0) { this.boost -= dt; if (this.boost <= 0) this.host.banner('Boost over', 700); }
    this.laneX += (this.lane - this.laneX) * Math.min(1, dt * 16);
    if (run) this.z += this.speed() * dt;
    else if (this.state === 'done') this.z += 4 * dt;

    if (run) {
      var air = this.jumpT > 0.06 && this.jumpT < this.jumpDur - 0.06;
      for (var i = 0; i < this.items.length; i++) {
        var it = this.items[i];
        if (it.gone) continue;
        var dz = it.z - this.z;
        if (dz > 1.2) break;
        if (dz < -1.2) continue;
        if (it.t === 'tok') {
          if (it.lane === this.lane && Math.abs(dz) < 0.55 && (!it.air || air)) {
            it.gone = true; this.tokens++; this.combo++;
            var m = this.mul(); if (m > this.bestMul) { this.bestMul = m; this.host.banner('Combo x' + m + '!', 900, 'good'); }
            this.maxCombo = Math.max(this.maxCombo, this.combo);
            var pts = 10 * m * (this.boost > 0 ? 2 : 1); this.score += pts;
            CC.Audio.sfx('collect', { combo: Math.min(8, this.combo) });
            var sx = this.laneScreenX(it.lane), sy = this.screenY(it.z);
            this.burst(sx, sy, '#ffe58a', 6, 70); this.addText(sx, sy - 14, '+' + pts, '#fff3a6');
          }
        } else if (it.t === 'boost') {
          if (it.lane === this.lane && Math.abs(dz) < 0.6) {
            it.gone = true; this.boost = 3.6; CC.Audio.sfx('boost'); this.host.banner('SUN BOOST!', 1100, 'good');
            this.burst(this.laneScreenX(it.lane), this.screenY(it.z), '#ffb347', 16, 140);
          }
        } else if (it.t === 'rock' || it.t === 'log' || it.t === 'wide') {
          if (it.hit || Math.abs(dz) > 0.62) continue;
          var inLane = it.t === 'wide' || it.lane === this.lane;
          if (!inLane) continue;
          var jumpable = it.t !== 'rock';
          if (jumpable && air) continue;
          if (this.boost > 0) {
            it.gone = true; this.score += 20; CC.Audio.sfx('hit');
            this.burst(this.laneScreenX(it.t === 'wide' ? this.lane : it.lane), this.screenY(it.z), '#b88a52', 14, 160); this.addText(this.laneScreenX(this.lane), this.screenY(it.z) - 12, 'SMASH +20', '#ffd34d');
            continue;
          }
          if (this.invuln > 0) continue;
          it.hit = true; this.hurt(it);
          if (this.state !== 'run') break;
        }
      }
      for (var c = 0; c < this.checkpoints.length; c++) {
        var cz = this.checkpoints[c];
        if (!this.cpDone[c] && this.z >= cz) {
          this.cpDone[c] = true; this.cps++; this.score += 50;
          var heal = this.lives < 3; if (heal) this.lives++;
          this.host.banner('Checkpoint!' + (heal ? ' +1 heart' : ' +50'), 1300, 'good'); CC.Audio.sfx('checkpoint');
        }
      }
      if (this.z >= this.D) this.win();
    }
    // particles / texts
    for (var pI = this.parts.length - 1; pI >= 0; pI--) {
      var p = this.parts[pI]; p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 220 * dt;
      if (p.life <= 0) this.parts.splice(pI, 1);
    }
    for (var tI = this.texts.length - 1; tI >= 0; tI--) { var tx = this.texts[tI]; tx.life -= dt; tx.y -= 36 * dt; if (tx.life <= 0) this.texts.splice(tI, 1); }
    // hud (throttled via string compare)
    var hs = this.score + '|' + this.lives + '|' + Math.floor(this.z / this.D * 100) + '|' + this.mul();
    if (hs !== this.lastHud) {
      this.lastHud = hs;
      var hearts = '';
      for (var hI = 0; hI < 3; hI++) hearts += hI < this.lives ? '♥' : '♡';
      this.host.hud({ score: this.score, aux: hearts, obj: this.objective() });
      var auxEl = document.getElementById('hud-aux'); if (auxEl) auxEl.setAttribute('aria-label', this.lives + ' of 3 lives');
    }
  };
  P.hurt = function () {
    this.lives--; this.hits++; this.combo = 0; this.invuln = 1.5; this.slow = 0.9;
    CC.Audio.sfx('hit'); this.host.shake();
    this.burst(this.laneScreenX(this.lane), this.py, '#c97a3a', 14, 150);
    if (this.lives <= 0) {
      this.state = 'crash';
      this.host.banner('Caravan stuck!', 1200, 'bad');
      var pct = clamp(this.z / this.D, 0, 1);
      this.host.finish({ success: false, perf: pct * 0.4, score: this.score, stat2: { label: 'Distance', value: Math.round(pct * 100) + '%' }, flags: { tokens: this.tokens }, opts: [],
        failTitle: 'Caravan Stuck!', failMsg: 'You got ' + Math.round(pct * 100) + '% of the way. Checkpoints restore a heart — try again!', delay: 1100 });
    } else this.host.banner(this.lives + (this.lives === 1 ? ' heart left' : ' hearts left'), 900, 'bad');
  };
  P.win = function () {
    if (this.state !== 'run') return;
    this.state = 'done';
    this.score += 100 + this.lives * 40;
    var tr = this.tokensTotal ? this.tokens / this.tokensTotal : 1;
    var perf = clamp(0.5 * tr + 0.3 * (this.lives / 3) + 0.2 * Math.min(1, this.maxCombo / 15), 0, 1);
    CC.Audio.sfx('checkpoint');
    this.host.banner('FINISH!', 1500, 'good');
    this.host.hud({ score: this.score });
    this.host.finish({
      success: true, perf: perf, score: this.score, stat2: { label: 'Tokens', value: this.tokens + ' / ' + this.tokensTotal },
      flags: { tokens: this.tokens, noHit: this.hits === 0, combo4: this.bestMul >= 4 },
      opts: [{ label: 'No hearts lost', done: this.hits === 0 }, { label: '80% of tokens', done: tr >= 0.8 }, { label: 'Combo x4', done: this.bestMul >= 4 }]
    });
  };

  /* ---- render ---- */
  P.render = function (c, w, h) {
    this.w = w; this.h = h; this.layout();
    var th = this.theme, lw = this.laneW, cx = this.cx, half = lw * 1.5, ppu = this.ppu;
    // ground
    var g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, th.g2); g.addColorStop(1, th.g1);
    c.fillStyle = g; c.fillRect(0, 0, w, h);
    // grass stripes
    c.fillStyle = 'rgba(255,255,255,.06)';
    var stripeH = ppu * 2.4, off = (this.z * ppu) % (stripeH * 2);
    for (var y = -stripeH * 2 + off; y < h; y += stripeH * 2) { c.fillRect(0, y, w, stripeH); }
    // scenery
    var k0 = Math.floor(this.z / 1.1) - 1, k1 = Math.ceil((this.z + this.py / ppu + 2) / 1.1);
    for (var k = k0; k <= k1; k++) {
      for (var s = 0; s < 2; s++) {
        var hh = hash(k * 2 + s + this.o.destId * 977), side = s ? 1 : -1;
        if (hh < 0.35) continue;
        var dxp = half + lw * (0.45 + hash(k * 5 + s + 11) * 2.8) + lw * 0.2;
        var tx = cx + side * dxp, ty = this.screenY(k * 1.1 + hash(k + s * 31) * 0.6);
        if (tx < -lw || tx > w + lw || ty < -lw || ty > h + lw) continue;
        var sz = lw * (0.42 + hash(k * 3 + s) * 0.4);
        c.fillStyle = 'rgba(0,0,0,.18)'; c.beginPath(); c.ellipse(tx + sz * 0.15, ty + sz * 0.2, sz * 0.62, sz * 0.4, 0, 0, 6.283); c.fill();
        if (th === THEMES.dusk) { c.fillStyle = th.crown[1]; c.beginPath(); c.moveTo(tx, ty - sz * 0.7); c.lineTo(tx + sz * 0.3, ty); c.lineTo(tx, ty + sz * 0.2); c.lineTo(tx - sz * 0.3, ty); c.closePath(); c.fill(); c.fillStyle = th.crown[0]; c.beginPath(); c.moveTo(tx, ty - sz * 0.7); c.lineTo(tx + sz * 0.3, ty); c.lineTo(tx, ty + sz * 0.2); c.closePath(); c.fill(); }
        else {
          c.fillStyle = th.trunk; c.fillRect(tx - sz * 0.07, ty - sz * 0.1, sz * 0.14, sz * 0.4);
          c.fillStyle = th.crown[0]; c.beginPath(); c.arc(tx, ty - sz * 0.25, sz * 0.5, 0, 6.283); c.fill();
          c.fillStyle = th.crown[1]; c.beginPath(); c.arc(tx - sz * 0.12, ty - sz * 0.36, sz * 0.3, 0, 6.283); c.fill();
          if (th.snow) { c.fillStyle = '#fff'; c.beginPath(); c.arc(tx, ty - sz * 0.5, sz * 0.2, 0, 6.283); c.fill(); }
        }
      }
    }
    // road
    c.fillStyle = th.edge; c.fillRect(cx - half - lw * 0.1, 0, half * 2 + lw * 0.2, h);
    c.fillStyle = th.road; c.fillRect(cx - half, 0, half * 2, h);
    c.fillStyle = 'rgba(120,80,30,.12)';
    for (var t = 0; t < 20; t++) { var rx = cx - half + hash(t + 3) * half * 2, ry = (hash(t + 99) * h * 1.4 + this.z * ppu * 0.9) % (h + 40) - 20; c.fillRect(rx, ry, 4 + hash(t) * 6, 3); }
    // lane dashes
    c.fillStyle = 'rgba(90,52,16,.35)';
    var dashL = ppu * 0.7, per = ppu * 1.6, doff = (this.z * ppu) % per;
    for (var yy = -per + doff; yy < h; yy += per) { c.fillRect(cx - lw * 0.5 - 2, yy, 4, dashL); c.fillRect(cx + lw * 0.5 - 2, yy, 4, dashL); }
    // edge posts
    for (var e = Math.floor(this.z / 2) - 1; e < this.z / 2 + this.py / ppu / 2 + 3; e++) {
      var ey = this.screenY(e * 2);
      c.fillStyle = '#5a3410'; c.fillRect(cx - half - lw * 0.14, ey - 6, 8, 12); c.fillRect(cx + half + lw * 0.06, ey - 6, 8, 12);
    }
    // checkpoints + finish line
    var self = this;
    this.checkpoints.forEach(function (cz, i) { var y = self.screenY(cz); if (y > -40 && y < h + 40) self.drawGate(c, y, cx, half, lw, self.cpDone[i] ? '#2fa05a' : '#ffc43a', 'CHECKPOINT'); });
    var fy = this.screenY(this.D);
    if (fy > -60 && fy < h + 60) {
      var sq = lw * 0.25;
      for (var r = 0; r < 2; r++) for (var q = 0; q < Math.ceil(half * 2 / sq); q++) { c.fillStyle = (q + r) % 2 ? '#111' : '#fff'; c.fillRect(cx - half + q * sq, fy - sq + r * sq, sq, sq); }
      this.drawGate(c, fy - sq * 1.6, cx, half, lw, '#d6342a', 'FINISH');
    }
    // items far -> near
    for (var i = this.items.length - 1; i >= 0; i--) {
      var it = this.items[i]; if (it.gone) continue;
      var y2 = this.screenY(it.z); if (y2 < -lw || y2 > h + lw) continue;
      this.drawItem(c, it, y2);
    }
    // player
    this.drawPlayer(c);
    // particles / floating texts
    for (var pI = 0; pI < this.parts.length; pI++) { var p = this.parts[pI]; c.globalAlpha = clamp(p.life * 2, 0, 1); c.fillStyle = p.c; c.beginPath(); c.arc(p.x, p.y, p.r, 0, 6.283); c.fill(); }
    c.globalAlpha = 1;
    c.font = '900 ' + Math.round(clamp(lw * 0.2, 14, 22)) + 'px "Arial Black",Arial,sans-serif'; c.textAlign = 'center';
    for (var tI = 0; tI < this.texts.length; tI++) { var tx2 = this.texts[tI]; c.globalAlpha = clamp(tx2.life * 1.6, 0, 1); c.lineWidth = 4; c.strokeStyle = '#3a1d06'; c.strokeText(tx2.t, tx2.x, tx2.y); c.fillStyle = tx2.c; c.fillText(tx2.t, tx2.x, tx2.y); }
    c.globalAlpha = 1;
    // boost vignette (soft, no flashing)
    if (this.boost > 0) {
      var vg = c.createRadialGradient(cx, this.py, lw, cx, this.py, Math.max(w, h) * 0.8); vg.addColorStop(0, 'rgba(255,170,40,0)'); vg.addColorStop(1, 'rgba(255,140,20,.28)');
      c.fillStyle = vg; c.fillRect(0, 0, w, h);
      if (!CC.UI.reducedMotion()) { c.strokeStyle = 'rgba(255,255,255,.35)'; c.lineWidth = 2; for (var sl = 0; sl < 10; sl++) { var sx = hash(sl + 5) * w, sy = ((this.t * 900 + sl * 137) % (h + 100)) - 50; c.beginPath(); c.moveTo(sx, sy); c.lineTo(sx, sy + 40); c.stroke(); } }
    }
  };
  P.drawGate = function (c, y, cx, half, lw, col, label) {
    c.fillStyle = '#3a1d06'; c.fillRect(cx - half - lw * 0.18, y - lw * 0.5, 8, lw * 0.5); c.fillRect(cx + half + lw * 0.1, y - lw * 0.5, 8, lw * 0.5);
    c.fillStyle = col; c.fillRect(cx - half - lw * 0.18, y - lw * 0.5, half * 2 + lw * 0.36 + 8, lw * 0.22);
    c.fillStyle = col === '#ffc43a' ? '#3a1d06' : '#fff'; c.font = '900 ' + Math.round(clamp(lw * 0.15, 11, 18)) + 'px "Arial Black",Arial,sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText(label + (col === '#2fa05a' ? ' ✓' : ''), cx, y - lw * 0.39); c.textBaseline = 'alphabetic';
  };
  P.drawItem = function (c, it, y) {
    var lw = this.laneW, x = it.lane >= 0 ? this.laneScreenX(it.lane) : this.cx;
    if (it.t === 'tok') {
      var air = it.air, lift = air ? lw * 0.18 : 0, r = lw * 0.15, sx = Math.abs(Math.cos(this.t * 4 + it.z));
      if (air) { c.fillStyle = 'rgba(0,0,0,.2)'; c.beginPath(); c.ellipse(x, y + lw * 0.08, r * 0.9, r * 0.4, 0, 0, 6.283); c.fill(); }
      c.save(); c.translate(x, y - lift); c.scale(0.35 + 0.65 * sx, 1);
      c.fillStyle = '#ffc43a'; c.strokeStyle = '#8a3d00'; c.lineWidth = 3; c.beginPath(); c.arc(0, 0, r, 0, 6.283); c.fill(); c.stroke();
      c.fillStyle = '#fff3a6'; c.beginPath(); c.moveTo(0, -r * 0.6); c.lineTo(r * 0.2, 0); c.lineTo(0, r * 0.6); c.lineTo(-r * 0.2, 0); c.closePath(); c.fill();
      c.restore();
    } else if (it.t === 'boost') {
      var br = lw * 0.26; c.save(); c.translate(x, y); c.rotate(this.t * 1.5);
      c.strokeStyle = '#ff8a1f'; c.lineWidth = 4; for (var a = 0; a < 8; a++) { c.beginPath(); c.moveTo(Math.cos(a * 0.785) * br * 1.1, Math.sin(a * 0.785) * br * 1.1); c.lineTo(Math.cos(a * 0.785) * br * 1.6, Math.sin(a * 0.785) * br * 1.6); c.stroke(); }
      c.fillStyle = '#ffe066'; c.strokeStyle = '#a85a00'; c.lineWidth = 4; c.beginPath(); c.arc(0, 0, br, 0, 6.283); c.fill(); c.stroke();
      c.fillStyle = '#d6342a'; c.beginPath(); c.moveTo(0, -br * .6); c.lineTo(br * .3, 0); c.lineTo(0, br * .6); c.lineTo(-br * .3, 0); c.closePath(); c.fill(); c.restore();
    } else if (it.t === 'rock' && !it.hit) {
      var rr = lw * 0.36; c.fillStyle = 'rgba(0,0,0,.25)'; c.beginPath(); c.ellipse(x + 4, y + rr * 0.55, rr * 1.05, rr * 0.5, 0, 0, 6.283); c.fill();
      c.fillStyle = '#8e9aa6'; c.strokeStyle = '#3a4650'; c.lineWidth = 4; c.lineJoin = 'round'; c.beginPath();
      c.moveTo(x - rr, y + rr * 0.3); c.lineTo(x - rr * 0.7, y - rr * 0.5); c.lineTo(x - rr * 0.1, y - rr * 0.85); c.lineTo(x + rr * 0.6, y - rr * 0.55); c.lineTo(x + rr, y + rr * 0.2); c.lineTo(x + rr * 0.4, y + rr * 0.6); c.lineTo(x - rr * 0.5, y + rr * 0.6); c.closePath(); c.fill(); c.stroke();
      c.fillStyle = '#b9c4cf'; c.beginPath(); c.moveTo(x - rr * 0.6, y - rr * 0.4); c.lineTo(x - rr * 0.1, y - rr * 0.7); c.lineTo(x + rr * 0.2, y - rr * 0.2); c.lineTo(x - rr * 0.4, y); c.closePath(); c.fill();
      c.strokeStyle = '#3a4650'; c.lineWidth = 3; c.beginPath(); c.moveTo(x + rr * 0.1, y - rr * 0.2); c.lineTo(x + rr * 0.3, y + rr * 0.2); c.stroke();
    } else if (it.t === 'log' || it.t === 'wide') {
      var wide = it.t === 'wide', lx = wide ? this.cx : x, len = wide ? this.laneW * 3.05 : lw * 0.92, th = lw * 0.3, al = it.hit ? 0.45 : 1;
      c.globalAlpha = al; c.fillStyle = 'rgba(0,0,0,.25)'; c.fillRect(lx - len / 2 + 4, y - th / 2 + th * 0.4, len, th);
      c.fillStyle = '#8a5426'; c.strokeStyle = '#3a1d06'; c.lineWidth = 4;
      this.rrect(c, lx - len / 2, y - th / 2, len, th, th * 0.35); c.fill(); c.stroke();
      c.strokeStyle = '#a8692f'; c.lineWidth = 3; c.beginPath(); c.moveTo(lx - len * 0.4, y - th * 0.12); c.lineTo(lx + len * 0.38, y - th * 0.12); c.moveTo(lx - len * 0.3, y + th * 0.18); c.lineTo(lx + len * 0.42, y + th * 0.18); c.stroke();
      c.fillStyle = '#e0b878'; c.strokeStyle = '#3a1d06'; c.lineWidth = 3;
      [lx - len / 2 + th * 0.2, lx + len / 2 - th * 0.2].forEach(function (ex) { c.beginPath(); c.ellipse(ex, y, th * 0.2, th * 0.4, 0, 0, 6.283); c.fill(); c.stroke(); });
      if (wide) { c.fillStyle = '#fff'; c.font = '900 ' + Math.round(clamp(lw * 0.16, 12, 20)) + 'px "Arial Black",Arial,sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.lineWidth = 4; c.strokeStyle = '#3a1d06'; c.strokeText('JUMP ↑', lx, y); c.fillText('JUMP ↑', lx, y); c.textBaseline = 'alphabetic'; }
      c.globalAlpha = 1;
    }
  };
  P.rrect = function (c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); };
  P.drawPlayer = function (c) {
    var lw = this.laneW, x = this.cx + (this.laneX - 1) * lw, y = this.py, jp = this.jumpT > 0 ? Math.sin((1 - this.jumpT / this.jumpDur) * Math.PI) : 0;
    var blink = this.invuln > 0 && Math.floor(this.invuln * 12) % 2 === 0;
    if (blink) c.globalAlpha = 0.45;
    var sc = 1 + jp * 0.28, bw = lw * 0.58 * sc, bl = lw * 1.0 * sc;
    c.fillStyle = 'rgba(0,0,0,' + (0.28 - jp * 0.12) + ')'; c.beginPath(); c.ellipse(x + jp * lw * 0.12, y + bl * 0.2 + jp * lw * 0.18, bw * 0.7, bl * 0.5, 0, 0, 6.283); c.fill();
    var yy = y - jp * lw * 0.22;
    var sk = CC.SKINS.filter(function (s) { return s.id === CC.Save.data.equipped; })[0] || CC.SKINS[0];
    // animals
    c.fillStyle = '#b07a42'; c.strokeStyle = '#3a1d06'; c.lineWidth = 3;
    [-1, 1].forEach(function (s) { c.beginPath(); c.ellipse(x + s * bw * 0.26, yy - bl * 0.72, bw * 0.2, bl * 0.2, 0, 0, 6.283); c.fill(); c.stroke(); c.beginPath(); c.arc(x + s * bw * 0.26, yy - bl * 0.95, bw * 0.12, 0, 6.283); c.fill(); c.stroke(); });
    // wheels
    c.fillStyle = '#3a1d06';
    c.fillRect(x - bw * 0.58, yy - bl * 0.34, bw * 0.16, bl * 0.28); c.fillRect(x + bw * 0.42, yy - bl * 0.34, bw * 0.16, bl * 0.28);
    c.fillRect(x - bw * 0.58, yy + bl * 0.1, bw * 0.16, bl * 0.28); c.fillRect(x + bw * 0.42, yy + bl * 0.1, bw * 0.16, bl * 0.28);
    // body
    c.fillStyle = '#8a5426'; this.rrect(c, x - bw * 0.5, yy - bl * 0.5, bw, bl, bw * 0.2); c.fill(); c.strokeStyle = '#3a1d06'; c.lineWidth = 4; c.stroke();
    var gr = c.createLinearGradient(x - bw * 0.4, yy, x + bw * 0.4, yy); gr.addColorStop(0, sk.c1); gr.addColorStop(1, sk.c2);
    c.fillStyle = gr; this.rrect(c, x - bw * 0.4, yy - bl * 0.38, bw * 0.8, bl * 0.72, bw * 0.3); c.fill(); c.stroke();
    c.strokeStyle = 'rgba(255,255,255,.5)'; c.lineWidth = 3; c.beginPath(); c.moveTo(x, yy - bl * 0.34); c.lineTo(x, yy + bl * 0.3); c.moveTo(x - bw * 0.2, yy - bl * 0.3); c.lineTo(x - bw * 0.2, yy + bl * 0.26); c.moveTo(x + bw * 0.2, yy - bl * 0.3); c.lineTo(x + bw * 0.2, yy + bl * 0.26); c.stroke();
    c.fillStyle = '#e53b30'; c.beginPath(); c.moveTo(x, yy + bl * 0.34); c.lineTo(x + bw * 0.34, yy + bl * 0.5); c.lineTo(x, yy + bl * 0.46); c.closePath(); c.fill();
    if (this.boost > 0) { c.strokeStyle = 'rgba(255,214,77,.9)'; c.lineWidth = 5; c.beginPath(); c.arc(x, yy, bl * 0.78, 0, 6.283); c.stroke(); }
    c.globalAlpha = 1;
  };
  P.destroy = function () { this.items = []; this.parts = []; this.texts = []; };
  CC.MiniGames.dash = Dash;
})();
