/* GLITCH GARDEN — simulation: player physics, collisions, items, hazards, camera.
   Pure logic (no drawing, no DOM). One Game instance per level run. */
(function () {
  'use strict';
  var GG = window.GG;

  var P = {
    W: 20, H: 26,
    GRAV: 1700, MAXFALL: 900, RUN: 175,
    ACC_G: 1900, ACC_A: 1250, FRIC: 2300,
    JUMP: 560, RISE_EXTRA: 2.1,
    COYOTE: 0.11, BUFFER: 0.13,
    INVULN: 1.6, MAX_HEALTH: 3, STEP: 1 / 120
  };
  GG.PHYS = P;

  function overlap(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  }

  function Game(levelId, emit) {
    this.def = GG.levels[levelId - 1];
    this.id = levelId;
    this.emit = emit || function () {};
    this.view = { w: 480, h: 270, inset: 0 };
    this.particles = [];
    this.reset();
  }

  Game.prototype.reset = function () {
    var d = this.def, i;
    this.time = 0;
    this.state = 'playing'; // playing | won | lost
    this.score = 0; this.coins = 0; this.stars = 0;
    this.health = P.MAX_HEALTH;
    this.invuln = 0;
    this.deathTimer = 0;
    this.particles.length = 0;

    this.solids = d.platforms.map(function (p) { return { x: p.x, y: p.y, w: p.w, h: p.h, t: p.t }; });
    this.crumbles = d.crumbles.map(function (c) {
      return { x: c.x, y: c.y, w: c.w, h: c.h, t: 'crumble', baseY: c.y, state: 'idle', timer: 0, vy: 0, shake: 0 };
    });
    this.movers = d.movers.map(function (m) {
      return { x: m.x, y: m.y, w: m.w, h: m.h, t: 'mover', ax: m.ax, ay: m.ay, bx: m.bx, by: m.by, speed: m.speed, dir: 1, wait: 0, dx: 0, dy: 0, prog: 0,
        len: Math.hypot(m.bx - m.ax, m.by - m.ay) };
    });
    this.items = [];
    for (i = 0; i < d.coins.length; i++) this.items.push({ kind: 'coin', x: d.coins[i].x, y: d.coins[i].y, r: 11, got: false, phase: i * 0.7 });
    for (i = 0; i < d.stars.length; i++) this.items.push({ kind: 'star', x: d.stars[i].x, y: d.stars[i].y, r: 15, got: false, phase: i * 1.3 });
    this.hazards = d.hazards.map(function (h) { return { x: h.x, y: h.y, w: h.w, h: h.h, t: h.t }; });
    this.bugs = d.bugs.map(function (b) { return { x: b.ax, y: b.y, w: b.w, h: b.h, ax: b.ax, bx: b.bx, speed: b.speed, dir: 1, t: 'bug', bob: 0 }; });
    this.checks = d.checks.map(function (c) { return { x: c.x, y: c.y, on: false }; });
    this.exit = { x: d.exit.x, y: d.exit.y, w: d.exit.w, h: d.exit.h };
    this.totalStars = d.stars.length;
    this.totalCoins = d.coins.length;

    this.spawn = { x: d.spawn.x, y: d.spawn.y };
    this.p = {
      x: this.spawn.x, y: this.spawn.y, w: P.W, h: P.H, vx: 0, vy: 0, face: 1,
      grounded: false, ground: null, coyote: 0, buffer: 0, anim: 0, squash: 0, wasGrounded: false
    };
    this.cam = { x: 0, y: 0, ready: false };
    this.acc = 0;
  };

  Game.prototype.setView = function (w, h, inset) {
    this.view.w = w; this.view.h = h; this.view.inset = inset || 0;
    if (this.cam.ready) this.updateCamera(0, true);
  };

  /* ---------------- helpers ---------------- */
  Game.prototype.burst = function (x, y, n, color, speed, life) {
    for (var i = 0; i < n; i++) {
      if (this.particles.length > 220) this.particles.shift();
      var a = Math.random() * Math.PI * 2, s = GG.rand(speed * 0.4, speed);
      this.particles.push({ x: x, y: y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - speed * 0.3, life: life || 0.6, max: life || 0.6, c: color, size: GG.rand(2, 4), g: 380 });
    }
  };

  Game.prototype.collectSolids = function () {
    var out = this.solids.slice(), i;
    for (i = 0; i < this.crumbles.length; i++) {
      var c = this.crumbles[i];
      if (c.state === 'idle' || c.state === 'shaking') out.push(c);
    }
    for (i = 0; i < this.movers.length; i++) out.push(this.movers[i]);
    return out;
  };

  /* ---------------- main update ---------------- */
  Game.prototype.update = function (dt, input) {
    dt = Math.min(dt, 1 / 20);
    this.acc += dt;
    var n = 0;
    while (this.acc >= P.STEP && n < 12) {
      this.step(P.STEP, input);
      this.acc -= P.STEP; n++;
    }
    if (n === 12) this.acc = 0;
    this.updateParticles(dt);
    this.updateCamera(dt, false);
  };

  Game.prototype.step = function (dt, input) {
    var p = this.p, i, s, solids;
    this.time += dt;
    if (this.invuln > 0) this.invuln -= dt;

    if (this.state !== 'playing') {
      if (this.state === 'lost') this.deathTimer += dt;
      // keep world animating (movers) but player input is ignored
      this.updateMovers(dt);
      return;
    }

    this.updateMovers(dt);
    this.updateCrumbles(dt);
    this.updateBugs(dt);

    /* --- ride moving platform --- */
    if (p.ground && p.ground.t === 'mover') { p.x += p.ground.dx; p.y += p.ground.dy; }

    /* --- input --- */
    var dir = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    var jumpPressed = input.consumeJump();
    if (jumpPressed) p.buffer = P.BUFFER;

    var target = dir * P.RUN;
    if (dir !== 0) {
      p.face = dir;
      var acc = p.grounded ? P.ACC_G : P.ACC_A;
      // quicker turn-around
      if (Math.sign(p.vx) !== dir && p.vx !== 0) acc *= 1.6;
      if (p.vx < target) p.vx = Math.min(target, p.vx + acc * dt);
      else if (p.vx > target) p.vx = Math.max(target, p.vx - acc * dt);
    } else {
      var f = (p.grounded ? P.FRIC : P.FRIC * 0.35) * dt;
      if (p.vx > 0) p.vx = Math.max(0, p.vx - f); else p.vx = Math.min(0, p.vx + f);
    }

    /* --- jump --- */
    p.coyote = p.grounded ? P.COYOTE : Math.max(0, p.coyote - dt);
    p.buffer = Math.max(0, p.buffer - dt);
    if (p.buffer > 0 && p.coyote > 0) {
      p.vy = -P.JUMP; p.buffer = 0; p.coyote = 0; p.grounded = false; p.ground = null; p.squash = -0.25;
      this.emit('sfx', 'jump');
      this.burst(p.x + p.w / 2, p.y + p.h, 4, '#fff6c8', 60, 0.35);
    }
    var g = P.GRAV;
    if (p.vy < 0 && !input.jumpHeld) g *= P.RISE_EXTRA;
    p.vy = Math.min(P.MAXFALL, p.vy + g * dt);

    /* --- move X & collide --- */
    solids = this.collectSolids();
    p.x += p.vx * dt;
    for (i = 0; i < solids.length; i++) {
      s = solids[i];
      // tiny vertical inset so resting exactly on a surface never counts as a side hit (float safety)
      if (overlap({ x: p.x, y: p.y + 0.06, w: p.w, h: p.h - 0.12 }, s)) {
        if (p.vx > 0 || (p.vx === 0 && p.x + p.w / 2 < s.x + s.w / 2)) p.x = s.x - p.w;
        else p.x = s.x + s.w;
        p.vx = 0;
      }
    }
    if (p.x < 0) { p.x = 0; p.vx = 0; }
    if (p.x + p.w > this.def.w) { p.x = this.def.w - p.w; p.vx = 0; }

    /* --- move Y & collide --- */
    var wasG = p.grounded;
    p.grounded = false; p.ground = null;
    p.y += p.vy * dt;
    for (i = 0; i < solids.length; i++) {
      s = solids[i];
      if (overlap(p, s)) {
        if (p.vy >= 0 && (p.y + p.h - p.vy * dt <= s.y + 1 + Math.max(0, (s.dy || 0)) || p.y + p.h - s.y <= 8)) {
          // landed on top
          var impact = p.vy;
          p.y = s.y - p.h; p.vy = 0; p.grounded = true; p.ground = s;
          if (!wasG && impact > 240) {
            p.squash = 0.3; this.emit('sfx', 'land');
            this.burst(p.x + p.w / 2, p.y + p.h, 5, '#d9f2b0', 70, 0.4);
          }
        } else if (p.vy < 0) {
          p.y = s.y + s.h; p.vy = 0;
        } else {
          // overlapping from the side while falling (rare): push out horizontally
          if (p.x + p.w / 2 < s.x + s.w / 2) p.x = s.x - p.w; else p.x = s.x + s.w;
        }
      }
    }
    if (p.grounded && p.ground && p.ground.t === 'crumble' && p.ground.state === 'idle') {
      p.ground.state = 'shaking'; p.ground.timer = 0.5; this.emit('sfx', 'crumble');
    }
    p.squash *= Math.pow(0.0005, dt);
    p.anim += dt * (p.grounded ? Math.abs(p.vx) / 18 : 6);

    /* --- items --- */
    var hb = { x: p.x - 3, y: p.y - 3, w: p.w + 6, h: p.h + 6 };
    for (i = 0; i < this.items.length; i++) {
      var it = this.items[i];
      if (it.got) continue;
      if (it.x + it.r > hb.x && it.x - it.r < hb.x + hb.w && it.y + it.r > hb.y && it.y - it.r < hb.y + hb.h) {
        it.got = true;
        if (it.kind === 'coin') {
          this.coins++; this.score += 10;
          this.burst(it.x, it.y, 7, '#ffe36b', 110, 0.5);
          this.emit('sfx', 'coin'); this.emit('coin', it);
        } else {
          this.stars++; this.score += 100;
          this.burst(it.x, it.y, 18, '#fff29a', 190, 0.8);
          this.emit('sfx', 'star'); this.emit('star', it);
        }
      }
    }

    /* --- checkpoints --- */
    for (i = 0; i < this.checks.length; i++) {
      var c = this.checks[i];
      if (!c.on && p.x + p.w > c.x - 16 && p.x < c.x + 16 && p.y + p.h > c.y - 60 && p.y < c.y + 4) {
        c.on = true; this.score += 25;
        this.spawn = { x: c.x - p.w / 2, y: c.y - p.h - 2 };
        this.burst(c.x, c.y - 30, 14, '#ff8fd0', 130, 0.7);
        this.emit('sfx', 'check'); this.emit('toast', 'Checkpoint!');
      }
    }

    /* --- hazards --- */
    if (this.invuln <= 0) {
      var body = { x: p.x + 3, y: p.y + 3, w: p.w - 6, h: p.h - 5 };
      for (i = 0; i < this.hazards.length; i++) {
        s = this.hazards[i];
        if (overlap(body, { x: s.x + 3, y: s.y + 4, w: s.w - 6, h: s.h - 4 })) { this.hurt(s.x + s.w / 2); break; }
      }
      if (this.invuln <= 0) {
        for (i = 0; i < this.bugs.length; i++) {
          s = this.bugs[i];
          if (overlap(body, { x: s.x + 2, y: s.y + 2, w: s.w - 4, h: s.h - 4 })) { this.hurt(s.x + s.w / 2); break; }
        }
      }
    }

    /* --- exit --- */
    var ex = this.exit;
    if (this.state === 'playing' && overlap(p, { x: ex.x + 8, y: ex.y + 6, w: ex.w - 16, h: ex.h - 6 })) {
      this.state = 'won';
      this.score += 200 + this.health * 50;
      p.vx = 0;
      this.burst(ex.x + ex.w / 2, ex.y + ex.h / 2, 30, '#fff29a', 240, 1);
      this.emit('sfx', 'win'); this.emit('win');
      return;
    }

    /* --- fell into the void --- */
    if (p.y > GG.WORLD_H + 140) this.fall();
  };

  Game.prototype.hurt = function (fromX) {
    var p = this.p;
    if (this.invuln > 0 || this.state !== 'playing') return;
    this.health--;
    this.invuln = P.INVULN;
    this.emit('sfx', 'hurt'); this.emit('hurtfx');
    this.burst(p.x + p.w / 2, p.y + p.h / 2, 12, '#ff6a6a', 150, 0.5);
    if (this.health <= 0) { this.lose(); return; }
    var side = p.x + p.w / 2 < fromX ? -1 : 1;
    p.vy = -340; p.vx = side * 170; p.grounded = false; p.ground = null;
  };

  Game.prototype.fall = function () {
    var p = this.p;
    this.health--;
    this.emit('sfx', 'hurt'); this.emit('hurtfx');
    if (this.health <= 0) { this.health = 0; this.lose(); return; }
    p.x = this.spawn.x; p.y = this.spawn.y; p.vx = 0; p.vy = 0; p.grounded = false; p.ground = null;
    this.invuln = 1.4;
    this.burst(p.x + p.w / 2, p.y + p.h / 2, 12, '#9be7ff', 120, 0.6);
    this.cam.ready = false;
  };

  Game.prototype.lose = function () {
    if (this.state !== 'playing') return;
    this.state = 'lost'; this.deathTimer = 0;
    this.p.vy = -380; this.p.vx = 0;
    this.emit('sfx', 'lose'); this.emit('lose');
  };

  /* ---------------- moving parts ---------------- */
  Game.prototype.updateMovers = function (dt) {
    var p = this.p;
    for (var i = 0; i < this.movers.length; i++) {
      var m = this.movers[i], ox = m.x, oy = m.y;
      if (m.wait > 0) { m.wait -= dt; m.dx = 0; m.dy = 0; continue; }
      m.prog += m.dir * m.speed * dt / m.len;
      if (m.prog >= 1) { m.prog = 1; m.dir = -1; m.wait = 0.35; }
      else if (m.prog <= 0) { m.prog = 0; m.dir = 1; m.wait = 0.35; }
      m.x = GG.lerp(m.ax, m.bx, m.prog); m.y = GG.lerp(m.ay, m.by, m.prog);
      m.dx = m.x - ox; m.dy = m.y - oy;
      // pushed by a platform sweeping into the player
      if (this.state === 'playing' && p.ground !== m && overlap(p, m)) {
        var pushR = m.x + m.w - p.x, pushL = p.x + p.w - m.x, pushD = m.y + m.h - p.y, pushU = p.y + p.h - m.y;
        var min = Math.min(pushR, pushL, pushD, pushU);
        if (min === pushU) { p.y = m.y - p.h; p.vy = Math.min(p.vy, 0); p.grounded = true; p.ground = m; }
        else if (min === pushD) { p.y = m.y + m.h; if (p.vy < 0) p.vy = 0; }
        else if (min === pushL) p.x = m.x - p.w;
        else p.x = m.x + m.w;
      }
    }
  };

  Game.prototype.updateCrumbles = function (dt) {
    var p = this.p;
    for (var i = 0; i < this.crumbles.length; i++) {
      var c = this.crumbles[i];
      if (c.state === 'shaking') {
        c.timer -= dt; c.shake = (Math.random() - 0.5) * 2.2;
        if (c.timer <= 0) { c.state = 'falling'; c.vy = 0; c.shake = 0; this.burst(c.x + c.w / 2, c.y + 6, 8, '#c58a4a', 90, 0.5); }
      } else if (c.state === 'falling') {
        c.vy += 1500 * dt; c.y += c.vy * dt;
        if (c.y > GG.WORLD_H + 200) { c.state = 'hidden'; c.timer = 2.8; }
      } else if (c.state === 'hidden') {
        c.timer -= dt;
        if (c.timer <= 0) {
          var back = { x: c.x, y: c.baseY, w: c.w, h: c.h };
          if (!overlap(back, p)) { c.y = c.baseY; c.state = 'idle'; c.vy = 0; c.shake = 0; }
        }
      }
    }
  };

  Game.prototype.updateBugs = function (dt) {
    for (var i = 0; i < this.bugs.length; i++) {
      var b = this.bugs[i];
      b.x += b.dir * b.speed * dt;
      if (b.x <= b.ax) { b.x = b.ax; b.dir = 1; }
      else if (b.x >= b.bx) { b.x = b.bx; b.dir = -1; }
      b.bob += dt * 6;
    }
  };

  Game.prototype.updateParticles = function (dt) {
    for (var i = this.particles.length - 1; i >= 0; i--) {
      var q = this.particles[i];
      q.life -= dt;
      if (q.life <= 0) { this.particles.splice(i, 1); continue; }
      q.vy += q.g * dt; q.x += q.vx * dt; q.y += q.vy * dt;
    }
  };

  /* ---------------- camera ---------------- */
  Game.prototype.updateCamera = function (dt, snap) {
    var p = this.p, v = this.view, d = this.def, c = this.cam;
    var tx = p.x + p.w / 2 + p.face * 36 - v.w / 2;
    var ty = p.y + p.h / 2 - v.h * 0.58;
    var maxX = d.w - v.w, minX = 0;
    var maxY = GG.WORLD_H + v.inset - v.h;
    var minY = Math.min(-30, maxY);
    tx = maxX < minX ? (d.w - v.w) / 2 : GG.clamp(tx, minX, maxX);
    ty = GG.clamp(ty, minY, maxY);
    if (this.state === 'lost') { ty = c.y; tx = c.x; }
    if (snap || !c.ready) { c.x = tx; c.y = ty; c.ready = true; return; }
    var k = 1 - Math.pow(0.0008, dt);
    c.x += (tx - c.x) * k;
    c.y += (ty - c.y) * (1 - Math.pow(0.004, dt));
  };

  GG.Game = Game;
})();
