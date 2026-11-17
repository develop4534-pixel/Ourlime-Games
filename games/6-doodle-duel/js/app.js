/* DOODLE DUEL — application shell: scaling, routing, settings, practice mode and the multiplayer client UI.
   All game RULES live in core.js (unit-tested). The server (server/server.js) re-uses them for authority. */
(function () {
  'use strict';
  var D = DD, A = ART, AU = AUDIO, I = I18N, t = I18N.t;
  var VERSION = '1.0.0';
  var H = document.documentElement, BODY = document.body;
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function now() { return performance.now(); }

  /* ───────────────── storage (always failure-safe) ───────────────── */
  var KEY = 'doodleduel.save', SKEY = 'doodleduel.server';
  function sget(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function sset(k, v) { try { localStorage.setItem(k, v); return true; } catch (e) { return false; } }
  function sdel(k) { try { localStorage.removeItem(k); } catch (e) { } }
  function randHex(n) {
    var a = new Uint8Array(n / 2), s = '';
    try { crypto.getRandomValues(a); } catch (e) { for (var i = 0; i < a.length; i++) a[i] = Math.floor(Math.random() * 256); }
    for (var j = 0; j < a.length; j++) s += ('0' + a[j].toString(16)).slice(-2);
    return s;
  }
  var raw = sget(KEY), firstRun = raw == null;
  var save = D.sanitizeSave(raw);
  if (!save.uid) save.uid = randHex(16);
  if (firstRun && window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) save.reducedMotion = true;
  function persist() { sset(KEY, JSON.stringify(save)); }
  persist();

  function serverUrl() {
    var s = sget(SKEY) || (window.DD_CONFIG && window.DD_CONFIG.serverUrl) || '';
    return DDNet.validUrl(s) ? s.trim() : '';
  }
  var urlParams = (function () { try { return new URLSearchParams(location.search); } catch (e) { return { get: function () { return null; } }; } })();
  (function () { var s = urlParams.get('s') || urlParams.get('server'); if (s && DDNet.validUrl(s)) sset(SKEY, s.trim()); })();
  var pendingCode = (function () { var c = (urlParams.get('room') || '').toUpperCase(); return /^[A-HJ-NP-Z2-9]{5}$/.test(c) ? c : ''; })();

  /* ───────────────── scale (1rem = 10u) ───────────────── */
  var pad = null;
  function layout() {
    var w = window.innerWidth, h = window.innerHeight;
    var land = w / h > 1.25;
    var u = land ? Math.min(w / 150, h / 74) : Math.min(w / 100, h / 150);
    u = clamp(u, 2.4, 11);
    H.style.fontSize = (u * 10).toFixed(2) + 'px';
    BODY.classList.toggle('land', land);
    if (pad) pad.resize();
  }
  window.addEventListener('resize', layout);
  window.addEventListener('orientationchange', function () { setTimeout(layout, 120); });
  if (window.visualViewport) window.visualViewport.addEventListener('resize', layout);

  /* ───────────────── i18n + icons ───────────────── */
  function icons(root) {
    $$('[data-ico]', root).forEach(function (el) { el.innerHTML = A.ui(el.getAttribute('data-ico')); el.setAttribute('data-ico-done', el.getAttribute('data-ico')); el.removeAttribute('data-ico'); });
  }
  function applyI18n() {
    I.setLang(save.lang || I.detect()); H.lang = I.getLang();
    $$('[data-t]').forEach(function (el) { el.textContent = t(el.getAttribute('data-t')); });
    $$('[aria-label]').forEach(function (el) { if (!el.dataset.al0) el.dataset.al0 = el.getAttribute('aria-label'); el.setAttribute('aria-label', I.al(el.dataset.al0)); });
    $('#privacyBody').innerHTML = t('privacy_html');
    $('#creditsBody').innerHTML = t('credits_html').replace('__V__', VERSION);
    syncMute(); if (cur) onEnter(cur);
  }
  function applyAccess() {
    H.classList.toggle('rm', !!save.reducedMotion); H.classList.toggle('hc', !!save.highContrast); H.classList.toggle('big', !!save.bigText);
    $('#tglRM').setAttribute('aria-checked', save.reducedMotion); $('#tglHC').setAttribute('aria-checked', save.highContrast); $('#tglBT').setAttribute('aria-checked', save.bigText);
  }
  function applyAudio() {
    AU.set({ music: save.music, sfx: save.sfx, muted: save.muted });
    var vm = $('#volMusic'), vs = $('#volSfx');
    vm.value = Math.round(save.music * 100); vs.value = Math.round(save.sfx * 100);
    vm.style.setProperty('--p', vm.value + '%'); vs.style.setProperty('--p', vs.value + '%');
    syncMute();
  }
  function syncMute() { $('#muteIco').innerHTML = A.ui(save.muted ? 'sound' : 'mute'); $('#muteLbl').textContent = t(save.muted ? 'unmute' : 'mute'); }

  /* ───────────────── router ───────────────── */
  var screens = {}, cur = null, stack = [];
  $$('.screen').forEach(function (s) { screens[s.id.slice(2)] = s; });
  var GRASS = { menu: 1, rooms: 1, create: 1, join: 1, lobby: 1, avatar: 1, settings: 1, audio: 1, access: 1, options: 1, privacy: 1, credits: 1, stats: 1, tutorial: 1 };
  function show(name) {
    if (!screens[name]) name = 'menu';
    Object.keys(screens).forEach(function (k) { if (k !== name) screens[k].hidden = true; });
    screens[name].hidden = false;
    cur = name;
    BODY.classList.toggle('scene-logo', name === 'logo');
    BODY.classList.toggle('grass', !!GRASS[name]); BODY.classList.toggle('ingame', name === 'game');
    onEnter(name);
    var f = screens[name].querySelector('.wbtn:not(:disabled), .sq:not(:disabled), input');
    if (f && name !== 'game') try { f.focus({ preventScroll: true }); } catch (e) { }
    if (name === 'game' && pad) requestAnimationFrame(function () { pad.resize(); });
  }
  function go(name) { if (cur && cur !== name) stack.push(cur); show(name); }
  function back() {
    if (anyOverlay()) { closeTopOverlay(); return; }
    var p = stack.pop(); if (!p || p === cur) p = 'menu';
    if (p === 'conn') p = 'menu';
    if (p === 'game') { if (S && S.mode === 'solo' && S.paused) { show('game'); openOverlay('o-pause'); return; } p = 'menu'; }
    show(p);
  }
  function toMenu() { stack = []; closeAllOverlays(); show('menu'); }

  function onEnter(name) {
    if (name === 'menu') { $('#menuBlue').innerHTML = A.char(0, 'idle'); $('#menuRed').innerHTML = A.char(1, 'idle', { flip: true }); }
    if (name === 'settings' || name === 'audio') applyAudio();
    if (name === 'options') syncOptions();
    if (name === 'access') syncLangSeg();
    if (name === 'avatar') renderAvatar();
    if (name === 'rooms') renderProfileChip();
    if (name === 'create') syncCreate();
    if (name === 'stats') renderStats();
    if (name === 'tutorial') renderTut();
    if (name === 'join') { var c = $('#codeInput'); if (pendingCode && !c.value) c.value = pendingCode; $('#joinErr').hidden = true; }
    if (name === 'lobby') renderLobby();
    if (name === 'report') renderReport();
  }

  /* overlays */
  var overlays = [];
  function openOverlay(id) { var el = $('#' + id); el.hidden = false; if (overlays.indexOf(id) < 0) overlays.push(id); var b = el.querySelector('.wbtn'); if (b) try { b.focus({ preventScroll: true }); } catch (e) { } }
  function closeOverlay(id) { var el = $('#' + id); if (el) el.hidden = true; overlays = overlays.filter(function (x) { return x !== id; }); }
  function anyOverlay() { return overlays.length > 0; }
  function closeTopOverlay() {
    var id = overlays[overlays.length - 1];
    if (id === 'o-confirm') { closeOverlay(id); return; }
    if (id === 'o-pause') { doResume(); return; }
    if (id === 'o-result') { act('next'); return; }
    closeOverlay(id);
  }
  function closeAllOverlays() { overlays.slice().forEach(closeOverlay); }

  var toastT = 0;
  function toast(msg, ms) {
    var el = $('#toast'); el.textContent = msg; el.hidden = false; clearTimeout(toastT);
    toastT = setTimeout(function () { el.hidden = true; }, ms || 2200);
  }
  var confirmFn = null;
  function ask(title, msg, yes) { $('#confTitle').textContent = title; $('#confMsg').textContent = msg; confirmFn = yes; openOverlay('o-confirm'); }
  function sfx(n) { AU.play(n); }

  /* ───────────────── widgets: segmented, avatar, tutorial ───────────────── */
  function seg(el, items, getV, setV) {
    el.innerHTML = '';
    items.forEach(function (it) {
      var b = document.createElement('button'); b.type = 'button'; b.setAttribute('role', 'radio'); b.textContent = it.label;
      b.setAttribute('aria-checked', String(getV() === it.value));
      b.addEventListener('click', function () { setV(it.value); sfx('tap'); $$('button', el).forEach(function (x, i) { x.setAttribute('aria-checked', String(items[i].value === getV())); }); });
      el.appendChild(b);
    });
  }
  var TIMER_LBL = function () { return [t('short'), t('normal'), t('long')]; };
  var roomCfg = { rounds: 4, timer: 1 };
  function syncCreate() {
    seg($('#segRounds'), [4, 6, 8].map(function (n) { return { value: n, label: String(n) }; }), function () { return roomCfg.rounds; }, function (v) { roomCfg.rounds = v; });
    seg($('#segTimer'), TIMER_LBL().map(function (l, i) { return { value: i, label: l }; }), function () { return roomCfg.timer; }, function (v) { roomCfg.timer = v; });
  }
  function syncOptions() {
    seg($('#optRounds'), [4, 6, 8].map(function (n) { return { value: n, label: String(n) }; }), function () { return save.rounds; }, function (v) { save.rounds = v; persist(); });
    seg($('#optTimer'), TIMER_LBL().map(function (l, i) { return { value: i, label: l }; }), function () { return save.timerMode; }, function (v) { save.timerMode = v; persist(); });
    $('#serverInput').value = sget(SKEY) || ''; $('#serverErr').hidden = true;
  }
  function syncLangSeg() { seg($('#segLang'), [{ value: '', label: 'Auto' }, { value: 'en', label: 'EN' }, { value: 'es', label: 'ES' }], function () { return save.lang; }, function (v) { save.lang = v; persist(); applyI18n(); syncLangSeg(); }); }
  function nickText() { return D.nickname(save.nickA, save.nickB) || 'Zippy Fox'; }
  function headHTML(kind, cls) { return '<span class="hd ' + (cls || '') + '">' + A.char(kind, 'idle') + '</span>'; }
  function renderProfileChip() { $('#profChip').innerHTML = headHTML(save.character) + '<span>' + nickText() + '</span>' + A.ui('gear', 'sm'); $('#profChip .ico').style.cssText = 'width:.6rem;height:.6rem;margin-left:auto'; }
  function renderAvatar() {
    var box = $('#avPick'); box.innerHTML = '';
    [0, 1].forEach(function (k) {
      var b = document.createElement('button'); b.type = 'button'; b.className = 'av-card'; b.setAttribute('role', 'radio'); b.setAttribute('aria-checked', String(save.character === k));
      b.setAttribute('aria-label', k ? 'Red' : 'Blue'); b.innerHTML = A.char(k, save.character === k ? 'win' : 'idle');
      b.addEventListener('click', function () { save.character = k; persist(); sfx('pick'); renderAvatar(); });
      box.appendChild(b);
    });
    $('#nickA').textContent = D.NICK_A[save.nickA]; $('#nickB').textContent = D.NICK_B[save.nickB];
  }
  function cycleNick(which, dir) {
    var list = which === 'A' ? D.NICK_A : D.NICK_B, k = 'nick' + which;
    save[k] = (save[k] + dir + list.length) % list.length; persist(); sfx('tap'); renderAvatar();
  }
  var tutI = 0;
  function tutSlides() {
    var P = function (id, cls) { return '<span class="pbox ' + (cls || '') + '">' + A.promptIcon(id) + '</span>'; };
    return [
      { h: t('tut1h'), p: t('tut1'), art: P('house') + A.ui('play', 'big-ico') + '<span class="strokes">' + '<i class="used"></i><i class="used"></i><i class="used"></i><i class="used"></i><i class="used"></i>' + '</span>' },
      { h: t('tut2h'), p: t('tut2'), art: P('fish', 'sm') + P('sun', 'sm') + P('house', 'sm ok') + P('star', 'sm') },
      { h: t('tut3h'), p: t('tut3'), art: A.ui('star', 'big-ico') + A.ui('clock', 'big-ico') + A.ui('trophy', 'big-ico') },
      { h: t('tut4h'), p: t('tut4'), art: A.ui('users', 'big-ico') + A.ui('shield', 'big-ico') }
    ];
  }
  function renderTut() {
    var s = tutSlides(), x = s[tutI];
    $('#tutArt').innerHTML = x.art; $('#tutHead').textContent = x.h; $('#tutText').textContent = x.p;
    $('#tutDots').innerHTML = s.map(function (_, i) { return '<i class="' + (i === tutI ? 'on' : '') + '"></i>'; }).join('');
    $('#tutPrev').disabled = tutI === 0;
    $('#tutNext').innerHTML = A.ui(tutI === s.length - 1 ? 'check' : 'play');
  }
  function finishTut() { save.tutorialDone = true; persist(); if (stack.length && stack[stack.length - 1] !== 'logo') back(); else { stack = []; show('menu'); } }
  function renderStats() {
    var s = save.stats, acc = s.rounds ? Math.round(100 * s.correct / s.rounds) + '%' : '—';
    function row(l, v) { return '<div class="stat-row"><span>' + l + '</span><b>' + v + '</b></div>'; }
    $('#statsBody').innerHTML = row(t('stat_games'), s.games) + row(t('stat_best'), s.best) + row(t('stat_correct'), s.correct) + row(t('stat_acc'), acc);
  }

  /* ───────────────── timer ───────────────── */
  var T = { running: false, end: 0, total: 1, raf: 0, left: 0, sec: -1, cb: null };
  var timerEl = $('#timer'), fillEl = $('#timerFill'), numEl = $('#timerNum');
  function timerRender(left) {
    fillEl.style.transform = 'scaleX(' + clamp(left / T.total, 0, 1).toFixed(4) + ')';
    var sec = Math.ceil(left / 1000);
    if (sec !== T.sec) {
      T.sec = sec; numEl.textContent = String(Math.max(0, sec));
      timerEl.classList.toggle('warn', sec <= 10 && sec > 5); timerEl.classList.toggle('danger', sec <= 5);
      if (sec <= 5 && sec > 0) sfx(sec === 5 ? 'warn' : 'tick');
    }
  }
  function timerStart(ms, cb) {
    timerStop(); T.total = Math.max(1, ms); T.end = now() + ms; T.cb = cb; T.running = true; T.sec = -1; timerTick();
  }
  function timerTick() {
    if (!T.running) return;
    var left = Math.max(0, T.end - now());
    timerRender(left);
    if (left <= 0) { T.running = false; var cb = T.cb; T.cb = null; if (cb) cb(); return; }
    T.raf = requestAnimationFrame(timerTick);
  }
  function timerLeft() { return T.running ? Math.max(0, T.end - now()) : T.left; }
  function timerStop() { T.running = false; cancelAnimationFrame(T.raf); }
  function timerPause() { if (!T.running) return; T.left = Math.max(0, T.end - now()); T.running = false; cancelAnimationFrame(T.raf); T.paused = true; }
  function timerResume() { if (!T.paused) return; T.paused = false; T.end = now() + T.left; T.running = true; timerTick(); }
  function timerIdle(txt) { timerStop(); T.sec = -1; fillEl.style.transform = 'scaleX(1)'; numEl.textContent = txt || '–'; timerEl.classList.remove('warn', 'danger'); }

  /* ───────────────── game stage helpers ───────────────── */
  var S = null;       // current game state (solo or mp)
  function buildPalette() {
    var pal = $('#palette'); pal.innerHTML = '';
    D.COLORS.forEach(function (c, i) {
      var b = document.createElement('button'); b.type = 'button'; b.className = 'sw'; b.style.background = c; b.setAttribute('role', 'radio'); b.setAttribute('aria-label', 'Colour ' + (i + 1));
      b.setAttribute('aria-checked', String(pad.color === c));
      b.addEventListener('click', function () { pad.color = c; sfx('pick'); $$('.sw', pal).forEach(function (x) { x.setAttribute('aria-checked', String(x === b)); }); });
      pal.appendChild(b);
    });
    var wd = $('#widths'); wd.innerHTML = '';
    D.WIDTHS.forEach(function (w, i) {
      var b = document.createElement('button'); b.type = 'button'; b.className = 'wd'; b.setAttribute('role', 'radio'); b.setAttribute('aria-label', 'Brush ' + (i + 1));
      b.setAttribute('aria-checked', String(pad.width === w)); var d = [.28, .45, .7][i]; b.innerHTML = '<i style="width:' + d + 'rem;height:' + d + 'rem"></i>';
      b.addEventListener('click', function () { pad.width = w; sfx('pick'); $$('.wd', wd).forEach(function (x) { x.setAttribute('aria-checked', String(x === b)); }); });
      wd.appendChild(b);
    });
  }
  function updateStrokes() {
    var n = pad.board.count(), box = $('#strokeCount'), max = D.CONFIG.MAX_STROKES, h = '';
    for (var i = 0; i < max; i++) h += '<i class="' + (i < n ? 'used' : '') + '"></i>';
    box.innerHTML = h; box.setAttribute('aria-label', (max - n) + ' ' + t('strokes_left'));
    $('#btnUndo').disabled = n === 0; $('#btnClear').disabled = n === 0;
  }
  function setPips(total, idx) {
    var h = ''; for (var i = 0; i < total; i++) h += '<i class="pip ' + (i < idx ? 'done' : i === idx ? 'cur' : '') + '"></i>';
    $('#pips').innerHTML = h; $('#pips').setAttribute('aria-label', t('round_no') + ' ' + (idx + 1) + '/' + total);
  }
  function setScore(v) { $('#hudScore').textContent = String(v); }
  function stage(kind, promptId, choices, onPick) {
    pad.reset(); pad.setMode(kind === 'draw' ? 'draw' : 'view');
    var tools = $('#tools'), pc = $('#promptCard'), ch = $('#choices');
    tools.hidden = kind !== 'draw'; pc.hidden = kind !== 'draw'; ch.hidden = kind !== 'guess';
    $('#waitNote').hidden = true; $('#reacts').hidden = true; $('#stageCover').hidden = true; $('#btnDone').disabled = false;
    if (kind === 'draw') {
      pc.innerHTML = '<span class="pbox">' + A.promptIcon(promptId) + '</span><span class="ptxt">' + A.ui('brush') + '<span>' + t('draw_this') + '</span></span>';
      updateStrokes();
    } else {
      ch.innerHTML = '';
      choices.forEach(function (id, i) {
        var b = document.createElement('button'); b.type = 'button'; b.className = 'choice'; b.dataset.i = i; b.setAttribute('aria-label', 'Option ' + (i + 1));
        b.innerHTML = A.promptIcon(id) + '<span class="mark"></span>';
        b.addEventListener('click', function () { onPick(i, b); });
        ch.appendChild(b);
      });
    }
  }
  function markChoices(correctIdx, pickedIdx) {
    $$('#choices .choice').forEach(function (b, i) {
      b.disabled = true;
      var m = $('.mark', b);
      if (i === correctIdx) { b.classList.add('correct'); m.innerHTML = A.ui('check'); }
      else if (i === pickedIdx) { b.classList.add('wrong'); m.innerHTML = A.ui('close'); }
      else b.classList.add('dim');
    });
  }
  function lockChoices() { $$('#choices .choice').forEach(function (b) { b.disabled = true; }); }
  function cover(html, ms, then) {
    var c = $('#stageCover'); c.innerHTML = html; c.hidden = false; c.style.pointerEvents = then ? 'auto' : 'none'; c.style.background = then ? '' : 'rgba(15,25,70,.55)';
    var done = false;
    function end() { if (done) return; done = true; c.hidden = true; c.onclick = null; if (then) then(); }
    if (then) c.onclick = end;
    setTimeout(end, H.classList.contains('rm') ? Math.min(ms, 450) : ms);
  }

  /* ───────────────── PRACTICE MODE ───────────────── */
  var TIMES = [[20, 15], [30, 25], [45, 35]];
  function startPractice() {
    mpTeardown(); closeAllOverlays(); AU.resume();
    var tm = TIMES[save.timerMode];
    S = { mode: 'solo', session: new D.PracticeSession({ rounds: save.rounds, drawSeconds: tm[0], guessSeconds: tm[1] }), paused: false, board: null };
    stack = []; show('game'); $('#players').hidden = true; setScore(0); setPips(S.session.rounds, 0);
    nextRound();
  }
  function nextRound() {
    var s = S.session, r = s.next();
    if (!r) { finishPractice(); return; }
    S.r = r; setPips(s.rounds, r.index); timerIdle();
    if (r.kind === 'draw') {
      stage('draw', r.promptId);
      pad.lock(true);
      cover('<div><span class="pic-wrap">' + A.promptIcon(r.promptId) + '</span>' + A.ui('brush') + '<div>' + t('you_draw') + '</div></div>', 1100, function () {
        pad.lock(false); timerStart(r.totalMs, soloDrawDone);
      });
    } else {
      stage('guess', r.promptId, r.choices, soloPick);
      lockChoices();
      cover('<div>' + A.ui('eye') + '<div>' + t('you_guess') + '</div></div>', 900, function () {
        $$('#choices .choice').forEach(function (b) { b.disabled = false; });
        pad.playDoodle(r.promptId, Math.min(3600, r.totalMs * 0.2), H.classList.contains('rm'));
        timerStart(r.totalMs, soloExpire);
      });
    }
  }
  function soloPick(i) {
    if (!S || S.mode !== 'solo' || S.r.kind !== 'guess' || S.session.state !== 'playing') return;
    var left = timerLeft(); timerStop();
    var res = S.session.submitGuess(i, left);
    if (!res) { timerStart(Math.max(500, left), soloExpire); return; }
    markChoices(S.r.correctIndex, i); sfx(res.result === 'correct' ? 'correct' : res.result === 'wrong' ? 'wrong' : 'expired');
    setScore(S.session.score);
    setTimeout(function () { showSoloResult(res); }, 900);
  }
  function soloExpire() {
    if (!S || S.mode !== 'solo' || S.session.state !== 'playing') return;
    if (S.r.kind === 'draw') { soloDrawDone(); return; }
    var res = S.session.expire(); if (!res) return;
    markChoices(S.r.correctIndex, -1); sfx('expired'); setTimeout(function () { showSoloResult(res); }, 800);
  }
  function soloDrawDone() {
    if (!S || S.mode !== 'solo' || S.r.kind !== 'draw' || S.session.state !== 'playing') return;
    timerStop(); pad.lock(true);
    var board = pad.board, res = S.session.finishDraw(board);
    if (!res) return;
    S.drawColors = board.colorsUsed(); setScore(S.session.score);
    sfx(res.result === 'identified' ? 'correct' : 'roundEnd');
    setTimeout(function () { showSoloResult(res); }, 500);
  }
  function chip(txt, big, ico) { return '<span class="chip' + (big ? ' big' : '') + '">' + (ico ? A.ui(ico) : '') + txt + '</span>'; }
  function showSoloResult(res) {
    var s = S.session, r = S.r, title, mine, theirs;
    var map = { correct: ['r_correct', 'win', 'sad'], wrong: ['r_wrong', 'sad', 'win'], expired: ['r_expired', 'sad', 'win'], identified: ['r_identified', 'win', 'sad'], missed: ['r_missed', 'react', 'win'], empty: ['r_empty', 'sad', 'win'] };
    var m = map[res.result] || map.wrong; title = t(m[0]); mine = m[1]; theirs = m[2];
    $('#resTitle').textContent = title;
    $('#resChars').innerHTML = A.char(save.character, mine) + A.char(save.character ? 0 : 1, theirs, { flip: true });
    $('#resAns').innerHTML = '<span class="pbox">' + A.promptIcon(r.promptId) + '</span>';
    var chips = chip('+' + res.points, true, 'star');
    if (r.kind === 'guess' && res.result === 'correct') chips += chip(t('speed') + ' +' + (res.points - D.CONFIG.SCORE_CORRECT), false, 'bolt');
    if (r.kind === 'draw' && res.points > 0) {
      chips += chip(t('drawn') + ' +' + D.CONFIG.SCORE_DRAW_COMPLETE, false, 'brush');
      if (res.result === 'identified') chips += chip(t('clear') + ' +' + D.CONFIG.SCORE_DRAW_CLEAR, false, 'thumb');
      if (S.drawColors >= 3) chips += chip(t('creative') + ' +' + D.CONFIG.SCORE_CREATIVE, false, 'heart');
    }
    $('#resPts').innerHTML = chips; $('#resList').hidden = true;
    var last = s.isLast(); $('#btnNext').querySelector('.lbl').textContent = last ? t('results') : t('next');
    openOverlay('o-result'); sfx(res.points > 0 ? 'roundEnd' : 'wrong');
  }
  function finishPractice() {
    var s = S.session, st = save.stats, prevBest = st.best;
    st.games++; st.best = Math.max(st.best, s.score);
    s.history.forEach(function (h) { if (h.kind === 'guess') { st.rounds++; if (h.result === 'correct') st.correct++; } });
    persist();
    var stars = s.stars();
    stack = []; closeAllOverlays(); show('final');
    $('#finTitle').textContent = stars >= 2 ? t('winner') : t('results');
    var good = stars >= 2;
    $('#finChars').innerHTML = A.char(save.character, good ? 'win' : 'react') + A.char(save.character ? 0 : 1, good ? 'sad' : 'win', { flip: true });
    $('#finStars').innerHTML = A.stars(stars, 3); $('#finScore').textContent = String(s.score);
    $('#finSub').textContent = s.score > prevBest && s.score > 0 ? t('new_best') : t('best') + ': ' + st.best;
    $('#board').innerHTML = ''; $('#finAgain').disabled = false; $('#finAgain').querySelector('.lbl').textContent = t('again');
    S.final = true; sfx(good ? 'win' : 'lose');
  }

  /* pause / resume (practice) */
  function doPause() {
    if (!S || S.mode !== 'solo' || cur !== 'game' || S.paused || S.session.state !== 'playing' || !$('#stageCover').hidden) return;
    S.paused = true; timerPause(); pad.lock(true); openOverlay('o-pause'); $('#btnRestart').hidden = false;
  }
  function doResume() {
    if (!S || !S.paused) { closeOverlay('o-pause'); return; }
    S.paused = false; closeOverlay('o-pause');
    if (S.r && !($('#stageCover').hidden === false)) { if (S.r.kind === 'draw') pad.lock(false); timerResume(); }
  }

  /* ───────────────── drawing actions ───────────────── */
  function afterDraw() { updateStrokes(); }
  function doUndo() { if (!pad || pad.mode !== 'draw' || pad.locked) return; if (pad.undo()) { sfx('undo'); if (S && S.mode === 'mp') net.send('undo'); } afterDraw(); }
  function doClear() {
    if (pad.mode !== 'draw' || pad.locked || !pad.board.count()) return;
    ask(t('clear_q'), t('clear_m'), function () { pad.clear(); sfx('clear'); if (S && S.mode === 'mp') net.send('clear'); afterDraw(); });
  }
  function doDone() {
    if (!S || pad.mode !== 'draw' || pad.locked) return;
    if (S.mode === 'solo') soloDrawDone();
    else { mpFlush(); net.send('done'); pad.lock(true); $('#btnDone').disabled = true; $('#waitNote').textContent = t('waiting_end'); $('#waitNote').hidden = false; $('#tools').hidden = true; }
  }

  /* ═════════════════ MULTIPLAYER (client) ═════════════════ */
  var net = new DDNet();
  var M = null;   // {room, rd, answered, ...}
  var REACT_ICONS = ['smile', 'thumb', 'fire', 'wow', 'think', 'heart'];
  function mpTeardown() { net.off(); net.close(true); M = null; hideBanner(); mpWire(); }
  function hideBanner() { $('#banner').hidden = true; }
  function showBanner(txt) { $('#bannerTxt').textContent = txt; $('#banner').hidden = false; }
  var ERR_MAP = { full: 'e_full', nocode: 'e_nocode', started: 'e_started', rate: 'e_rate', bad: 'e_bad', maint: 'e_maint', kicked: 'e_kicked', closed: 'e_host_left', few: 'e_few', noresume: 'e_lost' };

  function profile() { return { n: [save.nickA, save.nickB], ch: save.character, u: save.uid }; }
  function requireServer() {
    var u = serverUrl();
    if (!u) { showError(t('server_none'), { settings: true }); return ''; }
    return u;
  }
  var errRetryFn = null;
  function showError(msg, opts) {
    opts = opts || {}; closeAllOverlays(); hideBanner(); timerStop();
    $('#errMsg').textContent = msg; $('#errTitle').textContent = opts.maint ? t('e_maint').split('.')[0] : t('oops');
    var r = $('#errRetry'); r.hidden = !opts.retry && !opts.settings;
    r.querySelector('.lbl').textContent = opts.settings ? t('go_settings') : t('retry');
    r.firstElementChild.innerHTML = A.ui(opts.settings ? 'gear' : 'retry');
    errRetryFn = opts.settings ? function () { stack = ['menu']; show('options'); } : opts.retry || null;
    stack = []; show('error');
  }
  function startConnect(intent, noteKey) {
    var u = requireServer(); if (!u) return;
    mpTeardown(); mpWire();
    $('#connNote').textContent = t(noteKey || 'connecting'); $('#connTitle').textContent = t('connecting');
    S = { mode: 'mp' }; M = { room: null, intent: intent, seen: {}, scores: {}, answered: false };
    if (cur !== 'conn') go('conn');
    net.open(u, profile(), intent);
  }
  function mpWire() {
    net.off();
    net.on('status', function (st) {
      if (!M) return;
      if (st === 'reconnecting') { showBanner(t('reconnecting')); }
      else if (st === 'open') hideBanner();
    });
    net.on('fail', function (f) {
      if (!M) return;
      var why = f && f.why, msg = why === 'url' ? t('e_url') : why === 'lost' ? t('e_lost') : t('e_connect');
      var intent = M.intent; mpTeardown(); S = null;
      showError(msg, { retry: (why === 'connect' || why === 'close') && intent ? function () { startConnect(intent); } : null });
    });
    net.on('err', function (m) {
      if (!M) return;
      var key = ERR_MAP[m.code] || 'e_bad';
      if (!M.room && M.intent && M.intent.t === 'join' && (m.code === 'nocode' || m.code === 'full' || m.code === 'started' || m.code === 'rate')) {
        mpTeardown(); S = null; stack = ['menu', 'rooms']; show('join'); var e = $('#joinErr'); e.textContent = t(key); e.hidden = false; return;
      }
      if (m.code === 'kicked' || m.code === 'closed' || m.code === 'few' || m.code === 'maint' || m.code === 'noresume' || !M.room) { mpTeardown(); S = null; showError(t(key), { maint: m.code === 'maint' }); return; }
      toast(t(key));
    });
    net.on('welcome', function (m) { if (M) M.me = m.id; });
    net.on('room', onRoom);
    net.on('round', onRound);
    net.on('sync', function (m) { if (!M) return; onRound(m.round, m); });
    net.on('stroke', function (m) { if (M && pad.mode === 'view' && !isBlockedId(M.rd && M.rd.drawer)) { pad.remoteStroke(m); } });
    net.on('undo', function () { if (M && pad.mode === 'view') pad.remoteUndo(); });
    net.on('clear', function () { if (M && pad.mode === 'view') pad.remoteClear(); });
    net.on('guessed', function (m) { if (M) { M.guessed[m.pid] = 1; renderPlayersStrip(); } });
    net.on('ack', onAck);
    net.on('react', onReact);
    net.on('end', onEnd);
    net.on('over', onOver);
  }

  function me() { return M && M.room && M.room.players.filter(function (p) { return p.id === M.me; })[0]; }
  function pById(id) { return M && M.room ? M.room.players.filter(function (p) { return p.id === id; })[0] : null; }
  function pName(p) { return p ? (D.nickname(p.n[0], p.n[1]) || '?') : '?'; }
  function isHost() { return M && M.room && M.room.host === M.me; }
  function isBlockedId(id) { var p = pById(id); return !!(p && save.blocked.indexOf(p.k) >= 0); }

  function onRoom(m) {
    if (!M) return;
    var first = !M.room, prev = M.room;
    if (!Array.isArray(m.players)) return;
    M.room = m;
    if (prev) {
      var old = {}; prev.players.forEach(function (p) { old[p.id] = p; });
      var cur2 = {}; m.players.forEach(function (p) { cur2[p.id] = p; });
      m.players.forEach(function (p) { if (!old[p.id] && p.id !== M.me) { toast(pName(p) + ' ' + t('joined')); sfx('join'); } });
      prev.players.forEach(function (p) { if (!cur2[p.id] && p.id !== M.me) { toast(pName(p) + ' ' + t('left')); sfx('leave'); } });
    }
    if (first) { stack = ['menu', 'rooms']; show('lobby'); }
    if (m.phase === 'lobby') {
      if (cur !== 'lobby' && cur !== 'report' && cur !== 'avatar') { closeAllOverlays(); timerStop(); stack = ['menu', 'rooms']; show('lobby'); }
      renderLobby();
    } else if (cur === 'game') renderPlayersStrip();
    if (cur === 'report') renderReport();
    if (cur === 'final') renderFinalBtn();
  }
  function renderLobby() {
    if (!M || !M.room) return;
    var r = M.room; $('#lobbyCode').textContent = r.code;
    $('#lobbyMeta').innerHTML = chip(A.ui('users').replace('<svg', '<svg') + ' ' + r.players.length + '/' + D.CONFIG.MAX_PLAYERS, false) + chip(A.ui('list') + ' ' + r.rounds, false) + chip(A.ui('clock') + ' ' + TIMER_LBL()[r.timer], false);
    var h = '';
    for (var i = 0; i < D.CONFIG.MAX_PLAYERS; i++) {
      var p = r.players[i];
      if (!p) { h += '<li class="slot empty">' + A.ui('users') + '<span class="nm">' + t('empty_slot') + '</span></li>'; continue; }
      var isH = p.id === r.host, ready = isH || p.ready;
      h += '<li class="slot' + (ready ? ' ready' : '') + (p.on ? '' : ' off') + (p.id === M.me ? ' me' : '') + '">' + (isH ? A.ui('crown', 'crown') : '') + headHTML(p.ch) +
        '<span class="nm">' + pName(p) + (p.id === M.me ? ' (' + t('you') + ')' : '') + (p.on ? '' : '<br><small>' + t('away') + '</small>') + '</span><span class="st">' + A.ui(ready ? 'check' : 'clock') + '</span></li>';
    }
    $('#slots').innerHTML = h;
    var host = isHost(), my = me();
    $('#btnReady').hidden = host; $('#btnStart').hidden = !host;
    if (my && !host) { $('#btnReady').querySelector('.lbl').textContent = my.ready ? t('unready') : t('ready'); $('#btnReady').classList.toggle('go', !my.ready); }
    var others = r.players.filter(function (p) { return p.id !== r.host; });
    var okStart = r.players.length >= D.CONFIG.MIN_PLAYERS && others.every(function (p) { return p.ready && p.on; });
    $('#btnStart').disabled = !okStart;
    $('#btnStart').title = okStart ? '' : (r.players.length < 2 ? t('need_two') : t('wait_all_ready'));
  }
  function renderPlayersStrip() {
    if (!M || !M.room) return;
    var rd = M.rd || {}, h = '';
    M.room.players.forEach(function (p) {
      h += '<div class="pchip' + (p.id === rd.drawer ? ' drawer' : '') + (p.id === M.me ? ' me' : '') + (p.on ? '' : ' off') + (M.guessed && M.guessed[p.id] ? ' got' : '') + '"><span class="hd">' + A.char(p.ch, 'idle') + '</span><span><b>' + p.score + '</b><small>' + pName(p) + '</small></span></div>';
    });
    $('#players').innerHTML = h; var m = me(); if (m) setScore(m.score);
  }

  var sendBuf = [], sendT = 0, sendIdx = -1;
  function mpFlush() {
    clearTimeout(sendT); sendT = 0;
    while (sendBuf.length) { net.send('stroke', { id: sendIdx, pts: sendBuf.splice(0, 60) }); }
  }
  function wirePadMP() {
    pad.cb.onStart = function (idx, c, w, pt) { if (!S || S.mode !== 'mp') return; sendBuf = []; sendIdx = idx; net.send('stroke', { id: idx, c: c, w: w, pts: [pt], first: true }); };
    pad.cb.onPoints = function (idx, pts) { if (!S || S.mode !== 'mp') return; for (var i = 0; i < pts.length; i++) sendBuf.push(pts[i]); if (!sendT) sendT = setTimeout(mpFlush, 90); };
    pad.cb.onEnd = function () { if (S && S.mode === 'mp') mpFlush(); sfxStrokeEnd(); updateStrokes(); };
    pad.cb.onLimit = function () { var b = $('#strokeCount'); b.classList.remove('full'); void b.offsetWidth; b.classList.add('full'); sfx('wrong'); toast(t('hint_limit'), 1200); };
    pad.cb.onChange = function () { if (pad.mode === 'draw') updateStrokes(); };
  }
  function sfxStrokeEnd() { }

  function onRound(m, sync) {
    if (!M || !m || typeof m !== 'object') return;
    if (typeof m.n !== 'number' || typeof m.of !== 'number' || typeof m.ms !== 'number') return;
    closeOverlay('o-result'); closeOverlay('o-pause');
    M.rd = m; M.guessed = {}; M.answered = false; M.picked = -1;
    if (sync && Array.isArray(sync.guessed)) sync.guessed.forEach(function (id) { M.guessed[id] = 1; });
    if (cur !== 'game') { stack = []; show('game'); }
    $('#players').hidden = false; setPips(m.of, m.n - 1); renderPlayersStrip();
    var iDraw = m.you === 'draw';
    if (iDraw && typeof m.prompt === 'string' && D.ICONS[m.prompt]) {
      stage('draw', m.prompt); $('#btnDone').disabled = false;
      if (sync && Array.isArray(sync.strokes)) {
        sync.strokes.slice(0, D.CONFIG.MAX_STROKES).forEach(function (s) {
          if (s && D.validColor(s.c) && D.validWidth(s.w) && Array.isArray(s.p)) pad.board.strokes.push({ c: s.c, w: s.w, p: s.p.slice(0, D.CONFIG.MAX_POINTS).map(function (q) { return [D.clampPt(+q[0] || 0), D.clampPt(+q[1] || 0)]; }) });
        });
        pad.dirty = true; pad.render(); updateStrokes();
      }
      cover('<div>' + A.ui('brush') + '<div>' + t('you_draw') + '</div></div>', 900);
    } else if (!iDraw && Array.isArray(m.choices) && m.choices.length >= 2 && m.choices.length <= 6 && m.choices.every(function (id) { return !!D.ICONS[id]; })) {
      stage('guess', null, m.choices, mpPick);
      $('#reacts').hidden = false; buildReacts();
      var d = pById(m.drawer);
      if (isBlockedId(m.drawer)) { cover('<div>' + A.ui('block') + '<div>' + t('hidden_drawing') + '</div></div>', 2500); }
      else cover('<div>' + A.ui('eye') + '<div>' + pName(d) + ' ' + t('waiting_draw') + '</div></div>', 1000);
      if (sync && Array.isArray(sync.strokes)) pad.setRemote(sync.strokes);
      if (sync && sync.answered != null) { M.answered = true; markChoices(sync.correctIdx == null ? -1 : sync.correctIdx, sync.picked == null ? -1 : sync.picked); }
    } else return;
    timerStart(m.ms, function () { if (pad.mode === 'draw') { pad.lock(true); } lockChoices(); });
  }
  function mpPick(i) {
    if (!M || M.answered) return;
    M.answered = true; M.picked = i; lockChoices();
    net.send('guess', { i: i }); sfx('pick');
    $$('#choices .choice')[i].classList.add('dim');
    var w = $('#waitNote'); w.textContent = t('locked'); w.hidden = false;
  }
  function onAck(m) {
    if (!M) return;
    $('#waitNote').hidden = true;
    var corr = !!m.correct; M.myPts = m.pts || 0;
    markChoicesMP(M.picked, corr); sfx(corr ? 'correct' : 'wrong');
  }
  function markChoicesMP(picked, correct) {
    $$('#choices .choice').forEach(function (b, i) {
      b.disabled = true; b.classList.remove('dim'); var mk = $('.mark', b);
      if (i === picked) { b.classList.add(correct ? 'correct' : 'wrong'); mk.innerHTML = A.ui(correct ? 'check' : 'close'); } else b.classList.add('dim');
    });
  }
  function buildReacts() {
    var box = $('#reacts'); box.innerHTML = '';
    for (var i = 0; i < D.REACTION_COUNT; i++) (function (r) {
      var b = document.createElement('button'); b.type = 'button'; b.className = 'sq sm'; b.setAttribute('aria-label', 'Reaction ' + (r + 1)); b.innerHTML = A.ui(REACT_ICONS[r]);
      b.addEventListener('click', function () { if (!M || M.lastReact && now() - M.lastReact < 800) return; M.lastReact = now(); net.send('react', { r: r }); });
      box.appendChild(b);
    })(i);
  }
  function onReact(m) {
    if (!M || typeof m.r !== 'number' || m.r < 0 || m.r >= D.REACTION_COUNT || m.r !== Math.floor(m.r)) return;
    var p = pById(m.pid); if (!p || save.blocked.indexOf(p.k) >= 0 || cur !== 'game') return;
    var wrap = $('#canvasWrap'), el = document.createElement('div'); el.className = 'float-react'; el.innerHTML = A.ui(REACT_ICONS[m.r]);
    el.style.left = (8 + Math.random() * 70) + '%'; el.style.bottom = '6%'; wrap.appendChild(el); sfx('react');
    setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 1700);
  }
  function onEnd(m) {
    if (!M) return;
    timerStop(); pad.lock(true); lockChoices(); mpFlush();
    if (m.s && typeof m.s === 'object') M.room.players.forEach(function (p) { if (typeof m.s[p.id] === 'number') p.score = m.s[p.id]; });
    renderPlayersStrip();
    var d = m.d || {}, mine = d[M.me] || 0, ans = D.ICONS[m.answer] ? m.answer : 'star';
    $('#resTitle').textContent = t('r_over');
    var mk = save.character;
    $('#resChars').innerHTML = A.char(mk, mine > 0 ? 'win' : 'sad') + A.char(mk ? 0 : 1, mine > 0 ? 'react' : 'win', { flip: true });
    $('#resAns').innerHTML = '<span class="pbox">' + A.promptIcon(ans) + '</span>';
    $('#resPts').innerHTML = chip('+' + mine, true, 'star');
    var rows = M.room.players.slice().sort(function (a, b) { return (d[b.id] || 0) - (d[a.id] || 0); }).map(function (p) {
      return '<li><span class="nm">' + pName(p) + (p.id === M.me ? ' (' + t('you') + ')' : '') + '</span><span class="dl">+' + (d[p.id] || 0) + '</span></li>';
    }).join('');
    var rl = $('#resList'); rl.innerHTML = rows; rl.hidden = false;
    $('#btnNext').querySelector('.lbl').textContent = t('ok');
    openOverlay('o-result'); sfx(mine > 0 ? 'roundEnd' : 'wrong');
  }
  function onOver(m) {
    if (!M || !Array.isArray(m.board)) return;
    closeAllOverlays(); timerStop(); stack = []; show('final');
    var board = m.board.map(function (b) { return { p: pById(b.id), score: b.score }; }).filter(function (b) { return b.p; });
    var top = board[0], iWon = top && top.p.id === M.me;
    $('#finTitle').textContent = iWon ? t('winner') : t('results');
    $('#finChars').innerHTML = top ? A.char(top.p.ch, 'win') : '';
    var mine = board.filter(function (b) { return b.p.id === M.me; })[0];
    $('#finStars').innerHTML = A.ui('crown', 'big-ico').replace('class="ico big-ico"', 'class="ico" style="width:1.5rem;height:1.5rem;color:#ffd23f"');
    $('#finScore').textContent = mine ? mine.score : 0;
    $('#finSub').textContent = top ? pName(top.p) : '';
    $('#board').innerHTML = board.map(function (b) { return '<li class="' + (b.p.id === M.me ? 'me' : '') + '">' + headHTML(b.p.ch) + '<span class="nm">' + pName(b.p) + '</span><b>' + b.score + '</b></li>'; }).join('');
    renderFinalBtn(); sfx(iWon ? 'win' : 'lose');
  }
  function renderFinalBtn() {
    var b = $('#finAgain'); if (!M) return;
    b.querySelector('.lbl').textContent = t('rematch'); b.disabled = !isHost();
    if (!isHost()) b.querySelector('.lbl').textContent = t('waiting_host');
  }

  /* report / block */
  var repSel = null;
  function renderReport() {
    var list = $('#repList'), others = M && M.room ? M.room.players.filter(function (p) { return p.id !== M.me; }) : [];
    if (!others.length) { list.innerHTML = '<li class="note">' + t('no_players') + '</li>'; $('#repReasons').hidden = true; return; }
    list.innerHTML = others.map(function (p) {
      var bl = save.blocked.indexOf(p.k) >= 0;
      return '<li class="rep-item' + (repSel === p.id ? ' sel' : '') + '" data-id="' + p.id + '">' + headHTML(p.ch) + '<span class="nm">' + pName(p) + (bl ? ' ⛔' : '') + '</span>' +
        '<button class="sq sm" data-rep="flag" aria-label="Report">' + A.ui('flag') + '</button><button class="sq sm' + (bl ? ' on' : '') + '" data-rep="block" aria-label="' + t(bl ? 'unblock' : 'block') + '">' + A.ui('block') + '</button>' +
        (isHost() ? '<button class="sq sm" data-rep="kick" aria-label="' + t('kick') + '">' + A.ui('close') + '</button>' : '') + '</li>';
    }).join('');
    var rr = $('#repReasons'); rr.hidden = repSel == null;
    rr.innerHTML = [0, 1, 2, 3].map(function (i) { return '<button class="wbtn" data-why="' + i + '"><span class="lbl">' + t('why' + i) + '</span></button>'; }).join('');
  }
  $('#repList').addEventListener('click', function (e) {
    var b = e.target.closest('[data-rep]'); if (!b || !M) return;
    var li = b.closest('.rep-item'), id = li.dataset.id, p = pById(id); if (!p) return;
    sfx('tap');
    if (b.dataset.rep === 'flag') { repSel = id; renderReport(); }
    else if (b.dataset.rep === 'block') {
      var i = save.blocked.indexOf(p.k);
      if (i >= 0) { save.blocked.splice(i, 1); toast(t('unblocked')); } else { save.blocked.push(p.k); save.blocked = save.blocked.slice(-50); toast(t('blocked')); }
      persist(); renderReport();
    } else if (b.dataset.rep === 'kick') { net.send('kick', { pid: id }); }
  });
  $('#repReasons').addEventListener('click', function (e) {
    var b = e.target.closest('[data-why]'); if (!b || !M || repSel == null) return;
    net.send('report', { pid: repSel, why: +b.dataset.why }); repSel = null; toast(t('reported')); renderReport(); sfx('pick');
  });

  /* invite */
  function inviteLink() {
    var base = location.origin && location.origin !== 'null' ? location.origin + location.pathname : '';
    var q = '?room=' + (M && M.room ? M.room.code : '');
    var custom = sget(SKEY); if (custom) q += '&s=' + encodeURIComponent(custom);
    return base + q;
  }
  function copyText(txt) {
    function fb() {
      try { var ta = document.createElement('textarea'); ta.value = txt; ta.style.cssText = 'position:fixed;opacity:0'; document.body.appendChild(ta); ta.select(); var ok = document.execCommand('copy'); document.body.removeChild(ta); toast(ok ? t('copied') : t('copy_fail')); } catch (e) { toast(t('copy_fail')); }
    }
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(txt).then(function () { toast(t('copied')); }, fb); else fb();
  }

  /* ───────────────── actions ───────────────── */
  var ACTS = {
    welcome: function () { AU.resume(); AU.startMusic(); stack = []; if (!save.tutorialDone) { tutI = 0; show('tutorial'); } else show('menu'); },
    tutPrev: function () { if (tutI > 0) { tutI--; renderTut(); } },
    tutNext: function () { if (tutI < tutSlides().length - 1) { tutI++; renderTut(); } else finishTut(); },
    tutSkip: function () { finishTut(); },
    practice: startPractice,
    rooms: function () { go('rooms'); },
    settings: function () { go('settings'); },
    howto: function () { tutI = 0; go('tutorial'); },
    avatar: function () { go('avatar'); },
    stats: function () { go('stats'); },
    privacy: function () { go('privacy'); },
    credits: function () { go('credits'); },
    exit: function () {
      ask(t('exit_q'), t('exit_m'), function () {
        try { var cap = window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.App; if (cap && cap.exitApp) { cap.exitApp(); return; } } catch (e) { }
        mpTeardown(); S = null; stack = []; closeAllOverlays(); show('logo');
      });
    },
    pause: doPause, resume: doResume,
    restart: function () { ask(t('restart') + '?', t('quit_m'), function () { closeOverlay('o-pause'); startPractice(); }); },
    quit: function () { ask(t('quit_q'), S && S.mode === 'mp' ? t('leave_m') : t('quit_m'), function () { closeAllOverlays(); timerStop(); if (S && S.mode === 'mp') { net.send('leave'); mpTeardown(); } S = null; toMenu(); }); },
    goAudio2: function () { closeOverlay('o-pause'); stack.push('game'); show('audio'); S && (S.paused = true); },
    undo: doUndo, clear: doClear, done: doDone,
    next: function () {
      closeOverlay('o-result');
      if (S && S.mode === 'solo') nextRound();
    },
    finMenu: function () { if (S && S.mode === 'mp') { net.send('leave'); mpTeardown(); } S = null; toMenu(); },
    finAgain: function () { if (S && S.mode === 'mp') { if (isHost()) net.send('again'); } else startPractice(); },
    gotoCreate: function () { go('create'); },
    gotoJoin: function () { go('join'); },
    doCreate: function () { startConnect({ t: 'create', rounds: roomCfg.rounds, timer: roomCfg.timer }); },
    doJoin: function () {
      var c = $('#codeInput').value.trim().toUpperCase(), e = $('#joinErr');
      if (!/^[A-HJ-NP-Z2-9]{5}$/.test(c)) { e.textContent = t('e_code'); e.hidden = false; sfx('wrong'); return; }
      e.hidden = true; pendingCode = ''; startConnect({ t: 'join', code: c });
    },
    connCancel: function () { mpTeardown(); S = null; stack = []; show('rooms'); },
    errRetry: function () { var f = errRetryFn; if (f) f(); },
    errHome: function () { mpTeardown(); S = null; toMenu(); },
    copyCode: function () { if (M && M.room) copyText(M.room.code); },
    shareCode: function () {
      if (!M || !M.room) return;
      var link = inviteLink(), data = { title: 'DOODLE DUEL', text: t('invite') + ' — ' + M.room.code, url: link };
      if (navigator.share) navigator.share(data).catch(function () { }); else copyText(t('invite') + ': ' + M.room.code + ' ' + link);
    },
    leaveRoom: function () { ask(t('leave_q'), t('leave_m'), function () { net.send('leave'); mpTeardown(); S = null; stack = []; show('rooms'); }); },
    reportOpen: function () { repSel = null; go('report'); },
    toggleReady: function () { var p = me(); if (p) net.send('ready', { v: !p.ready }); sfx('pick'); },
    startGame: function () { net.send('start'); sfx('pick'); },
    'nickA-': function () { cycleNick('A', -1); }, 'nickA+': function () { cycleNick('A', 1); },
    'nickB-': function () { cycleNick('B', -1); }, 'nickB+': function () { cycleNick('B', 1); },
    goAudio: function () { go('audio'); }, goAccess: function () { go('access'); }, goOptions: function () { go('options'); },
    'vol-music-': function () { vol('music', -.1); }, 'vol-music+': function () { vol('music', .1); },
    'vol-sfx-': function () { vol('sfx', -.1); }, 'vol-sfx+': function () { vol('sfx', .1); },
    toggleMute: function () { save.muted = !save.muted; persist(); applyAudio(); if (!save.muted) sfx('pick'); },
    saveServer: function () {
      var v = $('#serverInput').value.trim(), e = $('#serverErr');
      if (!v) { sdel(SKEY); e.hidden = true; toast(t('saved')); return; }
      if (!DDNet.validUrl(v)) { e.textContent = t('e_url'); e.hidden = false; sfx('wrong'); return; }
      sset(SKEY, v); e.hidden = true; toast(t('saved'));
    },
    resetData: function () {
      ask(t('reset_q'), t('reset_m'), function () {
        var uid = save.uid; sdel(KEY); sdel(SKEY); save = D.defaultSave(); save.uid = uid; persist(); applyAccess(); applyAudio(); applyI18n(); toast(t('done_reset')); syncOptions();
      });
    },
    back: back,
    confYes: function () { var f = confirmFn; confirmFn = null; closeOverlay('o-confirm'); if (f) f(); },
    confNo: function () { confirmFn = null; closeOverlay('o-confirm'); }
  };
  function vol(which, d) { save[which] = clamp(Math.round((save[which] + d) * 100) / 100, 0, 1); if (save.muted && save[which] > 0) save.muted = false; persist(); applyAudio(); sfx('tap'); }
  function act(name, el) {
    if (name.indexOf('tgl-') === 0) { var k = name.slice(4); save[k] = !save[k]; persist(); applyAccess(); sfx('tap'); return; }
    var f = ACTS[name]; if (f) { if (name !== 'welcome' && name !== 'done' && name !== 'undo' && name !== 'clear') sfx(name === 'back' ? 'back' : 'tap'); f(el); }
  }
  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-act]'); if (!b || b.disabled) return;
    act(b.getAttribute('data-act'), b);
  });
  $('#volMusic').addEventListener('input', function (e) { save.music = e.target.value / 100; e.target.style.setProperty('--p', e.target.value + '%'); applyAudio(); });
  $('#volMusic').addEventListener('change', persist);
  $('#volSfx').addEventListener('input', function (e) { save.sfx = e.target.value / 100; e.target.style.setProperty('--p', e.target.value + '%'); applyAudio(); });
  $('#volSfx').addEventListener('change', function () { persist(); sfx('tap'); });
  $('#codeInput').addEventListener('input', function (e) { e.target.value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 5); });
  $('#codeInput').addEventListener('keydown', function (e) { if (e.key === 'Enter') ACTS.doJoin(); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { e.preventDefault(); if (cur === 'logo') return; if (anyOverlay()) closeTopOverlay(); else if (cur === 'game') (S && S.mode === 'solo' ? doPause() : ACTS.quit()); else back(); }
  });
  document.addEventListener('contextmenu', function (e) { if (!/INPUT|TEXTAREA/.test(e.target.tagName)) e.preventDefault(); });
  document.addEventListener('gesturestart', function (e) { e.preventDefault(); });
  document.addEventListener('dblclick', function (e) { e.preventDefault(); }, { passive: false });

  // Android hardware back (Capacitor) — same behaviour as Escape
  try { var capApp = window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.App; if (capApp && capApp.addListener) capApp.addListener('backButton', function () { if (cur === 'logo' || cur === 'menu') ACTS.exit(); else document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' })); }); } catch (e) { }

  // background / foreground: pause practice, probe the network, resume audio
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) { if (S && S.mode === 'solo' && cur === 'game' && !anyOverlay()) doPause(); if (pad && pad.board.active) pad.lock(false); }
    else { AU.resume(); if (M) net.wake(); }
  });
  window.addEventListener('pagehide', function () { if (M && M.room) net.send('leave'); });
  window.addEventListener('online', function () { if (M) net.wake(); });

  /* ───────────────── boot ───────────────── */
  function floaters() {
    var F = ['<path d="M50 8l11 24 26 3-19 18 5 26-23-13-23 13 5-26-19-18 26-3z"/>', '<circle cx="50" cy="50" r="30"/>', '<path d="M10 70q20-50 40-10t40-30"/>', '<path d="M20 20l60 60M80 20L20 80"/>', '<path d="M15 80 50 15l35 65z"/>'];
    var h = '';
    for (var i = 0; i < 9; i++) h += '<div class="fl" style="left:' + ((i * 37 + 8) % 92) + '%;top:' + ((i * 53 + 6) % 88) + '%;animation-delay:-' + (i * 1.1) + 's;transform:scale(' + (0.6 + (i % 4) * 0.25) + ')"><svg viewBox="0 0 100 100">' + F[i % F.length] + '</svg></div>';
    $('#floaters').innerHTML = h;
  }
  function boot() {
    layout(); icons(document); applyI18n(); applyAccess(); applyAudio(); floaters();
    pad = new Pad($('#pad')); layout();
    buildPalette(); updateStrokes(); wirePadMP();
    pad.cb.onChange = function () { if (pad.mode === 'draw') updateStrokes(); };
    pad.cb.onEnd = function () { if (S && S.mode === 'mp') mpFlush(); updateStrokes(); };
    // loading bar: real tasks + a short minimum so the logo is seen
    var tasks = 3, done = 0, fill = $('#loadfill'), txt = $('#loadtxt'), bar = $('#loadbar'), t0 = now();
    function prog() {
      var p = Math.min(100, Math.round(done / tasks * 100));
      fill.style.width = p + '%'; txt.textContent = p + '%'; bar.setAttribute('aria-valuenow', p);
      if (p >= 100) { setTimeout(function () { var w = $('#btnWelcome'); w.disabled = false; try { w.focus({ preventScroll: true }); } catch (e) { } bar.style.display = 'none'; }, Math.max(0, 900 - (now() - t0))); }
    }
    function step() { done++; prog(); }
    var img = $('#logoImg');
    if (img.complete) step(); else { img.addEventListener('load', step, { once: true }); img.addEventListener('error', step, { once: true }); }
    setTimeout(step, 250);
    (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(step, step);
    show('logo');
    var url = serverUrl(); if (url && 'serviceWorker' in navigator === false) { /* noop */ }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();

  // test/automation hook (read-only helpers; no effect on gameplay)
  window.__DD = { get screen() { return cur; }, get state() { return S; }, get save() { return save; }, get pad() { return pad; }, get M() { return M; }, act: act, show: show, go: go, openOverlay: openOverlay, closeOverlay: closeOverlay, applyAccess: applyAccess, applyI18n: applyI18n, persist: persist, net: net };
})();
