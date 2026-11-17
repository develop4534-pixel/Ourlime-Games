/* DOODLE DUEL — multiplayer client transport: validation, heartbeat, token-based reconnect.
   The server is authoritative for rounds, timers and scoring; the client only sends intents. */
(function (root) {
  'use strict';
  var PRIVATE_HOST = /^(localhost|127\.0\.0\.1|\[::1\]|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+|[a-z0-9-]+\.local)$/i;

  // Secure transport rule: wss:// anywhere; ws:// only for localhost / private networks (development).
  function validUrl(u) {
    if (typeof u !== 'string' || u.length > 200) return null;
    u = u.trim();
    var m = /^(wss?):\/\/([^\/?#:]+|\[::1\])(:\d{1,5})?(\/[^\s?#]*)?$/i.exec(u);
    if (!m) return null;
    if (m[1].toLowerCase() === 'ws' && !PRIVATE_HOST.test(m[2])) return null;
    return u;
  }

  function Net() {
    this.h = {}; this.ws = null; this.state = 'closed'; this.url = ''; this.hello = null; this.intent = null;
    this.token = null; this.room = null; this.manual = false; this.tries = 0; this.deadline = 0;
    this.lastRx = 0; this.hb = null; this.ct = null; this.rt = null; this.everOpen = false;
  }
  Net.validUrl = validUrl;
  Net.prototype.on = function (t, fn) { (this.h[t] = this.h[t] || []).push(fn); return this; };
  Net.prototype.off = function () { this.h = {}; };
  Net.prototype.emit = function (t, d) { var a = this.h[t]; if (a) a.slice().forEach(function (f) { try { f(d); } catch (e) { if (root.console) console.error(e); } }); };

  // intent: {t:'create',...} | {t:'join',code}
  Net.prototype.open = function (url, hello, intent) {
    this.close(true);
    var v = validUrl(url);
    if (!v) { this.emit('fail', { why: 'url' }); return; }
    this.url = v; this.hello = hello; this.intent = intent; this.manual = false; this.tries = 0; this.token = null; this.room = null; this.everOpen = false;
    this._connect();
  };
  Net.prototype._connect = function () {
    var self = this;
    try { if (this.ws) { this.ws.onclose = this.ws.onerror = this.ws.onmessage = this.ws.onopen = null; this.ws.close(); } } catch (e) { }
    this.state = this.everOpen ? 'reconnecting' : 'connecting'; this.emit('status', this.state);
    var ws;
    try { ws = new WebSocket(this.url); } catch (e) { this._lost('connect'); return; }
    this.ws = ws;
    clearTimeout(this.ct);
    this.ct = setTimeout(function () { if (ws.readyState !== 1) { try { ws.close(); } catch (e) { } } }, 8000);
    ws.onopen = function () {
      clearTimeout(self.ct); self.everOpen = true; self.lastRx = Date.now();
      var hello = { t: 'hello', n: self.hello.n, ch: self.hello.ch };
      if (self.token && self.room) hello.resume = { room: self.room, token: self.token };
      self._raw(hello);
      self._startHb();
    };
    ws.onmessage = function (ev) {
      self.lastRx = Date.now();
      if (typeof ev.data !== 'string' || ev.data.length > 30000) return;
      var m; try { m = JSON.parse(ev.data); } catch (e) { return; }
      if (!m || typeof m !== 'object' || typeof m.t !== 'string') return;
      if (m.t === 'welcome') {
        var resumed = !!m.resumed;
        self.token = m.token; self.id = m.id; self.state = 'open'; self.tries = 0; self.emit('status', 'open');
        if (!resumed && self.intent) { self._raw(self.intent); self.intent = null; }
      } else if (m.t === 'room' && typeof m.code === 'string') { self.room = m.code; }
      if (m.t === 'pong') return;
      self.emit(m.t, m);
    };
    ws.onerror = function () { };
    ws.onclose = function () { clearTimeout(self.ct); self._stopHb(); if (!self.manual) self._lost('close'); };
  };
  Net.prototype._lost = function (why) {
    var self = this;
    if (this.manual) return;
    if (!this.everOpen) { this.state = 'closed'; this.emit('fail', { why: why }); return; }
    if (!this.room || !this.token) { this.state = 'closed'; this.emit('fail', { why: 'lost' }); return; }
    if (!this.deadline || this.state === 'open') this.deadline = Date.now() + 20000; // 20 s grace (matches server)
    if (Date.now() > this.deadline) { this.state = 'closed'; this.deadline = 0; this.emit('fail', { why: 'lost' }); return; }
    this.state = 'reconnecting'; this.emit('status', 'reconnecting');
    var wait = Math.min(3000, 500 * Math.pow(2, this.tries++));
    clearTimeout(this.rt); this.rt = setTimeout(function () { self._connect(); }, wait);
  };
  Net.prototype._raw = function (o) { try { if (this.ws && this.ws.readyState === 1) { this.ws.send(JSON.stringify(o)); return true; } } catch (e) { } return false; };
  Net.prototype.send = function (t, d) { if (this.state !== 'open') return false; var o = d || {}; o.t = t; return this._raw(o); };
  Net.prototype._startHb = function () {
    var self = this; this._stopHb();
    this.hb = setInterval(function () {
      if (Date.now() - self.lastRx > 25000) { try { self.ws.close(); } catch (e) { } return; }
      self._raw({ t: 'ping' });
    }, 8000);
  };
  Net.prototype._stopHb = function () { clearInterval(this.hb); this.hb = null; };
  Net.prototype.close = function (silent) {
    this.manual = true; this._stopHb(); clearTimeout(this.ct); clearTimeout(this.rt); this.deadline = 0;
    try { if (this.ws) { this.ws.onclose = null; this.ws.close(); } } catch (e) { }
    this.ws = null; this.state = 'closed'; this.token = null; this.room = null; this.intent = null;
    if (!silent) this.emit('status', 'closed');
  };
  // Mobile resume: probe the socket immediately instead of waiting for the heartbeat.
  Net.prototype.wake = function () {
    if (this.manual || !this.room) return;
    if (!this.ws || this.ws.readyState !== 1) { clearTimeout(this.rt); this.tries = 0; this._lost('wake'); }
    else this._raw({ t: 'ping' });
  };

  root.DDNet = Net;
})(typeof self !== 'undefined' ? self : this);
