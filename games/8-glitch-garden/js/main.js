/* GLITCH GARDEN — app state machine, game loop, wiring. Every listener is attached exactly once. */
(function () {
  'use strict';
  var GG = window.GG, $ = GG.$;

  var app = {
    state: 'welcome', // welcome | menu | levels | howto | settings | credits | playing | ending | paused | victory | gameover
    game: null, levelId: 1, settingsReturn: 'menu',
    timers: [], last: 0, t: 0, raf: 0
  };
  GG.app = app; // exposed for debugging / automated tests

  function later(fn, ms) { var id = setTimeout(function () { var i = app.timers.indexOf(id); if (i >= 0) app.timers.splice(i, 1); fn(); }, ms); app.timers.push(id); return id; }
  function clearTimers() { while (app.timers.length) clearTimeout(app.timers.pop()); }
  function sfx(n) { GG.audio.play(n); }
  function applyAudio() { var s = GG.save.settings(); GG.audio.setVolumes(s.music, s.sfx, s.mute); }
  function inGameplay() { return app.state === 'playing' || app.state === 'ending'; }

  /* ---------- scene transitions ---------- */
  function toScreen(id) {
    app.state = id;
    GG.ui.showScreen(id);
    if (id === 'welcome') GG.render.sparkles.start(); else GG.render.sparkles.stop();
    if (id === 'levels') GG.ui.buildLevels(function (lid) { sfx('click'); GG.ui.go(function () { startLevel(lid); }); });
    if (id === 'settings') GG.ui.syncSettings();
  }

  function leaveGameplay() {
    clearTimers();
    GG.input.setGameplay(false);
    GG.ui.hideOverlays(); GG.ui.showHud(false); GG.ui.showTouch(false); GG.ui.clearToast();
    GG.render.confetti.stop();
    app.game = null; GG.render.attach(null); GG.render.clear();
  }

  function startLevel(id) {
    clearTimers();
    GG.render.confetti.stop();
    app.levelId = id;
    GG.ui.hideScreens(); GG.render.sparkles.stop(); GG.ui.hideOverlays();
    app.game = new GG.Game(id, onGameEvent);
    GG.render.attach(app.game);
    GG.ui.hudInit(app.game); GG.ui.showHud(true); GG.ui.showTouch(true); GG.ui.clearToast();
    app.state = 'playing';
    GG.input.setGameplay(true);
    app.last = performance.now();
    GG.audio.startMusic();
    GG.ui.toast(app.game.def.name);
  }

  function restartLevel() { GG.ui.go(function () { startLevel(app.levelId); }); }

  function pause(auto) {
    if (app.state !== 'playing') return;
    app.state = 'paused';
    GG.input.setGameplay(false);
    GG.ui.showOverlay('pause');
    if (auto === true) { /* tab hidden: audio is suspended by the visibility handler */ }
  }
  function resume() {
    if (app.state !== 'paused') return;
    GG.ui.hideOverlay('pause');
    app.state = 'playing'; app.last = performance.now();
    GG.input.setGameplay(true);
  }

  function onGameEvent(type, data) {
    var g = app.game; if (!g) return;
    switch (type) {
      case 'sfx': sfx(data); break;
      case 'toast': GG.ui.toast(data); break;
      case 'star': GG.ui.toast('Star!  +100'); break;
      case 'hurtfx': GG.render.shake(0.25); break;
      case 'win':
        app.state = 'ending'; GG.input.setGameplay(false);
        later(function () { showVictory(); }, 1100);
        break;
      case 'lose':
        app.state = 'ending'; GG.input.setGameplay(false);
        later(function () { showGameOver(); }, 1300);
        break;
    }
  }

  function showVictory() {
    var g = app.game; if (!g) return;
    var hasNext = app.levelId < GG.levels.length;
    var newBest = GG.save.complete(g.id, g.score, g.stars, g.coins);
    GG.ui.fillVictory(g, newBest, hasNext);
    app.state = 'victory';
    GG.ui.showOverlay('victory');
    if (!(GG.save.settings().reduce || (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches))) GG.render.confetti.start();
  }
  function showGameOver() {
    var g = app.game; if (!g) return;
    GG.ui.fillGameOver(g);
    app.state = 'gameover';
    GG.ui.showOverlay('gameover');
  }

  /* ---------- main loop (single rAF chain) ---------- */
  function frame(now) {
    app.raf = requestAnimationFrame(frame);
    var dt = Math.min((now - app.last) / 1000, 0.05);
    if (!(dt >= 0)) dt = 0;
    app.last = now; app.t += dt;
    var g = app.game;
    if (g && (app.state === 'playing' || app.state === 'ending')) {
      g.update(dt, GG.input);
      if (app.state === 'playing') GG.ui.hudUpdate(g, false);
    }
    if (g && (app.state === 'playing' || app.state === 'ending' || app.state === 'paused' || app.state === 'victory' || app.state === 'gameover')) {
      GG.render.draw(g, app.t);
    }
    GG.render.tickFx(dt, app.t);
  }

  /* ---------- wiring ---------- */
  function wire() {
    function on(id, fn) { $(id).addEventListener('click', function () { if (GG.ui.busy) return; GG.audio.unlock(); fn(); }); }
    function nav(id, target, fromMenu) { on(id, function () { sfx('click'); GG.ui.go(function () { toScreen(target); }); void fromMenu; }); }

    on('btnWelcome', function () {
      sfx('click'); GG.audio.startMusic();
      GG.ui.go(function () { toScreen('menu'); });
    });
    on('mPlay', function () { sfx('click'); GG.ui.go(function () { startLevel(1); }); });
    nav('mLevels', 'levels'); nav('mHow', 'howto');
    on('mSettings', function () { sfx('click'); app.settingsReturn = 'menu'; GG.ui.go(function () { toScreen('settings'); }); });
    nav('mCredits', 'credits');
    nav('lvBack', 'menu'); nav('hwBack', 'menu'); nav('crBack', 'menu');
    on('setBack', function () {
      sfx('click');
      if (app.settingsReturn === 'paused') { GG.ui.go(function () { GG.ui.hideScreens(); app.state = 'paused'; GG.ui.showOverlay('pause'); }); }
      else GG.ui.go(function () { toScreen('menu'); });
    });
    on('setReset', function () {
      var b = $('setReset');
      if (b.dataset.arm === '1') { GG.save.reset(); b.dataset.arm = ''; b.textContent = 'Reset Progress'; sfx('hurt'); GG.ui.syncSettings(); return; }
      b.dataset.arm = '1'; b.textContent = 'Tap again to confirm'; sfx('click');
      later(function () { b.dataset.arm = ''; b.textContent = 'Reset Progress'; }, 3000);
    });

    // gameplay
    $('btnPause').addEventListener('click', function () { GG.audio.unlock(); sfx('click'); pause(); });
    on('pResume', function () { sfx('click'); resume(); });
    on('pRestart', function () { sfx('click'); restartLevel(); });
    on('pSettings', function () {
      sfx('click'); app.settingsReturn = 'paused';
      GG.ui.go(function () { GG.ui.hideOverlay('pause', true); toScreen('settings'); app.state = 'settings'; });
    });
    on('pMenu', function () { sfx('click'); GG.ui.go(function () { leaveGameplay(); toScreen('menu'); }); });

    on('vNext', function () { sfx('click'); var n = app.levelId + 1; if (n <= GG.levels.length) GG.ui.go(function () { startLevel(n); }); });
    on('vReplay', function () { sfx('click'); restartLevel(); });
    on('vMenu', function () { sfx('click'); GG.ui.go(function () { leaveGameplay(); toScreen('menu'); }); });
    on('gRetry', function () { sfx('click'); restartLevel(); });
    on('gMenu', function () { sfx('click'); GG.ui.go(function () { leaveGameplay(); toScreen('menu'); }); });

    GG.input.onPause(pause);
    GG.input.onBack(function (code) {
      if (GG.ui.busy) return;
      var s = app.state;
      if (s === 'paused') { if (code === 'Escape' || code === 'KeyP') { sfx('click'); resume(); } return; }
      if (code !== 'Escape') return;
      if (s === 'levels' || s === 'howto' || s === 'credits') { sfx('click'); GG.ui.go(function () { toScreen('menu'); }); }
      else if (s === 'settings') { $('setBack').click(); }
    });
    GG.ui.initKeyNav(inGameplay);
  }

  function relayout() { GG.render.resize(); }

  function init() {
    GG.save.load();
    var s = GG.save.settings();
    GG.touchControlsOn = s.touch === null ? GG.isTouchDevice() : s.touch;
    GG.render.init();
    GG.input.init();
    GG.ui.setHandlers({ audio: applyAudio, layout: relayout });
    applyAudio();
    GG.ui.syncSettings();
    wire();

    // first user gesture of any kind unlocks audio (autoplay policy)
    var unlock = function () { GG.audio.unlock(); };
    window.addEventListener('pointerdown', unlock, { once: true });
    window.addEventListener('keydown', unlock, { once: true });
    document.addEventListener('visibilitychange', function () { if (document.hidden) GG.audio.suspend(); else GG.audio.resume(); });

    var pending = 0;
    function onResize() { if (pending) return; pending = requestAnimationFrame(function () { pending = 0; relayout(); if (GG.render.sparkles.active) GG.render.sparkles.resize(); }); }
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', function () { setTimeout(onResize, 120); });
    if (window.visualViewport) window.visualViewport.addEventListener('resize', onResize);

    // Preload the cover art, then show the welcome screen (never starts gameplay automatically)
    var img = new Image();
    var started = false;
    function begin() { if (started) return; started = true; toScreen('welcome'); app.last = performance.now(); app.raf = requestAnimationFrame(frame); }
    img.onload = begin; img.onerror = begin;
    img.src = 'assets/cover.jpg';
    setTimeout(begin, 2500);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
