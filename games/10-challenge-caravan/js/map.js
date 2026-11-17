/* CHALLENGE CARAVAN — World map (illustrated SVG + DOM nodes, caravan travel animation) */
(function () {
  'use strict';
  var CC = window.CC, UI = CC.UI, $ = UI.$;
  var NS = 'http://www.w3.org/2000/svg';
  var NODE_COL = { dash: ['#ffb347', '#e0650a'], puzzle: ['#b57bff', '#6a2fb0'], snap: ['#5fd8ff', '#1478b8'], any: ['#ff7fb0', '#a02a6a'] };
  var W = 1000, H = 620, portrait = false, selected = -1, travelRaf = 0, segs = [];
  var mql = window.matchMedia ? window.matchMedia('(max-aspect-ratio: 19/20)') : null;

  function pos(i) { var d = CC.DEST[i], p = portrait ? d.p : d.l; return { x: p[0] / 100 * W, y: p[1] / 100 * H, px: p[0], py: p[1] }; }
  function el(tag, attrs, parent) {
    var e = document.createElementNS(NS, tag);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }
  function palm(x, y, s) {
    var g = "<g transform='translate(" + x + ' ' + y + ') scale(' + s + ")'><path d='M0 0Q4 -20 10 -36' stroke='#7a4a22' stroke-width='5' fill='none' stroke-linecap='round'/>";
    for (var a = -70; a <= 70; a += 35) g += "<ellipse cx='10' cy='-38' rx='20' ry='5.5' fill='#2fa05a' stroke='#17692f' stroke-width='1.5' transform='rotate(" + (a - 10) + " 10 -38) translate(14 0)'/>";
    return g + "<circle cx='10' cy='-36' r='3.5' fill='#5a3410'/></g>";
  }
  function tree(x, y, r) { return "<circle cx='" + x + "' cy='" + y + "' r='" + r + "' fill='#1f8a4c' stroke='#0f5a2c' stroke-width='2'/><circle cx='" + (x - r * .3) + "' cy='" + (y - r * .3) + "' r='" + r * .45 + "' fill='#3cbf6c'/>"; }
  function blob(cx, cy, rx, ry, fill, stroke) {
    return "<path d='M" + (cx - rx) + ' ' + cy + 'Q' + (cx - rx * .9) + ' ' + (cy - ry * 1.05) + ' ' + cx + ' ' + (cy - ry) + 'Q' + (cx + rx * 1.05) + ' ' + (cy - ry * .8) + ' ' + (cx + rx) + ' ' + cy + 'Q' + (cx + rx * .9) + ' ' + (cy + ry * 1.05) + ' ' + cx + ' ' + (cy + ry) + 'Q' + (cx - rx * 1.05) + ' ' + (cy + ry * .9) + ' ' + (cx - rx) + ' ' + cy + "z' fill='" + fill + "' stroke='" + (stroke || 'none') + "' stroke-width='3'/>";
  }
  function island(i, x, y, R) {
    var g = "<g class='isl isl" + i + "'>";
    var sand = '#f6dc94', sandS = '#c99a3c';
    switch (i) {
      case 0:
        g += blob(x, y + 8, R * 1.15, R * .72, sand, sandS) + blob(x, y, R * .95, R * .6, '#3cbf6c', '#1f8a4c') + palm(x - R * .5, y + 6, R / 52) + palm(x + R * .55, y + 10, R / 60);
        g += "<g stroke='#5a3410' stroke-width='2'><rect x='" + (x - R * .2) + "' y='" + (y - R * .22) + "' width='" + R * .26 + "' height='" + R * .2 + "' fill='#fff3d2'/><path d='M" + (x - R * .24) + ' ' + (y - R * .22) + 'l' + R * .18 + ' ' + -R * .16 + 'l' + R * .18 + ' ' + R * .16 + "z' fill='#d6342a'/><rect x='" + (x + R * .14) + "' y='" + (y - R * .1) + "' width='" + R * .22 + "' height='" + R * .16 + "' fill='#fff3d2'/><path d='M" + (x + R * .1) + ' ' + (y - R * .1) + 'l' + R * .15 + ' ' + -R * .13 + 'l' + R * .15 + ' ' + R * .13 + "z' fill='#e8862a'/></g>"; break;
      case 1:
        g += blob(x, y + 6, R * 1.15, R * .75, '#2a8a4c', '#145a2c') + tree(x - R * .6, y + 4, R * .24) + tree(x + R * .6, y + 2, R * .26) + tree(x - R * .25, y + R * .3, R * .2) + tree(x + R * .3, y + R * .3, R * .2);
        g += "<g stroke='#4a4a40' stroke-width='2.5' fill='#b5b09a'><rect x='" + (x - R * .34) + "' y='" + (y - R * .1) + "' width='" + R * .68 + "' height='" + R * .2 + "'/><rect x='" + (x - R * .25) + "' y='" + (y - R * .3) + "' width='" + R * .5 + "' height='" + R * .2 + "'/><rect x='" + (x - R * .16) + "' y='" + (y - R * .48) + "' width='" + R * .32 + "' height='" + R * .18 + "' fill='#c9c4ac'/><rect x='" + (x - R * .05) + "' y='" + (y - R * .08) + "' width='" + R * .1 + "' height='" + R * .18 + "' fill='#3a2a10'/></g>"; break;
      case 2:
        g += blob(x, y + 10, R * 1.2, R * .7, '#3a9a5c', '#1f6a3a') + "<path d='M" + (x - R * 1.05) + ' ' + (y + 4) + 'L' + (x - R * .75) + ' ' + (y - R * .75) + 'L' + (x - R * .1) + ' ' + (y - R * .6) + 'L' + (x - R * .1) + ' ' + (y + R * .1) + "z' fill='#a8692f' stroke='#5a3410' stroke-width='3'/><path d='M" + (x + R * 1.05) + ' ' + (y + 4) + 'L' + (x + R * .8) + ' ' + (y - R * .8) + 'L' + (x + R * .1) + ' ' + (y - R * .6) + 'L' + (x + R * .1) + ' ' + (y + R * .1) + "z' fill='#8a5426' stroke='#5a3410' stroke-width='3'/>";
        g += "<rect x='" + (x - R * .12) + "' y='" + (y - R * .6) + "' width='" + R * .24 + "' height='" + R * .75 + "' fill='#e8fbff' stroke='#7fd0ee' stroke-width='2'/><path d='M" + (x - R * .06) + ' ' + (y - R * .6) + 'v' + R * .75 + 'M' + (x + R * .06) + ' ' + (y - R * .6) + 'v' + R * .75 + "' stroke='#7fd0ee' stroke-width='2'/>" + blob(x, y + R * .22, R * .5, R * .16, '#19b8e6', '#0b6fb8'); break;
      case 3:
        g += blob(x, y + 10, R * 1.15, R * .7, '#6aa07a', '#2f6a44') + "<path d='M" + (x - R * 1.0) + ' ' + (y + 8) + 'L' + (x - R * .4) + ' ' + (y - R * .75) + 'L' + (x - R * .05) + ' ' + (y - R * .25) + 'L' + (x + R * .35) + ' ' + (y - R * .95) + 'L' + (x + R * 1.0) + ' ' + (y + 8) + "z' fill='#8e9aa6' stroke='#46515c' stroke-width='3' stroke-linejoin='round'/><path d='M" + (x + R * .35) + ' ' + (y - R * .95) + 'L' + (x + R * .12) + ' ' + (y - R * .55) + 'L' + (x + R * .3) + ' ' + (y - R * .5) + 'L' + (x + R * .42) + ' ' + (y - R * .58) + 'L' + (x + R * .58) + ' ' + (y - R * .52) + "z' fill='#fff' stroke='#9fb2c2' stroke-width='2'/>";
        g += "<g stroke='#2a3540' stroke-width='2.5'><rect x='" + (x - R * .72) + "' y='" + (y - R * .52) + "' width='" + R * .24 + "' height='" + R * .16 + "' fill='#e8edf2'/><path d='M" + (x - R * .72) + ' ' + (y - R * .52) + 'a' + R * .12 + ' ' + R * .12 + " 0 0 1 " + R * .24 + " 0z' fill='#f2c14e'/></g>"; break;
      case 4:
        g += blob(x - R * .1, y + 6, R * 1.15, R * .6, sand, sandS) + "<rect x='" + (x + R * .1) + "' y='" + (y + R * .1) + "' width='" + R * .8 + "' height='" + R * .12 + "' fill='#8a5426' stroke='#3a1d06' stroke-width='2'/>";
        g += "<g stroke='#3a1d06' stroke-width='2'><path d='M" + (x + R * .55) + ' ' + (y + R * .05) + 'v' + -R * .6 + 'l' + R * .38 + ' ' + R * .45 + "z' fill='#fff'/><path d='M" + (x + R * .5) + ' ' + (y + R * .05) + 'h' + R * .5 + 'l' + -R * .1 + ' ' + R * .14 + 'h' + -R * .3 + "z' fill='#d6342a'/></g>";
        g += "<g stroke='#3a1d06' stroke-width='2'><rect x='" + (x - R * .55) + "' y='" + (y - R * .3) + "' width='" + R * .22 + "' height='" + R * .3 + "' fill='#fff3d2'/><path d='M" + (x - R * .58) + ' ' + (y - R * .3) + 'l' + R * .14 + ' ' + -R * .15 + 'l' + R * .14 + ' ' + R * .15 + "z' fill='#1f7ac9'/></g>" + palm(x - R * .85, y + 8, R / 70); break;
      case 5:
        g += blob(x, y + 8, R * 1.2, R * .72, '#f2b45a', '#b8742a') + "<path d='M" + (x - R * 1.0) + ' ' + (y + 12) + 'q' + R * .3 + ' ' + -R * .4 + ' ' + R * .6 + " 0q" + R * .3 + ' ' + -R * .35 + ' ' + R * .55 + ' 0' + "' stroke='#c98a3a' stroke-width='3' fill='none'/>";
        g += "<g stroke='#6a4a20' stroke-width='2.5'><rect x='" + (x - R * .4) + "' y='" + (y - R * .12) + "' width='" + R * .8 + "' height='" + R * .26 + "' fill='#e8c98a'/><path d='M" + (x - R * .46) + ' ' + (y - R * .12) + 'L' + x + ' ' + (y - R * .55) + 'L' + (x + R * .46) + ' ' + (y - R * .12) + "z' fill='#d9a95a'/>";
        for (var c = -2; c <= 2; c++) g += "<rect x='" + (x + c * R * .16 - R * .035) + "' y='" + (y - R * .1) + "' width='" + R * .07 + "' height='" + R * .22 + "' fill='#fff3d2'/>";
        g += '</g>'; break;
      case 6:
        g += "<ellipse cx='" + x + "' cy='" + (y + R * .5) + "' rx='" + R * 1.1 + "' ry='" + R * .3 + "' fill='#fff' opacity='.9'/><ellipse cx='" + (x - R * .5) + "' cy='" + (y + R * .55) + "' rx='" + R * .5 + "' ry='" + R * .25 + "' fill='#fff'/><ellipse cx='" + (x + R * .5) + "' cy='" + (y + R * .52) + "' rx='" + R * .5 + "' ry='" + R * .25 + "' fill='#fff'/>";
        g += "<path d='M" + (x - R * .95) + ' ' + (y + R * .1) + 'Q' + x + ' ' + (y + R * 1.1) + ' ' + (x + R * .95) + ' ' + (y + R * .1) + 'Z' + "' fill='#a8692f' stroke='#5a3410' stroke-width='3'/>" + blob(x, y - R * .05, R * 1.0, R * .36, '#3cbf6c', '#1f8a4c');
        var cols = ['#ff5a7a', '#ffc43a', '#46ccff', '#b57bff', '#ff8a1f'];
        for (var l = 0; l < 5; l++) g += "<circle class='lantern' style='animation-delay:" + (-l * .6) + "s' cx='" + (x - R * .8 + l * R * .4) + "' cy='" + (y - R * .55 + (l % 2) * R * .18) + "' r='" + R * .11 + "' fill='" + cols[l] + "' stroke='#3a1d06' stroke-width='2'/>";
        g += palm(x - R * .4, y - R * .05, R / 80); break;
      default:
        g += "<circle cx='" + x + "' cy='" + y + "' r='" + R * 1.25 + "' fill='url(#mystGlow)'/>" + blob(x, y + 8, R * 1.1, R * .62, '#6a4aa8', '#2a1a5a') +
          "<path d='M" + (x - R * .8) + ' ' + (y + 8) + 'L' + (x - R * .25) + ' ' + (y - R * .8) + 'L' + x + ' ' + (y - R * .4) + 'L' + (x + R * .3) + ' ' + (y - R * 1.0) + 'L' + (x + R * .85) + ' ' + (y + 8) + "z' fill='#3a2a7a' stroke='#1a0f3a' stroke-width='3'/><path d='M" + (x - R * .14) + ' ' + (y + 8) + 'v' + -R * .4 + 'a' + R * .14 + ' ' + R * .14 + " 0 0 1 " + R * .28 + ' 0v' + R * .4 + "z' fill='#ffe58a'/>";
        for (var s = 0; s < 6; s++) g += "<circle class='twk' style='animation-delay:" + (-s * .5) + "s' cx='" + (x + Math.cos(s * 1.05) * R * 1.1) + "' cy='" + (y - R * .3 + Math.sin(s * 1.05) * R * .8) + "' r='3.2' fill='#fff'/>";
    }
    return g + '</g>';
  }

  function bez(i) {
    var n = CC.DEST.length, P = function (k) { return pos(Math.max(0, Math.min(n - 1, k))); };
    var a = P(i - 1), b = P(i), c = P(i + 1), d = P(i + 2);
    return 'M' + b.x + ' ' + b.y + ' C' + (b.x + (c.x - a.x) / 6) + ' ' + (b.y + (c.y - a.y) / 6) + ' ' + (c.x - (d.x - b.x) / 6) + ' ' + (c.y - (d.y - b.y) / 6) + ' ' + c.x + ' ' + c.y;
  }

  var Map = {
    layoutKey: '',
    isPortrait: function () { return !!(mql && mql.matches); },
    init: function () {
      UI.bind('map-back', function () { CC.State.go('MAIN_MENU', {}, { wipe: true }); }, { sfx: 'back' });
      UI.bind('map-community', function () { CC.State.go('COMMUNITY'); });
      UI.bind('dest-close', function () { Map.closePanel(); }, { sfx: 'back' });
      UI.bind('dp-play', function () { if (selected >= 0) CC.App.play(selected); });
      var rr = function () { if (CC.State.cur === 'WORLD_MAP' && Map.layoutKey !== (Map.isPortrait() ? 'p' : 'l')) Map.render(); };
      if (mql) { if (mql.addEventListener) mql.addEventListener('change', rr); else if (mql.addListener) mql.addListener(rr); }
      window.addEventListener('resize', rr);
      $('map-nodes').addEventListener('keydown', function (e) {
        var k = e.key, d = 0;
        if (k === 'ArrowRight' || k === 'ArrowDown') d = 1; else if (k === 'ArrowLeft' || k === 'ArrowUp') d = -1; else return;
        var list = Array.prototype.slice.call(document.querySelectorAll('#map-nodes .node'));
        var i = list.indexOf(document.activeElement);
        if (i < 0) return;
        e.preventDefault();
        var nx = list[Math.max(0, Math.min(list.length - 1, i + d))];
        if (nx) nx.focus();
      });
    },
    caravanAt: function () { return Math.min(CC.Save.data.unlocked, CC.DEST.length - 1); },
    render: function () {
      portrait = Map.isPortrait();
      Map.layoutKey = portrait ? 'p' : 'l';
      W = portrait ? 620 : 1000; H = portrait ? 1000 : 620;
      var box = $('map-box'), svg = $('map-svg'), save = CC.Save.data;
      svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
      svg.setAttribute('preserveAspectRatio', 'none');
      var R = Math.min(W, H) * (portrait ? .115 : .105);
      var s = "<defs><linearGradient id='sea' x1='0' y1='0' x2='0' y2='1'><stop offset='0' stop-color='#7be3ff'/><stop offset='.5' stop-color='#26a9dc'/><stop offset='1' stop-color='#0b6fb8'/></linearGradient>" +
        "<radialGradient id='mystGlow'><stop offset='0' stop-color='#ffe58a' stop-opacity='.9'/><stop offset='.5' stop-color='#b57bff' stop-opacity='.5'/><stop offset='1' stop-color='#b57bff' stop-opacity='0'/></radialGradient></defs>";
      s += "<rect width='" + W + "' height='" + H + "' fill='url(#sea)'/>";
      for (var w = 0; w < 14; w++) {
        var wx = (w * 173) % W, wy = (w * 311) % H;
        s += "<path class='mwave' style='animation-delay:" + (-w * .7) + "s' d='M" + wx + ' ' + wy + 'q10 -8 20 0t20 0t20 0' + "' stroke='rgba(255,255,255,.45)' stroke-width='3' fill='none' stroke-linecap='round'/>";
      }
      /* far scenery */
      var far = portrait ? [[60, 360, 60], [560, 250, 70], [70, 780, 55], [560, 940, 50], [330, 560, 40]] : [[80, 150, 60], [330, 110, 50], [620, 140, 56], [900, 330, 50], [600, 600, 44], [200, 590, 40]];
      far.forEach(function (f) { s += blob(f[0], f[1], f[2], f[2] * .5, '#e9d28a', 'none') + blob(f[0], f[1] - 4, f[2] * .8, f[2] * .36, '#58b87a', 'none'); });
      /* route */
      segs = [];
      var n = CC.DEST.length, unlocked = save.unlocked;
      var routeBase = '', routeDone = '';
      for (var i = 0; i < n - 1; i++) {
        var d = bez(i); segs.push(d);
        routeBase += "<path d='" + d + "' stroke='#7a4a22' stroke-width='" + (R * .2) + "' fill='none' stroke-linecap='round' opacity='.35'/><path d='" + d + "' stroke='#fff3d2' stroke-width='" + (R * .1) + "' fill='none' stroke-dasharray='" + (R * .2) + ' ' + (R * .2) + "' stroke-linecap='round'/>";
        if (i < unlocked) routeDone += "<path d='" + d + "' stroke='#8a3d00' stroke-width='" + (R * .2) + "' fill='none' stroke-linecap='round'/><path d='" + d + "' stroke='#ffc43a' stroke-width='" + (R * .13) + "' fill='none' stroke-linecap='round'/>";
      }
      s += routeBase + routeDone;
      for (var k = 0; k < n; k++) { var p = pos(k); s += island(k, p.x, p.y, R); }
      /* unlocked decorations */
      if (save.decor.palms) { var a = pos(0), b = pos(2); s += palm(a.x + R * 1.0, a.y + R * .2, R / 50) + palm(a.x - R * 1.0, a.y + R * .3, R / 56) + palm(b.x + R * 1.0, b.y + R * .3, R / 52); }
      if (save.decor.lighthouse) { var h = pos(4); s += "<g transform='translate(" + (h.x - R * 1.15) + ' ' + (h.y + R * .25) + ")'><path d='M-8 0L-5 -46H5L8 0z' fill='#fff' stroke='#3a1d06' stroke-width='2.5'/><path d='M-6 -30H6V-22H-6z' fill='#d6342a'/><rect x='-7' y='-56' width='14' height='10' rx='2' fill='#ffe58a' stroke='#3a1d06' stroke-width='2'/><path d='M-9 -56h18l-9 -9z' fill='#d6342a' stroke='#3a1d06' stroke-width='2'/></g>"; }
      if (save.decor.balloon) { var bb = pos(3); s += "<g class='mballoon' transform='translate(" + (bb.x + R * 1.3) + ' ' + (bb.y - R * 1.3) + ")'><ellipse cx='0' cy='0' rx='20' ry='24' fill='#e53b30' stroke='#3a1d06' stroke-width='2.5'/><path d='M-8 -22Q-14 0 -6 22M8 -22Q14 0 6 22' stroke='#fff' stroke-width='5' fill='none'/><rect x='-7' y='32' width='14' height='9' fill='#8a5426' stroke='#3a1d06' stroke-width='2'/><path d='M-7 32L-12 22M7 32L12 22' stroke='#3a1d06' stroke-width='1.5'/></g>"; }
      if (save.decor.fireworks) { var f2 = pos(7); [[-1.1, -1.2, '#ff5a7a'], [1.2, -1.0, '#46ccff'], [0.1, -1.6, '#ffc43a']].forEach(function (q, qi) { s += "<g class='mfw' style='animation-delay:" + (-qi * .9) + "s' transform='translate(" + (f2.x + q[0] * R) + ' ' + (f2.y + q[1] * R) + ")' stroke='" + q[2] + "' stroke-width='4' stroke-linecap='round'><path d='M0 -22V-10M0 22V10M-22 0H-10M22 0H10M-16 -16L-8 -8M16 16L8 8M-16 16L-8 8M16 -16L8 -8'/></g>"; }); }
      /* clouds + compass */
      s += "<g class='mcloud' style='animation-duration:70s'><ellipse cx='" + W * .15 + "' cy='" + H * .1 + "' rx='60' ry='16' fill='#fff' opacity='.8'/><ellipse cx='" + (W * .15 + 30) + "' cy='" + (H * .1 - 8) + "' rx='34' ry='14' fill='#fff' opacity='.8'/></g>";
      s += "<g class='mcloud' style='animation-duration:95s;animation-delay:-40s'><ellipse cx='" + W * .6 + "' cy='" + H * .06 + "' rx='70' ry='15' fill='#fff' opacity='.7'/></g>";
      var cx = portrait ? W - 62 : 62, cy = portrait ? H - 62 : H - 66;
      s += "<g transform='translate(" + cx + ' ' + cy + ")' opacity='.92'><circle r='34' fill='#fff3d2' stroke='#5a3410' stroke-width='4'/><path d='M0 -28L7 0L0 28L-7 0z' fill='#d6342a' stroke='#3a1d06' stroke-width='2'/><path d='M-28 0L0 -7L28 0L0 7z' fill='#fff' stroke='#3a1d06' stroke-width='2'/><text y='-38' text-anchor='middle' font-size='16' font-weight='900' fill='#3a1d06' font-family='Arial Black,Arial,sans-serif'>N</text></g>";
      svg.innerHTML = s;

      /* nodes */
      var host = $('map-nodes'); host.innerHTML = '';
      CC.DEST.forEach(function (dest, i) {
        var st = save.nodes[i] || { stars: 0, cleared: false };
        var locked = i > unlocked, done = !!st.cleared, pp = pos(i);
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'node' + (locked ? ' locked' : done ? ' done' : ' avail') + ((portrait ? pp.py > 55 : pp.py > 60) ? ' lab-top' : '');
        b.dataset.id = i;
        b.style.left = pp.px + '%'; b.style.top = pp.py + '%';
        var col = NODE_COL[dest.game] || NODE_COL.any;
        b.style.setProperty('--nc1', col[0]); b.style.setProperty('--nc2', col[1]);
        var gi = dest.game === 'any' ? 'trophy' : CC.GAMES[dest.game].icon;
        b.innerHTML = "<span class='num'>" + (i + 1) + '</span>' + CC.icoHTML(locked ? 'lock' : gi) + (done ? "<span class='tick'>" + CC.icoHTML('check') + '</span>' : '') +
          "<span class='node-label'>" + dest.name + (done || st.stars ? UI.stars(st.stars, 3) : '') + '</span>';
        b.setAttribute('aria-label', 'Stop ' + (i + 1) + ': ' + dest.name + ', ' + (dest.game === 'any' ? 'your choice of challenge' : CC.GAMES[dest.game].name) + ', ' + CC.DIFF_NAMES[dest.diff] + '. ' +
          (locked ? 'Locked. Finish the previous stop to unlock.' : done ? 'Completed, ' + st.stars + ' of 3 stars.' : 'Available.'));
        if (locked) b.setAttribute('aria-disabled', 'true');
        if (i === Math.min(unlocked, n - 1)) b.setAttribute('data-autofocus', '');
        b.addEventListener('click', function () { CC.Audio.init(); Map.select(i); });
        host.appendChild(b);
      });
      Map.placeCaravan(Map.caravanAt());
      if (selected >= 0) Map.select(selected, true);
    },
    placeCaravan: function (i) {
      var m = $('map-caravan'), p = pos(i);
      m.innerHTML = CC.Characters.wagon(CC.Save.data.equipped);
      m.style.left = p.px + '%'; m.style.top = p.py + '%';
      Map._at = i;
      Array.prototype.forEach.call(document.querySelectorAll('#map-nodes .node'), function (nd) { nd.classList.toggle('here', +nd.dataset.id === i); });
    },
    updateHint: function () {
      var save = CC.Save.data, h = $('map-hint');
      if (save.nodes[7] && save.nodes[7].cleared) h.textContent = 'Journey complete! Replay any stop to beat your best.';
      else if (selected >= 0) h.textContent = '';
      else h.textContent = save.unlocked === 0 && !CC.Save.clearedCount() ? 'Tap the glowing stop to begin your first challenge!' : 'Pick any unlocked stop — or head to the glowing one!';
    },
    select: function (i, silent) {
      var save = CC.Save.data, dest = CC.DEST[i];
      if (!dest) return;
      if (i > save.unlocked) {
        UI.toast('Locked — finish ' + CC.DEST[Math.max(0, i - 1)].name + ' first.');
        CC.Audio.sfx('locked');
        return;
      }
      selected = i;
      var nodes = document.querySelectorAll('#map-nodes .node');
      for (var k = 0; k < nodes.length; k++) nodes[k].classList.toggle('sel', k === i);
      var st = save.nodes[i] || { stars: 0, cleared: false, best: {} };
      var g = dest.game === 'any' ? null : CC.GAMES[dest.game];
      $('dp-name').textContent = dest.name;
      $('dp-type').textContent = g ? g.name + ' · ' + g.kind.split(' · ')[0] : 'Your choice: Dash, Puzzle or Snap';
      var ic = $('dp-ico'); ic.className = 'ico ico-' + (g ? g.icon : 'trophy');
      $('dp-diff').textContent = CC.DIFF_NAMES[dest.diff];
      var best = 0; Object.keys(st.best || {}).forEach(function (kk) { best = Math.max(best, st.best[kk]); });
      $('dp-best').textContent = best ? String(best) : '—';
      $('dp-stars').innerHTML = UI.stars(st.stars || 0, 3);
      $('dp-reward').textContent = st.cleared ? 'Up to ' + CC.Progress.potential(true) + ' JP · new-best bonus' : 'Up to ' + CC.Progress.potential(false) + ' JP · badge · stamp';
      var panel = $('dest-panel');
      var pp = pos(i);
      var dock;
      if (Map.isPortrait()) dock = pp.py > 52 ? 'dock-t' : 'dock-b'; else dock = pp.px < 50 ? 'dock-r' : 'dock-l';
      panel.className = 'dest-panel ' + dock;
      var wasHidden = panel.hidden;
      panel.hidden = false;
      $('dp-play').firstElementChild.textContent = st.cleared ? 'PLAY AGAIN' : 'PLAY';
      if (!silent) { CC.Audio.sfx('click'); if (wasHidden || true) { var p = panel; p.style.animation = 'none'; void p.offsetWidth; p.style.animation = ''; } }
      Map.updateHint();
      $('dp-play').setAttribute('aria-label', 'Play ' + dest.name);
    },
    closePanel: function () {
      selected = -1;
      $('dest-panel').hidden = true;
      var nodes = document.querySelectorAll('#map-nodes .node');
      for (var k = 0; k < nodes.length; k++) nodes[k].classList.remove('sel');
      Map.updateHint();
    },
    confetti: function (i) {
      var host = $('map-confetti'), p = pos(i);
      if (UI.reducedMotion()) return;
      host.innerHTML = '';
      var cols = ['#ffc43a', '#ff5a7a', '#46ccff', '#7ae582', '#b57bff'];
      for (var k = 0; k < 28; k++) {
        var c = document.createElement('i'); c.className = 'confetti';
        c.style.left = p.px + '%'; c.style.top = p.py + '%';
        c.style.background = cols[k % cols.length];
        var a = Math.random() * Math.PI * 2, d = 40 + Math.random() * 90;
        c.style.setProperty('--dx', Math.cos(a) * d + 'px'); c.style.setProperty('--dy', Math.sin(a) * d - 30 + 'px'); c.style.setProperty('--rot', (Math.random() * 720 - 360) + 'deg');
        host.appendChild(c);
      }
      setTimeout(function () { host.innerHTML = ''; }, 2000);
    },
    /* animate the caravan along the route from node a to node b */
    travel: function (a, b, done) {
      cancelAnimationFrame(travelRaf);
      var m = $('map-caravan');
      if (b <= a || UI.reducedMotion()) { Map.placeCaravan(b); if (done) done(); return; }
      var path = document.createElementNS(NS, 'path');
      path.setAttribute('d', segs[a]);
      var len = path.getTotalLength(), dur = 1700, t0 = performance.now();
      m.classList.add('moving');
      CC.Audio.sfx('travel');
      Map.placeCaravan(a);
      m.classList.add('moving');
      (function step(now) {
        var k = Math.min(1, (now - t0) / dur), e = k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
        var pt = path.getPointAtLength(len * e);
        m.style.left = pt.x / W * 100 + '%'; m.style.top = pt.y / H * 100 + '%';
        if (k < 1) travelRaf = requestAnimationFrame(step);
        else {
          m.classList.remove('moving');
          Map.placeCaravan(b);
          var node = document.querySelector('#map-nodes .node[data-id="' + b + '"]');
          if (node) { node.classList.add('unlock-pop'); }
          CC.Audio.sfx('unlock'); Map.confetti(b);
          if (done) done();
        }
      })(t0);
    },
    enter: function (data) {
      Map.render();
      $('map-jp').textContent = CC.Save.data.jp;
      $('map-stars').textContent = CC.Save.totalStars();
      if (!(data && data.keepSel)) Map.closePanel(); else Map.updateHint();
      Map.updateHint();
      var tr = CC.App && CC.App.pendingTravel;
      if (tr) {
        CC.App.pendingTravel = null;
        Map.placeCaravan(tr.from);
        setTimeout(function () {
          Map.travel(tr.from, tr.to, function () {
            UI.toast('Caravan arrived at ' + CC.DEST[tr.to].name + '!');
            Map.updateHint();
          });
        }, 500);
      }
    },
    leave: function () { cancelAnimationFrame(travelRaf); $('map-caravan').classList.remove('moving'); }
  };
  CC.Map = Map;
})();
