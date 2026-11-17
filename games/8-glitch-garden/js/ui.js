/* GLITCH GARDEN — DOM UI: screens, transitions, level cards, HUD, settings */
(function () {
  'use strict';
  var GG = window.GG, $ = GG.$;
  var busy = false, toastTimer = null, hudCache = {}, lvMsgTimer = null;
  var SCREENS = ['welcome', 'menu', 'levels', 'howto', 'settings', 'credits'];
  var OVERLAYS = ['pause', 'victory', 'gameover'];
  var hideTimers = {};

  var THUMBS = {
    day: 'linear-gradient(180deg,#52c3ff 0%,#bdeaff 62%,#58c43a 62%,#3a9a2a 100%)',
    sky: 'linear-gradient(180deg,#1f7bff 0%,#8fd4ff 70%,#e8f8ff 100%)',
    glitch: 'linear-gradient(180deg,#150a45 0%,#5a2aa8 60%,#16b8c9 100%)'
  };
  function thumbSvg(theme) {
    var ground = theme === 'glitch' ? '#22d6a0' : '#4ccf3a', dirt = theme === 'glitch' ? '#3a2370' : '#9b6230';
    var sh = '';
    if (theme === 'day') sh = '<rect x="0" y="62" width="160" height="38" fill="' + dirt + '"/><rect x="0" y="58" width="160" height="8" fill="' + ground + '"/><circle cx="128" cy="24" r="12" fill="#fff6a8"/>';
    if (theme === 'sky') sh = '<rect x="14" y="62" width="44" height="12" rx="3" fill="' + dirt + '"/><rect x="14" y="58" width="44" height="7" fill="' + ground + '"/><rect x="74" y="44" width="40" height="12" rx="3" fill="' + dirt + '"/><rect x="74" y="40" width="40" height="7" fill="' + ground + '"/><rect x="118" y="68" width="38" height="12" rx="3" fill="' + dirt + '"/><rect x="118" y="64" width="38" height="7" fill="' + ground + '"/>';
    if (theme === 'glitch') sh = '<rect x="0" y="66" width="50" height="34" fill="' + dirt + '"/><rect x="0" y="62" width="50" height="7" fill="' + ground + '"/><rect x="64" y="50" width="30" height="10" fill="#19d3ff"/><rect x="112" y="64" width="48" height="36" fill="' + dirt + '"/><rect x="112" y="60" width="48" height="7" fill="' + ground + '"/><rect x="100" y="20" width="6" height="6" fill="#ff4f9a"/><rect x="30" y="30" width="8" height="4" fill="#fff"/>';
    return 'data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 100" preserveAspectRatio="xMidYMid slice">' + sh + '</svg>');
  }

  /* ---------- screen helpers ---------- */
  function showEl(id) {
    var el = $(id);
    if (hideTimers[id]) { clearTimeout(hideTimers[id]); hideTimers[id] = null; }
    el.classList.add('active');
    void el.offsetWidth; // force reflow so the fade runs
    el.classList.add('show');
    el.removeAttribute('aria-hidden');
  }
  function hideEl(id, instant) {
    var el = $(id);
    el.classList.remove('show');
    el.setAttribute('aria-hidden', 'true');
    if (hideTimers[id]) clearTimeout(hideTimers[id]);
    if (instant) { el.classList.remove('active'); hideTimers[id] = null; return; }
    hideTimers[id] = setTimeout(function () { if (!el.classList.contains('show')) el.classList.remove('active'); hideTimers[id] = null; }, 380);
  }
  function focusFirst(id) {
    var el = $(id); if (!el) return;
    var t = el.querySelector('.btn:not([disabled]), .card:not(.locked)');
    if (t) { try { t.focus({ preventScroll: true }); } catch (e) { t.focus(); } }
  }
  function reduced() { return GG.save.settings().reduce || (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); }

  GG.ui = {
    get busy() { return busy; },
    /* Fade through the curtain, run fn at the midpoint. Ignores re-entry. */
    go: function (fn) {
      if (busy) return;
      busy = true;
      var c = $('curtain');
      if (reduced()) { fn(); busy = false; return; }
      c.classList.add('on');
      setTimeout(function () {
        try { fn(); } finally { setTimeout(function () { c.classList.remove('on'); busy = false; }, 60); }
      }, 300);
    },
    showScreen: function (id) {
      for (var i = 0; i < SCREENS.length; i++) if (SCREENS[i] !== id) hideEl(SCREENS[i], true);
      showEl(id);
      GG.ui.msg('');
      focusFirst(id);
    },
    hideScreens: function () { for (var i = 0; i < SCREENS.length; i++) hideEl(SCREENS[i], true); },
    showOverlay: function (id) { showEl(id); focusFirst(id); },
    hideOverlay: function (id, instant) { hideEl(id, instant); },
    hideOverlays: function () { for (var i = 0; i < OVERLAYS.length; i++) hideEl(OVERLAYS[i], true); },
    showHud: function (on) { if (on) showEl('hud'); else hideEl('hud', true); },
    showTouch: function (on) { $('touch').classList.toggle('on', !!on && !!GG.touchControlsOn); },
    msg: function (t) {
      var m = $('lvMsg'); if (!m) return; m.textContent = t || '';
      if (lvMsgTimer) clearTimeout(lvMsgTimer);
      if (t) lvMsgTimer = setTimeout(function () { m.textContent = ''; }, 2600);
    },

    /* ---------- levels ---------- */
    buildLevels: function (onPick) {
      var grid = $('levelGrid'); grid.innerHTML = '';
      GG.levels.forEach(function (lv, idx) {
        var unlocked = GG.save.isUnlocked(lv.id), info = GG.save.levelInfo(lv.id);
        var b = document.createElement('button');
        b.type = 'button'; b.className = 'card' + (unlocked ? '' : ' locked');
        b.setAttribute('aria-label', lv.name + (unlocked ? '' : ', locked. Complete ' + GG.levels[idx - 1].name + ' to unlock'));
        var st = '';
        for (var i = 0; i < 3; i++) st += '<span class="' + (i < info.bestStars ? '' : 'off') + '">★</span>';
        b.innerHTML =
          '<span class="num">' + lv.id + '</span>' +
          '<span class="thumb" style="background:' + THUMBS[lv.theme] + '"><img alt="" src="' + thumbSvg(lv.theme) + '" style="width:100%;height:100%;display:block;object-fit:cover"></span>' +
          '<span class="lock"><svg width="1em" height="1em" viewBox="0 0 24 24"><rect x="4" y="10" width="16" height="11" rx="3" fill="#ffd93b" stroke="#7a4a00" stroke-width="1.6"/><path d="M8 10V7a4 4 0 018 0v3" fill="none" stroke="#e8e8e8" stroke-width="2.4" stroke-linecap="round"/><circle cx="12" cy="15.5" r="1.7" fill="#7a4a00"/></svg></span>' +
          '<span class="meta"><span class="name">' + lv.name + '</span>' +
          (unlocked ? '<span class="sub">' + lv.sub + '</span><span class="stars">' + st + '</span>' : '<span class="sub req">Complete ' + GG.levels[idx - 1].name + ' to unlock</span>') +
          '</span>';
        b.addEventListener('click', function () {
          if (!GG.save.isUnlocked(lv.id)) { GG.audio.play('hurt'); GG.ui.msg('Locked: complete ' + GG.levels[idx - 1].name + ' first.'); return; }
          onPick(lv.id);
        });
        grid.appendChild(b);
      });
    },

    /* ---------- HUD ---------- */
    hudInit: function (g) {
      hudCache = {};
      $('hudName').textContent = g.def.name;
      GG.ui.hudUpdate(g, true);
    },
    hudUpdate: function (g, force) {
      var c = hudCache;
      if (force || c.coins !== g.coins) { $('hudCoins').textContent = g.coins; if (!force) bump('hudCoinChip'); c.coins = g.coins; }
      var s = g.stars + '/' + g.totalStars;
      if (force || c.stars !== s) { $('hudStars').textContent = s; if (!force) bump('hudStarChip'); c.stars = s; }
      if (force || c.health !== g.health) {
        var h = '';
        for (var i = 0; i < 3; i++) h += '<i style="' + (i < g.health ? '' : 'filter:grayscale(1) brightness(.5);') + '"><svg viewBox="0 0 24 24" width="100%" height="100%"><use href="#i-heart"/></svg></i>';
        $('hudLives').innerHTML = h; $('hudLives').setAttribute('aria-label', g.health + ' lives');
        if (!force) bump('hudLives');
        c.health = g.health;
      }
      var prog = GG.clamp(g.p.x / Math.max(1, g.exit.x), 0, 1), pr = Math.round(prog * 100);
      if (force || c.prog !== pr) { $('hudProg').style.width = pr + '%'; c.prog = pr; }
    },
    toast: function (text) {
      var t = $('hudToast'); t.textContent = text; t.classList.add('on');
      if (toastTimer) clearTimeout(toastTimer);
      toastTimer = setTimeout(function () { t.classList.remove('on'); toastTimer = null; }, 1300);
    },
    clearToast: function () { if (toastTimer) { clearTimeout(toastTimer); toastTimer = null; } $('hudToast').classList.remove('on'); },

    /* ---------- end screens ---------- */
    fillVictory: function (g, newBest, hasNext) {
      $('vCoins').textContent = g.coins + '/' + g.totalCoins;
      $('vStarsN').textContent = g.stars + '/' + g.totalStars;
      $('vScore').textContent = g.score;
      $('vSub').textContent = g.def.name + ' cleared!';
      $('vBest').textContent = newBest ? 'New best score!' : 'Best: ' + GG.save.levelInfo(g.id).bestScore;
      $('vNext').style.display = hasNext ? '' : 'none';
      var spans = $('vStars').children;
      for (var i = 0; i < spans.length; i++) { spans[i].className = ''; }
      var delay = reduced() ? 0 : 450;
      for (var j = 0; j < spans.length; j++) (function (k) {
        setTimeout(function () { spans[k].className = k < g.stars ? 'got' : 'miss'; }, delay + k * (reduced() ? 0 : 330));
      })(j);
    },
    fillGameOver: function (g) { $('gCoins').textContent = g.coins; $('gScore').textContent = g.score; },

    /* ---------- settings ---------- */
    syncSettings: function () {
      var s = GG.save.settings();
      $('setMusic').value = s.music; $('valMusic').textContent = s.music + '%'; paintRange($('setMusic'));
      $('setSfx').value = s.sfx; $('valSfx').textContent = s.sfx + '%'; paintRange($('setSfx'));
      $('setMute').setAttribute('aria-checked', String(s.mute));
      $('setTouch').setAttribute('aria-checked', String(!!GG.touchControlsOn));
      $('setMotion').setAttribute('aria-checked', String(!!s.reduce));
      var ico = s.mute ? '#i-mute' : '#i-sound', btns = document.querySelectorAll('[data-sound-toggle]');
      for (var i = 0; i < btns.length; i++) {
        btns[i].classList.toggle('muted', s.mute); btns[i].setAttribute('aria-pressed', String(s.mute));
        btns[i].innerHTML = '<svg><use href="' + ico + '"/></svg>';
      }
      document.body.classList.toggle('reduce-motion', reduced());
    },
    setHandlers: function (h) {
      var s = GG.save.settings();
      $('setMusic').addEventListener('input', function (e) { s.music = +e.target.value; paintRange(e.target); $('valMusic').textContent = s.music + '%'; h.audio(); });
      $('setSfx').addEventListener('input', function (e) { s.sfx = +e.target.value; paintRange(e.target); $('valSfx').textContent = s.sfx + '%'; h.audio(); });
      $('setSfx').addEventListener('change', function () { GG.audio.play('coin'); GG.save.write(); });
      $('setMusic').addEventListener('change', function () { GG.save.write(); });
      $('setMute').addEventListener('click', function () { s.mute = !s.mute; h.audio(); GG.save.write(); GG.ui.syncSettings(); GG.audio.play('click'); });
      $('setTouch').addEventListener('click', function () { s.touch = !GG.touchControlsOn; GG.touchControlsOn = s.touch; GG.save.write(); GG.ui.syncSettings(); h.layout(); GG.audio.play('click'); });
      $('setMotion').addEventListener('click', function () { s.reduce = !s.reduce; GG.save.write(); GG.ui.syncSettings(); GG.audio.play('click'); });
      var tg = document.querySelectorAll('[data-sound-toggle]');
      for (var i = 0; i < tg.length; i++) tg[i].addEventListener('click', function () { s.mute = !s.mute; h.audio(); GG.save.write(); GG.ui.syncSettings(); GG.audio.play('click'); });
    }
  };

  function bump(id) { var e = $(id); e.classList.remove('bump'); void e.offsetWidth; e.classList.add('bump'); }
  function paintRange(r) { r.style.setProperty('--p', r.value + '%'); }

  /* Arrow-key menu navigation (only while not in gameplay) */
  GG.ui.initKeyNav = function (isGameplay) {
    document.addEventListener('keydown', function (e) {
      if (isGameplay()) return;
      var k = e.key;
      if (k !== 'ArrowDown' && k !== 'ArrowUp' && k !== 'ArrowLeft' && k !== 'ArrowRight') return;
      var tgt = e.target;
      if (tgt && tgt.type === 'range' && (k === 'ArrowLeft' || k === 'ArrowRight')) return;
      var scope = null, i, list = document.querySelectorAll('.screen.show');
      for (i = list.length - 1; i >= 0; i--) { if (list[i].classList.contains('over') || !scope) scope = list[i]; if (list[i].classList.contains('over')) break; }
      if (!scope) return;
      var els = Array.prototype.filter.call(scope.querySelectorAll('.btn:not([disabled]), .card, input[type=range], .switch'), function (n) { return n.offsetParent !== null; });
      if (!els.length) return;
      var cur = els.indexOf(document.activeElement);
      var next = (k === 'ArrowDown' || k === 'ArrowRight') ? cur + 1 : cur - 1;
      if (cur < 0) next = 0;
      next = (next + els.length) % els.length;
      e.preventDefault(); els[next].focus();
    });
  };
})();
