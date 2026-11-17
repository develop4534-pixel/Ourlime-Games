/* GLITCH GARDEN — shared utilities: namespace, math, save data, input */
(function () {
  'use strict';
  var GG = (window.GG = window.GG || {});

  GG.clamp = function (v, a, b) { return v < a ? a : v > b ? b : v; };
  GG.lerp = function (a, b, t) { return a + (b - a) * t; };
  GG.rand = function (a, b) { return a + Math.random() * (b - a); };
  GG.$ = function (id) { return document.getElementById(id); };

  /* ---------------- Save / progression ---------------- */
  var KEY = 'glitchGarden.save.v1';
  var DEFAULTS = function () {
    return {
      v: 1,
      levels: {}, // id -> {done, bestScore, bestStars, bestCoins}
      settings: { music: 70, sfx: 80, mute: false, touch: null, reduce: false }
    };
  };
  var memoryStore = null; // fallback if localStorage unavailable
  var data = DEFAULTS();

  function num(v, a, b, d) {
    v = Number(v);
    return isFinite(v) ? GG.clamp(Math.round(v), a, b) : d;
  }
  function sanitize(raw) {
    var out = DEFAULTS();
    if (!raw || typeof raw !== 'object') return out;
    var s = raw.settings || {};
    out.settings.music = num(s.music, 0, 100, 70);
    out.settings.sfx = num(s.sfx, 0, 100, 80);
    out.settings.mute = s.mute === true;
    out.settings.touch = s.touch === true ? true : s.touch === false ? false : null;
    out.settings.reduce = s.reduce === true;
    var lv = raw.levels && typeof raw.levels === 'object' ? raw.levels : {};
    for (var i = 1; i <= 3; i++) {
      var l = lv[i];
      if (l && typeof l === 'object') {
        out.levels[i] = {
          done: l.done === true,
          bestScore: num(l.bestScore, 0, 1e7, 0),
          bestStars: num(l.bestStars, 0, 3, 0),
          bestCoins: num(l.bestCoins, 0, 9999, 0)
        };
      }
    }
    return out;
  }
  GG.save = {
    load: function () {
      var raw = null;
      try {
        var txt = window.localStorage.getItem(KEY);
        raw = txt ? JSON.parse(txt) : null;
      } catch (e) {
        raw = memoryStore;
      }
      data = sanitize(raw);
      return data;
    },
    write: function () {
      memoryStore = JSON.parse(JSON.stringify(data));
      try { window.localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) { /* storage unavailable: memory only */ }
    },
    get data() { return data; },
    settings: function () { return data.settings; },
    isUnlocked: function (id) {
      if (id <= 1) return true;
      var prev = data.levels[id - 1];
      return !!(prev && prev.done);
    },
    levelInfo: function (id) { return data.levels[id] || { done: false, bestScore: 0, bestStars: 0, bestCoins: 0 }; },
    complete: function (id, score, stars, coins) {
      var l = data.levels[id] || { done: false, bestScore: 0, bestStars: 0, bestCoins: 0 };
      var newBest = score > l.bestScore;
      l.done = true;
      l.bestScore = Math.max(l.bestScore, score);
      l.bestStars = Math.max(l.bestStars, stars);
      l.bestCoins = Math.max(l.bestCoins, coins);
      data.levels[id] = l;
      GG.save.write();
      return newBest;
    },
    reset: function () {
      var s = data.settings;
      data = DEFAULTS();
      data.settings = s;
      GG.save.write();
    }
  };

  /* ---------------- Input (registered once, never duplicated) ---------------- */
  var kb = { left: false, right: false, jump: false };
  var touch = { left: false, right: false, jump: false };
  var jumpQueued = false; // edge-triggered press
  var prevJump = false;
  var handlers = { pause: null, back: null };
  var gameplayActive = false;

  function setKey(code, down) {
    switch (code) {
      case 'ArrowLeft': case 'KeyA': kb.left = down; return true;
      case 'ArrowRight': case 'KeyD': kb.right = down; return true;
      case 'ArrowUp': case 'KeyW': case 'Space':
        if (down && !kb.jump) jumpQueued = true;
        kb.jump = down; return true;
    }
    return false;
  }

  GG.input = {
    get left() { return kb.left || touch.left; },
    get right() { return kb.right || touch.right; },
    get jumpHeld() { return kb.jump || touch.jump; },
    consumeJump: function () { var j = jumpQueued; jumpQueued = false; return j; },
    setGameplay: function (on) { gameplayActive = on; GG.input.reset(); },
    reset: function () {
      kb.left = kb.right = kb.jump = false;
      touch.left = touch.right = touch.jump = false;
      jumpQueued = false; prevJump = false;
      var btns = document.querySelectorAll('.tbtn.down');
      for (var i = 0; i < btns.length; i++) btns[i].classList.remove('down');
    },
    onPause: function (fn) { handlers.pause = fn; },
    onBack: function (fn) { handlers.back = fn; },
    bindTouchButton: function (el, key) {
      var active = new Set();
      function press(e) {
        if (!gameplayActive) return;
        e.preventDefault();
        try { el.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
        active.add(e.pointerId);
        if (key === 'jump' && !touch.jump) jumpQueued = true;
        touch[key] = true; el.classList.add('down');
      }
      function release(e) {
        active.delete(e.pointerId);
        if (active.size === 0) { touch[key] = false; el.classList.remove('down'); }
      }
      el.addEventListener('pointerdown', press);
      el.addEventListener('pointerup', release);
      el.addEventListener('pointercancel', release);
      el.addEventListener('lostpointercapture', release);
      el.addEventListener('contextmenu', function (e) { e.preventDefault(); });
    },
    init: function () {
      window.addEventListener('keydown', function (e) {
        if (e.repeat && (e.code === 'Escape' || e.code === 'KeyP')) return;
        if (e.code === 'Escape' || e.code === 'KeyP') {
          if (gameplayActive && handlers.pause) { e.preventDefault(); handlers.pause(); }
          else if (handlers.back) { e.preventDefault(); handlers.back(e.code); }
          return;
        }
        if (gameplayActive && setKey(e.code, true)) e.preventDefault();
      });
      window.addEventListener('keyup', function (e) { setKey(e.code, false); });
      window.addEventListener('blur', function () { GG.input.reset(); });
      document.addEventListener('visibilitychange', function () {
        if (document.hidden) { GG.input.reset(); if (gameplayActive && handlers.pause) handlers.pause(true); }
      });
      // Block page scroll/zoom gestures during play
      document.addEventListener('touchmove', function (e) {
        var t = e.target;
        if (t && t.closest && t.closest('.scroll')) return;
        e.preventDefault();
      }, { passive: false });
      document.addEventListener('gesturestart', function (e) { e.preventDefault(); });
      document.addEventListener('dblclick', function (e) { e.preventDefault(); });
      GG.input.bindTouchButton(GG.$('tLeft'), 'left');
      GG.input.bindTouchButton(GG.$('tRight'), 'right');
      GG.input.bindTouchButton(GG.$('tJump'), 'jump');
    }
  };

  GG.isTouchDevice = function () {
    return ('ontouchstart' in window) || (navigator.maxTouchPoints || 0) > 0 ||
      (window.matchMedia && window.matchMedia('(pointer: coarse)').matches);
  };
})();
