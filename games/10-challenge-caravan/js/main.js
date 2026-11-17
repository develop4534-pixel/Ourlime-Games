/* CHALLENGE CARAVAN — boot */
(function () {
  'use strict';
  var CC = window.CC, UI = CC.UI, State = CC.State, Save = CC.Save, $ = UI.$;
  var started = false;

  function setProgress(p, msg) {
    var bar = $('boot-bar'); if (!bar) return;
    bar.style.width = p + '%';
    bar.parentNode.setAttribute('aria-valuenow', String(Math.round(p)));
    if (msg) $('boot-msg').textContent = msg;
  }

  function boot() {
    if (started) return; started = true;
    var t0 = performance.now();
    try { Save.load(); } catch (e) { Save.data = Save.defaults(); }
    UI.init();
    CC.App.init();
    CC.Game.init();
    setProgress(30, 'Reading the map…');

    var img = $('w-img'), done = false;
    function go() {
      if (done) return; done = true;
      setProgress(100, 'Ready!');
      var wait = Math.max(0, 650 - (performance.now() - t0));
      setTimeout(function () { State.go('WELCOME', {}, { force: true }); }, wait);
    }
    function artFailed() { var w = $('welcome'); if (w) w.classList.add('no-art'); }
    if (img) {
      img.addEventListener('error', function () { artFailed(); setProgress(90, 'Almost there…'); go(); });
      img.addEventListener('load', function () { setProgress(90, 'Almost there…'); go(); });
      if (img.complete) { if (img.naturalWidth > 0) { setProgress(90); go(); } else { artFailed(); go(); } }
    } else go();
    setTimeout(go, 6000); // never leave the player on the loading screen
  }

  window.addEventListener('error', function (e) { if (window.console) console.error('[CC] runtime error:', e.message); });
  window.addEventListener('unhandledrejection', function (e) { if (window.console) console.warn('[CC] unhandled promise:', e.reason); e.preventDefault(); });

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
