/* CHALLENGE CARAVAN — Save manager (validated localStorage persistence) */
(function () {
  'use strict';
  var CC = window.CC;
  var KEY = 'challengeCaravan.save.v1';
  var memoryFallback = null;

  function num(v, def, min, max) {
    v = Number(v);
    if (!isFinite(v)) return def;
    return Math.min(max, Math.max(min, v));
  }
  function bool(v, def) { return typeof v === 'boolean' ? v : def; }
  function oneOf(v, list, def) { return list.indexOf(v) >= 0 ? v : def; }

  function defaults() {
    return {
      v: 1,
      started: false,
      settings: { music: true, sfx: true, musicVol: 0.55, sfxVol: 0.8, motion: 'auto', contrast: false, large: false, touch: 'auto' },
      jp: 0,
      unlocked: 0,
      nodes: {},
      badges: {},
      decor: {},
      skins: { sun: true },
      equipped: 'sun',
      milestones: {},
      tutorial: { story: false, dash: false, puzzle: false, snap: false },
      streak: 0,
      community: { stage: {}, last: null },
      totals: { runs: 0, tokens: 0, snaps: 0, perfects: 0, solved: 0 }
    };
  }

  function validate(raw) {
    var d = defaults();
    if (!raw || typeof raw !== 'object' || raw.v !== 1) return d;
    try {
      d.started = bool(raw.started, false);
      var s = raw.settings || {};
      d.settings.music = bool(s.music, true);
      d.settings.sfx = bool(s.sfx, true);
      d.settings.musicVol = num(s.musicVol, 0.55, 0, 1);
      d.settings.sfxVol = num(s.sfxVol, 0.8, 0, 1);
      d.settings.motion = oneOf(s.motion, ['auto', 'reduce'], 'auto');
      d.settings.contrast = bool(s.contrast, false);
      d.settings.large = bool(s.large, false);
      d.settings.touch = oneOf(s.touch, ['auto', 'on', 'off'], 'auto');
      d.jp = Math.round(num(raw.jp, 0, 0, 1e6));
      d.unlocked = Math.round(num(raw.unlocked, 0, 0, CC.DEST.length - 1));
      var n = raw.nodes && typeof raw.nodes === 'object' ? raw.nodes : {};
      CC.DEST.forEach(function (dest) {
        var r = n[dest.id];
        if (!r || typeof r !== 'object') return;
        var best = {};
        ['dash', 'puzzle', 'snap'].forEach(function (g) {
          if (r.best && r.best[g] != null) best[g] = Math.round(num(r.best[g], 0, 0, 1e6));
        });
        d.nodes[dest.id] = {
          stars: Math.round(num(r.stars, 0, 0, 3)),
          cleared: bool(r.cleared, false),
          plays: Math.round(num(r.plays, 0, 0, 1e6)),
          best: best
        };
      });
      ['badges', 'decor', 'skins', 'milestones'].forEach(function (k) {
        var src = raw[k];
        if (src && typeof src === 'object') Object.keys(src).forEach(function (id) { if (src[id] === true) d[k][id] = true; });
      });
      d.skins.sun = true;
      d.equipped = d.skins[raw.equipped] ? raw.equipped : 'sun';
      var t = raw.tutorial || {};
      ['story', 'dash', 'puzzle', 'snap'].forEach(function (k) { d.tutorial[k] = bool(t[k], false); });
      d.streak = Math.round(num(raw.streak, 0, 0, 999));
      var c = raw.community || {};
      if (c.stage && typeof c.stage === 'object') Object.keys(c.stage).forEach(function (k) {
        if (/^\d$/.test(k)) d.community.stage[k] = Math.round(num(c.stage[k], 0, 0, CC.STAGE_CAP));
      });
      if (c.last && typeof c.last === 'object') {
        d.community.last = { dest: Math.round(num(c.last.dest, 0, 0, 7)), pts: Math.round(num(c.last.pts, 0, 0, 1000)) };
      }
      var tt = raw.totals || {};
      Object.keys(d.totals).forEach(function (k) { d.totals[k] = Math.round(num(tt[k], 0, 0, 1e7)); });
      // consistency: unlocked must follow cleared nodes
      var maxCleared = -1;
      CC.DEST.forEach(function (dest) { if (d.nodes[dest.id] && d.nodes[dest.id].cleared) maxCleared = Math.max(maxCleared, dest.id); });
      d.unlocked = Math.max(d.unlocked, Math.min(CC.DEST.length - 1, maxCleared + 1));
    } catch (e) { return defaults(); }
    return d;
  }

  var Save = {
    data: defaults(),
    ok: true,
    load: function () {
      var raw = null;
      try {
        var txt = window.localStorage.getItem(KEY);
        raw = txt ? JSON.parse(txt) : null;
      } catch (e) { this.ok = false; raw = memoryFallback; }
      this.data = validate(raw);
      return this.data;
    },
    save: function () {
      try {
        memoryFallback = JSON.parse(JSON.stringify(this.data));
        window.localStorage.setItem(KEY, JSON.stringify(this.data));
        this.ok = true;
      } catch (e) { this.ok = false; }
    },
    reset: function () {
      var settings = this.data.settings;
      this.data = defaults();
      this.data.settings = settings;
      memoryFallback = null;
      try { window.localStorage.removeItem(KEY); } catch (e) { /* ignore */ }
      this.save();
    },
    node: function (id) {
      if (!this.data.nodes[id]) this.data.nodes[id] = { stars: 0, cleared: false, plays: 0, best: {} };
      return this.data.nodes[id];
    },
    totalStars: function () {
      var t = 0, n = this.data.nodes;
      Object.keys(n).forEach(function (k) { t += n[k].stars || 0; });
      return t;
    },
    clearedCount: function () {
      var t = 0, n = this.data.nodes;
      Object.keys(n).forEach(function (k) { if (n[k].cleared) t++; });
      return t;
    }
  };
  Save.defaults = defaults;
  Save.validate = validate;
  CC.Save = Save;
})();
