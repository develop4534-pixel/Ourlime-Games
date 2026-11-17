/* GLITCH GARDEN — canvas rendering: responsive fit, parallax, world, robot, effects */
(function () {
  'use strict';
  var GG = window.GG;
  var canvas, ctx, dpr = 1, cssW = 0, cssH = 0, scale = 1;
  var MIN_W = 360, MIN_H = 250, MAX_SCALE = 3;
  var shakeT = 0, tiles = {}, game = null, touchInset = 0, safeProbe = null;

  var THEMES = {
    day: {
      sky: ['#52c3ff', '#9ee4ff', '#e4f8ff'], sun: true, hillFar: '#5fc7b0', hillNear: '#43b94a', cloud: 'rgba(255,255,255,.95)',
      grass: ['#8ff06a', '#4ccf3a', '#2c9a2a'], island: 'rgba(255,255,255,.35)', under: '#6b3d17', decor: true
    },
    sky: {
      sky: ['#1f7bff', '#58b8ff', '#bfeaff'], sun: true, hillFar: '#7fc4ff', hillNear: '#6bd0c4', cloud: 'rgba(255,255,255,.97)',
      grass: ['#9bf575', '#52d43f', '#2c9a2a'], island: 'rgba(255,255,255,.45)', under: '#4b6aa8', decor: true, bigIslands: true
    },
    glitch: {
      sky: ['#150a45', '#4a1d8f', '#16b8c9'], sun: false, hillFar: '#3b2480', hillNear: '#1e6a86', cloud: 'rgba(160,110,255,.45)',
      grass: ['#6dffd0', '#22d6a0', '#118a73'], island: 'rgba(120,255,230,.22)', under: '#2a1650', decor: true, glitch: true
    }
  };

  function hash(n) { var x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }

  /* ---------- pattern tiles ---------- */
  function mkTile(w, h, draw) {
    var c = document.createElement('canvas'); c.width = w; c.height = h;
    draw(c.getContext('2d'), w, h); return c;
  }
  function buildTiles() {
    tiles.dirt = mkTile(56, 28, function (g, w, h) {
      g.fillStyle = '#9b6230'; g.fillRect(0, 0, w, h);
      g.fillStyle = '#b07840'; g.fillRect(0, 0, w, 3);
      g.strokeStyle = '#6a3f19'; g.lineWidth = 2;
      g.strokeRect(1, 1, w / 2 - 1, h / 2 - 1); g.strokeRect(w / 2 + 1, 1, w / 2 - 2, h / 2 - 1);
      g.strokeRect(-w / 4 + 1, h / 2 + 1, w / 2 - 1, h / 2 - 2); g.strokeRect(w / 4 + 1, h / 2 + 1, w / 2 - 1, h / 2 - 2); g.strokeRect(w * 0.75 + 1, h / 2 + 1, w / 2 - 1, h / 2 - 2);
      g.fillStyle = 'rgba(255,220,160,.18)'; g.fillRect(5, 5, 8, 2); g.fillRect(34, 5, 10, 2); g.fillRect(16, 19, 9, 2); g.fillRect(44, 19, 7, 2);
    });
    tiles.stone = mkTile(40, 40, function (g, w, h) {
      g.fillStyle = '#a7b0ba'; g.fillRect(0, 0, w, h);
      g.fillStyle = '#c8d0d8'; g.fillRect(0, 0, w, 4);
      g.strokeStyle = '#6b7480'; g.lineWidth = 2; g.strokeRect(1, 1, w - 2, h - 2);
      g.fillStyle = 'rgba(255,255,255,.28)'; g.fillRect(6, 8, 10, 3); g.fillRect(24, 26, 8, 3);
      g.fillStyle = 'rgba(40,110,60,.55)'; g.fillRect(2, h - 7, 14, 5); g.fillRect(27, h - 5, 9, 3);
    });
    tiles.wood = mkTile(32, 14, function (g, w, h) {
      g.fillStyle = '#c98a42'; g.fillRect(0, 0, w, h);
      g.fillStyle = '#e0a45c'; g.fillRect(0, 0, w, 3);
      g.strokeStyle = '#7a4a18'; g.lineWidth = 2; g.strokeRect(0, 0, w, h);
      g.fillStyle = '#5b3410'; g.beginPath(); g.arc(5, 7, 1.6, 0, 7); g.arc(27, 7, 1.6, 0, 7); g.fill();
    });
    tiles.leaf = mkTile(26, 16, function (g, w, h) {
      g.fillStyle = '#7ccf48'; g.fillRect(0, 0, w, h);
      g.fillStyle = '#a5ee6c'; g.fillRect(0, 0, w, 4);
      g.strokeStyle = '#3d7a1c'; g.lineWidth = 2; g.strokeRect(0, 0, w, h);
      g.beginPath(); g.moveTo(3, 11); g.lineTo(23, 8); g.stroke();
    });
    tiles.metal = mkTile(32, 16, function (g, w, h) {
      var gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#9fe9ff'); gr.addColorStop(0.5, '#3bb7e8'); gr.addColorStop(1, '#1e5fc8');
      g.fillStyle = gr; g.fillRect(0, 0, w, h);
      g.strokeStyle = '#0d2f6f'; g.lineWidth = 2; g.strokeRect(0, 0, w, h);
      g.fillStyle = '#fff'; g.fillRect(4, 3, 8, 2); g.fillRect(18, 3, 6, 2);
      g.fillStyle = '#ffe36b'; g.fillRect(14, 9, 4, 3);
    });
    // pattern objects are bound to the main context lazily
  }
  function pat(name) {
    var cache = tiles._p || (tiles._p = {});
    if (!cache[name]) cache[name] = ctx.createPattern(tiles[name], 'repeat');
    return cache[name];
  }

  /* ---------- fit ---------- */
  function resize() {
    if (!canvas) return;
    var vv = window.visualViewport;
    cssW = Math.max(1, Math.round(canvas.clientWidth || window.innerWidth));
    cssH = Math.max(1, Math.round(canvas.clientHeight || window.innerHeight));
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(cssW * dpr); canvas.height = Math.round(cssH * dpr);
    scale = Math.min(cssW / MIN_W, cssH / MIN_H, MAX_SCALE);
    if (!safeProbe) {
      safeProbe = document.createElement('div');
      safeProbe.style.cssText = 'position:fixed;left:0;bottom:0;width:1px;height:env(safe-area-inset-bottom,0px);visibility:hidden;pointer-events:none';
      document.body.appendChild(safeProbe);
    }
    var safeB = safeProbe.offsetHeight || 0;
    touchInset = GG.touchControlsOn ? (Math.min(Math.max(64, 0.17 * Math.min(cssW, cssH)), 96) + 16 + 14 + safeB) : 0;
    if (game) game.setView(cssW / scale, cssH / scale, touchInset / scale);
    void vv;
  }

  /* ---------- background ---------- */
  function drawSky(th, cam, t) {
    var w = cssW, h = cssH;
    var g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, th.sky[0]); g.addColorStop(0.55, th.sky[1]); g.addColorStop(1, th.sky[2]);
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    var camx = cam.x, camy = cam.y;
    if (th.sun) {
      var sg = ctx.createRadialGradient(w * 0.82, h * 0.16, 0, w * 0.82, h * 0.16, h * 0.4);
      sg.addColorStop(0, 'rgba(255,250,200,.9)'); sg.addColorStop(0.25, 'rgba(255,240,170,.35)'); sg.addColorStop(1, 'rgba(255,240,170,0)');
      ctx.fillStyle = sg; ctx.fillRect(0, 0, w, h);
    }
    if (th.glitch) {
      ctx.fillStyle = 'rgba(255,255,255,.8)';
      for (var i = 0; i < 40; i++) {
        var sx = (hash(i) * w * 1.4 - camx * 0.04 * scale) % (w * 1.4); if (sx < 0) sx += w * 1.4;
        var sy = hash(i + 50) * h * 0.55; var tw = 0.5 + 0.5 * Math.sin(t * 2 + i);
        ctx.globalAlpha = 0.25 + 0.6 * tw; ctx.fillRect(sx, sy, 2 + (i % 3), 2 + (i % 3));
      }
      ctx.globalAlpha = 1;
    }
    // far floating islands (parallax)
    var far = th.bigIslands ? 9 : 6, k, wx, wy, sz;
    for (k = 0; k < far; k++) {
      var par = 0.12 + (k % 3) * 0.06;
      sz = (th.bigIslands ? 110 : 70) * scale * (0.7 + hash(k + 9) * 0.8);
      wx = ((hash(k + 1) * 1800 - camx * par) * scale) % (w + sz * 2); if (wx < -sz) wx += w + sz * 2;
      wy = h * (0.07 + 0.42 * hash(k + 4)) - camy * par * 0.08 * scale;
      drawFarIsland(th, wx, wy, sz);
    }
    // clouds
    for (k = 0; k < 7; k++) {
      var cp = 0.25 + (k % 3) * 0.08, cw = (60 + hash(k + 20) * 70) * scale;
      var cx = ((hash(k + 11) * 1600 - camx * cp + t * (4 + k)) * scale) % (w + cw * 2); if (cx < -cw) cx += w + cw * 2;
      var cy = h * (0.04 + 0.5 * hash(k + 33)) - camy * cp * 0.06 * scale;
      cloud(cx, cy, cw);
    }
    // hills
    hills(th.hillFar, camx * 0.3, camy, 0.85, 330, 120, 0.012, 1.1, h);
    hills(th.hillNear, camx * 0.55, camy, 0.93, 345, 80, 0.02, 2.7, h);
  }
  function drawFarIsland(th, x, y, s) {
    ctx.save(); ctx.translate(x, y);
    ctx.fillStyle = th.island; ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-s * 0.5, 0); ctx.quadraticCurveTo(0, -s * 0.18, s * 0.5, 0);
    ctx.lineTo(s * 0.3, s * 0.12); ctx.lineTo(s * 0.08, s * 0.38); ctx.lineTo(-s * 0.16, s * 0.14); ctx.lineTo(-s * 0.4, s * 0.1); ctx.closePath();
    ctx.fill(); ctx.stroke(); ctx.restore();
  }
  function cloud(x, y, w) {
    ctx.fillStyle = 'rgba(255,255,255,.88)';
    ctx.beginPath();
    ctx.arc(x, y, w * 0.2, 0, 7); ctx.arc(x + w * 0.2, y - w * 0.1, w * 0.26, 0, 7); ctx.arc(x + w * 0.46, y, w * 0.2, 0, 7); ctx.arc(x + w * 0.22, y + w * 0.06, w * 0.24, 0, 7);
    ctx.fill();
  }
  function hills(color, camx, camy, vpar, y0, amp, freq, ph, h) {
    var base = (y0 - camy * vpar) * scale;
    ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(0, h + 4);
    for (var x = 0; x <= cssW + 12; x += 12) {
      var wx = x / scale + camx;
      var y = base - (Math.sin(wx * freq + ph) * 0.5 + Math.sin(wx * freq * 2.3 + ph * 2) * 0.25 + 0.75) * amp * scale * 0.6;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(cssW, h + 4); ctx.closePath(); ctx.fill();
  }

  /* ---------- world pieces ---------- */
  function grassCap(th, x, y, w, round) {
    // main strip with scalloped underside
    ctx.fillStyle = th.grass[2];
    ctx.beginPath(); ctx.moveTo(x, y + 4);
    for (var sx = x; sx < x + w; sx += 10) { ctx.lineTo(sx, y + 12); ctx.lineTo(Math.min(sx + 5, x + w), y + 15); ctx.lineTo(Math.min(sx + 10, x + w), y + 12); }
    ctx.lineTo(x + w, y + 4); ctx.closePath(); ctx.fill();
    ctx.fillStyle = th.grass[1]; ctx.fillRect(x, y, w, 11);
    ctx.fillStyle = th.grass[0]; ctx.fillRect(x + 1, y, w - 2, 3);
    ctx.strokeStyle = 'rgba(20,70,25,.55)'; ctx.lineWidth = 1.5; ctx.strokeRect(x, y, w, 11);
    void round;
  }
  var FLOWER = ['#ff4f9a', '#b05cff', '#ff5a4a', '#ffd93b', '#ff8fd0'];
  function decor(th, p, camL, camR) {
    var start = Math.max(p.x + 8, camL - 20), end = Math.min(p.x + p.w - 8, camR + 20);
    for (var x = Math.floor(start / 34) * 34; x < end; x += 34) {
      var r = hash(x * 0.37 + p.y);
      if (x < p.x + 6 || x > p.x + p.w - 6 || r < 0.35) continue;
      var kind = r > 0.7 ? 1 : 0, gx = x + (r - 0.5) * 12;
      if (kind === 0) { // grass tuft
        ctx.fillStyle = th.grass[1]; ctx.strokeStyle = th.grass[2]; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(gx - 5, p.y + 1); ctx.lineTo(gx - 3, p.y - 7); ctx.lineTo(gx - 1, p.y + 1); ctx.lineTo(gx + 1, p.y - 10); ctx.lineTo(gx + 3, p.y + 1); ctx.lineTo(gx + 5, p.y - 6); ctx.lineTo(gx + 6, p.y + 1); ctx.closePath(); ctx.fill(); ctx.stroke();
      } else { // flower
        var col = FLOWER[Math.floor(hash(x) * FLOWER.length)];
        ctx.strokeStyle = th.grass[2]; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(gx, p.y + 1); ctx.lineTo(gx, p.y - 9); ctx.stroke();
        ctx.fillStyle = col; for (var a = 0; a < 5; a++) { ctx.beginPath(); ctx.arc(gx + Math.cos(a * 1.2566) * 3.4, p.y - 11 + Math.sin(a * 1.2566) * 3.4, 2.5, 0, 7); ctx.fill(); }
        ctx.fillStyle = '#ffe66b'; ctx.beginPath(); ctx.arc(gx, p.y - 11, 2, 0, 7); ctx.fill();
      }
    }
  }
  function drawPlatform(th, p, camL, camR) {
    if (p.x + p.w < camL - 40 || p.x > camR + 40) return;
    var x = p.x, y = p.y, w = p.w, h = p.h;
    ctx.save();
    if (p.t === 'ground') {
      ctx.fillStyle = pat('dirt'); ctx.fillRect(x, y, w, h);
      ctx.fillStyle = th.under === '#2a1650' ? 'rgba(40,0,90,.35)' : 'rgba(40,15,0,.0)'; ctx.fillRect(x, y, w, h);
      ctx.strokeStyle = '#3a2410'; ctx.lineWidth = 2.5; ctx.strokeRect(x, y, w, h);
      grassCap(th, x, y, w); decor(th, p, camL, camR);
    } else if (p.t === 'island') {
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + w, y); ctx.lineTo(x + w, y + h - 12); ctx.lineTo(x + w - 10, y + h); ctx.lineTo(x + 10, y + h); ctx.lineTo(x, y + h - 12); ctx.closePath();
      ctx.fillStyle = pat('dirt'); ctx.fill(); ctx.strokeStyle = '#3a2410'; ctx.lineWidth = 2.5; ctx.stroke();
      grassCap(th, x, y, w); decor(th, p, camL, camR);
      // hanging roots (decor only)
      ctx.strokeStyle = th.grass[2]; ctx.lineWidth = 2;
      for (var rx = x + 14; rx < x + w - 8; rx += 26) { var rl = 6 + hash(rx) * 10; ctx.beginPath(); ctx.moveTo(rx, y + h - 2); ctx.lineTo(rx + 1, y + h + rl); ctx.stroke(); }
    } else if (p.t === 'stone') {
      ctx.fillStyle = pat('stone'); ctx.fillRect(x, y, w, h); ctx.strokeStyle = '#4c5560'; ctx.lineWidth = 2.5; ctx.strokeRect(x, y, w, h);
    } else if (p.t === 'wood') {
      ctx.fillStyle = pat('wood'); ctx.fillRect(x, y, w, h); ctx.strokeStyle = '#4e2c0c'; ctx.lineWidth = 2.5; ctx.strokeRect(x, y, w, h);
      ctx.strokeStyle = '#6b4018'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x + 6, y + h); ctx.lineTo(x + 6, y + h + 12); ctx.moveTo(x + w - 6, y + h); ctx.lineTo(x + w - 6, y + h + 12); ctx.stroke();
    }
    ctx.restore();
  }
  function drawCrumble(th, c, camL, camR) {
    if (c.state === 'hidden' || c.x + c.w < camL - 40 || c.x > camR + 40) return;
    ctx.save(); ctx.translate(c.shake || 0, 0);
    var warn = c.state === 'shaking';
    ctx.fillStyle = pat('leaf'); ctx.fillRect(c.x, c.y, c.w, c.h);
    if (warn) { ctx.fillStyle = 'rgba(255,170,40,' + (0.25 + 0.2 * Math.sin(game.time * 40)) + ')'; ctx.fillRect(c.x, c.y, c.w, c.h); }
    ctx.strokeStyle = warn ? '#b04a00' : '#2f6a14'; ctx.lineWidth = 2.5; ctx.strokeRect(c.x, c.y, c.w, c.h);
    ctx.strokeStyle = 'rgba(40,80,10,.7)'; ctx.lineWidth = 1.5;
    for (var cx = c.x + 18; cx < c.x + c.w - 6; cx += 28) { ctx.beginPath(); ctx.moveTo(cx, c.y); ctx.lineTo(cx - 3, c.y + 6); ctx.lineTo(cx + 2, c.y + c.h); ctx.stroke(); }
    // small warning leaf marks beneath
    ctx.fillStyle = 'rgba(120,70,20,.9)';
    ctx.fillRect(c.x + 4, c.y + c.h, 3, 5); ctx.fillRect(c.x + c.w - 7, c.y + c.h, 3, 5);
    ctx.restore();
  }
  function drawMover(m, t) {
    ctx.fillStyle = pat('metal'); ctx.fillRect(m.x, m.y, m.w, m.h);
    ctx.strokeStyle = '#0d2f6f'; ctx.lineWidth = 2.5; ctx.strokeRect(m.x, m.y, m.w, m.h);
    var g = ctx.createLinearGradient(m.x, m.y + m.h, m.x, m.y + m.h + 12);
    g.addColorStop(0, 'rgba(25,211,255,' + (0.5 + 0.2 * Math.sin(t * 6)) + ')'); g.addColorStop(1, 'rgba(25,211,255,0)');
    ctx.fillStyle = g; ctx.fillRect(m.x + 4, m.y + m.h, m.w - 8, 12);
    // direction arrows
    ctx.fillStyle = '#fff';
    var horiz = m.ax !== m.bx, cx = m.x + m.w / 2, cy = m.y + m.h / 2;
    ctx.beginPath();
    if (horiz) { ctx.moveTo(cx - 8, cy); ctx.lineTo(cx - 3, cy - 3); ctx.lineTo(cx - 3, cy + 3); ctx.moveTo(cx + 8, cy); ctx.lineTo(cx + 3, cy - 3); ctx.lineTo(cx + 3, cy + 3); }
    else { ctx.moveTo(cx, cy - 5); ctx.lineTo(cx - 3, cy - 1); ctx.lineTo(cx + 3, cy - 1); ctx.moveTo(cx, cy + 5); ctx.lineTo(cx - 3, cy + 1); ctx.lineTo(cx + 3, cy + 1); }
    ctx.fill();
  }

  function drawHazard(h, t) {
    ctx.save();
    if (h.t === 'thorn') {
      var n = Math.max(2, Math.round(h.w / 9)), sw = h.w / n;
      for (var i = 0; i < n; i++) {
        var x0 = h.x + i * sw;
        ctx.fillStyle = '#e63a6e'; ctx.strokeStyle = '#6a0f2e'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(x0, h.y + h.h); ctx.lineTo(x0 + sw / 2, h.y - 1 + (i % 2) * 3); ctx.lineTo(x0 + sw, h.y + h.h); ctx.closePath(); ctx.fill(); ctx.stroke();
      }
      ctx.fillStyle = '#2c9a2a'; ctx.fillRect(h.x - 1, h.y + h.h - 3, h.w + 2, 4);
    } else { // bramble
      ctx.fillStyle = '#25702c'; ctx.strokeStyle = '#123a16'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(h.x + h.w / 2, h.y + h.h - 8, h.w / 2, 11, 0, 0, 7); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#ff5a8a';
      for (var j = 0; j < 5; j++) { var px = h.x + 6 + j * (h.w - 12) / 4; ctx.beginPath(); ctx.moveTo(px - 3, h.y + h.h - 8); ctx.lineTo(px, h.y + (j % 2) * 4); ctx.lineTo(px + 3, h.y + h.h - 8); ctx.fill(); }
    }
    ctx.restore(); void t;
  }
  function drawBug(b, t) {
    var cx = b.x + b.w / 2, cy = b.y + b.h / 2 + Math.sin(b.bob) * 2, jit = Math.sin(t * 40 + b.x) > 0.93 ? 2 : 0;
    ctx.save(); ctx.translate(cx + jit, cy); ctx.scale(b.dir, 1);
    var fl = Math.sin(t * 40) * 4;
    ctx.fillStyle = 'rgba(160,255,255,.75)'; ctx.strokeStyle = '#0a6a7a'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.ellipse(-3, -8, 6, 3 + fl * 0.2, -0.5, 0, 7); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#7b2cff'; ctx.strokeStyle = '#2a0a66'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(0, 0, 11, 8, 0, 0, 7); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#19d3ff'; ctx.fillRect(-6, -3, 4, 4); ctx.fillRect(1, 2, 3, 3);
    ctx.fillStyle = '#ff3b5c'; ctx.fillRect(5, -4, 4, 4);
    ctx.fillStyle = '#fff'; ctx.fillRect(6, -3, 1.5, 1.5);
    ctx.strokeStyle = '#2a0a66'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(-5, 7); ctx.lineTo(-7, 11); ctx.moveTo(0, 8); ctx.lineTo(0, 12); ctx.moveTo(5, 7); ctx.lineTo(7, 11); ctx.stroke();
    ctx.restore();
  }

  function drawCoin(it, t) {
    var bob = Math.sin(t * 3 + it.phase) * 2, sx = Math.abs(Math.cos(t * 3.2 + it.phase)), r = it.r;
    var w = Math.max(2.2, r * sx);
    ctx.save(); ctx.translate(it.x, it.y + bob);
    ctx.fillStyle = 'rgba(255,230,100,.22)'; ctx.beginPath(); ctx.arc(0, 0, r + 4, 0, 7); ctx.fill();
    ctx.fillStyle = '#ffc21a'; ctx.strokeStyle = '#a86100'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(0, 0, w, r, 0, 0, 7); ctx.fill(); ctx.stroke();
    if (w > 5) { ctx.strokeStyle = '#ffe780'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.ellipse(0, 0, w * 0.62, r * 0.62, 0, 0, 7); ctx.stroke(); ctx.fillStyle = '#e09100'; ctx.fillRect(-1.2, -r * 0.4, 2.4, r * 0.8); }
    ctx.restore();
  }
  function drawStar(it, t) {
    var bob = Math.sin(t * 2.4 + it.phase) * 3, r = it.r;
    ctx.save(); ctx.translate(it.x, it.y + bob); ctx.rotate(Math.sin(t * 2 + it.phase) * 0.12);
    var g = ctx.createRadialGradient(0, 0, 2, 0, 0, r * 2.4);
    g.addColorStop(0, 'rgba(255,245,150,.85)'); g.addColorStop(1, 'rgba(255,245,150,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, r * 2.4, 0, 7); ctx.fill();
    ctx.beginPath();
    for (var i = 0; i < 10; i++) { var rr = i % 2 ? r * 0.5 : r, a = -Math.PI / 2 + i * Math.PI / 5; ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
    ctx.closePath(); ctx.fillStyle = '#ffe23a'; ctx.strokeStyle = '#c47a00'; ctx.lineWidth = 2; ctx.lineJoin = 'round'; ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#3a1a00'; ctx.beginPath(); ctx.arc(-3.2, -1.5, 1.7, 0, 7); ctx.arc(3.2, -1.5, 1.7, 0, 7); ctx.fill();
    ctx.strokeStyle = '#3a1a00'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.arc(0, 1.5, 3.2, 0.15, Math.PI - 0.15); ctx.stroke();
    ctx.restore();
  }
  function drawCheck(c, t) {
    ctx.save(); ctx.translate(c.x, c.y);
    ctx.fillStyle = '#7a4a18'; ctx.strokeStyle = '#3a2410'; ctx.lineWidth = 2; ctx.fillRect(-2.5, -46, 5, 46); ctx.strokeRect(-2.5, -46, 5, 46);
    var sway = Math.sin(t * 3) * 2;
    if (c.on) {
      var g = ctx.createRadialGradient(0, -42, 2, 0, -42, 26); g.addColorStop(0, 'rgba(255,170,230,.8)'); g.addColorStop(1, 'rgba(255,170,230,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, -42, 26, 0, 7); ctx.fill();
    }
    ctx.fillStyle = c.on ? '#ff4f9a' : '#9aa3ad'; ctx.strokeStyle = c.on ? '#8a1a52' : '#5b636d'; ctx.lineWidth = 1.8;
    ctx.beginPath(); ctx.moveTo(2.5, -45); ctx.quadraticCurveTo(14, -44 + sway, 22 + sway, -38); ctx.quadraticCurveTo(14, -32 + sway, 2.5, -30); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = c.on ? '#ffe66b' : '#c9d0d6'; ctx.beginPath(); ctx.arc(0, -48, 5, 0, 7); ctx.fill(); ctx.stroke();
    ctx.restore();
  }
  function drawExit(e, t) {
    var cx = e.x + e.w / 2, cy = e.y + e.h / 2, pul = 0.5 + 0.5 * Math.sin(t * 3);
    ctx.save();
    var g = ctx.createRadialGradient(cx, cy, 4, cx, cy, 48 + pul * 6); g.addColorStop(0, 'rgba(255,245,160,.9)'); g.addColorStop(1, 'rgba(255,245,160,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, 54, 0, 7); ctx.fill();
    // arch
    ctx.fillStyle = '#a7b0ba'; ctx.strokeStyle = '#4c5560'; ctx.lineWidth = 3;
    ctx.fillRect(e.x - 8, e.y + 4, 10, e.h - 4); ctx.strokeRect(e.x - 8, e.y + 4, 10, e.h - 4);
    ctx.fillRect(e.x + e.w - 2, e.y + 4, 10, e.h - 4); ctx.strokeRect(e.x + e.w - 2, e.y + 4, 10, e.h - 4);
    ctx.beginPath(); ctx.moveTo(e.x - 8, e.y + 8); ctx.quadraticCurveTo(cx, e.y - 22, e.x + e.w + 8, e.y + 8); ctx.lineTo(e.x + e.w + 8, e.y + 20); ctx.quadraticCurveTo(cx, e.y - 8, e.x - 8, e.y + 20); ctx.closePath(); ctx.fill(); ctx.stroke();
    // portal
    var pg = ctx.createLinearGradient(e.x, e.y, e.x + e.w, e.y + e.h); pg.addColorStop(0, '#19d3ff'); pg.addColorStop(0.5, '#fff6a8'); pg.addColorStop(1, '#ffb62e');
    ctx.fillStyle = pg; ctx.globalAlpha = 0.85; ctx.fillRect(e.x + 2, e.y + 10, e.w - 4, e.h - 10);
    ctx.globalAlpha = 1; ctx.fillStyle = 'rgba(255,255,255,.7)';
    for (var i = 0; i < 4; i++) { var yy = e.y + 14 + ((t * 30 + i * 14) % (e.h - 18)); ctx.fillRect(e.x + 6 + (i * 9) % 26, yy, 3, 3); }
    // flag + leaves
    ctx.fillStyle = '#35c24a'; ctx.beginPath(); ctx.ellipse(cx - 7, e.y - 6, 7, 3.5, -0.5, 0, 7); ctx.ellipse(cx + 7, e.y - 6, 7, 3.5, 0.5, 0, 7); ctx.fill();
    ctx.restore();
  }

  /* ---------- robot ---------- */
  function robotPath(g, w, h) { // helper to keep code compact
    g.beginPath(); g.ellipse(0, 0, w, h, 0, 0, 7);
  }
  function drawRobot(p, t, g, dead) {
    var cx = p.x + p.w / 2, fy = p.y + p.h;
    var sq = p.squash || 0;
    ctx.save();
    ctx.translate(cx, fy);
    ctx.scale((p.face || 1) * (1 + sq * 0.5), 1 - sq * 0.5);
    if (dead) ctx.rotate(Math.sin(t * 6) * 0.3);
    var run = p.grounded && Math.abs(p.vx) > 20, ph = p.anim, bob = run ? Math.abs(Math.sin(ph)) * 1.4 : Math.sin(t * 3) * 0.6;
    var air = !p.grounded;
    // shadow
    if (p.grounded) { ctx.fillStyle = 'rgba(0,0,0,.2)'; ctx.beginPath(); ctx.ellipse(0, -0.5, 9, 2.4, 0, 0, 7); ctx.fill(); }
    // back arm
    var armSw = run ? Math.sin(ph) * 5 : air ? -5 : Math.sin(t * 3) * 0.8;
    ctx.fillStyle = '#e8eef5'; ctx.strokeStyle = '#1e4aa8'; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.arc(-8 - armSw * 0.2, -13 + (air ? -4 : armSw * 0.4), 3, 0, 7); ctx.fill(); ctx.stroke();
    // legs
    var l1 = run ? Math.sin(ph) * 4 : air ? 2 : 0, l2 = run ? -Math.sin(ph) * 4 : air ? -2 : 0;
    ctx.fillStyle = '#2f6bf0'; ctx.strokeStyle = '#143a92'; ctx.lineWidth = 1.6;
    rr(-6.5 + l1 * 0.5, -6 - (air ? 2 : Math.max(0, -Math.sin(ph) * 2 * (run ? 1 : 0))), 5.5, 6, 2);
    rr(1 + l2 * 0.5, -6 - (air ? 0 : Math.max(0, Math.sin(ph) * 2 * (run ? 1 : 0))), 5.5, 6, 2);
    // torso
    ctx.fillStyle = '#f4f8ff'; ctx.strokeStyle = '#1e4aa8'; ctx.lineWidth = 1.8;
    rr(-5.5, -15 - bob * 0.3, 11, 10, 3.5);
    ctx.fillStyle = '#2f6bf0'; ctx.fillRect(-3, -12 - bob * 0.3, 6, 2.4);
    // head
    ctx.save(); ctx.translate(0, -17 - bob);
    ctx.fillStyle = '#f4f8ff'; ctx.strokeStyle = '#1e4aa8'; ctx.lineWidth = 2;
    robotPath(ctx, 11.5, 9.8); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#2f6bf0'; ctx.beginPath(); ctx.ellipse(-11.3, 0.6, 2.6, 4.4, 0, 0, 7); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(11.3, 0.6, 2.6, 4.4, 0, 0, 7); ctx.fill(); ctx.stroke();
    // visor
    ctx.fillStyle = '#0d1426'; ctx.strokeStyle = '#13213f'; ctx.lineWidth = 1;
    rr(-8.4, -5.6, 16.8, 11.4, 5.2);
    // eyes
    var blink = (t % 3.2) > 3.05, hurt = g.invuln > 1.2 || dead;
    ctx.strokeStyle = '#2ee6ff'; ctx.lineWidth = 2.1; ctx.lineCap = 'round';
    ctx.shadowColor = '#19d3ff'; ctx.shadowBlur = 5;
    if (hurt) { ctx.beginPath(); ctx.moveTo(-5.4, -1.8); ctx.lineTo(-1.8, 1.6); ctx.moveTo(-1.8, -1.8); ctx.lineTo(-5.4, 1.6); ctx.moveTo(1.8, -1.8); ctx.lineTo(5.4, 1.6); ctx.moveTo(5.4, -1.8); ctx.lineTo(1.8, 1.6); ctx.stroke(); }
    else if (blink) { ctx.beginPath(); ctx.moveTo(-5.6, 0.4); ctx.lineTo(-1.8, 0.4); ctx.moveTo(1.8, 0.4); ctx.lineTo(5.6, 0.4); ctx.stroke(); }
    else if (air && p.vy < 0) { ctx.beginPath(); ctx.arc(-3.6, 0.2, 2.1, 0, 7); ctx.arc(3.6, 0.2, 2.1, 0, 7); ctx.fillStyle = '#2ee6ff'; ctx.fill(); }
    else { ctx.beginPath(); ctx.arc(-3.7, 1.6, 2.5, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke(); ctx.beginPath(); ctx.arc(3.7, 1.6, 2.5, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke(); }
    ctx.shadowBlur = 0; ctx.lineCap = 'butt';
    // sprout
    var sw = (run ? Math.sin(ph * 2) * 1.2 : Math.sin(t * 2.5) * 0.6) - (air ? p.vy * 0.004 : 0);
    ctx.strokeStyle = '#1a5c26'; ctx.lineWidth = 1.4; ctx.fillStyle = '#4fd45f';
    ctx.beginPath(); ctx.moveTo(0, -9.5); ctx.lineTo(0, -12); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, -12); ctx.quadraticCurveTo(-6 + sw, -18, -10 + sw, -13); ctx.quadraticCurveTo(-5 + sw, -10.5, 0, -12); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, -12); ctx.quadraticCurveTo(6 + sw, -19, 10.5 + sw, -14.5); ctx.quadraticCurveTo(5 + sw, -11, 0, -12); ctx.fill(); ctx.stroke();
    ctx.restore();
    // front arm
    ctx.fillStyle = '#e8eef5'; ctx.strokeStyle = '#1e4aa8'; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.arc(8 + armSw * 0.2, -12.5 + (air ? -5 : -armSw * 0.4), 3.2, 0, 7); ctx.fill(); ctx.stroke();
    ctx.restore();
    function rr(x, y, w, h, r) {
      ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); ctx.fill(); ctx.stroke();
    }
  }

  /* ---------- main draw ---------- */
  function drawGame(g, t) {
    var th = THEMES[g.def.theme] || THEMES.day, cam = g.cam, i;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cssW, cssH);
    drawSky(th, cam, t);

    var sx = 0, sy = 0;
    if (shakeT > 0) { sx = (Math.random() - 0.5) * 7 * shakeT * 3; sy = (Math.random() - 0.5) * 7 * shakeT * 3; }
    ctx.setTransform(dpr * scale, 0, 0, dpr * scale, (-cam.x * scale + sx) * dpr, (-cam.y * scale + sy) * dpr);
    var camL = cam.x, camR = cam.x + cssW / scale;

    // underground fill below the level
    ctx.fillStyle = pat('dirt');
    ctx.fillRect(camL - 10, GG.WORLD_H + 39, camR - camL + 20, 2000);
    ctx.fillStyle = th.glitch ? 'rgba(30,0,70,.55)' : 'rgba(30,10,0,.25)';
    ctx.fillRect(camL - 10, GG.WORLD_H + 39, camR - camL + 20, 2000);

    for (i = 0; i < g.solids.length; i++) drawPlatform(th, g.solids[i], camL, camR);
    for (i = 0; i < g.crumbles.length; i++) drawCrumble(th, g.crumbles[i], camL, camR);
    for (i = 0; i < g.movers.length; i++) drawMover(g.movers[i], t);
    for (i = 0; i < g.checks.length; i++) if (g.checks[i].x > camL - 40 && g.checks[i].x < camR + 40) drawCheck(g.checks[i], t);
    drawExit(g.exit, t);
    for (i = 0; i < g.hazards.length; i++) { var hz = g.hazards[i]; if (hz.x + hz.w > camL - 20 && hz.x < camR + 20) drawHazard(hz, t); }
    for (i = 0; i < g.bugs.length; i++) drawBug(g.bugs[i], t);
    for (i = 0; i < g.items.length; i++) {
      var it = g.items[i]; if (it.got || it.x < camL - 30 || it.x > camR + 30) continue;
      if (it.kind === 'coin') drawCoin(it, t); else drawStar(it, t);
    }
    // player (blink while invulnerable)
    var vis = g.invuln <= 0 || Math.floor(g.invuln * 14) % 2 === 0;
    if (vis || g.state !== 'playing') drawRobot(g.p, t, g, g.state === 'lost');
    // particles
    for (i = 0; i < g.particles.length; i++) {
      var q = g.particles[i]; ctx.globalAlpha = Math.max(0, q.life / q.max); ctx.fillStyle = q.c; ctx.fillRect(q.x - q.size / 2, q.y - q.size / 2, q.size, q.size);
    }
    ctx.globalAlpha = 1;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  /* ---------- 2D FX canvases: welcome sparkles + victory confetti ---------- */
  function makeFx(id, make, step, draw) {
    var cv = GG.$(id), cx = cv.getContext('2d'), list = [], active = false, w = 0, h = 0, d = 1;
    return {
      get active() { return active; },
      start: function () { this.resize(); list = []; for (var i = 0; i < 40; i++) list.push(make(w, h, true)); active = true; },
      stop: function () { active = false; cx.setTransform(1, 0, 0, 1, 0, 0); cx.clearRect(0, 0, cv.width, cv.height); list = []; },
      resize: function () { d = Math.min(window.devicePixelRatio || 1, 2); w = cv.clientWidth; h = cv.clientHeight; cv.width = Math.round(w * d); cv.height = Math.round(h * d); },
      frame: function (dt, t) {
        if (!active) return;
        cx.setTransform(d, 0, 0, d, 0, 0); cx.clearRect(0, 0, w, h);
        for (var i = 0; i < list.length; i++) { step(list[i], dt, w, h, t); draw(cx, list[i], t); }
      },
      count: function (n) { while (list.length < n) list.push(make(w, h, true)); list.length = n; }
    };
  }
  var sparkles = null, confetti = null;
  function initFx() {
    sparkles = makeFx('sparkles', function (w, h) {
      return { x: Math.random() * w, y: Math.random() * h, r: 1.2 + Math.random() * 3, vy: -(6 + Math.random() * 18), ph: Math.random() * 6, hue: Math.random() > 0.5 ? 255 : 200 };
    }, function (s, dt, w, h) { s.y += s.vy * dt; s.x += Math.sin(s.ph + s.y * 0.02) * 0.2; if (s.y < -10) { s.y = h + 10; s.x = Math.random() * w; } }, function (c, s, t) {
      var a = 0.35 + 0.65 * Math.abs(Math.sin(t * 2 + s.ph));
      c.globalAlpha = a; c.fillStyle = s.hue === 255 ? '#fff6b0' : '#c8f6ff';
      c.beginPath(); c.moveTo(s.x, s.y - s.r * 2); c.lineTo(s.x + s.r * 0.6, s.y - s.r * 0.6); c.lineTo(s.x + s.r * 2, s.y); c.lineTo(s.x + s.r * 0.6, s.y + s.r * 0.6); c.lineTo(s.x, s.y + s.r * 2); c.lineTo(s.x - s.r * 0.6, s.y + s.r * 0.6); c.lineTo(s.x - s.r * 2, s.y); c.lineTo(s.x - s.r * 0.6, s.y - s.r * 0.6); c.closePath(); c.fill(); c.globalAlpha = 1;
    });
    var COL = ['#ffd93b', '#ff4f9a', '#19d3ff', '#7de65f', '#ff9a1f', '#b05cff'];
    confetti = makeFx('confetti', function (w, h, init) {
      return { x: Math.random() * w, y: init ? -Math.random() * h : -10, vx: (Math.random() - 0.5) * 60, vy: 90 + Math.random() * 140, rot: Math.random() * 6, vr: (Math.random() - 0.5) * 9, c: COL[(Math.random() * COL.length) | 0], s: 5 + Math.random() * 7 };
    }, function (p, dt, w, h) { p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.vr * dt; if (p.y > h + 20) { p.y = -10; p.x = Math.random() * w; } }, function (c, p) {
      c.save(); c.translate(p.x, p.y); c.rotate(p.rot); c.fillStyle = p.c; c.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2); c.restore();
    });
  }

  GG.render = {
    init: function () {
      canvas = GG.$('game'); ctx = canvas.getContext('2d');
      buildTiles(); initFx(); resize();
    },
    resize: function () { resize(); if (sparkles && sparkles.active) sparkles.resize(); if (confetti && confetti.active) confetti.resize(); },
    attach: function (g) { game = g; if (g) { resize(); g.setView(cssW / scale, cssH / scale, touchInset / scale); g.updateCamera(0, true); } },
    draw: function (g, t) { if (g) drawGame(g, t); },
    clear: function () { if (ctx) { ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, canvas.width, canvas.height); } },
    shake: function (s) { shakeT = Math.max(shakeT, s); },
    tickFx: function (dt, t) {
      if (shakeT > 0) shakeT = Math.max(0, shakeT - dt);
      sparkles.frame(dt, t); confetti.frame(dt, t);
    },
    get sparkles() { return sparkles; }, get confetti() { return confetti; },
    get scale() { return scale; },
    get viewSize() { return { w: cssW / scale, h: cssH / scale }; }
  };
})();
