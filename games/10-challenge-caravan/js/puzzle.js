/* CHALLENGE CARAVAN — Mini-game 2: RUINS PUZZLE (rotate tiles, route the sun-energy) */
(function () {
  'use strict';
  var CC = window.CC, clamp = CC.clamp;
  var N_ = 1, E_ = 2, S_ = 4, W_ = 8;
  var DIRS = [[N_, 0, -1, S_], [E_, 1, 0, W_], [S_, 0, 1, N_], [W_, -1, 0, E_]]; // bit, dc, dr, opposite
  function rot(m) { return ((m << 1) | (m >> 3)) & 15; }
  function sides(m) { var a = []; if (m & N_) a.push('north'); if (m & E_) a.push('east'); if (m & S_) a.push('south'); if (m & W_) a.push('west'); return a; }
  function kindOf(m) { var c = (m & 1) + ((m >> 1) & 1) + ((m >> 2) & 1) + ((m >> 3) & 1); return c === 0 ? 'a blocked stone' : c === 1 ? 'a dead end' : c === 2 ? (m === 5 || m === 10 ? 'a straight channel' : 'a curved channel') : c === 3 ? 'a T-junction' : 'a crossing'; }

  function Puzzle(host, o) { this.host = host; this.o = o; this.diff = o.diff; this.needsCountdown = false; }
  var P = Puzzle.prototype;

  P.generate = function (n, rnd) {
    var r0 = Math.floor(rnd() * n), r1 = Math.floor(rnd() * n), path = null, tries = 0;
    function dfs(c, r, vis, acc) {
      if (c === n - 1 && r === r1) return acc;
      var order = [1, 1, 2, 0, 3].sort(function () { return rnd() - 0.5; }); // bias to the right
      var seen = {};
      for (var i = 0; i < order.length; i++) {
        var d = order[i]; if (seen[d]) continue; seen[d] = 1;
        var nc = c + DIRS[d][1], nr = r + DIRS[d][2];
        if (nc < 0 || nr < 0 || nc >= n || nr >= n || vis[nr * n + nc]) continue;
        vis[nr * n + nc] = 1; acc.push([nc, nr, d]);
        var res = dfs(nc, nr, vis, acc); if (res) return res;
        acc.pop(); vis[nr * n + nc] = 0;
      }
      return null;
    }
    while (tries++ < 60) {
      var vis = {}; vis[r0 * n] = 1;
      var res = dfs(0, r0, vis, [[0, r0, -1]]);
      if (res && res.length >= n + 2 + (this.diff > 1 ? 1 : 0)) { path = res; break; }
      if (res && !path) path = res;
    }
    return { path: path, r0: r0, r1: r1 };
  };

  P.init = function () {
    var n = [0, 4, 5, 6][this.diff], rnd = CC.rng((Date.now() ^ (this.o.destId * 104729)) >>> 0);
    this.n = n; this.moves = 0; this.hints = 0; this.t = 0; this.done = false; this.lastSec = -1; this.focus = [0, 0];
    var g = this.generate(n, rnd), path = g.path;
    this.r0 = g.r0; this.r1 = g.r1;
    var tiles = [], i;
    for (i = 0; i < n * n; i++) tiles.push({ mask: 0, sol: 0, locked: false, onPath: false });
    // solution masks along the path
    for (i = 0; i < path.length; i++) {
      var inBit = i === 0 ? W_ : DIRS[(path[i][2] + 2) % 4][0];            // came from the opposite side of the move
      var outBit = i === path.length - 1 ? E_ : DIRS[path[i + 1][2]][0];
      var t = tiles[path[i][1] * n + path[i][0]]; t.sol = inBit | outBit; t.onPath = true; t.pathIdx = i;
    }
    // decoys
    for (i = 0; i < n * n; i++) {
      var tt = tiles[i]; if (tt.onPath) continue;
      var roll = rnd();
      tt.sol = roll < 0.38 ? 5 : roll < 0.74 ? 3 : roll < 0.9 ? 7 : (this.diff >= 2 ? 0 : 10);
      if (tt.sol === 0) tt.locked = true;
    }
    // locked (pre-solved) helper tiles on harder levels
    var lockN = this.diff === 1 ? 0 : this.diff === 2 ? 2 : 3;
    var idxs = path.map(function (p, k) { return k; }).filter(function (k) { return k > 0 && k < path.length - 1; }).sort(function () { return rnd() - 0.5; });
    for (i = 0; i < lockN && i < idxs.length; i++) { var lt = tiles[path[idxs[i]][1] * n + path[idxs[i]][0]]; lt.locked = true; }
    // scramble
    var guard = 0;
    do {
      for (i = 0; i < n * n; i++) {
        var q = tiles[i]; q.mask = q.sol; q.angle = 0;
        if (!q.locked) { var k = Math.floor(rnd() * 4); for (var j = 0; j < k; j++) q.mask = rot(q.mask); }
      }
      this.tiles = tiles; this.flow();
    } while (this.won() && guard++ < 20);
    // par
    var par = 0;
    path.forEach(function (p) { var tl = tiles[p[1] * n + p[0]]; if (tl.locked) return; var m = tl.mask, k2 = 0; while (m !== tl.sol && k2 < 4) { m = rot(m); k2++; } par += k2 % 4; });
    this.par = par + 2; this.pathLen = path.length;
    this.targetT = 25 + n * n * 3;
    this.build();
    this.flow(); this.refreshAll(true);
    this.host.hud({ score: 0, aux: '0:00', lbl1: 'Moves', lbl2: 'Time', obj: 'Connect the sun to the temple gate' });
    document.getElementById('pz-moves').textContent = '0'; document.getElementById('pz-par').textContent = String(this.par);
    var self = this;
    this._hintBtn = document.getElementById('pz-hint');
    this._hintFn = function () { self.useHint(); };
    this._hintBtn.addEventListener('click', this._hintFn);
    this._hintBtn.disabled = false;
  };
  P.objective = function () { return 'Connect the sun to the temple gate'; };

  P.build = function () {
    var n = this.n, host = document.getElementById('puzzle'), self = this;
    host.innerHTML = '';
    var board = document.createElement('div'); board.className = 'pz-board'; board.style.setProperty('--n', n);
    board.setAttribute('role', 'grid'); board.setAttribute('aria-label', 'Ruins puzzle board, ' + n + ' by ' + n + '. Arrow keys move, Enter or Space rotates.');
    var src = document.createElement('div'); src.className = 'pz-src'; src.style.gridColumn = 1; src.style.gridRow = this.r0 + 1; src.setAttribute('role', 'img'); src.setAttribute('aria-label', 'Sun source, feeds row ' + (this.r0 + 1));
    src.innerHTML = "<svg viewBox='0 0 100 100'><path d='M60 50H100' stroke='#ffc43a' stroke-width='14' stroke-linecap='butt'/><circle cx='42' cy='50' r='24' fill='#ffd34d' stroke='#a85a00' stroke-width='5'/><g stroke='#ff8a1f' stroke-width='6' stroke-linecap='round'><path d='M42 12v8M42 80v8M4 50h8M20 24l6 6M20 76l6-6M64 24l-6 6'/></g><path d='M34 50l8 -12 8 12-8 12z' fill='#d6342a'/></svg><span>SUN</span>";
    board.appendChild(src);
    var gate = document.createElement('div'); gate.className = 'pz-gate'; gate.style.gridColumn = n + 2; gate.style.gridRow = this.r1 + 1; gate.setAttribute('role', 'img'); gate.setAttribute('aria-label', 'Temple gate, receives energy from row ' + (this.r1 + 1)); this.gate = gate;
    gate.innerHTML = "<svg viewBox='0 0 100 100'><path d='M0 50H40' class='gp' stroke='#8a7a5a' stroke-width='14'/><path d='M38 82V44a22 22 0 0144 0v38z' fill='#6b5a3a' stroke='#3a2a10' stroke-width='5'/><path d='M48 82V48a12 12 0 0124 0v34z' class='gd' fill='#2a1a08'/></svg><span>GATE</span>";
    board.appendChild(gate);
    this.els = [];
    for (var r = 0; r < n; r++) for (var c = 0; c < n; c++) {
      var b = document.createElement('button'); b.type = 'button'; b.className = 'pz-tile'; b.dataset.r = r; b.dataset.c = c;
      b.style.gridColumn = c + 2; b.style.gridRow = r + 1; b.setAttribute('role', 'gridcell'); b.tabIndex = (r === this.r0 && c === 0) ? 0 : -1;
      b.addEventListener('click', (function (rr, cc) { return function () { self.press(rr, cc); }; })(r, c));
      board.appendChild(b); this.els.push(b);
    }
    this.focus = [this.r0, 0];
    board.addEventListener('keydown', function (e) {
      var d = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1], w: [-1, 0], s: [1, 0], a: [0, -1], d: [0, 1] }[e.key];
      if (!d) return;
      e.preventDefault();
      var f = self.focus, nr = clamp(f[0] + d[0], 0, n - 1), nc = clamp(f[1] + d[1], 0, n - 1);
      self.setFocus(nr, nc, true);
    });
    board.addEventListener('focusin', function (e) { var t = e.target; if (t && t.dataset && t.dataset.r != null) self.setFocus(+t.dataset.r, +t.dataset.c, false); });
    host.appendChild(board); this.board = board;
  };
  P.setFocus = function (r, c, doFocus) {
    var old = this.els[this.focus[0] * this.n + this.focus[1]]; if (old) old.tabIndex = -1;
    this.focus = [r, c];
    var el = this.els[r * this.n + c]; el.tabIndex = 0;
    if (doFocus) el.focus({ preventScroll: true });
  };
  P.onStart = function () {
    this.host.banner('Tap tiles to rotate · connect the sun to the gate', 3200);
    if (!CC.UI.isTouch()) { var el = this.els[this.focus[0] * this.n + this.focus[1]]; if (el) el.focus({ preventScroll: true }); }
  };

  /* energy flow (BFS from the west side of the source row) */
  P.flow = function () {
    var n = this.n, t = this.tiles, lit = {}, q = [], start = this.r0 * n;
    if (t[start].mask & W_) { lit[start] = 1; q.push([0, this.r0]); }
    while (q.length) {
      var cur = q.shift(), m = t[cur[1] * n + cur[0]].mask;
      for (var d = 0; d < 4; d++) {
        if (!(m & DIRS[d][0])) continue;
        var nc = cur[0] + DIRS[d][1], nr = cur[1] + DIRS[d][2];
        if (nc < 0 || nr < 0 || nc >= n || nr >= n) continue;
        var ni = nr * n + nc;
        if (lit[ni] || !(t[ni].mask & DIRS[d][3])) continue;
        lit[ni] = 1; q.push([nc, nr]);
      }
    }
    this.lit = lit; this.litCount = Object.keys(lit).length;
    return lit;
  };
  P.won = function () { var n = this.n, i = this.r1 * n + n - 1; return !!(this.lit && this.lit[i] && (this.tiles[i].mask & E_)); };

  P.svg = function (m, lit, locked) {
    var s = "<svg viewBox='0 0 100 100' aria-hidden='true' focusable='false'><rect x='3' y='3' width='94' height='94' rx='12' fill='" + (m === 0 ? '#9a8a68' : locked ? '#bfae86' : '#e6d6a8') + "' stroke='" + (locked ? '#5a4a2a' : '#8a6a34') + "' stroke-width='4'/>";
    if (lit) s += "<rect x='6' y='6' width='88' height='88' rx='10' fill='rgba(255,214,77,.3)'/>";
    if (m === 0) return s + "<path d='M22 70l14-26 12 14 10-20 20 32z' fill='#7a6a4a' stroke='#4a3a22' stroke-width='3' stroke-linejoin='round'/><path d='M26 30l10 10M64 28l8 12' stroke='#5a4a2a' stroke-width='3' stroke-linecap='round'/>" + (locked ? "<g transform='translate(70 8)'><rect x='0' y='7' width='20' height='14' rx='3' fill='#3a2a10'/><path d='M4 7V4a6 6 0 0112 0v3' fill='none' stroke='#3a2a10' stroke-width='3'/></g>" : '') + '</svg>';
    var ends = { 1: 'M50 50V-2', 2: 'M50 50H102', 4: 'M50 50V102', 8: 'M50 50H-2' }, d = '';
    for (var b = 1; b <= 8; b <<= 1) if (m & b) d += ends[b];
    s += "<path d='" + d + "' stroke='#4a3a22' stroke-width='26' stroke-linecap='butt' fill='none'/>";
    s += "<path d='" + d + "' stroke='" + (lit ? '#7a4a00' : '#a99872') + "' stroke-width='18' stroke-linecap='butt' fill='none'/>";
    s += "<path class='" + (lit ? 'flowline' : '') + "' d='" + d + "' stroke='" + (lit ? '#ffd34d' : '#d9ccaa') + "' stroke-width='" + (lit ? 9 : 8) + "' stroke-linecap='butt' fill='none'" + (lit ? " stroke-dasharray='10 8'" : '') + '/>';
    s += "<circle cx='50' cy='50' r='15' fill='" + (lit ? '#ffe58a' : '#c8b88a') + "' stroke='" + (lit ? '#8a3d00' : '#5a4a2a') + "' stroke-width='4'/>";
    if (lit) s += "<path d='M53 38L43 53h6l-2 9 10-15h-6z' fill='#d6342a'/>";
    if (locked) s += "<g transform='translate(70 8)'><rect x='0' y='7' width='20' height='14' rx='3' fill='#3a2a10'/><path d='M4 7V4a6 6 0 0112 0v3' fill='none' stroke='#3a2a10' stroke-width='3'/></g>";
    return s + '</svg>';
  };
  P.refresh = function (i, animate) {
    var t = this.tiles[i], el = this.els[i], lit = !!this.lit[i], n = this.n, r = Math.floor(i / n), c = i % n;
    var key = t.mask + '|' + lit;
    if (el._k !== key) {
      el.innerHTML = this.svg(t.mask, lit, t.locked);
      el._k = key;
      el.classList.toggle('lit', lit);
      if (animate && el._r) { var sv = el.firstChild; sv.style.animation = 'none'; void sv.offsetWidth; sv.style.animation = ''; }
    }
    el.classList.toggle('locked', t.locked);
    var s = sides(t.mask);
    el.setAttribute('aria-label', 'Row ' + (r + 1) + ', column ' + (c + 1) + ': ' + kindOf(t.mask) + (s.length ? ' connecting ' + s.join(' and ') : '') + '. ' + (t.locked ? 'Fixed in place. ' : 'Press to rotate. ') + (lit ? 'Powered.' : 'Not powered.'));
  };
  P.refreshAll = function (first) { for (var i = 0; i < this.tiles.length; i++) this.refresh(i, false); this.updateGate(); if (first) for (i = 0; i < this.els.length; i++) this.els[i]._r = true; };
  P.updateGate = function () {
    var on = this.won(), g = this.gate; if (!g) return;
    g.classList.toggle('open', on);
    g.querySelector('span').textContent = on ? 'OPEN!' : 'GATE';
    var lastLit = this.lit && this.lit[this.r1 * this.n + this.n - 1];
    g.querySelector('.gp').setAttribute('stroke', on ? '#ffc43a' : '#8a7a5a');
  };

  P.press = function (r, c) {
    if (this.done || !CC.Game.running) return;
    var i = r * this.n + c, t = this.tiles[i], el = this.els[i];
    if (t.locked) {
      CC.Audio.sfx('locked');
      el.classList.remove('nope'); void el.offsetWidth; el.classList.add('nope');
      this.host.banner(t.mask === 0 ? 'Solid stone — it can’t move' : 'This tile is fixed in place', 1100, 'bad');
      return;
    }
    var before = this.litCount;
    t.mask = rot(t.mask); this.moves++;
    this.flow();
    CC.Audio.sfx('rotate');
    this.refresh(i, true);
    for (var k = 0; k < this.tiles.length; k++) if (k !== i) this.refresh(k, false);
    this.updateGate();
    if (this.litCount > before) CC.Audio.sfx('lit');
    document.getElementById('pz-moves').textContent = String(this.moves);
    this.host.hud({ score: this.moves });
    if (this.won()) this.win();
  };

  P.useHint = function () {
    if (this.done || !CC.Game.running) return;
    var t = this.tiles, cand = [];
    for (var i = 0; i < t.length; i++) if (t[i].onPath && !t[i].locked && t[i].mask !== t[i].sol) cand.push(i);
    if (!cand.length) { this.host.banner('Every path tile is already right!', 1200); return; }
    cand.sort(function (a, b) { return t[a].pathIdx - t[b].pathIdx; });
    var i2 = cand[0], tl = t[i2], k = 0;
    while (tl.mask !== tl.sol && k < 4) { tl.mask = rot(tl.mask); k++; }
    this.hints++; this.flow(); CC.Audio.sfx('found');
    for (var j = 0; j < t.length; j++) this.refresh(j, j === i2);
    this.updateGate();
    var el = this.els[i2]; el.classList.remove('hinted'); void el.offsetWidth; el.classList.add('hinted');
    this.setFocus(Math.floor(i2 / this.n), i2 % this.n, !CC.UI.isTouch());
    this.host.banner('Hint: that tile is now in place (−60)', 1500);
    if (this.won()) this.win();
  };

  P.update = function (dt) {
    if (this.done) return;
    this.t += dt;
    var sec = Math.floor(this.t);
    if (sec !== this.lastSec) { this.lastSec = sec; this.host.hud({ aux: Math.floor(sec / 60) + ':' + ('0' + (sec % 60)).slice(-2) }); }
  };
  P.win = function () {
    if (this.done) return; this.done = true;
    var moveScore = clamp(this.par / Math.max(this.moves, this.par), 0, 1), timeScore = clamp(this.targetT / Math.max(this.t, this.targetT), 0, 1);
    var perf = clamp(0.65 * moveScore + 0.35 * timeScore - this.hints * 0.08, 0.05, 1);
    var score = Math.max(0, Math.round(300 + 500 * moveScore + 200 * timeScore - 60 * this.hints));
    this.updateGate();
    CC.Audio.sfx('perfect');
    this.host.banner('Temple restored!', 1600, 'good');
    var sec = Math.round(this.t);
    this.host.finish({
      success: true, perf: perf, score: score,
      stat2: { label: 'Moves', value: this.moves + ' (par ' + this.par + ')' },
      flags: { underPar: this.moves <= this.par && this.hints === 0 },
      opts: [{ label: 'At or under par', done: this.moves <= this.par }, { label: 'No hints', done: this.hints === 0 }, { label: 'Under ' + Math.round(this.targetT) + 's', done: sec <= this.targetT }],
      delay: 1300
    });
  };
  P.resize = function () { };
  P.render = function () { };
  P.destroy = function () {
    if (this._hintBtn && this._hintFn) this._hintBtn.removeEventListener('click', this._hintFn);
    var h = document.getElementById('puzzle'); if (h) h.innerHTML = '';
    this.els = []; this.tiles = [];
  };
  CC.MiniGames.puzzle = Puzzle;
})();
