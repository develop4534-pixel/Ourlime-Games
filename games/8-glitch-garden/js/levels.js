/* GLITCH GARDEN — level definitions (world units; y grows downward) */
(function () {
  'use strict';
  var GG = window.GG;
  var H = 420; // logical world height of every level

  function Builder(def) {
    this.def = def;
    def.h = H;
    def.platforms = []; def.crumbles = []; def.movers = []; def.hazards = []; def.bugs = [];
    def.coins = []; def.stars = []; def.checks = []; def.order = [];
  }
  Builder.prototype = {
    ground: function (x, w, y) { var p = { x: x, y: y, w: w, h: H - y + 40, t: 'ground' }; this.def.platforms.push(p); this.def.order.push(p); return this; },
    island: function (x, w, y) { var p = { x: x, y: y, w: w, h: 34, t: 'island' }; this.def.platforms.push(p); this.def.order.push(p); return this; },
    stone: function (x, y, w, h) { this.def.platforms.push({ x: x, y: y, w: w, h: h, t: 'stone' }); return this; },
    wood: function (x, w, y) { var p = { x: x, y: y, w: w, h: 14, t: 'wood' }; this.def.platforms.push(p); this.def.order.push(p); return this; },
    crumble: function (x, w, y) { var p = { x: x, y: y, w: w, h: 16, t: 'crumble' }; this.def.crumbles.push(p); this.def.order.push(p); return this; },
    // horizontal (x0->x1) or vertical (y0->y1) mover, speed in units/s
    moverH: function (x0, x1, y, w, speed) { this.def.movers.push({ x: x0, y: y, w: w, h: 16, ax: x0, ay: y, bx: x1, by: y, speed: speed, t: 'mover' }); return this; },
    moverV: function (x, y0, y1, w, speed) { this.def.movers.push({ x: x, y: y0, w: w, h: 16, ax: x, ay: y0, bx: x, by: y1, speed: speed, t: 'mover' }); return this; },
    thorn: function (x, topY, w) { w = w || 26; this.def.hazards.push({ x: x, y: topY - 16, w: w, h: 16, t: 'thorn' }); return this; },
    bramble: function (x, topY, w) { w = w || 44; this.def.hazards.push({ x: x, y: topY - 24, w: w, h: 24, t: 'bramble' }); return this; },
    bug: function (x0, x1, y, speed) { this.def.bugs.push({ x: x0, y: y, ax: x0, bx: x1, speed: speed || 50, w: 22, h: 18, t: 'bug' }); return this; },
    star: function (x, y) { this.def.stars.push({ x: x, y: y }); return this; },
    check: function (x, topY) { this.def.checks.push({ x: x, y: topY }); return this; },
    exit: function (x, topY) { this.def.exit = { x: x, y: topY - 64, w: 44, h: 64 }; return this; },
    // coin line along a platform top, lifted over thorns/brambles
    coinsOn: function (p, from, to, step) {
      var d = this.def; step = step || 34;
      from = from == null ? p.x + 20 : from; to = to == null ? p.x + p.w - 20 : to;
      for (var x = from; x <= to; x += step) {
        var y = p.y - 26;
        for (var i = 0; i < d.hazards.length; i++) {
          var hz = d.hazards[i];
          if (x > hz.x - 14 && x < hz.x + hz.w + 14 && Math.abs(hz.y + hz.h - p.y) < 3) { y = p.y - 70; break; }
        }
        if (Math.abs(x - d.spawn.x - 10) < 36 && Math.abs(p.y - 26 - d.spawn.y) < 60) continue; // keep the spawn point clear
        d.coins.push({ x: x, y: y });
      }
      return this;
    },
    // arc of coins between two x positions
    arc: function (xa, xb, ya, yb, peak, n) {
      for (var i = 0; i < n; i++) {
        var t = (i + 1) / (n + 1);
        var y = GG.lerp(ya, yb, t) - Math.sin(t * Math.PI) * peak;
        this.def.coins.push({ x: GG.lerp(xa, xb, t), y: y });
      }
      return this;
    },
    // automatic coin trail: coins on platforms in route order + arcs over the gaps
    autoCoins: function (skipIdx) {
      var o = this.def.order;
      skipIdx = skipIdx || [];
      for (var i = 0; i < o.length; i++) {
        var p = o[i];
        if (skipIdx.indexOf(i) < 0 && p.w >= 80) this.coinsOn(p, p.x + 24, p.x + p.w - 24, p.w > 300 ? 52 : 36);
        var q = o[i + 1];
        if (q) {
          var gap = q.x - (p.x + p.w);
          if (gap > 40) this.arc(p.x + p.w, q.x, p.y - 4, q.y - 4, 34, 3);
        }
      }
      return this;
    }
  };

  var L = [];

  /* ---------------- 1. SUNNY GARDEN ---------------- */
  (function () {
    var d = { id: 1, name: 'Sunny Garden', sub: 'A gentle first stroll', theme: 'day', w: 2780, spawn: { x: 60, y: 330 - 30 } };
    var b = new Builder(d);
    b.ground(0, 560, 330)
     .ground(630, 470, 330).thorn(860, 330)
     .island(1170, 120, 290)
     .island(1350, 120, 250)
     .island(1530, 120, 290)
     .ground(1720, 380, 330).check(1790, 330).stone(1900, 290, 40, 40).thorn(2010, 330)
     .crumble(2170, 120, 330)
     .ground(2290, 490, 330)
     .wood(2380, 90, 262)
     .exit(2660, 330);
    b.autoCoins();
    b.star(1410, 200).star(1930, 235).star(2425, 235);
    L.push(d);
  })();

  /* ---------------- 2. FLOATING ISLANDS ---------------- */
  (function () {
    var d = { id: 2, name: 'Floating Islands', sub: 'Leap between sky isles', theme: 'sky', w: 3640, spawn: { x: 60, y: 340 - 30 } };
    var b = new Builder(d);
    b.ground(0, 400, 340)
     .island(480, 120, 320)
     .island(680, 100, 280)
     .island(860, 140, 240)
     .island(1080, 200, 280).thorn(1160, 280)
     .crumble(1360, 100, 300)
     .crumble(1540, 100, 300)
     .island(1720, 320, 320).check(1780, 320).thorn(1840, 320).thorn(1930, 320)
     .island(2120, 100, 280)
     .island(2310, 100, 240)
     .island(2500, 100, 200)
     .island(2690, 260, 260).check(2740, 260).thorn(2840, 260)
     .crumble(3030, 80, 300)
     .ground(3190, 450, 330)
     .exit(3500, 330);
    b.autoCoins();
    b.star(930, 168).star(1680, 222).star(2550, 128);
    L.push(d);
  })();

  /* ---------------- 3. GLITCH WILDERNESS ---------------- */
  (function () {
    var d = { id: 3, name: 'Glitch Wilderness', sub: 'Movers, bugs and thorns', theme: 'glitch', w: 4720, spawn: { x: 60, y: 340 - 30 } };
    var b = new Builder(d);
    b.ground(0, 360, 340)
     .moverH(440, 600, 330, 80, 60)
     .island(700, 220, 320).thorn(790, 320)
     .moverV(990, 330, 205, 90, 50)
     .island(1160, 240, 200).bug(1200, 1350, 182, 46)
     .crumble(1480, 100, 240)
     .crumble(1660, 100, 280)
     .ground(1840, 420, 320).check(1890, 320).thorn(1990, 320).thorn(2080, 320)
     .moverH(2330, 2510, 320, 80, 70)
     .island(2610, 100, 300)
     .crumble(2790, 80, 270)
     .island(2950, 80, 230)
     .island(3090, 280, 270).check(3140, 270).bug(3190, 3340, 252, 50)
     .moverV(3450, 330, 235, 90, 60)
     .island(3630, 120, 230)
     .crumble(3830, 80, 230)
     .crumble(3990, 80, 230)
     .ground(4150, 570, 320).thorn(4280, 320).thorn(4360, 320)
     .exit(4560, 320);
    b.autoCoins();
    b.star(2048, 225).star(2990, 150).star(4333, 245);
    L.push(d);
  })();

  GG.levels = L;
  GG.WORLD_H = H;
})();
