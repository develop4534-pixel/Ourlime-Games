/* DOODLE DUEL — drawing pad: pointer input → StrokeBoard (rules live in core.js), smooth rendering,
   remote-stroke playback for guessers, and the animated replay of the built-in doodles. */
(function (root) {
  'use strict';
  var D = root.DD, CV = D.CONFIG.CANVAS;

  function Pad(canvas) {
    this.cv = canvas; this.ctx = canvas.getContext('2d', { alpha: false });
    this.board = new D.StrokeBoard();
    this.mode = 'off';            // 'draw' | 'view' | 'off'
    this.locked = false;
    this.color = D.COLORS[1]; this.width = D.WIDTHS[1];
    this.remote = [];             // strokes shown in view mode
    this.size = 300; this.scale = 0.3; this.dpr = 1; this.bg = null;
    this.raf = 0; this.replayRaf = 0; this.dirty = true;
    this.cb = {};                 // onStart(idx,c,w,pt) onPoints(idx,pts) onEnd(idx) onLimit() onChange()
    this._pending = []; this._bind();
  }

  Pad.prototype._bind = function () {
    var self = this, cv = this.cv;
    cv.addEventListener('pointerdown', function (e) {
      if (self.mode !== 'draw' || self.locked) return;
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      e.preventDefault();
      var p = self._pt(e);
      if (self.board.begin(e.pointerId, p.x, p.y, self.color, self.width)) {
        try { cv.setPointerCapture(e.pointerId); } catch (err) { }
        self._pending = [];
        if (self.cb.onStart) self.cb.onStart(self.board.count() - 1, self.color, self.width, [Math.round(p.x), Math.round(p.y)]);
        if (root.AUDIO) root.AUDIO.drawStart();
        self._changed();
      } else if (!self.board.active && self.board.count() >= self.board.max && self.cb.onLimit) self.cb.onLimit();
    });
    cv.addEventListener('pointermove', function (e) {
      if (self.mode !== 'draw' || !self.board.active) return;
      e.preventDefault();
      var evs = e.getCoalescedEvents ? e.getCoalescedEvents() : null;
      if (!evs || !evs.length) evs = [e];
      var added = [];
      for (var i = 0; i < evs.length; i++) {
        var p = self._pt(evs[i]);
        if (self.board.move(e.pointerId, p.x, p.y)) added.push([Math.round(p.x), Math.round(p.y)]);
      }
      if (added.length) {
        if (self.cb.onPoints) self.cb.onPoints(self.board.count() - 1, added);
        self._changed();
      }
    });
    function up(e) {
      if (!self.board.active) return;
      var idx = self.board.count() - 1;
      if (self.board.end(e.pointerId)) {
        if (root.AUDIO) root.AUDIO.drawStop();
        if (self.cb.onEnd) self.cb.onEnd(idx);
        self._changed();
      }
    }
    cv.addEventListener('pointerup', up);
    cv.addEventListener('pointercancel', up);
    cv.addEventListener('lostpointercapture', up);
    cv.addEventListener('contextmenu', function (e) { e.preventDefault(); });
    cv.addEventListener('touchmove', function (e) { if (self.mode === 'draw') e.preventDefault(); }, { passive: false });
    if (typeof ResizeObserver !== 'undefined') new ResizeObserver(function () { self.resize(); }).observe(cv);
    else root.addEventListener('resize', function () { self.resize(); });
  };

  Pad.prototype._pt = function (e) {
    var r = this.cv.getBoundingClientRect();
    return { x: (e.clientX - r.left) / r.width * CV, y: (e.clientY - r.top) / r.height * CV };
  };
  Pad.prototype._changed = function () { this.dirty = true; if (this.cb.onChange) this.cb.onChange(); this._schedule(); };
  Pad.prototype._schedule = function () {
    var self = this; if (this.raf) return;
    this.raf = requestAnimationFrame(function () { self.raf = 0; if (self.dirty) self.render(); });
  };

  Pad.prototype.resize = function () {
    var r = this.cv.getBoundingClientRect();
    if (!r.width || !r.height) return;
    var dpr = Math.min(root.devicePixelRatio || 1, 2.5);
    var px = Math.max(64, Math.round(r.width * dpr));
    if (this.cv.width !== px || this.size !== r.width) {
      this.cv.width = px; this.cv.height = px; this.size = r.width; this.dpr = dpr; this.bg = null;
    }
    this.scale = px / CV; this.dirty = true; this.render();
  };

  Pad.prototype._makeBg = function () {
    var n = this.cv.width, c = document.createElement('canvas'); c.width = c.height = n;
    var g = c.getContext('2d');
    g.fillStyle = '#ffffff';
    g.fillRect(0, 0, n, n);
    this.bg = c;
  };

  Pad.prototype._strokePath = function (ctx, s) {
    var p = s.p, k = this.scale;
    if (p.length < 2) return false;
    if (s.sharp) { ctx.beginPath(); ctx.moveTo(p[0][0] * k, p[0][1] * k); for (var j = 1; j < p.length; j++) ctx.lineTo(p[j][0] * k, p[j][1] * k); return true; }
    ctx.beginPath(); ctx.moveTo(p[0][0] * k, p[0][1] * k);
    if (p.length === 2) { ctx.lineTo(p[1][0] * k, p[1][1] * k); return true; }
    for (var i = 1; i < p.length - 1; i++) {
      var mx = (p[i][0] + p[i + 1][0]) / 2 * k, my = (p[i][1] + p[i + 1][1]) / 2 * k;
      ctx.quadraticCurveTo(p[i][0] * k, p[i][1] * k, mx, my);       // midpoint smoothing → no jagged corners
    }
    var l = p[p.length - 1]; ctx.lineTo(l[0] * k, l[1] * k);
    return true;
  };
  Pad.prototype._drawStroke = function (ctx, s) {
    var k = this.scale, w = s.w * k, o = Math.max(1.5, 7 * k);
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    var isDot = s.p.length < 2 || (s.p.length === 2 && s.p[0][0] === s.p[1][0] && s.p[0][1] === s.p[1][1]);
    if (isDot) {
      var x = s.p[0][0] * k, y = s.p[0][1] * k;
      ctx.fillStyle = '#1b1b2f'; ctx.beginPath(); ctx.arc(x, y, w / 2 + o / 2, 0, 6.2832); ctx.fill();
      ctx.fillStyle = s.c; ctx.beginPath(); ctx.arc(x, y, w / 2, 0, 6.2832); ctx.fill();
      return;
    }
    this._strokePath(ctx, s); ctx.strokeStyle = '#1b1b2f'; ctx.lineWidth = w + o; ctx.stroke();   // sticker outline
    this._strokePath(ctx, s); ctx.strokeStyle = s.c; ctx.lineWidth = w; ctx.stroke();
  };

  Pad.prototype.render = function () {
    this.dirty = false;
    if (!this.bg || this.bg.width !== this.cv.width) this._makeBg();
    var ctx = this.ctx; ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(this.bg, 0, 0);
    var list = this.mode === 'draw' ? this.board.strokes : this.remote;
    for (var i = 0; i < list.length; i++) this._drawStroke(ctx, list[i]);
  };

  Pad.prototype.setMode = function (m) {
    this.mode = m; this.locked = false; this.cancelReplay();
    if (m !== 'draw' && this.board.active) this.board.end(this.board.activePointer);
    if (root.AUDIO) root.AUDIO.drawStop();
    this.cv.parentNode.classList.toggle('locked', m !== 'draw');
    this._changed();
  };
  Pad.prototype.lock = function (v) {
    this.locked = !!v;
    if (v && this.board.active) { var i = this.board.count() - 1; this.board.end(this.board.activePointer); if (this.cb.onEnd) this.cb.onEnd(i); }
    if (root.AUDIO) root.AUDIO.drawStop();
    this.cv.parentNode.classList.toggle('locked', !!v || this.mode !== 'draw');
  };
  Pad.prototype.reset = function () { this.board.clear(); this.remote = []; this.cancelReplay(); this._changed(); };
  Pad.prototype.undo = function () { var s = this.board.undo(); this._changed(); return s; };
  Pad.prototype.clear = function () { this.board.clear(); this._changed(); };

  /* remote strokes (multiplayer guessers). Defensive: ids are 0..63, limited to MAX_STROKES. */
  Pad.prototype.remoteStroke = function (m) {
    var pts = D.validatePoints(m.pts);
    if (!pts || !D.validStrokeId(m.id) || !D.validColor(m.c) || !D.validWidth(m.w)) return false;
    if (m.first) {
      if (this.remote.length >= D.CONFIG.MAX_STROKES) return false;
      this.remote.push({ id: m.id, c: m.c, w: m.w, p: pts.slice(0, D.CONFIG.MAX_POINTS) });
    } else {
      var s = this.remote[this.remote.length - 1];
      if (!s || s.id !== m.id) return false;
      for (var i = 0; i < pts.length && s.p.length < D.CONFIG.MAX_POINTS; i++) s.p.push(pts[i]);
    }
    var last = this.remote[this.remote.length - 1];
    if (last.p.length === 1) last.p.push([last.p[0][0], last.p[0][1]]);
    this._changed(); return true;
  };
  Pad.prototype.remoteUndo = function () { this.remote.pop(); this._changed(); };
  Pad.prototype.remoteClear = function () { this.remote = []; this._changed(); };
  Pad.prototype.setRemote = function (strokes) {
    this.remote = [];
    var self = this;
    (strokes || []).slice(0, D.CONFIG.MAX_STROKES).forEach(function (s) {
      var pts = D.validatePoints(s.p ? s.p.slice(0, 64) : null);
      if (pts && D.validColor(s.c) && D.validWidth(s.w)) { var all = []; for (var i = 0; i < s.p.length && all.length < D.CONFIG.MAX_POINTS; i++) all.push([Math.round(D.clampPt(+s.p[i][0])), Math.round(D.clampPt(+s.p[i][1]))]); self.remote.push({ id: s.id, c: s.c, w: s.w, p: all }); }
    });
    this._changed();
  };

  /* animated replay of an authored doodle (guess rounds) */
  Pad.prototype.cancelReplay = function () { if (this.replayRaf) cancelAnimationFrame(this.replayRaf); this.replayRaf = 0; };
  Pad.prototype.playDoodle = function (promptId, ms, instant) {
    var self = this, def = D.DOODLES[promptId] || [];
    var cols = ['#1e6bff', '#ff3b3b', '#2ecc71', '#ff9f1c', '#b05cff'];
    var full = def.map(function (pts, i) { return { c: cols[i % cols.length], w: 22, sharp: true, p: pts.map(function (q) { return [q[0] * 10, q[1] * 10]; }) }; });
    var lens = full.map(function (s) { return D.inkLength([s]) + 40; }), total = lens.reduce(function (a, b) { return a + b; }, 0) || 1;
    this.cancelReplay();
    if (instant) { this.remote = full; this._changed(); return; }
    var t0 = performance.now();
    function frame(now) {
      var f = Math.min(1, (now - t0) / ms), want = f * total, acc = 0, out = [];
      for (var i = 0; i < full.length; i++) {
        var seg = lens[i], part = Math.max(0, Math.min(1, (want - acc) / seg)); acc += seg;
        if (part <= 0) break;
        var pts = full[i].p, keep = Math.max(2, Math.ceil(pts.length * part));
        out.push({ c: full[i].c, w: full[i].w, sharp: true, p: pts.slice(0, keep) });
        if (part < 1) break;
      }
      self.remote = out; self.render();
      if (f < 1) self.replayRaf = requestAnimationFrame(frame); else { self.replayRaf = 0; self.remote = full; self.render(); }
    }
    this.remote = []; this.replayRaf = requestAnimationFrame(frame);
  };

  root.Pad = Pad;
})(typeof self !== 'undefined' ? self : this);
