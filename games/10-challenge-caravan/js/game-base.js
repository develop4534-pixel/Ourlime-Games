/* CHALLENGE CARAVAN — Game controller: loop, canvas/DPR, HUD, pause, countdown, results hand-off */
(function () {
  'use strict';
  var CC = window.CC, UI = CC.UI, State = CC.State, $ = UI.$;
  CC.MiniGames = CC.MiniGames || {};

  var G = {
    mg: null, destId: 0, gameId: 'dash', running: false, finishing: false, counting: false,
    raf: 0, last: 0, cv: null, c2: null, W: 0, H: 0, DPR: 1, timers: [], keys: {}, ro: null, _rz: 0, tick: 0,

    init: function () {
      G.cv = $('cv'); G.c2 = G.cv.getContext('2d');
      if (window.ResizeObserver) {
        G.ro = new ResizeObserver(function () { cancelAnimationFrame(G._rz); G._rz = requestAnimationFrame(function () { G.resize(); }); });
        G.ro.observe($('play'));
      } else window.addEventListener('resize', function () { G.resize(); });
      window.addEventListener('orientationchange', function () { setTimeout(function () { G.resize(); }, 250); });

      UI.bind('hud-pause', function () { G.pause(); }, { sfx: 'click' });
      UI.bind('p-resume', function () { G.resume(); });
      UI.bind('p-restart', function () { G.restart(); });
      UI.bind('p-how', function () { CC.App.howtoGame = G.gameId; State.go('HOWTO'); });
      UI.bind('p-settings', function () { State.go('SETTINGS'); });
      UI.bind('p-map', function () {
        UI.confirm('Leave this challenge?', 'Your current run will be lost.', 'LEAVE').then(function (yes) {
          if (yes && State.cur === 'PAUSED') State.go('WORLD_MAP', { keepSel: true }, { wipe: true });
        });
      }, { sfx: 'back' });

      /* keyboard */
      window.addEventListener('keydown', function (e) {
        if (State.cur !== 'MINIGAME' || !G.mg) return;
        var k = e.key;
        if (e.target && e.target.closest && e.target.closest('input,select,textarea')) return;
        if (k === 'p' || k === 'P') { G.pause(); e.preventDefault(); return; }
        G.keys[k] = true;
        if ((k === ' ' || k === 'Enter') && e.target && e.target.closest && e.target.closest('.btn,#puzzle button')) return; // focused button handles it
        if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', ' ', 'Spacebar'].indexOf(k) >= 0 && !(e.target && e.target.closest && e.target.closest('#puzzle button, .btn'))) e.preventDefault();
        if (G.running && G.mg.onKey) UI.safe(function () { G.mg.onKey('down', e); });
      }, { passive: false });
      window.addEventListener('keyup', function (e) {
        G.keys[e.key] = false;
        if (State.cur === 'MINIGAME' && G.mg && G.running && G.mg.onKey) UI.safe(function () { G.mg.onKey('up', e); });
      });
      window.addEventListener('blur', function () { G.keys = {}; });

      /* touch controls (pointerdown for instant response) */
      function hold(id, name) {
        var b = $(id);
        var fire = function (e) {
          if (e.type === 'click' && performance.now() - (b._pt || 0) < 450) return;
          if (e.type === 'pointerdown') { b._pt = performance.now(); e.preventDefault(); }
          if (G.running && G.mg && G.mg.onAction) UI.safe(function () { G.mg.onAction(name); });
        };
        b.addEventListener('pointerdown', fire);
        b.addEventListener('click', fire);
      }
      hold('tc-left', 'left'); hold('tc-right', 'right'); hold('tc-jump', 'jump');

      /* pointer on the play area */
      var play = $('play');
      play.addEventListener('pointerdown', function (e) { if (G.running && G.mg && G.mg.onPointer) { try { play.setPointerCapture(e.pointerId); } catch (x) { /* ignore */ } UI.safe(function () { G.mg.onPointer('down', e); }); } });
      play.addEventListener('pointermove', function (e) { if (G.running && G.mg && G.mg.onPointer) UI.safe(function () { G.mg.onPointer('move', e); }); });
      play.addEventListener('pointerup', function (e) { if (G.running && G.mg && G.mg.onPointer) UI.safe(function () { G.mg.onPointer('up', e); }); });
      play.addEventListener('pointercancel', function (e) { if (G.mg && G.mg.onPointer) UI.safe(function () { G.mg.onPointer('cancel', e); }); });
      play.addEventListener('touchmove', function (e) { if (e.cancelable) e.preventDefault(); }, { passive: false });
    },

    /* ---- lifecycle ---- */
    enter: function (data, prev) {
      if (prev === 'PAUSED' && !data.restart) {          // resume
        UI.closeOverlay($('pause'), true);
        if (G.mg && G.mg.needsCountdown) G.countdown(function () { G.run(); }); else G.run();
        return;
      }
      G.teardown();
      G.destId = data.dest; G.gameId = data.game; G.finishing = false; G.keys = {};
      var dest = CC.DEST[data.dest], info = CC.GAMES[data.game], Cls = CC.MiniGames[data.game];
      var game = $('game'); game.dataset.game = data.game;
      $('hud-title').textContent = info.name;
      $('hud-obj').textContent = '';
      var isCv = data.game !== 'puzzle';
      G.cv.hidden = !isCv; $('puzzle').hidden = isCv; $('puzzle').innerHTML = '';
      $('game-banner').textContent = ''; $('game-fx').innerHTML = '';
      $('pause').hidden = true;
      G.mg = new Cls(G, { diff: dest.diff, destId: data.dest, dest: dest });
      CC.Audio.setDuck(.55);
      G.layoutControls();
      G.W = 0;
      UI.safe(function () { G.mg.init(); });
      G.resize(true);
      G.renderOnce();
      G.countdown(function () { G.run(); }, true);
    },
    teardown: function () {
      cancelAnimationFrame(G.raf); G.running = false; G.counting = false;
      G.timers.forEach(clearTimeout); G.timers = [];
      $('countdown').hidden = true;
      if (G.mg) { UI.safe(function () { if (G.mg.destroy) G.mg.destroy(); }); G.mg = null; }
      $('puzzle').innerHTML = '';
      $('game-fx').innerHTML = '';
    },
    leave: function () {
      G.teardown();
      UI.closeOverlay($('pause'), true);
      CC.Audio.setDuck(1);
    },
    layoutControls: function () {
      var g = G.gameId, touch = UI.isTouch();
      $('ctl-dash').hidden = !(g === 'dash' && touch);
      $('ctl-snap').hidden = g !== 'snap';
      $('ctl-puzzle').hidden = g !== 'puzzle';
      $('controls').hidden = ($('ctl-dash').hidden && $('ctl-snap').hidden && $('ctl-puzzle').hidden);
      if (G.mg && G.mg.setTouch) G.mg.setTouch(touch);
    },
    resize: function (force) {
      var r = $('play').getBoundingClientRect(), w = Math.floor(r.width), h = Math.floor(r.height);
      if (w < 2 || h < 2) return;
      if (!force && w === G.W && h === G.H && G.DPR === Math.min(window.devicePixelRatio || 1, 2.5)) return;
      G.W = w; G.H = h; G.DPR = Math.min(window.devicePixelRatio || 1, 2.5);
      if (!G.cv.hidden) {
        G.cv.width = Math.round(w * G.DPR); G.cv.height = Math.round(h * G.DPR);
        G.c2.setTransform(G.DPR, 0, 0, G.DPR, 0, 0);
      }
      if (G.mg && G.mg.resize) UI.safe(function () { G.mg.resize(w, h); });
      if (!G.running) G.renderOnce();
    },
    renderOnce: function () {
      if (G.mg && G.mg.render && !G.cv.hidden && G.W) UI.safe(function () { G.mg.render(G.c2, G.W, G.H); });
    },
    loopFn: function (ts) {
      if (!G.running) return;
      G.raf = requestAnimationFrame(G.loopFn);
      var dt = Math.min(0.05, Math.max(0, (ts - G.last) / 1000) || 0.016);
      G.last = ts;
      if (!G.mg) return;
      try { G.mg.update(dt); if (!G.cv.hidden) G.mg.render(G.c2, G.W, G.H); }
      catch (e) { if (window.console) console.error('[CC game]', e); }
    },
    run: function () {
      if (G.running || !G.mg) return;
      G.running = true; G.last = performance.now();
      cancelAnimationFrame(G.raf);
      G.raf = requestAnimationFrame(G.loopFn);
      if (G.mg.onStart && !G.mg._started) { G.mg._started = true; UI.safe(function () { G.mg.onStart(); }); }
      var obj = $('hud-obj'); if (obj && G.mg.objective) obj.textContent = G.mg.objective();
    },
    stop: function () { G.running = false; cancelAnimationFrame(G.raf); },
    countdown: function (cb, first) {
      G.counting = true;
      var box = $('countdown'), n = $('countdown-n');
      var steps = first ? ['3', '2', '1', 'GO!'] : ['2', '1', 'GO!'];
      if (G.mg && !G.mg.needsCountdown) steps = ['GO!'];
      box.hidden = false;
      var i = 0;
      (function next() {
        if (!G.counting) return;
        if (i >= steps.length) { box.hidden = true; G.counting = false; cb(); return; }
        n.textContent = steps[i]; n.style.animation = 'none'; void n.offsetWidth; n.style.animation = '';
        CC.Audio.sfx(steps[i] === 'GO!' ? 'go' : 'count');
        i++;
        G.timers.push(setTimeout(next, steps.length === 1 ? 450 : 650));
      })();
    },
    pause: function () {
      if (State.cur !== 'MINIGAME' || G.finishing) return false;
      G.stop(); G.counting = false; G.timers.forEach(clearTimeout); G.timers = []; $('countdown').hidden = true;
      return State.go('PAUSED', {}, { force: true });
    },
    autoPause: function () { if (State.cur === 'MINIGAME') G.pause(); },
    showPause: function () { UI.openOverlay($('pause'), $('p-resume')); },
    resume: function () {
      if (State.cur !== 'PAUSED') return;
      UI.closeOverlay($('pause'), true);
      State.go('MINIGAME', { dest: G.destId, game: G.gameId }, { force: true });
    },
    restart: function () {
      if (State.cur !== 'PAUSED') return;
      UI.closeOverlay($('pause'), true);
      State.go('MINIGAME', { dest: G.destId, game: G.gameId, restart: true }, { force: true });
    },

    /* ---- helpers for mini-games ---- */
    hud: function (o) {
      if (o.score != null) $('hud-score').textContent = o.score;
      if (o.aux != null) $('hud-aux').textContent = o.aux;
      if (o.lbl1) $('hud-lbl1').textContent = o.lbl1;
      if (o.lbl2) $('hud-lbl2').textContent = o.lbl2;
      if (o.obj != null) $('hud-obj').textContent = o.obj;
    },
    banner: function (text, ms, cls) {
      var b = $('game-banner');
      b.className = 'game-banner' + (cls ? ' ' + cls : '');
      b.textContent = text;
      void b.offsetWidth; b.classList.add('show');
      clearTimeout(b._t);
      b._t = setTimeout(function () { b.classList.remove('show'); }, ms || 1400);
    },
    shake: function () {
      if (UI.reducedMotion()) return;
      var p = $('play'); p.classList.remove('shake'); void p.offsetWidth; p.classList.add('shake');
    },
    floatText: function (x, y, text, cls) {
      var fx = $('game-fx');
      if (fx.children.length > 14) return;
      var e = document.createElement('span'); e.className = 'ftext' + (cls ? ' ' + cls : ''); e.textContent = text;
      e.style.left = x + 'px'; e.style.top = y + 'px';
      fx.appendChild(e);
      setTimeout(function () { if (e.parentNode) e.parentNode.removeChild(e); }, 950);
    },
    finish: function (result) {
      if (G.finishing || !G.mg) return;
      G.finishing = true;
      var destId = G.destId, gameId = G.gameId;
      var summary = CC.Progress.apply(destId, gameId, result);
      summary.dest = destId; summary.game = gameId; summary.stat2 = result.stat2; summary.failTitle = result.failTitle; summary.failMsg = result.failMsg;
      var delay = result.delay == null ? 900 : result.delay;
      G.timers.push(setTimeout(function () {
        G.stop();
        G.teardown();
        State.go('RESULTS', summary, { force: true });
      }, delay));
    }
  };
  CC.Game = G;

  /* Base class helpers */
  CC.rng = function (seed) {
    var s = seed >>> 0 || 1;
    return function () { s = (s + 0x6D2B79F5) >>> 0; var t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  };
  CC.clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };
})();
