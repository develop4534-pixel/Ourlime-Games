/* CHALLENGE CARAVAN — static game data */
(function () {
  'use strict';
  var CC = (window.CC = window.CC || {});

  /* ---------- Icons (24x24, used as CSS masks) ---------- */
  var S = "fill='none' stroke='#000' stroke-width='2.6' stroke-linecap='round' stroke-linejoin='round'";
  CC.ICONS = {
    target: "<circle cx='12' cy='12' r='9' " + S + "/><circle cx='12' cy='12' r='4' " + S + "/><circle cx='12' cy='12' r='1.4'/>",
    map: "<path d='M3 6l6-2.5 6 2.5 6-2.5v14.5l-6 2.5-6-2.5-6 2.5z' " + S + "/><path d='M9 3.5v14.5M15 6v14.5' " + S + "/>",
    people: "<circle cx='8' cy='8' r='3.4'/><circle cx='17' cy='9' r='2.8'/><path d='M1.5 20c0-3.6 3-6 6.5-6s6.5 2.4 6.5 6z'/><path d='M15 14.4c3.6-.5 7.5 1 7.5 5.6H16.5c0-2.2-.6-4-1.5-5.6z'/>",
    gift: "<rect x='3' y='9' width='18' height='4' rx='1'/><rect x='4.5' y='13' width='15' height='8' rx='1'/><path d='M12 9C9 9 6.5 7.5 7.5 5.5s4 .5 4.5 3.5zM12 9c3 0 5.5-1.5 4.5-3.5s-4 .5-4.5 3.5z'/>",
    help: "<circle cx='12' cy='12' r='9.5' " + S + "/><path d='M8.8 9.5a3.2 3.2 0 116.2 1c0 2-3 2.4-3 4.2' " + S + "/><circle cx='12' cy='18' r='1.5'/>",
    gear: "<circle cx='12' cy='12' r='3.4' " + S + "/><path d='M12 2.5v4M12 17.5v4M2.5 12h4M17.5 12h4M5.3 5.3l2.8 2.8M15.9 15.9l2.8 2.8M5.3 18.7l2.8-2.8M15.9 8.1l2.8-2.8' " + S + "/>",
    back: "<path d='M15 4l-8 8 8 8' " + S + "/>",
    compass: "<circle cx='12' cy='12' r='9.5' " + S + "/><path d='M16.5 7.5l-2.2 6.8-6.8 2.2 2.2-6.8z'/>",
    star: "<path d='M12 2l2.9 6.6 7.1.6-5.4 4.7 1.6 7L12 17.3 5.8 20.9l1.6-7L2 9.2l7.1-.6z'/>",
    staro: "<path d='M12 3.6l2.5 5.6 6 .6-4.5 4 1.4 6-5.4-3.2-5.4 3.2 1.4-6-4.5-4 6-.6z' fill='none' stroke='#000' stroke-width='2.2' stroke-linejoin='round'/>",
    x: "<path d='M5.5 5.5l13 13M18.5 5.5l-13 13' " + S + "/>",
    pause: "<rect x='5.5' y='4' width='4.5' height='16' rx='1.2'/><rect x='14' y='4' width='4.5' height='16' rx='1.2'/>",
    left: "<path d='M15 4l-8 8 8 8' " + S + "/>",
    right: "<path d='M9 4l8 8-8 8' " + S + "/>",
    up: "<path d='M4 15l8-8 8 8' " + S + "/>",
    bulb: "<path d='M9 21h6M10 18h4M12 3a6 6 0 00-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0012 3z' " + S + "/>",
    camera: "<path d='M4 8h3l1.5-2.5h7L17 8h3a1 1 0 011 1v10a1 1 0 01-1 1H4a1 1 0 01-1-1V9a1 1 0 011-1z' " + S + "/><circle cx='12' cy='13.5' r='3.6' " + S + "/>",
    lock: "<rect x='5' y='10.5' width='14' height='10' rx='2'/><path d='M8 10.5V8a4 4 0 018 0v2.5' " + S + "/>",
    check: "<path d='M4.5 12.5l5 5 10-11' " + S + "/>",
    play: "<path d='M7 4l13 8-13 8z'/>",
    puzzle: "<path d='M4 8h4a2 2 0 114 0h4v4a2 2 0 110 4v4H4z'/>",
    flag: "<path d='M6 21V3' " + S + "/><path d='M6 4h12l-3 4 3 4H6z'/>",
    bolt: "<path d='M13 2L5 14h6l-1 8 8-12h-6z'/>",
    trophy: "<path d='M7 3h10v6a5 5 0 01-10 0z'/><path d='M7 5H3v2a4 4 0 004 4M17 5h4v2a4 4 0 01-4 4M12 14v4M8 21h8' " + S + "/>",
    heart: "<path d='M12 21S3 14.5 3 8.5A4.5 4.5 0 0112 6a4.5 4.5 0 019 2.5C21 14.5 12 21 12 21z'/>",
    rotate: "<path d='M20 12a8 8 0 11-2.6-5.9' " + S + "/><path d='M20 3v5h-5' " + S + "/>",
    sound: "<path d='M4 9h4l5-4v14l-5-4H4z'/><path d='M16 9a4 4 0 010 6M18.5 6.5a8 8 0 010 11' " + S + "/>"
  };
  CC.iconURL = function (name) {
    var inner = CC.ICONS[name] || '';
    return 'url("data:image/svg+xml,' + encodeURIComponent("<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'>" + inner + '</svg>') + '")';
  };
  CC.installIcons = function () {
    var root = document.documentElement;
    Object.keys(CC.ICONS).forEach(function (k) { root.style.setProperty('--ico-' + k, CC.iconURL(k)); });
  };
  /* Coloured inline icon (for places where we need a real fill colour) */
  CC.icoHTML = function (name, cls) { return '<i class="ico ico-' + name + (cls ? ' ' + cls : '') + '" aria-hidden="true"></i>'; };

  /* ---------- Games ---------- */
  CC.GAMES = {
    dash: { id: 'dash', name: 'Caravan Dash', kind: 'Speed · Reaction · Precision', icon: 'bolt', color: '#ff8a1f',
      goal: 'Steer the caravan to the finish flag. Grab expedition tokens, dodge rocks, hop over logs.',
      controls: ['Move: ← → or A D (or swipe / big buttons)', 'Jump over logs: Space, ↑ or W (or the JUMP button)', 'Sun Boost = a few seconds of speed and safety', 'Chain tokens for a bigger combo'] },
    puzzle: { id: 'puzzle', name: 'Ruins Puzzle', kind: 'Puzzle · Logic', icon: 'puzzle', color: '#7a3fc0',
      goal: 'Rotate the ancient tiles so the sun-energy flows from the glowing source on the left to the temple gate on the right.',
      controls: ['Tap / click a tile (or press Enter / Space) to rotate it', 'Arrow keys move between tiles', 'Powered tiles glow and show a ⚡ mark', 'Stuck? HINT fixes one tile (small score cost)'] },
    snap: { id: 'snap', name: 'Expedition Snap', kind: 'Observation · Precision', icon: 'camera', color: '#19b8e6',
      goal: 'Find every item on your checklist and photograph it. Centre it in the frame for a PERFECT shot. Accuracy beats speed.',
      controls: ['Move the camera frame: mouse, finger, or arrow keys / WASD', 'SNAP: click/tap, Space or Enter', 'Film is limited — wrong shots cost accuracy', 'Stuck? HINT shows the general area'] }
  };

  /* ---------- Destinations (8) ---------- */
  CC.DEST = [
    { id: 0, name: 'Palm Cove Village', game: 'dash', diff: 1, l: [8, 80], p: [22, 90], blurb: 'Where every caravan begins.', badge: 'Palm Cove Explorer' },
    { id: 1, name: 'Jungle Ruins', game: 'puzzle', diff: 1, l: [21, 55], p: [68, 80], blurb: 'Vines hide an ancient mechanism.', badge: 'Ruin Restorer' },
    { id: 2, name: 'Waterfall Canyon', game: 'snap', diff: 1, l: [33, 78], p: [30, 69], blurb: 'Rare sights behind the mist.', badge: 'Canyon Photographer' },
    { id: 3, name: 'Mountain Observatory', game: 'dash', diff: 2, l: [45, 46], p: [72, 58], blurb: 'A steep trail to the stars.', badge: 'Summit Seeker' },
    { id: 4, name: 'Coastal Harbor', game: 'snap', diff: 2, l: [56, 76], p: [28, 47], blurb: 'Boats, gulls and hidden treasure.', badge: 'Harbor Hawk' },
    { id: 5, name: 'Desert Puzzle Temple', game: 'puzzle', diff: 2, l: [68, 50], p: [70, 37], blurb: 'Sand-worn stones, sharp riddles.', badge: 'Temple Tinkerer' },
    { id: 6, name: 'Floating Festival Island', game: 'snap', diff: 3, l: [81, 22], p: [30, 26], blurb: 'Lanterns drift through the sky.', badge: 'Festival Finder' },
    { id: 7, name: 'The Mystery Horizon', game: 'any', diff: 3, l: [93, 56], p: [62, 11], blurb: 'Choose your strength for the grand finale.', badge: 'Horizon Champion' }
  ];
  CC.DIFF_NAMES = ['', 'Easy', 'Medium', 'Hard'];
  CC.MAX_STARS = CC.DEST.length * 3;

  /* ---------- Rewards ---------- */
  CC.SKINS = [
    { id: 'sun', name: 'Sunrise Wagon', c1: '#ffc43a', c2: '#ff7a00', need: 0 },
    { id: 'sunset', name: 'Sunset Wagon', c1: '#ff6fa8', c2: '#7a3fc0', need: 150 },
    { id: 'jungle', name: 'Jungle Wagon', c1: '#58d36f', c2: '#177a43', need: 500 },
    { id: 'star', name: 'Starlight Wagon', c1: '#7be3ff', c2: '#16307a', need: 1000 }
  ];
  CC.DECOR = [
    { id: 'palms', name: 'Palm Grove', need: 60, desc: 'Swaying palms appear on the map.' },
    { id: 'lighthouse', name: 'Lighthouse', need: 300, desc: 'A beacon guides the caravan home.' },
    { id: 'balloon', name: 'Hot-Air Balloon', need: 750, desc: 'A balloon drifts over the route.' },
    { id: 'fireworks', name: 'Festival Fireworks', need: 1400, desc: 'Sparks over the final horizon.' }
  ];
  CC.MILESTONES = [60, 150, 300, 500, 750, 1000, 1400];
  CC.BADGES = [
    { id: 'first', name: 'First Steps', desc: 'Finish your first challenge.', icon: 'flag' },
    { id: 'three', name: 'Triple Star', desc: 'Earn 3 stars on one challenge.', icon: 'star' },
    { id: 'streak3', name: 'Rolling Along', desc: 'Complete 3 challenges in a row.', icon: 'bolt' },
    { id: 'speed', name: 'Smooth Driver', desc: 'Finish Caravan Dash without losing a heart.', icon: 'heart' },
    { id: 'combo', name: 'Combo Collector', desc: 'Reach a x4 token combo in Dash.', icon: 'compass' },
    { id: 'pz', name: 'Master Mechanic', desc: 'Solve a Ruins Puzzle at or under par.', icon: 'puzzle' },
    { id: 'eye', name: 'Eagle Eye', desc: 'Finish Expedition Snap with every shot on target.', icon: 'camera' },
    { id: 'perfect', name: 'Perfect Frame', desc: 'Land 3 PERFECT snaps in total.', icon: 'target' },
    { id: 'better', name: 'Level Up', desc: 'Beat one of your own personal bests.', icon: 'trophy' },
    { id: 'half', name: 'Halfway There', desc: 'Unlock the 5th destination.', icon: 'map' },
    { id: 'champ', name: 'Horizon Champion', desc: 'Complete the whole journey.', icon: 'trophy' }
  ];
  CC.DEST.forEach(function (d) { CC.BADGES.push({ id: 'dest' + d.id, name: d.badge, desc: 'Clear ' + d.name + ' for the first time.', icon: 'flag', dest: d.id }); });

  /* Community demo crews (SIMULATED) — avg is the average per-member progress 0..1 at stage 0 */
  CC.DEMO_CREWS = [
    { name: 'Sunrise Scouts', members: 8, avg: 0.78 },
    { name: 'Harbor Hikers', members: 212, avg: 0.58 },
    { name: 'Trail Pals', members: 31, avg: 0.69 }
  ];
  CC.STAGE_CAP = 100; // max community contribution points per member per stage (anti-grind)

  CC.HOWTO = [
    { h: 'The Journey', p: 'Pick a destination on the World Map, play its challenge, and your result pushes the caravan toward the next one. Every finished challenge moves you forward — speed, puzzles and sharp eyes all count.' },
    { h: 'Journey Points', p: 'You earn points for finishing, for accuracy, for beating your own best and for streaks. Replaying an old stop earns a little, with bonuses only when you improve — no grinding needed.' },
    { h: 'Stars', p: 'Every challenge awards 1–3 stars. One star unlocks the next destination. Three stars earn a gold stamp.' }
  ];
})();
