/*!
 * DOODLE DUEL — core rules (shared by browser client, tests and the multiplayer server).
 * Pure logic only: no DOM, no timers, no network. Everything here is unit-tested in tests/.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * STROKE-COUNTING RULE (deterministic)
 *   1. A STROKE is one pointer-down → pointer-up/cancel sequence made by the FIRST
 *      active pointer on the canvas. Pointer MOVES are *points* inside a stroke,
 *      never strokes. A long drag = 1 stroke. A tap = 1 stroke (a dot).
 *   2. At most MAX_STROKES (5) strokes may exist on the canvas at once.
 *      A pointer-down while 5 strokes exist is rejected (nothing is drawn).
 *   3. Undo removes the last stroke and frees its slot. Clear removes all strokes.
 *   4. Extra fingers (multi-touch) are ignored while a stroke is active.
 *   5. Leaving the canvas edge clamps the point to the edge; the stroke continues.
 *   6. A touch-cancel / pointer-cancel ends the stroke and keeps what was drawn.
 *   7. Points closer than MIN_STEP to the previous point are dropped and a stroke is
 *      capped at MAX_POINTS points (payload protection for multiplayer).
 * ─────────────────────────────────────────────────────────────────────────────
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.DD = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /* ───────────── configuration ───────────── */
  var CONFIG = {
    MAX_STROKES: 5,
    MAX_POINTS: 400,        // per stroke
    MIN_STEP: 3,            // logical units (canvas is 1000 x 1000)
    CANVAS: 1000,
    ROUNDS: 6,
    DRAW_SECONDS: 30,
    GUESS_SECONDS: 25,
    CHOICES: 4,
    MIN_PLAYERS: 2,
    MAX_PLAYERS: 6,
    SCORE_CORRECT: 100,
    SCORE_TIME_BONUS_MAX: 50,
    SCORE_DRAW_COMPLETE: 20,
    SCORE_DRAW_CLEAR: 60,     // drawer bonus when the rival(s) identify the drawing
    SCORE_CREATIVE: 10,       // 3+ different colours used (transparent rule, capped)
    SAVE_VERSION: 2
  };

  var COLORS = ['#1f1f3a', '#1e6bff', '#00c2ff', '#ff3b3b', '#ff9f1c', '#ffd23f', '#2ecc71', '#b05cff'];
  var WIDTHS = [10, 20, 34];

  /* ───────────── icon library (original SVG art, 100x100 viewBox) ───────────── */
  var O = 'stroke="#1b1b2f" stroke-width="5" stroke-linejoin="round" stroke-linecap="round"';
  var ICONS = {
    house: '<polygon points="12,48 50,14 88,48" fill="#ff4d4d" ' + O + '/><rect x="21" y="48" width="58" height="38" fill="#ffd9a0" ' + O + '/><rect x="42" y="60" width="16" height="26" fill="#8a4b22" ' + O + '/>',
    sun: '<g ' + O + ' stroke="#ff9f1c"><path d="M50 6v14M50 80v14M6 50h14M80 50h14M19 19l10 10M71 71l10 10M81 19L71 29M29 71L19 81"/></g><circle cx="50" cy="50" r="22" fill="#ffd23f" ' + O + '/>',
    tree: '<rect x="43" y="56" width="14" height="32" fill="#8a4b22" ' + O + '/><circle cx="50" cy="38" r="28" fill="#3ddc84" ' + O + '/>',
    fish: '<polygon points="76,50 94,32 94,68" fill="#ff9f1c" ' + O + '/><ellipse cx="46" cy="50" rx="32" ry="22" fill="#4dc3ff" ' + O + '/><circle cx="34" cy="45" r="4.5" fill="#1b1b2f"/>',
    star: '<polygon points="50,8 61,37 92,38 67,57 76,88 50,70 24,88 33,57 8,38 39,37" fill="#ffd23f" ' + O + '/>',
    heart: '<path d="M50 88 C10 58 6 30 28 20 C40 15 48 22 50 30 C52 22 60 15 72 20 C94 30 90 58 50 88Z" fill="#ff3b5c" ' + O + '/>',
    cat: '<polygon points="20,46 22,10 44,26" fill="#b8b8d0" ' + O + '/><polygon points="80,46 78,10 56,26" fill="#b8b8d0" ' + O + '/><circle cx="50" cy="56" r="32" fill="#d4d4e8" ' + O + '/><circle cx="38" cy="52" r="4.5" fill="#1b1b2f"/><circle cx="62" cy="52" r="4.5" fill="#1b1b2f"/><path d="M44 66 Q50 72 56 66" fill="none" ' + O + '/>',
    flower: '<path d="M50 52V90" fill="none" ' + O + ' stroke="#2c9a55"/><g fill="#ff7ab8" ' + O + '><circle cx="50" cy="22" r="14"/><circle cx="76" cy="40" r="14"/><circle cx="66" cy="68" r="0"/><circle cx="24" cy="40" r="14"/><circle cx="34" cy="64" r="0"/></g><circle cx="50" cy="44" r="13" fill="#ffd23f" ' + O + '/>',
    car: '<path d="M8 66 V52 L24 48 L34 30 H66 L78 48 L94 52 V66Z" fill="#2f7bff" ' + O + '/><path d="M38 36 H62 L70 48 H32Z" fill="#bfe6ff" ' + O + '/><circle cx="30" cy="68" r="10" fill="#2b2b45" ' + O + '/><circle cx="72" cy="68" r="10" fill="#2b2b45" ' + O + '/>',
    boat: '<path d="M12 62 H88 L72 84 H28Z" fill="#ff7043" ' + O + '/><path d="M50 62 V14" fill="none" ' + O + '/><polygon points="52,16 82,56 52,56" fill="#fff" ' + O + '/>',
    moon: '<path d="M67 79 A34 34 0 1 1 67 21 A30 30 0 0 0 67 79Z" fill="#ffd23f" ' + O + '/>',
    umbrella: '<path d="M10 52 A40 38 0 0 1 90 52Z" fill="#a259ff" ' + O + '/><path d="M50 52 V82 Q50 92 40 88" fill="none" ' + O + '/>',
    cloud: '<path d="M24 72 A15 15 0 0 1 22 44 A20 20 0 0 1 58 32 A18 18 0 0 1 82 46 A13 13 0 0 1 78 72Z" fill="#e8f6ff" ' + O + '/>',
    key: '<circle cx="28" cy="42" r="19" fill="#ffd23f" ' + O + '/><circle cx="28" cy="42" r="6" fill="#1b1b2f"/><path d="M46 46 H90 M78 46 V62 M90 46 V58" fill="none" ' + O + ' stroke="#e0a800" stroke-width="9"/>',
    apple: '<circle cx="50" cy="58" r="30" fill="#ff3b3b" ' + O + '/><path d="M50 30 Q52 18 58 12" fill="none" ' + O + '/><path d="M54 22 Q70 12 74 24 Q60 30 54 22Z" fill="#3ddc84" ' + O + '/>',
    crown: '<path d="M12 78 L12 30 L34 52 L50 20 L66 52 L88 30 L88 78Z" fill="#ffd23f" ' + O + '/><circle cx="12" cy="28" r="5" fill="#ff3b3b"/><circle cx="50" cy="18" r="5" fill="#2f7bff"/><circle cx="88" cy="28" r="5" fill="#2ecc71"/>'
  };

  /* ───────────── authored doodles (<=5 strokes each, coordinates 0..100) ───────────── */
  function circ(cx, cy, r, a0, a1, n) {
    a0 = a0 == null ? 0 : a0; a1 = a1 == null ? 360 : a1; n = n || 28;
    var out = [];
    for (var i = 0; i <= n; i++) {
      var a = (a0 + (a1 - a0) * i / n) * Math.PI / 180;
      out.push([+(cx + r * Math.cos(a)).toFixed(1), +(cy + r * Math.sin(a)).toFixed(1)]);
    }
    return out;
  }
  function starPts() {
    var pts = [], order = [0, 2, 4, 1, 3, 0];
    order.forEach(function (k) {
      var a = (-90 + k * 72) * Math.PI / 180;
      pts.push([+(50 + 40 * Math.cos(a)).toFixed(1), +(52 + 40 * Math.sin(a)).toFixed(1)]);
    });
    return pts;
  }
  function heartPts() {
    var pts = [];
    for (var i = 0; i <= 40; i++) {
      var t = i / 40 * 2 * Math.PI;
      var x = 16 * Math.pow(Math.sin(t), 3);
      var y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
      pts.push([+(50 + x * 2.5).toFixed(1), +(46 - y * 2.5).toFixed(1)]);
    }
    return pts;
  }
  function sunRays() {
    var pts = [];
    for (var i = 0; i < 8; i++) {
      var a = (i * 45) * Math.PI / 180, b = ((i + 1) * 45) * Math.PI / 180, m = (i * 45 + 22.5) * Math.PI / 180;
      pts.push([50 + 27 * Math.cos(a), 50 + 27 * Math.sin(a)]);
      pts.push([50 + 42 * Math.cos(m), 50 + 42 * Math.sin(m)]);
      pts.push([50 + 27 * Math.cos(b), 50 + 27 * Math.sin(b)]);
    }
    return pts.map(function (p) { return [+p[0].toFixed(1), +p[1].toFixed(1)]; });
  }
  function chaikin(pts, n) {
    for (var k = 0; k < n; k++) {
      var out = [pts[0]];
      for (var i = 0; i < pts.length - 1; i++) {
        var a = pts[i], b = pts[i + 1];
        out.push([+(0.75 * a[0] + 0.25 * b[0]).toFixed(1), +(0.75 * a[1] + 0.25 * b[1]).toFixed(1)], [+(0.25 * a[0] + 0.75 * b[0]).toFixed(1), +(0.25 * a[1] + 0.75 * b[1]).toFixed(1)]);
      }
      out.push(pts[pts.length - 1]); pts = out;
    }
    return pts;
  }
  var DOODLES = {
    house: [[[12, 46], [50, 14], [88, 46], [12, 46]], [[22, 46], [22, 86], [78, 86], [78, 46]], [[42, 86], [42, 62], [58, 62], [58, 86]], [[62, 52], [72, 52], [72, 62], [62, 62], [62, 52]]],
    sun: [circ(50, 50, 18), sunRays()],
    tree: [[[44, 90], [44, 58]], [[56, 90], [56, 58]], circ(50, 36, 26)],
    fish: [circ(44, 50, 28, 0, 360).map(function (p) { return [50 + (p[0] - 44) * 1.15 - 6, 50 + (p[1] - 50) * 0.78]; }), [[76, 50], [94, 32], [94, 68], [76, 50]], circ(30, 44, 3, 0, 360, 10)],
    star: [starPts()],
    heart: [heartPts()],
    cat: [circ(50, 58, 28), [[26, 42], [28, 12], [44, 30]], [[74, 42], [72, 12], [56, 30]], circ(40, 54, 3, 0, 360, 10), circ(60, 54, 3, 0, 360, 10)],
    flower: [circ(50, 36, 7, 0, 360, 14), circ(50, 36, 22, 0, 360, 36).map(function (p, i) { var r = 1 + 0.22 * Math.sin(i / 36 * 2 * Math.PI * 5); return [50 + (p[0] - 50) * r, 36 + (p[1] - 36) * r]; }), [[50, 60], [50, 92]], [[50, 78], [70, 66], [64, 84], [50, 78]]],
    car: [[[8, 66], [8, 50], [24, 46], [34, 30], [66, 30], [78, 46], [94, 50], [94, 66], [8, 66]], circ(30, 68, 9), circ(72, 68, 9)],
    boat: [[[12, 62], [88, 62], [72, 84], [28, 84], [12, 62]], [[50, 62], [50, 14]], [[52, 16], [82, 56], [52, 56]]],
    moon: [],
    umbrella: [circ(50, 52, 38, 180, 360, 24).concat([[12, 52]]), [[50, 52], [50, 82], [44, 90], [37, 84]]],
    cloud: [chaikin([[22, 70], [12, 58], [20, 46], [32, 44], [38, 32], [52, 26], [64, 34], [68, 42], [80, 42], [90, 54], [84, 68], [76, 70], [22, 70]], 2)],
    key: [circ(28, 42, 17), [[45, 42], [90, 42]], [[78, 42], [78, 56]], [[90, 42], [90, 52]]],
    apple: [circ(50, 58, 28), [[50, 32], [53, 16]], [[53, 24], [68, 14], [64, 28], [53, 24]]],
    crown: [[[14, 76], [14, 34], [34, 54], [50, 22], [66, 54], [86, 34], [86, 76], [14, 76]], circ(14, 30, 3, 0, 360, 8), circ(50, 18, 3, 0, 360, 8), circ(86, 30, 3, 0, 360, 8)]
  };
  // proper crescent (outer arc then inner arc back)
  (function () {
    var outer = circ(50, 50, 34, 60, 300, 30);
    var inner = circ(72, 50, 29.8, 260.4, 99.6, 24); // decreasing angle → passes through 180°
    DOODLES.moon = [outer.concat(inner)];
  })();

  var PROMPT_IDS = Object.keys(ICONS);

  /* ───────────── RNG ───────────── */
  function mulberry32(a) {
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      var t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  function shuffle(arr, rng) {
    rng = rng || Math.random;
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(rng() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }
  function pickPrompts(n, rng, exclude) {
    var pool = PROMPT_IDS.filter(function (id) { return !exclude || exclude.indexOf(id) < 0; });
    return shuffle(pool, rng).slice(0, n);
  }

  /* ───────────── multiple-choice builder ───────────── */
  // Exactly ONE correct answer; distractors are distinct ids; positions randomised.
  function buildChoices(correctId, n, rng) {
    n = Math.max(2, Math.min(n || CONFIG.CHOICES, PROMPT_IDS.length));
    var others = shuffle(PROMPT_IDS.filter(function (id) { return id !== correctId; }), rng).slice(0, n - 1);
    var ids = shuffle(others.concat([correctId]), rng);
    return { ids: ids, correctIndex: ids.indexOf(correctId) };
  }

  /* ───────────── stroke board (the five-stroke rule) ───────────── */
  function clampPt(v) { return v < 0 ? 0 : v > CONFIG.CANVAS ? CONFIG.CANVAS : v; }

  function StrokeBoard(opts) {
    opts = opts || {};
    this.max = opts.max || CONFIG.MAX_STROKES;
    this.strokes = [];     // finished + active strokes: {c, w, p:[[x,y],...]}
    this.active = null;
    this.activePointer = null;
  }
  StrokeBoard.prototype.begin = function (pointerId, x, y, color, width) {
    if (this.active) return false;                       // rule 4
    if (this.strokes.length >= this.max) return false;   // rule 2
    this.active = { c: color, w: width, p: [[clampPt(x), clampPt(y)]] };
    this.activePointer = pointerId;
    this.strokes.push(this.active);
    return true;
  };
  StrokeBoard.prototype.move = function (pointerId, x, y) {
    if (!this.active || pointerId !== this.activePointer) return false;
    x = clampPt(x); y = clampPt(y);                       // rule 5
    var p = this.active.p, last = p[p.length - 1];
    if (p.length >= CONFIG.MAX_POINTS) return false;      // rule 7
    var dx = x - last[0], dy = y - last[1];
    if (dx * dx + dy * dy < CONFIG.MIN_STEP * CONFIG.MIN_STEP) return false;
    p.push([x, y]);
    return true;
  };
  StrokeBoard.prototype.end = function (pointerId) {
    if (!this.active || pointerId !== this.activePointer) return false;
    var s = this.active;
    if (s.p.length === 1) s.p.push([s.p[0][0], s.p[0][1]]); // a tap is a dot (still one stroke)
    this.active = null; this.activePointer = null;
    return true;
  };
  StrokeBoard.prototype.undo = function () {
    if (this.active) this.end(this.activePointer);
    return this.strokes.pop() || null;                    // rule 3
  };
  StrokeBoard.prototype.clear = function () {
    this.active = null; this.activePointer = null; this.strokes = [];
  };
  StrokeBoard.prototype.count = function () { return this.strokes.length; };
  StrokeBoard.prototype.remaining = function () { return this.max - this.strokes.length; };
  StrokeBoard.prototype.colorsUsed = function () {
    var set = {};
    this.strokes.forEach(function (s) { set[s.c] = 1; });
    return Object.keys(set).length;
  };
  StrokeBoard.prototype.inkLength = function () { return inkLength(this.strokes); };

  function inkLength(strokes) {
    var len = 0;
    strokes.forEach(function (s) {
      for (var i = 1; i < s.p.length; i++) {
        var dx = s.p[i][0] - s.p[i - 1][0], dy = s.p[i][1] - s.p[i - 1][1];
        len += Math.sqrt(dx * dx + dy * dy);
      }
    });
    return len;
  }

  /* ───────────── scoring ───────────── */
  // Guesser: correct = 100 + time bonus (0..50, linear in remaining time). Wrong/expired = 0 (never negative).
  function scoreGuess(o) {
    if (!o || !o.correct) return 0;
    var total = Math.max(1, o.totalMs), rem = Math.max(0, Math.min(total, o.remainingMs));
    return CONFIG.SCORE_CORRECT + Math.floor(CONFIG.SCORE_TIME_BONUS_MAX * rem / total);
  }
  // Drawer: +20 for submitting a drawing (>=1 stroke), +60 if identified, +10 if 3+ colours (cap).
  function scoreDraw(o) {
    if (!o || !o.strokes || o.strokes < 1) return 0;
    if (o.recognizable === false) return 0;
    if (o.recognizable == null && o.quality != null && o.quality < 0.88) return 0;
    var s = CONFIG.SCORE_DRAW_COMPLETE;
    if (o.identified && o.recognizable !== false) s += CONFIG.SCORE_DRAW_CLEAR;
    if (o.colors >= 3) s += CONFIG.SCORE_CREATIVE;
    return s;
  }
  function samplePolyline(points, step) {
    var out = [];
    if (!Array.isArray(points) || points.length === 0) return out;
    out.push([points[0][0], points[0][1]]);
    for (var i = 1; i < points.length; i++) {
      var a = points[i - 1], b = points[i];
      var dx = b[0] - a[0], dy = b[1] - a[1];
      var length = Math.sqrt(dx * dx + dy * dy);
      var parts = Math.max(1, Math.ceil(length / (step || 4)));
      for (var j = 1; j <= parts; j++) {
        var t = j / parts;
        out.push([a[0] + dx * t, a[1] + dy * t]);
      }
    }
    return out;
  }
  function drawingQuality(strokes, promptId) {
    var target = DOODLES[promptId];
    if (!Array.isArray(target) || target.length === 0 || !Array.isArray(strokes) || strokes.length === 0) return 0;
    var drawn = [], ink = 0;
    for (var s = 0; s < strokes.length; s++) {
      var raw = strokes[s] && strokes[s].p;
      if (!Array.isArray(raw) || raw.length === 0) continue;
      var normalized = raw.map(function (p) { return [Number(p[0]) / 10, Number(p[1]) / 10]; });
      var sampled = samplePolyline(normalized, 4);
      drawn = drawn.concat(sampled);
      for (var i = 1; i < normalized.length; i++) {
        var dx = normalized[i][0] - normalized[i - 1][0];
        var dy = normalized[i][1] - normalized[i - 1][1];
        ink += Math.sqrt(dx * dx + dy * dy);
      }
    }
    if (drawn.length === 0 || ink < 12) return 0;
    var expected = [];
    for (var t = 0; t < target.length; t++) {
      expected = expected.concat(samplePolyline(target[t], 4));
    }
    if (expected.length === 0) return 0;
    var radius = 16;
    function coverage(source, reference) {
      if (!source.length || !reference.length) return 0;
      var close = 0;
      for (var i = 0; i < source.length; i++) {
        var nearest = Infinity;
        for (var j = 0; j < reference.length; j++) {
          var dx = source[i][0] - reference[j][0], dy = source[i][1] - reference[j][1];
          var d = dx * dx + dy * dy;
          if (d < nearest) nearest = d;
          if (nearest < radius * radius) break;
        }
        if (nearest <= radius * radius) close++;
      }
      return close / source.length;
    }
    function meanDistance(source, reference) {
      if (!source.length || !reference.length) return 100;
      var total = 0;
      for (var i = 0; i < source.length; i++) {
        var nearest = Infinity;
        for (var j = 0; j < reference.length; j++) {
          var dx = source[i][0] - reference[j][0], dy = source[i][1] - reference[j][1];
          var d = dx * dx + dy * dy;
          if (d < nearest) nearest = d;
          if (nearest < 1) break;
        }
        total += Math.sqrt(nearest);
      }
      return total / source.length;
    }
    var targetCoverage = coverage(expected, drawn);
    var drawingCoverage = coverage(drawn, expected);
    var targetDistance = meanDistance(expected, drawn);
    var drawingDistance = meanDistance(drawn, expected);
    var distanceScore = Math.exp(-((targetDistance + drawingDistance) / 2) / 22);
    var expectedInk = 0;
    for (var e = 1; e < expected.length; e++) {
      var ex = expected[e][0] - expected[e - 1][0], ey = expected[e][1] - expected[e - 1][1];
      expectedInk += Math.sqrt(ex * ex + ey * ey);
    }
    if (ink < expectedInk * 0.35 || targetCoverage < 0.62 || drawingCoverage < 0.52) return 0;
    if (promptId === 'moon' && (targetCoverage < 0.72 || drawingCoverage < 0.68)) return 0;
    var quality = targetCoverage * 0.38 + drawingCoverage * 0.32 + distanceScore * 0.30;
    return Math.max(0, Math.min(1, quality));
  }
  // Practice-only rival: transparent heuristic, NOT real recognition.
  function botChance(strokes) {
    var n = strokes.length, ink = inkLength(strokes);
    if (n === 0) return 0;
    var c = 0.30 + 0.12 * Math.min(n, 4) + Math.min(0.25, ink / 4000);
    return Math.max(0, Math.min(0.92, c));
  }
  function botGuess(strokes, rng, promptId) {
    var quality = promptId ? drawingQuality(strokes, promptId) : botChance(strokes);
    var p = promptId ? quality : botChance(strokes);
    return { chance: p, correct: promptId ? quality >= 0.88 : (rng || Math.random)() < p };
  }

  /* ───────────── practice session (state machine) ───────────── */
  // Round kinds alternate: 'guess' (watch a built-in doodle, pick the icon) and 'draw'.
  function PracticeSession(opts) {
    opts = opts || {};
    this.rng = opts.rng || Math.random;
    this.rounds = opts.rounds || CONFIG.ROUNDS;
    this.drawMs = (opts.drawSeconds || CONFIG.DRAW_SECONDS) * 1000;
    this.guessMs = (opts.guessSeconds || CONFIG.GUESS_SECONDS) * 1000;
    this.prompts = pickPrompts(this.rounds, this.rng);
    this.index = -1;
    this.score = 0;
    this.history = [];
    this.state = 'idle';       // idle | playing | resolved | finished
    this.current = null;
  }
  PracticeSession.prototype.next = function () {
    if (this.state === 'playing') return null;              // cannot skip an unresolved round
    this.index++;
    if (this.index >= this.rounds) { this.state = 'finished'; this.current = null; return null; }
    var kind = this.index % 2 === 0 ? 'guess' : 'draw';
    var pid = this.prompts[this.index];
    var r = { index: this.index, kind: kind, promptId: pid, answered: false, points: 0, totalMs: kind === 'draw' ? this.drawMs : this.guessMs };
    if (kind === 'guess') { var ch = buildChoices(pid, CONFIG.CHOICES, this.rng); r.choices = ch.ids; r.correctIndex = ch.correctIndex; }
    this.current = r; this.state = 'playing';
    return r;
  };
  PracticeSession.prototype.submitGuess = function (idx, remainingMs) {
    var r = this.current;
    if (this.state !== 'playing' || !r || r.kind !== 'guess' || r.answered) return null; // one answer only
    if (!(idx >= 0 && idx < r.choices.length) || idx !== Math.floor(idx)) return null;
    if (remainingMs <= 0) return this.expire();                                   // timer boundary: 0 = expired
    r.answered = true;
    var correct = idx === r.correctIndex;
    r.points = scoreGuess({ correct: correct, remainingMs: remainingMs, totalMs: r.totalMs });
    return this._resolve({ result: correct ? 'correct' : 'wrong', picked: idx });
  };
  PracticeSession.prototype.finishDraw = function (board, rng) {
    var r = this.current;
    if (this.state !== 'playing' || !r || r.kind !== 'draw' || r.answered) return null;
    r.answered = true;
    var n = board.count();
    var bot = n > 0 ? botGuess(board.strokes, rng || this.rng, r.promptId) : { chance: 0, correct: false };
    r.points = scoreDraw({ strokes: n, identified: bot.correct, colors: board.colorsUsed(), quality: bot.chance, recognizable: bot.correct });
    return this._resolve({ result: n === 0 ? 'empty' : bot.correct ? 'identified' : 'missed', strokes: n, chance: bot.chance });
  };
  PracticeSession.prototype.expire = function () {
    var r = this.current;
    if (this.state !== 'playing' || !r || r.answered) return null;
    r.answered = true; r.points = 0;
    return this._resolve({ result: 'expired' });
  };
  PracticeSession.prototype._resolve = function (extra) {
    var r = this.current;
    this.score += r.points;
    this.state = 'resolved';
    var out = { index: r.index, kind: r.kind, promptId: r.promptId, points: r.points, total: this.score };
    for (var k in extra) out[k] = extra[k];
    this.history.push(out);
    return out;
  };
  PracticeSession.prototype.isLast = function () { return this.index >= this.rounds - 1; };
  PracticeSession.prototype.stars = function () {
    var max = Math.ceil(this.rounds / 2) * (CONFIG.SCORE_CORRECT + CONFIG.SCORE_TIME_BONUS_MAX) +
      Math.floor(this.rounds / 2) * (CONFIG.SCORE_DRAW_COMPLETE + CONFIG.SCORE_DRAW_CLEAR + CONFIG.SCORE_CREATIVE);
    var f = max ? this.score / max : 0;
    return f >= 0.75 ? 3 : f >= 0.45 ? 2 : f >= 0.15 ? 1 : 0;
  };

  /* ───────────── network message validation (client AND server) ───────────── */
  function isNum(v) { return typeof v === 'number' && isFinite(v); }
  function validStrokeId(v) { return typeof v === 'number' && v >= 0 && v < 64 && Math.floor(v) === v; }
  function validatePoints(pts) {
    if (!Array.isArray(pts) || pts.length === 0 || pts.length > 64) return null; // per-message chunk cap
    var out = [];
    for (var i = 0; i < pts.length; i++) {
      var p = pts[i];
      if (!Array.isArray(p) || p.length !== 2 || !isNum(p[0]) || !isNum(p[1])) return null;
      out.push([Math.round(clampPt(p[0])), Math.round(clampPt(p[1]))]);
    }
    return out;
  }
  function validColor(c) { return typeof c === 'string' && COLORS.indexOf(c) >= 0; }
  function validWidth(w) { return typeof w === 'number' && WIDTHS.indexOf(w) >= 0; }
  var NAME_ICONS = 12; // predefined nickname parts
  var NICK_A = ['Zippy', 'Bouncy', 'Sneaky', 'Mighty', 'Sunny', 'Turbo', 'Fuzzy', 'Cosmic', 'Wobbly', 'Jolly', 'Speedy', 'Chill'];
  var NICK_B = ['Fox', 'Panda', 'Owl', 'Otter', 'Gecko', 'Llama', 'Koala', 'Moose', 'Yeti', 'Falcon', 'Newt', 'Lynx'];
  function nickname(a, b) {
    if (!(a >= 0 && a < NICK_A.length && b >= 0 && b < NICK_B.length)) return null;
    return NICK_A[a | 0] + ' ' + NICK_B[b | 0];
  }
  var REACTION_COUNT = 6; // predefined reactions, sent as ids 0..5 (art lives in the client)

  /* ───────────── save data (versioned, validated, migratable) ───────────── */
  function defaultSave() {
    return {
      v: CONFIG.SAVE_VERSION,
      music: 0.5, sfx: 0.8, muted: false,
      reducedMotion: false, highContrast: false, bigText: false,
      tutorialDone: false, character: 0, nickA: 0, nickB: 0,
      rounds: CONFIG.ROUNDS, timerMode: 1, lang: '', uid: '',
      stats: { games: 0, best: 0, correct: 0, rounds: 0 },
      blocked: []
    };
  }
  function clamp01(v, d) { return typeof v === 'number' && isFinite(v) ? Math.max(0, Math.min(1, v)) : d; }
  function bool(v, d) { return typeof v === 'boolean' ? v : d; }
  function intIn(v, lo, hi, d) { return typeof v === 'number' && isFinite(v) && Math.floor(v) === v && v >= lo && v <= hi ? v : d; }
  // Accepts anything (string/object/null); always returns a valid save object.
  function sanitizeSave(raw) {
    var d = defaultSave(), o = raw;
    if (typeof raw === 'string') { try { o = JSON.parse(raw); } catch (e) { return d; } }
    if (!o || typeof o !== 'object' || Array.isArray(o)) return d;
    // v1 → v2 migration: v1 stored "sound" (0..1) and "soundOn"
    if (o.v === 1 || o.v === undefined) {
      if (typeof o.sound === 'number') o.sfx = o.sound;
      if (typeof o.soundOn === 'boolean') o.muted = !o.soundOn;
    }
    var st = o.stats && typeof o.stats === 'object' ? o.stats : {};
    var blocked = Array.isArray(o.blocked) ? o.blocked.filter(function (x) { return typeof x === 'string' && /^[A-Za-z0-9_-]{4,40}$/.test(x); }).slice(0, 50) : [];
    return {
      v: CONFIG.SAVE_VERSION,
      music: clamp01(o.music, d.music), sfx: clamp01(o.sfx, d.sfx), muted: bool(o.muted, d.muted),
      reducedMotion: bool(o.reducedMotion, d.reducedMotion), highContrast: bool(o.highContrast, d.highContrast), bigText: bool(o.bigText, d.bigText),
      tutorialDone: bool(o.tutorialDone, d.tutorialDone),
      character: intIn(o.character, 0, 1, 0), nickA: intIn(o.nickA, 0, NICK_A.length - 1, 0), nickB: intIn(o.nickB, 0, NICK_B.length - 1, 0),
      rounds: [4, 6, 8].indexOf(o.rounds) >= 0 ? o.rounds : d.rounds,
      timerMode: intIn(o.timerMode, 0, 2, 1),
      lang: 'en',
      uid: typeof o.uid === 'string' && /^[a-f0-9]{16}$/.test(o.uid) ? o.uid : '',
      stats: {
        games: intIn(st.games, 0, 1e7, 0), best: intIn(st.best, 0, 1e6, 0),
        correct: intIn(st.correct, 0, 1e7, 0), rounds: intIn(st.rounds, 0, 1e7, 0)
      },
      blocked: blocked
    };
  }

  return {
    CONFIG: CONFIG, COLORS: COLORS, WIDTHS: WIDTHS, ICONS: ICONS, DOODLES: DOODLES, PROMPT_IDS: PROMPT_IDS,
    NICK_A: NICK_A, NICK_B: NICK_B, REACTION_COUNT: REACTION_COUNT,
    mulberry32: mulberry32, shuffle: shuffle, pickPrompts: pickPrompts, buildChoices: buildChoices,
    StrokeBoard: StrokeBoard, inkLength: inkLength, clampPt: clampPt,
    scoreGuess: scoreGuess, scoreDraw: scoreDraw, drawingQuality: drawingQuality, botChance: botChance, botGuess: botGuess,
    PracticeSession: PracticeSession,
    validatePoints: validatePoints, validStrokeId: validStrokeId, validColor: validColor, validWidth: validWidth, nickname: nickname,
    defaultSave: defaultSave, sanitizeSave: sanitizeSave
  };
});
