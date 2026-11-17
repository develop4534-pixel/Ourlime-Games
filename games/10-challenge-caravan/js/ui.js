/* CHALLENGE CARAVAN — UI helpers + explicit state machine */
(function () {
  'use strict';
  var CC = window.CC;
  var $ = function (id) { return document.getElementById(id); };
  var app;

  function safe(fn, a, b, c) {
    try { return fn(a, b, c); } catch (e) { if (window.console) console.error('[CC]', e); }
  }

  var UI = {
    $: $,
    safe: safe,
    overlays: [],
    isTouch: function () {
      var s = CC.Save.data.settings.touch;
      if (s === 'on') return true;
      if (s === 'off') return false;
      return !!(window.matchMedia && window.matchMedia('(pointer: coarse)').matches);
    },
    reducedMotion: function () {
      return CC.Save.data.settings.motion === 'reduce' || !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    },
    applySettings: function () {
      var s = CC.Save.data.settings, h = document.documentElement;
      if (s.motion === 'reduce') h.setAttribute('data-motion', 'reduce'); else h.removeAttribute('data-motion');
      if (s.contrast) h.setAttribute('data-contrast', ''); else h.removeAttribute('data-contrast');
      if (s.large) h.setAttribute('data-large', ''); else h.removeAttribute('data-large');
      h.classList.toggle('touch-ui', UI.isTouch());
      if (CC.Audio) CC.Audio.applySettings();
    },
    /* click with double-activation guard + click sound */
    bind: function (el, fn, opts) {
      if (typeof el === 'string') el = $(el);
      if (!el) return;
      el.addEventListener('click', function (ev) {
        if (el.disabled || el.getAttribute('aria-disabled') === 'true') return;
        var now = performance.now();
        if (now - (el._ct || 0) < 260) return;
        el._ct = now;
        CC.Audio.init();
        if (!(opts && opts.silent)) CC.Audio.sfx(opts && opts.sfx ? opts.sfx : 'click');
        safe(fn, ev);
      });
    },
    toast: function (msg) {
      var box = $('toasts');
      if (!box) return;
      var t = document.createElement('div');
      t.className = 'toast'; t.textContent = msg;
      box.appendChild(t);
      setTimeout(function () { if (t.parentNode) t.parentNode.removeChild(t); }, 3300);
      while (box.children.length > 3) box.removeChild(box.firstChild);
    },
    /* Overlays with focus trap */
    openOverlay: function (el, focusEl) {
      if (!el) return;
      el.hidden = false;
      el._last = document.activeElement;
      if (UI.overlays.indexOf(el) < 0) UI.overlays.push(el);
      var first = focusEl || el.querySelector('button:not([disabled])');
      if (first) setTimeout(function () { try { first.focus({ preventScroll: true }); } catch (e) { /* ignore */ } }, 30);
      if (!el._trap) {
        el._trap = function (e) {
          if (e.key !== 'Tab') return;
          var f = el.querySelectorAll('button:not([disabled]),[href],input,select,[tabindex]:not([tabindex="-1"])');
          if (!f.length) return;
          var a = f[0], z = f[f.length - 1];
          if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus(); }
          else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); }
          else if (!el.contains(document.activeElement)) { e.preventDefault(); a.focus(); }
        };
        el.addEventListener('keydown', el._trap);
      }
    },
    closeOverlay: function (el, noRestore) {
      if (!el || el.hidden) return;
      el.hidden = true;
      var i = UI.overlays.indexOf(el);
      if (i >= 0) UI.overlays.splice(i, 1);
      if (!noRestore && el._last && document.contains(el._last) && !el._last.closest('[hidden]')) {
        try { el._last.focus({ preventScroll: true }); } catch (e) { /* ignore */ }
      }
    },
    topOverlay: function () { return UI.overlays.length ? UI.overlays[UI.overlays.length - 1] : null; },
    confirm: function (title, text, yesLabel) {
      return new Promise(function (resolve) {
        var box = $('confirm');
        $('cf-title').textContent = title;
        $('cf-text').textContent = text;
        $('cf-yes').firstElementChild.textContent = yesLabel || 'CONFIRM';
        function done(v) {
          $('cf-yes').removeEventListener('click', yes);
          $('cf-no').removeEventListener('click', no);
          box.removeEventListener('cc-cancel', no);
          UI.closeOverlay(box);
          resolve(v);
        }
        function yes() { done(true); }
        function no() { done(false); }
        $('cf-yes').addEventListener('click', yes);
        $('cf-no').addEventListener('click', no);
        box.addEventListener('cc-cancel', no);
        UI.openOverlay(box, $('cf-no'));
      });
    },
    /* Reward reveal: items = [{icon,title,text}] shown one after another */
    reveal: function (items) {
      return new Promise(function (resolve) {
        var q = (items || []).slice();
        if (!q.length) return resolve();
        var box = $('reveal');
        function next() {
          var it = q.shift();
          if (!it) { $('rv-ok').removeEventListener('click', next); box.removeEventListener('cc-cancel', next); UI.closeOverlay(box); return resolve(); }
          $('rv-ico').innerHTML = it.html || '';
          $('rv-title').textContent = it.title;
          $('rv-text').textContent = it.text || '';
          var ic = $('rv-ico'); ic.style.animation = 'none'; void ic.offsetWidth; ic.style.animation = '';
          CC.Audio.sfx('reveal');
          $('rv-ok').firstElementChild.textContent = q.length ? 'NEXT' : 'NICE!';
        }
        $('rv-ok').addEventListener('click', next);
        box.addEventListener('cc-cancel', next);
        UI.openOverlay(box, $('rv-ok'));
        next();
      });
    },
    wipe: function (mid) {
      var w = $('wipe');
      if (UI.reducedMotion()) { mid(); return; }
      w.className = 'wipe cover';
      setTimeout(function () {
        mid();
        w.className = 'wipe reveal';
        setTimeout(function () { w.className = 'wipe'; }, 420);
      }, 330);
    },
    pop: function (el) {
      if (!el || UI.reducedMotion()) return;
      el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump');
    },
    /* animated number counter */
    count: function (el, from, to, ms, fmt) {
      if (!el) return;
      fmt = fmt || function (v) { return String(v); };
      if (UI.reducedMotion() || from === to) { el.textContent = fmt(to); return; }
      var t0 = performance.now();
      cancelAnimationFrame(el._raf || 0);
      (function tick(now) {
        var k = Math.min(1, (now - t0) / ms);
        el.textContent = fmt(Math.round(from + (to - from) * (1 - Math.pow(1 - k, 3))));
        if (k < 1) el._raf = requestAnimationFrame(tick);
      })(t0);
    },
    stars: function (n, max, big) {
      var out = '';
      for (var i = 0; i < max; i++) out += "<i class='star " + (i < n ? 'on' : 'off') + (big ? ' big' : '') + "' aria-hidden='true'></i>";
      return "<span class='stars' role='img' aria-label='" + n + ' of ' + max + " stars'>" + out + '</span>';
    }
  };
  CC.UI = UI;

  /* ================= STATE MACHINE ================= */
  var TRANS = {
    BOOT: ['WELCOME'],
    WELCOME: ['MAIN_MENU'],
    MAIN_MENU: ['WORLD_MAP', 'STORY', 'SETTINGS', 'REWARDS', 'COMMUNITY', 'CHALLENGES', 'HOWTO'],
    STORY: ['WORLD_MAP'],
    WORLD_MAP: ['MAIN_MENU', 'CHALLENGE_INTRO', 'MINIGAME', 'COMMUNITY', 'REWARDS', 'SETTINGS', 'HOWTO'],
    CHALLENGE_INTRO: ['WORLD_MAP', 'MINIGAME'],
    MINIGAME: ['PAUSED', 'RESULTS'],
    PAUSED: ['MINIGAME', 'WORLD_MAP', 'SETTINGS', 'HOWTO', 'CHALLENGE_INTRO'],
    RESULTS: ['MINIGAME', 'WORLD_MAP', 'REWARDS', 'CHALLENGE_INTRO'],
    REWARDS: [], COMMUNITY: ['WORLD_MAP'], CHALLENGES: ['WORLD_MAP', 'CHALLENGE_INTRO', 'MINIGAME'], HOWTO: [], SETTINGS: []
  };
  var PANELS = ['REWARDS', 'COMMUNITY', 'CHALLENGES', 'HOWTO', 'SETTINGS'];

  var State = {
    cur: 'BOOT', prev: null, busy: false, stack: [], defs: {}, _bt: 0,
    register: function (name, def) { State.defs[name] = def; },
    isPanel: function (s) { return PANELS.indexOf(s) >= 0; },
    can: function (to) { return (TRANS[State.cur] || []).indexOf(to) >= 0; },
    show: function (id) {
      var list = document.querySelectorAll('.screen');
      for (var i = 0; i < list.length; i++) {
        var s = list[i];
        if (s.id === id) { if (!s.classList.contains('active')) s.classList.add('active'); }
        else s.classList.remove('active');
      }
    },
    go: function (to, data, opts) {
      opts = opts || {};
      if (State.busy && !opts.force) return false;
      if (!opts.back && !State.can(to)) { if (window.console) console.warn('[CC] blocked transition', State.cur, '->', to); return false; }
      var def = State.defs[to];
      if (!def) return false;
      State.busy = true;
      clearTimeout(State._bt);
      State._bt = setTimeout(function () { State.busy = false; }, opts.wipe && !UI.reducedMotion() ? 800 : 260);
      var swap = function () {
        var from = State.defs[State.cur];
        if (from && from.leave) safe(from.leave, to);
        State.prev = State.cur;
        if (State.isPanel(to) && !opts.back) State.stack.push(State.cur);
        else if (State.isPanel(State.cur) && !opts.back) State.stack.length = 0;
        State.cur = to;
        app.dataset.state = to;
        State.show(def.screen);
        if (def.enter) safe(def.enter, data || {}, State.prev, !!opts.back);
        var scr = $(def.screen);
        if (scr && !opts.noFocus) {
          var f = scr.querySelector('[data-autofocus]') || null;
          if (def.focus) f = typeof def.focus === 'function' ? def.focus() : $(def.focus);
          if (f) setTimeout(function () { try { f.focus({ preventScroll: true }); } catch (e) { /* ignore */ } }, 60);
        }
      };
      if (opts.wipe) UI.wipe(swap); else swap();
      return true;
    },
    /* return from a panel to whatever opened it */
    back: function (data) {
      if (!State.isPanel(State.cur)) return false;
      var to = State.stack.pop() || 'MAIN_MENU';
      return State.go(to, data || { fromPanel: true }, { back: true, force: true });
    }
  };
  CC.State = State;

  /* ================= Global wiring ================= */
  UI.init = function () {
    app = $('app');
    CC.installIcons();
    UI.applySettings();

    /* press feedback for touch + keyboard activation */
    document.addEventListener('pointerdown', function (e) {
      var b = e.target.closest && e.target.closest('.btn');
      if (b) b.classList.add('is-pressed');
    }, { passive: true });
    var rel = function () {
      var l = document.querySelectorAll('.btn.is-pressed');
      for (var i = 0; i < l.length; i++) l[i].classList.remove('is-pressed');
    };
    document.addEventListener('pointerup', rel, { passive: true });
    document.addEventListener('pointercancel', rel, { passive: true });
    window.addEventListener('blur', rel);

    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape') return;
      var top = UI.topOverlay();
      if (top && top.id !== 'pause') { top.dispatchEvent(new Event('cc-cancel')); e.preventDefault(); return; }
      var d = State.defs[State.cur];
      if (d && d.escape) { safe(d.escape); e.preventDefault(); }
    });

    document.addEventListener('visibilitychange', function () {
      if (document.hidden) {
        CC.Audio.suspend();
        if (CC.Game && CC.Game.autoPause) CC.Game.autoPause();
      } else if (CC.Save.data.settings.music || CC.Save.data.settings.sfx) CC.Audio.resume();
    });

    if (window.matchMedia) {
      var mq = window.matchMedia('(pointer: coarse)');
      var h = function () { document.documentElement.classList.toggle('touch-ui', UI.isTouch()); if (CC.Game && CC.Game.layoutControls) CC.Game.layoutControls(); };
      if (mq.addEventListener) mq.addEventListener('change', h); else if (mq.addListener) mq.addListener(h);
    }
    /* block pinch / page zoom & context menu in the play area, keep scrolling elsewhere */
    document.addEventListener('contextmenu', function (e) { if (e.target.closest && e.target.closest('#play,.controls')) e.preventDefault(); });
    ['gesturestart', 'gesturechange'].forEach(function (n) { document.addEventListener(n, function (e) { e.preventDefault(); }); });
    document.addEventListener('dblclick', function (e) { if (e.target.closest && e.target.closest('#game')) e.preventDefault(); });
  };
})();
