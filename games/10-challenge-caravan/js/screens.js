/* CHALLENGE CARAVAN — Reward manager, App controller and all non-game screens */
(function () {
  'use strict';
  var CC = window.CC, UI = CC.UI, State = CC.State, Save = CC.Save, $ = UI.$;
  var N = CC.DEST.length;

  /* =============== REWARD / PROGRESS MANAGER =============== */
  var Progress = {
    potential: function (cleared) { return cleared ? 75 : 140; },
    starsFor: function (success, perf) { return !success ? 0 : perf >= 0.9 ? 3 : perf >= 0.62 ? 2 : 1; },
    apply: function (destId, gameId, run) {
      var S = Save.data, node = Save.node(destId);
      var first = !node.cleared, visited = node.plays > 0;
      var prevBest = node.best[gameId] || 0;
      var perf = Math.max(0, Math.min(1, isFinite(run.perf) ? run.perf : 0));
      var score = Math.max(0, Math.round(isFinite(run.score) ? run.score : 0));
      var stars = Progress.starsFor(run.success, perf);
      var notes = [], jp = 0, newBest = false;
      if (!visited) { jp += 5; notes.push('Exploration +5'); }
      if (!run.success) {
        var p = Math.round(5 + perf * 10); jp += p; notes.push('Effort +' + p); S.streak = 0;
      } else {
        S.streak++;
        var base = first ? 30 : 10; jp += base; notes.push('Challenge complete +' + base);
        var acc = Math.round(perf * (first ? 50 : 20)); jp += acc; notes.push('Skill +' + acc);
        if (first) { jp += 25; notes.push('First clear +25'); }
        if (prevBest > 0 && score > prevBest) { jp += 15; newBest = true; notes.push('Personal best +15'); }
        var od = 0;
        (run.opts || []).forEach(function (o) { if (o.done && od < 2) { od++; jp += 8; notes.push(o.label + ' +8'); } });
        if (S.streak >= 2) { var sb = Math.min(15, (S.streak - 1) * 5); jp += sb; notes.push('Streak x' + S.streak + ' +' + sb); }
      }
      jp = Math.max(0, Math.min(150, jp));
      var fl = run.flags || {};
      /* persist */
      var prevJP = S.jp;
      S.jp += jp;
      S.started = true;
      node.plays++;
      if (score > prevBest) node.best[gameId] = score;
      node.stars = Math.max(node.stars, stars);
      var wasCleared = node.cleared;
      if (run.success) node.cleared = true;
      S.totals.runs++;
      S.totals.tokens += Math.max(0, fl.tokens | 0);
      S.totals.snaps += Math.max(0, fl.snaps | 0);
      S.totals.perfects += Math.max(0, fl.perfects | 0);
      if (run.success && gameId === 'puzzle') S.totals.solved++;
      /* community (capped per member per stage) */
      var cur = S.community.stage[destId] || 0, gain = Math.max(0, Math.min(CC.STAGE_CAP - cur, jp));
      S.community.stage[destId] = cur + gain;
      S.community.last = { dest: destId, pts: gain };
      /* unlock */
      var from = Math.min(S.unlocked, N - 1), unlockedNew = false;
      if (run.success && destId === S.unlocked && destId < N - 1) { S.unlocked++; unlockedNew = true; }
      var complete = run.success && destId === N - 1 && !wasCleared;
      /* badges */
      var newBadges = [];
      function award(id) { if (!S.badges[id]) { S.badges[id] = true; newBadges.push(id); } }
      if (run.success) {
        award('first');
        if (stars === 3) award('three');
        if (S.streak >= 3) award('streak3');
        if (first) award('dest' + destId);
        if (fl.noHit) award('speed');
        if (fl.combo4) award('combo');
        if (fl.underPar) award('pz');
        if (fl.allOnTarget) award('eye');
        if (newBest) award('better');
        if (complete || (destId === N - 1)) award('champ');
      }
      if (S.totals.perfects >= 3) award('perfect');
      if (S.unlocked >= 4) award('half');
      /* items by Journey Points milestones */
      var newItems = [];
      CC.SKINS.forEach(function (k) { if (k.need > 0 && S.jp >= k.need && !S.skins[k.id]) { S.skins[k.id] = true; newItems.push({ type: 'skin', item: k }); } });
      CC.DECOR.forEach(function (d) { if (S.jp >= d.need && !S.decor[d.id]) { S.decor[d.id] = true; newItems.push({ type: 'decor', item: d }); } });
      Save.save();
      return { stars: stars, jp: jp, notes: notes, newBest: newBest, prevBest: prevBest, best: node.best[gameId] || score, newBadges: newBadges, newItems: newItems,
        unlockedNew: unlockedNew, from: from, to: Math.min(S.unlocked, N - 1), complete: complete, success: !!run.success, perf: perf, score: score, streak: S.streak, prevJP: prevJP };
    }
  };
  CC.Progress = Progress;

  /* =============== APP CONTROLLER =============== */
  var App = {
    pendingTravel: null, last: null, pick: 'dash', howtoGame: null,
    startJourney: function () {
      var S = Save.data; S.started = true; Save.save();
      if (!S.tutorial.story) { State.go('STORY', {}, { wipe: true }); }
      else State.go('WORLD_MAP', {}, { wipe: true });
    },
    play: function (id) {
      var S = Save.data, d = CC.DEST[id];
      if (!d || id > S.unlocked) return;
      var game = d.game === 'any' ? App.pick : d.game;
      if (d.game === 'any' || !S.tutorial[game]) State.go('CHALLENGE_INTRO', { dest: id, game: game });
      else State.go('MINIGAME', { dest: id, game: game }, { wipe: true });
    }
  };
  CC.App = App;

  function artHTML(list) { return list.map(function (c) { return "<div class='crew-m'>" + CC.Characters.svg(c[0], c[1]) + '</div>'; }).join(''); }
  function setText(id, t) { var e = $(id); if (e) e.textContent = t; }
  function refreshMenu() {
    var S = Save.data;
    setText('start-label', S.started && (Save.clearedCount() || S.tutorial.story) ? 'CONTINUE JOURNEY' : 'START JOURNEY');
    setText('menu-jp', S.jp);
    setText('menu-stars', Save.totalStars() + ' / ' + CC.MAX_STARS);
    var cleared = S.nodes[N - 1] && S.nodes[N - 1].cleared;
    setText('menu-next', cleared ? 'Journey complete!' : CC.DEST[Math.min(S.unlocked, N - 1)].name);
  }

  /* =============== STATE REGISTRATION =============== */
  State.register('BOOT', { screen: 'boot' });
  State.register('WELCOME', { screen: 'welcome', focus: 'btn-welcome' });
  State.register('MAIN_MENU', {
    screen: 'menu', focus: 'btn-start',
    enter: function () {
      refreshMenu();
      var crew = $('menu-crew');
      if (crew && !crew.children.length) crew.innerHTML = CC.Characters.crewHTML(['point', 'ready', 'map', 'celebrate', 'idle']);
      CC.Audio.setDuck(1);
    }
  });
  State.register('STORY', {
    screen: 'story', focus: 'story-go',
    enter: function () { $('story-art').innerHTML = artHTML([[1, 'ready'], [0, 'point'], [2, 'map'], [3, 'celebrate']]); },
    escape: function () { State.go('MAIN_MENU', {}, { wipe: true }); }
  });
  State.register('WORLD_MAP', {
    screen: 'map',
    focus: function () { return document.querySelector('#map-nodes .node[data-autofocus]'); },
    enter: function (data) { CC.Map.enter(data); CC.Audio.setDuck(1); },
    leave: function () { CC.Map.leave(); },
    escape: function () { if (!$('dest-panel').hidden) CC.Map.closePanel(); else State.go('MAIN_MENU', {}, { wipe: true }); }
  });

  /* ----- Challenge intro ----- */
  var introData = null;
  function fillIntro() {
    var d = CC.DEST[introData.dest], g = CC.GAMES[introData.game];
    setText('intro-eyebrow', 'Stop ' + (introData.dest + 1) + ' · ' + d.name + ' · ' + CC.DIFF_NAMES[d.diff]);
    setText('intro-title', g.name);
    setText('intro-goal', g.goal);
    $('intro-controls').innerHTML = g.controls.map(function (c) { return '<li>' + c + '</li>'; }).join('');
    var ch = { dash: [0, 'point'], puzzle: [2, 'map'], snap: [1, 'ready'] }[introData.game];
    $('intro-art').innerHTML = "<div class='crew-m'>" + CC.Characters.svg(ch[0], ch[1]) + '</div>' + (introData.game === 'dash' ? "<div class='crew-m'>" + CC.Characters.wagon(Save.data.equipped) + '</div>' : '');
    var pickBox = $('intro-pick');
    if (d.game === 'any') {
      if (!pickBox) {
        pickBox = document.createElement('div'); pickBox.id = 'intro-pick'; pickBox.className = 'intro-pick'; pickBox.setAttribute('role', 'group'); pickBox.setAttribute('aria-label', 'Choose your strength');
        $('intro-controls').parentNode.insertBefore(pickBox, $('intro-controls'));
      }
      pickBox.hidden = false;
      pickBox.innerHTML = ['dash', 'puzzle', 'snap'].map(function (k) {
        return "<button type='button' class='btn pick' data-g='" + k + "' aria-pressed='" + (k === introData.game) + "'>" + CC.icoHTML(CC.GAMES[k].icon) + '<span>' + CC.GAMES[k].name + '</span></button>';
      }).join('');
      Array.prototype.forEach.call(pickBox.querySelectorAll('button'), function (b) {
        b.addEventListener('click', function () { CC.Audio.init(); CC.Audio.sfx('click'); App.pick = b.dataset.g; introData.game = b.dataset.g; fillIntro(); var nb = $('intro-pick').querySelector('[data-g="' + b.dataset.g + '"]'); if (nb) nb.focus({ preventScroll: true }); });
      });
    } else if (pickBox) pickBox.hidden = true;
  }
  State.register('CHALLENGE_INTRO', {
    screen: 'intro', focus: 'intro-go',
    enter: function (data) { introData = { dest: data.dest, game: data.game }; fillIntro(); },
    escape: function () { State.go('WORLD_MAP', { keepSel: true }); }
  });

  /* ----- Game states (logic in game-base.js) ----- */
  State.register('MINIGAME', {
    screen: 'game',
    enter: function (data, prev, back) { CC.Game.enter(data, prev); },
    leave: function (to) { if (to !== 'PAUSED') CC.Game.leave(to); },
    escape: function () { CC.Game.pause(); }
  });
  State.register('PAUSED', {
    screen: 'game',
    enter: function () { CC.Game.showPause(); },
    leave: function (to) { if (to !== 'MINIGAME' && to !== 'SETTINGS' && to !== 'HOWTO') CC.Game.leave(to); },
    escape: function () { CC.Game.resume(); }
  });

  /* ----- Results ----- */
  var resTimers = [];
  function clearResTimers() { resTimers.forEach(clearTimeout); resTimers = []; }
  function later(fn, ms) { resTimers.push(setTimeout(function () { UI.safe(fn); }, ms)); }
  function rewardItems(r) {
    var items = [];
    if (r.unlockedNew) items.push({ html: CC.icoHTML('map'), title: 'New destination!', text: CC.DEST[r.to].name + ' is now open on the map.' });
    r.newBadges.forEach(function (id) {
      var b = CC.BADGES.filter(function (x) { return x.id === id; })[0];
      if (b) items.push({ html: CC.icoHTML(b.icon), title: 'Badge: ' + b.name, text: b.desc });
    });
    r.newItems.forEach(function (x) {
      if (x.type === 'skin') items.push({ html: CC.Characters.wagon(x.item.id), title: 'Caravan skin: ' + x.item.name, text: 'Equip it in Rewards.' });
      else items.push({ html: CC.icoHTML('gift'), title: 'Map decoration: ' + x.item.name, text: x.item.desc });
    });
    if (r.complete) items.push({ html: CC.icoHTML('trophy'), title: 'Journey complete!', text: 'You reached the Mystery Horizon. Different people, one amazing journey!' });
    return items;
  }
  function buildStrip(r) {
    var strip = $('route-strip'), pct = function (i) { return (i / (N - 1) * 100); };
    var html = "<div class='rail'><i style='width:" + pct(r.from) + "%'></i></div>";
    for (var i = 0; i < N; i++) html += "<span class='pip" + (i < r.from ? ' done' : i === r.from ? ' cur' : '') + "' style='left:" + pct(i) + "%'></span>";
    html += "<div class='rs-wagon' style='left:" + pct(r.from) + "%'>" + CC.Characters.wagon(Save.data.equipped) + '</div>';
    strip.innerHTML = html;
    strip.setAttribute('aria-label', r.unlockedNew ? 'Caravan moves from stop ' + (r.from + 1) + ' to stop ' + (r.to + 1) : 'Caravan at stop ' + (r.to + 1) + ' of ' + N);
    if (r.unlockedNew) {
      later(function () {
        var w = strip.querySelector('.rs-wagon'), fill = strip.querySelector('.rail i'), pips = strip.querySelectorAll('.pip');
        if (!w) return;
        CC.Audio.sfx('travel');
        w.style.left = pct(r.to) + '%'; fill.style.transition = 'width 1.4s cubic-bezier(.45,.05,.2,1)'; fill.style.width = pct(r.to) + '%';
        Array.prototype.forEach.call(pips, function (p, i) { p.classList.toggle('done', i < r.to); p.classList.toggle('cur', i === r.to); });
      }, UI.reducedMotion() ? 0 : 1300);
    }
  }
  State.register('RESULTS', {
    screen: 'results', focus: function () { return $('res-continue').hidden ? $('res-again') : $('res-continue'); },
    enter: function (r) {
      clearResTimers();
      App.last = r;
      var d = CC.DEST[r.dest], g = CC.GAMES[r.game];
      setText('res-dest', 'Stop ' + (r.dest + 1) + ' · ' + d.name + ' · ' + g.name);
      var t = $('res-title');
      t.textContent = r.success ? 'Challenge Complete!' : r.failTitle || 'Not this time!';
      t.classList.toggle('fail', !r.success);
      var crew = $('res-crew');
      if (!crew) { crew = document.createElement('div'); crew.id = 'res-crew'; crew.className = 'crew res-crew'; crew.setAttribute('aria-hidden', 'true'); $('results').firstElementChild.insertBefore(crew, $('results').firstElementChild.firstChild); }
      crew.innerHTML = artHTML([[0, r.success ? 'celebrate' : 'idle'], [1, r.success ? 'celebrate' : 'idle'], [3, r.success ? 'celebrate' : 'idle']]);
      /* stars */
      var sb = $('res-stars'); sb.innerHTML = ''; sb.setAttribute('aria-label', r.stars + ' of 3 stars earned');
      for (var i = 0; i < 3; i++) { var s = document.createElement('i'); s.className = 'star big ' + (i < r.stars ? 'on' : 'off') + (i >= r.stars ? ' show' : ''); sb.appendChild(s); }
      Array.prototype.forEach.call(sb.querySelectorAll('.star.on'), function (s, i) { later(function () { s.classList.add('show'); CC.Audio.sfx('collect', { combo: i + 2 }); }, UI.reducedMotion() ? 0 : 450 + i * 420); });
      $('res-score').textContent = '0'; UI.count($('res-score'), 0, r.score, 900);
      setText('res-k2', r.stat2 ? r.stat2.label : 'Result'); setText('res-v2', r.stat2 ? r.stat2.value : '—');
      setText('res-best', r.best);
      $('res-jp').textContent = '+0'; UI.count($('res-jp'), 0, r.jp, 1100, function (v) { return '+' + v; });
      $('res-notes').innerHTML = r.notes.map(function (n) { return '<li>' + n + '</li>'; }).join('') + (r.newBest ? "<li class='new'>New personal best!</li>" : '');
      var msg = r.complete ? 'You reached the Mystery Horizon — the journey is complete!' :
        r.unlockedNew ? 'The caravan rolls on to ' + CC.DEST[r.to].name + '!' :
        r.success ? 'Nice run! Beat your best for bonus points.' : r.failMsg || 'Almost! Finish the challenge to move the caravan.';
      setText('res-msg', msg);
      buildStrip(r);
      $('res-continue').hidden = !r.success;
      $('res-again').classList.toggle('btn-primary', !r.success);
      CC.Audio.sfx(r.success ? 'success' : 'fail');
      CC.Audio.setDuck(.6);
      var items = rewardItems(r);
      if (items.length) later(function () { if (State.cur === 'RESULTS') UI.reveal(items); }, UI.reducedMotion() ? 300 : 2800);
    },
    leave: function () { clearResTimers(); }
  });
  function leaveResults(to, data, opts) { State.go(to, data, opts); }
  UI.bind('res-again', function () { var r = App.last; if (r) leaveResults('MINIGAME', { dest: r.dest, game: r.game }, { wipe: true }); });
  UI.bind('res-continue', function () {
    var r = App.last;
    if (r && r.unlockedNew) App.pendingTravel = { from: r.from, to: r.to };
    leaveResults('WORLD_MAP', {}, { wipe: true });
  });
  UI.bind('res-map', function () { var r = App.last; if (r && r.unlockedNew) App.pendingTravel = { from: r.from, to: r.to }; leaveResults('WORLD_MAP', {}, { wipe: true }); });

  /* =============== PANEL SCREENS =============== */
  function panelState(name, screenId, render) {
    State.register(name, {
      screen: screenId,
      focus: function () { return document.querySelector('#' + screenId + ' [data-back]'); },
      enter: function () { render(); var sc = document.querySelector('#' + screenId + ' .scroll-area'); if (sc) sc.scrollTop = 0; },
      escape: function () { State.back(); }
    });
  }
  function ico(name, cls) { return CC.icoHTML(name, cls); }

  /* ----- Rewards ----- */
  function renderRewards() {
    var S = Save.data, h = '';
    setText('rw-jp', S.jp);
    var next = null;
    CC.SKINS.concat(CC.DECOR).forEach(function (x) { if (x.need > S.jp && (!next || x.need < next.need)) next = x; });
    h += "<div class='panel-wrap'>";
    h += "<section class='card'><h3>Journey Points</h3><p><b>" + S.jp + '</b> points earned by finishing challenges, playing accurately and beating your own bests.</p>';
    if (next) h += "<div class='bar' role='img' aria-label='" + S.jp + ' of ' + next.need + " points to next reward' style='--v:" + Math.min(100, Math.round(S.jp / next.need * 100)) + "%;margin-top:8px'><i></i><span>" + S.jp + ' / ' + next.need + ' → ' + next.name + '</span></div>';
    else h += '<p>Every reward unlocked — amazing!</p>';
    h += '</section>';
    h += "<section><h3 class='sec-title'>Expedition Stamps</h3><div class='stamp-row'>";
    CC.DEST.forEach(function (d, i) {
      var st = S.nodes[i] || { cleared: false, stars: 0 };
      h += "<div class='stamp" + (st.cleared ? ' got' : '') + (st.stars === 3 ? ' gold' : '') + "'><div class='ring'>" + ico(st.cleared ? 'flag' : 'lock') + '</div><span>' + d.name + '</span><span class="sr-only">' + (st.stars === 3 ? 'Gold stamp' : st.cleared ? 'Stamp earned' : 'Not yet earned') + '</span></div>';
    });
    h += '</div></section>';
    h += "<section><h3 class='sec-title'>Badges · " + Object.keys(S.badges).length + ' / ' + CC.BADGES.length + "</h3><div class='tile-grid'>";
    CC.BADGES.forEach(function (b) {
      var got = !!S.badges[b.id];
      h += "<div class='tile" + (got ? '' : ' locked') + "'><span class='state'>" + (got ? 'EARNED' : 'LOCKED') + "</span><span class='t-ico'>" + ico(got ? b.icon : 'lock') + '</span><b>' + b.name + '</b><small>' + b.desc + '</small></div>';
    });
    h += '</div></section>';
    h += "<section><h3 class='sec-title'>Caravan Skins</h3><div class='tile-grid'>";
    CC.SKINS.forEach(function (k) {
      var own = !!S.skins[k.id], eq = S.equipped === k.id;
      h += "<div class='tile" + (own ? '' : ' locked') + "'><span class='state'>" + (eq ? 'EQUIPPED' : own ? 'OWNED' : 'LOCKED') + "</span><div style='width:84px'>" + CC.Characters.wagon(k.id) + '</div><b>' + k.name + '</b>' +
        (own ? "<button class='btn' type='button' data-skin='" + k.id + "' " + (eq ? "aria-pressed='true' disabled" : "aria-pressed='false'") + '><span>' + (eq ? 'IN USE' : 'EQUIP') + '</span></button>' : '<small>Unlocks at ' + k.need + ' JP</small>') + '</div>';
    });
    h += '</div></section>';
    h += "<section><h3 class='sec-title'>Map Decorations</h3><div class='tile-grid'>";
    CC.DECOR.forEach(function (d) {
      var own = !!S.decor[d.id];
      h += "<div class='tile" + (own ? '' : ' locked') + "'><span class='state'>" + (own ? 'ON MAP' : 'LOCKED') + "</span><span class='t-ico'>" + ico(own ? 'gift' : 'lock') + '</span><b>' + d.name + '</b><small>' + (own ? d.desc : 'Unlocks at ' + d.need + ' JP') + '</small></div>';
    });
    h += '</div></section></div>';
    $('rw-body').innerHTML = h;
    Array.prototype.forEach.call($('rw-body').querySelectorAll('[data-skin]'), function (b) {
      b.addEventListener('click', function () { CC.Audio.init(); CC.Audio.sfx('click'); S.equipped = b.dataset.skin; Save.save(); renderRewards(); var nb = $('rw-body').querySelector('[data-skin="' + b.dataset.skin + '"]'); if (nb) nb.focus({ preventScroll: true }); });
    });
  }
  panelState('REWARDS', 'rewards', renderRewards);

  /* ----- Community (clearly labelled DEMO data) ----- */
  function renderCommunity() {
    var S = Save.data, stage = Math.min(S.unlocked, N - 1), cap = CC.STAGE_CAP;
    var mine = Math.min(cap, S.community.stage[stage] || 0), myNorm = mine / cap;
    var crews = CC.DEMO_CREWS.map(function (c) { return { name: c.name, members: c.members, norm: Math.min(1, c.avg * (0.55 + 0.45 * Math.min(1, (stage + 1) / 4))) }; });
    var shared = (crews.reduce(function (a, c) { return a + c.norm; }, 0) + myNorm) / (crews.length + 1);
    var pct = function (v) { return Math.round(v * 100); };
    var last = S.community.last;
    var h = "<div class='panel-wrap'><div class='demo-banner' role='note'>DEMO DATA — the crews below are simulated for illustration. No live players are involved; your progress is saved on this device only. The game is fully playable solo.</div>";
    h += "<section class='card'><h3>Current expedition</h3><p><b>" + CC.DEST[stage].name + '</b> — stop ' + (stage + 1) + ' of ' + N + '.</p>';
    h += "<div class='crew-row' style='margin-top:8px'><div class='meta'><span>Shared progress</span><small>average of all crews</small></div><div class='bar' role='img' aria-label='Shared progress ' style='--v:" + pct(shared) + "%'><i></i><span>" + pct(shared) + '%</span></div></div></section>';
    h += "<section class='card'><h3>Crews (simulated)</h3><div class='stack'>";
    crews.concat([{ name: 'Your solo crew', members: 1, norm: myNorm, me: true }]).forEach(function (c) {
      h += "<div class='crew-row'><div class='meta'><span>" + c.name + (c.me ? ' (you)' : '') + '</span><small>' + c.members + (c.members === 1 ? ' member' : ' members') + "</small></div><div class='bar' role='img' aria-label='" + c.name + ' ' + pct(c.norm) + " percent' style='--v:" + pct(c.norm) + "%'><i></i><span>" + pct(c.norm) + '%</span></div></div>';
    });
    h += '</div></section>';
    h += "<section class='card'><h3>Your contribution</h3><p>This stop: <b>" + mine + ' / ' + cap + '</b> contribution points (per-member cap).</p><p>Most recent: ' +
      (last ? '<b>+' + last.pts + '</b> at ' + CC.DEST[last.dest].name : 'play a challenge to contribute!') + '</p></section>';
    h += "<section class='card'><h3>Milestone &amp; next unlock</h3><div class='ms-list'><div class='ms-row" + (shared >= .75 ? ' done' : '') + "'><span>Light the festival lanterns (demo)</span><span class='pts'>" + (shared >= .75 ? 'DONE' : 'at 75%') + "</span></div><div class='ms-row'><span>Next unlock</span><span class='pts'>" + (stage < N - 1 ? CC.DEST[stage + 1].name : 'You made it!') + '</span></div></div></section>';
    h += "<section class='card parchment'><h3>Fair for every crew</h3><p>Each member's contribution is capped at " + cap + ' points per stop, and shared progress is the <b>average per member</b> — not the total. A crew of 8 can move the caravan as fast as a crew of 200.</p><p>Points come from finishing, accuracy and improvement, so spamming or grinding earns nothing extra.</p></section></div>';
    $('cm-body').innerHTML = h;
  }
  panelState('COMMUNITY', 'community', renderCommunity);

  /* ----- Challenges ----- */
  function renderChallenges() {
    var S = Save.data, h = "<div class='panel-wrap'><p class='goal' style='color:#fff'>Three kinds of challenge — different strengths all move the caravan forward.</p>";
    ['dash', 'puzzle', 'snap'].forEach(function (k) {
      var g = CC.GAMES[k], target = -1;
      CC.DEST.forEach(function (d) { if ((d.game === k) && d.id <= S.unlocked) target = d.id; });
      if (target < 0 && S.unlocked >= 7) target = 7;
      var best = 0; Object.keys(S.nodes).forEach(function (i) { var b = S.nodes[i].best && S.nodes[i].best[k]; if (b) best = Math.max(best, b); });
      var firstDest = CC.DEST.filter(function (d) { return d.game === k; })[0];
      h += "<section class='card parchment ch-card'><div class='t-ico' style='background:" + g.color + "'>" + ico(g.icon) + "</div><div><h3>" + g.name + '</h3><p><b>' + g.kind + '</b></p><p>' + g.goal + '</p><p>Best score: <b>' + (best || '—') + '</b></p>' +
        (target >= 0 ? "<button class='btn btn-primary' type='button' data-play='" + target + "' data-g='" + k + "'><span>PLAY · " + CC.DEST[target].name + '</span></button>' : "<p><b>Unlocks at " + firstDest.name + '.</b></p>') + '</div></section>';
    });
    $('ch-body').innerHTML = h + '</div>';
    Array.prototype.forEach.call($('ch-body').querySelectorAll('[data-play]'), function (b) {
      b.addEventListener('click', function () { CC.Audio.init(); CC.Audio.sfx('click'); var id = +b.dataset.play; if (CC.DEST[id].game === 'any') App.pick = b.dataset.g; App.play(id); });
    });
  }
  panelState('CHALLENGES', 'challenges', renderChallenges);

  /* ----- How to play ----- */
  function renderHowto() {
    var h = "<div class='panel-wrap'>";
    CC.HOWTO.forEach(function (x) { h += "<section class='card parchment'><h3>" + x.h + '</h3><p>' + x.p + '</p></section>'; });
    ['dash', 'puzzle', 'snap'].forEach(function (k) {
      var g = CC.GAMES[k];
      h += "<section class='card parchment' id='ht-" + k + "'" + (App.howtoGame === k ? " style='outline:4px solid #ff8a1f'" : '') + '><h3>' + g.name + (App.howtoGame === k ? ' (current challenge)' : '') + '</h3><p>' + g.goal + "</p><ul class='howlist' style='margin-top:8px'>" + g.controls.map(function (c) { return '<li>' + c + '</li>'; }).join('') + '</ul></section>';
    });
    h += "<section class='card parchment'><h3>Comfort &amp; access</h3><ul class='howlist'><li>Pause any time with the pause button or Esc.</li><li>Settings has reduce-motion, high-contrast, larger text and touch-control options.</li><li>Puzzle and Snap include hints. Nothing in the game is timed against you unfairly.</li></ul></section></div>";
    $('ht-body').innerHTML = h;
    if (App.howtoGame) setTimeout(function () { var e = $('ht-' + App.howtoGame); if (e && e.scrollIntoView) e.scrollIntoView({ block: 'start' }); }, 50);
  }
  panelState('HOWTO', 'howto', renderHowto);

  /* ----- Settings ----- */
  function switchRow(label, sub, key, onChange) {
    var s = Save.data.settings, id = 'sw-' + key;
    return "<div class='set-row'><span id='" + id + "-l'>" + label + (sub ? '<small>' + sub + '</small>' : '') + "</span><button class='switch' type='button' role='switch' id='" + id + "' aria-labelledby='" + id + "-l' aria-checked='" + (key === 'mute' ? !(s.music || s.sfx) : !!s[key]) + "' data-key='" + key + "'></button></div>";
  }
  function renderSettings() {
    var s = Save.data.settings;
    var h = "<div class='panel-wrap'>";
    h += "<div class='set-group'><h3>Audio</h3>" + switchRow('Mute everything', '', 'mute') + switchRow('Music', '', 'music') +
      "<div class='set-row'><label for='vol-music'>Music volume</label><input id='vol-music' type='range' min='0' max='100' value='" + Math.round(s.musicVol * 100) + "' data-vol='musicVol'></div>" +
      switchRow('Sound effects', '', 'sfx') +
      "<div class='set-row'><label for='vol-sfx'>Effects volume</label><input id='vol-sfx' type='range' min='0' max='100' value='" + Math.round(s.sfxVol * 100) + "' data-vol='sfxVol'></div></div>";
    h += "<div class='set-group'><h3>Accessibility</h3>" + switchRow('Reduce motion', 'Calms animations and camera effects. Your system setting is always respected.', 'reduce') + switchRow('High contrast', 'Stronger borders and text.', 'contrast') + switchRow('Larger text', '', 'large') + '</div>';
    h += "<div class='set-group'><h3>Controls</h3><div class='set-row'><span id='tc-l'>On-screen touch controls<small>Auto shows them on touch devices.</small></span><div class='seg' role='group' aria-labelledby='tc-l'>" +
      ['auto', 'on', 'off'].map(function (v) { return "<button class='btn' type='button' data-touch='" + v + "' aria-pressed='" + (s.touch === v) + "'><span>" + v.toUpperCase() + '</span></button>'; }).join('') + '</div></div></div>';
    var fromPause = State.stack[State.stack.length - 1] === 'PAUSED';
    if (!fromPause) h += "<div class='set-group'><h3>Progress</h3><div class='set-row'><span>Saved on this device<small>" + (Save.ok ? 'Auto-saves after every challenge.' : 'Saving is unavailable in this browser — progress lasts until you close the page.') + "</small></span><button id='st-reset' class='btn btn-danger' type='button'><span>RESET PROGRESS</span></button></div></div>";
    $('st-body').innerHTML = h + '</div>';
    var body = $('st-body');
    Array.prototype.forEach.call(body.querySelectorAll('.switch'), function (b) {
      b.addEventListener('click', function () {
        CC.Audio.init();
        var k = b.dataset.key, on = b.getAttribute('aria-checked') !== 'true';
        if (k === 'mute') { s.music = !on; s.sfx = !on; }
        else if (k === 'reduce') s.motion = on ? 'reduce' : 'auto';
        else s[k] = on;
        Save.save(); UI.applySettings(); CC.Audio.syncMusic();
        renderSettings(); var nb = $('sw-' + k); if (nb) nb.focus({ preventScroll: true });
        CC.Audio.sfx('click');
      });
    });
    Array.prototype.forEach.call(body.querySelectorAll('[data-vol]'), function (r) {
      r.addEventListener('input', function () { s[r.dataset.vol] = Math.max(0, Math.min(1, (+r.value || 0) / 100)); CC.Audio.applySettings(); });
      r.addEventListener('change', function () { Save.save(); CC.Audio.init(); CC.Audio.sfx('collect', { combo: 1 }); });
    });
    Array.prototype.forEach.call(body.querySelectorAll('[data-touch]'), function (b) {
      b.addEventListener('click', function () { s.touch = b.dataset.touch; Save.save(); UI.applySettings(); renderSettings(); var nb = body.querySelector('[data-touch="' + s.touch + '"]'); if (nb) nb.focus({ preventScroll: true }); CC.Audio.sfx('click'); });
    });
    var rb = $('st-reset');
    if (rb) rb.addEventListener('click', function () {
      CC.Audio.init(); CC.Audio.sfx('click');
      UI.confirm('Reset progress?', 'This erases Journey Points, stars, badges, rewards and best scores on this device. Settings are kept.', 'RESET').then(function (yes) {
        if (!yes) return;
        Save.reset(); App.pendingTravel = null; App.last = null;
        UI.applySettings(); UI.toast('Progress reset. A fresh journey awaits!');
        State.stack.length = 0; State.cur = 'SETTINGS';
        State.go('MAIN_MENU', {}, { back: true, force: true, wipe: true });
      });
    });
  }
  panelState('SETTINGS', 'settings', renderSettings);

  /* =============== BUTTON WIRING =============== */
  App.init = function () {
    UI.bind('btn-welcome', function () {
      CC.Audio.init(); CC.Audio.sfx('welcome'); CC.Audio.syncMusic();
      State.go('MAIN_MENU', {}, { wipe: true });
    }, { silent: true });
    UI.bind('btn-start', function () { App.startJourney(); });
    UI.bind('btn-challenges', function () { State.go('CHALLENGES'); });
    UI.bind('btn-map', function () { Save.data.started = true; State.go('WORLD_MAP', {}, { wipe: true }); });
    UI.bind('btn-community', function () { State.go('COMMUNITY'); });
    UI.bind('btn-rewards', function () { State.go('REWARDS'); });
    UI.bind('btn-howto', function () { App.howtoGame = null; State.go('HOWTO'); });
    UI.bind('btn-settings', function () { State.go('SETTINGS'); });
    UI.bind('story-go', function () { Save.data.tutorial.story = true; Save.save(); State.go('WORLD_MAP', {}, { wipe: true }); });
    UI.bind('intro-back', function () { State.go('WORLD_MAP', { keepSel: true }); }, { sfx: 'back' });
    UI.bind('intro-go', function () {
      if (!introData) return;
      Save.data.tutorial[introData.game] = true; Save.save();
      State.go('MINIGAME', { dest: introData.dest, game: introData.game }, { wipe: true });
    });
    Array.prototype.forEach.call(document.querySelectorAll('[data-back]'), function (b) { UI.bind(b, function () { State.back(); }, { sfx: 'back' }); });
    CC.Map.init();
  };
})();
