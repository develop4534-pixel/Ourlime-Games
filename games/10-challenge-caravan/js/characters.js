/* CHALLENGE CARAVAN — procedural SVG adventurers + caravan wagon */
(function () {
  'use strict';
  var CC = window.CC;
  var INK = '#2a1608';

  var CREW = [
    { name: 'Mateo', skin: '#d9a066', hair: '#1d1209', style: 'short', cap: '#e53b30', top: '#d6342a', pants: '#3b4a6b', pack: '#8a6a34' },
    { name: 'Amara', skin: '#8a5a3a', hair: '#1a0f0a', style: 'puffs', cap: null, top: '#1f7ac9', pants: '#2c3e50', pack: '#a8692f' },
    { name: 'Lin', skin: '#f2cfa6', hair: '#2a1a14', style: 'long', cap: '#7a3fc0', top: '#6a2fb0', pants: '#33415c', pack: '#7a5a2a', glasses: true },
    { name: 'Sam', skin: '#b87a4b', hair: '#4a2a14', style: 'short', cap: '#3f6b3a', top: '#4c8a3c', pants: '#4a3a2a', pack: '#6b5a2a', freckles: true },
    { name: 'Rosa', skin: '#e8b48a', hair: '#dcdcdc', style: 'bun', cap: '#e8c46a', top: '#e8862a', pants: '#40506a', pack: '#9a6a34', hat: 'straw' }
  ];
  var uid = 0;

  function arms(o, pose) {
    var c = o.top, s = o.skin, st = "stroke-linecap='round' fill='none'";
    var L, R;
    if (pose === 'celebrate') { L = [36, 90, 16, 50]; R = [84, 90, 104, 50]; }
    else if (pose === 'point') { L = [36, 90, 28, 124]; R = [84, 90, 118, 74]; }
    else if (pose === 'map') { L = [36, 92, 50, 120]; R = [84, 92, 70, 120]; }
    else if (pose === 'ready') { L = [36, 90, 30, 112]; R = [84, 90, 90, 112]; }
    else { L = [36, 90, 27, 124]; R = [84, 90, 93, 124]; }
    function a(p) { return "<path class='arm' d='M" + p[0] + ' ' + p[1] + 'L' + p[2] + ' ' + p[3] + "' stroke='" + c + "' stroke-width='14' " + st + "/><circle cx='" + p[2] + "' cy='" + p[3] + "' r='7' fill='" + s + "' stroke='" + INK + "' stroke-width='2'/>"; }
    var extra = '';
    if (pose === 'map') extra = "<g transform='rotate(-6 60 128)'><rect x='38' y='112' width='44' height='30' rx='3' fill='#f5e2b0' stroke='" + INK + "' stroke-width='2.5'/><path d='M44 122l8 6 8-8 10 9M46 134h22' stroke='#c0392b' stroke-width='2' fill='none' stroke-linecap='round'/></g>";
    return a(L) + a(R) + extra;
  }
  function hairBack(o) {
    if (o.style === 'long') return "<path d='M34 50C30 90 38 98 44 98L44 60Z M86 50C90 90 82 98 76 98L76 60Z' fill='" + o.hair + "' stroke='" + INK + "' stroke-width='2.5'/>";
    return '';
  }
  function hairFront(o) {
    var h = o.hair;
    if (o.style === 'puffs') return "<circle cx='36' cy='36' r='11' fill='" + h + "'/><circle cx='84' cy='36' r='11' fill='" + h + "'/><circle cx='60' cy='24' r='15' fill='" + h + "'/><path d='M38 46Q60 18 82 46Q60 34 38 46Z' fill='" + h + "'/>";
    if (o.style === 'bun') return "<circle cx='60' cy='20' r='9' fill='" + h + "' stroke='" + INK + "' stroke-width='2'/><path d='M36 52Q36 26 60 26Q84 26 84 52Q72 38 60 38Q48 38 36 52Z' fill='" + h + "' stroke='" + INK + "' stroke-width='2'/>";
    if (o.style === 'long') return "<path d='M36 52Q36 26 60 26Q84 26 84 52Q70 36 60 40Q50 36 36 52Z' fill='" + h + "'/>";
    return "<path d='M36 50Q34 26 60 26Q86 26 84 50Q74 38 60 40Q46 38 36 50Z' fill='" + h + "'/>";
  }
  function headgear(o) {
    if (o.hat === 'straw') return "<ellipse cx='60' cy='36' rx='36' ry='8' fill='" + o.cap + "' stroke='" + INK + "' stroke-width='2.5'/><path d='M40 36Q42 12 60 12Q78 12 80 36Z' fill='" + o.cap + "' stroke='" + INK + "' stroke-width='2.5'/><rect x='41' y='28' width='38' height='6' fill='#c0392b'/>";
    if (o.cap) return "<path d='M35 46A25 25 0 0 1 85 46Z' fill='" + o.cap + "' stroke='" + INK + "' stroke-width='2.5'/><path d='M33 46h54a2 2 0 0 1 0 5H33a2 2 0 0 1 0-5z' fill='" + o.cap + "' stroke='" + INK + "' stroke-width='2.5'/><path d='M60 28l3 6-3 6-3-6z' fill='#fff'/>";
    return '';
  }

  var Characters = {
    crew: CREW,
    svg: function (i, pose, cls) {
      var o = CREW[((i % CREW.length) + CREW.length) % CREW.length];
      pose = pose || 'idle';
      var id = 'c' + (uid++);
      var face = "<ellipse cx='50' cy='56' rx='3.4' ry='4.4' fill='" + INK + "'/><ellipse cx='70' cy='56' rx='3.4' ry='4.4' fill='" + INK + "'/>" +
        "<circle cx='51.2' cy='54.4' r='1.3' fill='#fff'/><circle cx='71.2' cy='54.4' r='1.3' fill='#fff'/>" +
        "<path d='M50 66Q60 75 70 66' stroke='" + INK + "' stroke-width='3' fill='none' stroke-linecap='round'/>" +
        "<circle cx='44' cy='64' r='4' fill='#ff8a8a' opacity='.35'/><circle cx='76' cy='64' r='4' fill='#ff8a8a' opacity='.35'/>" +
        (o.glasses ? "<circle cx='50' cy='56' r='8' fill='rgba(255,255,255,.25)' stroke='" + INK + "' stroke-width='2.4'/><circle cx='70' cy='56' r='8' fill='rgba(255,255,255,.25)' stroke='" + INK + "' stroke-width='2.4'/><path d='M58 56h4' stroke='" + INK + "' stroke-width='2.4'/>" : '') +
        (o.freckles ? "<g fill='#7a4a2a' opacity='.6'><circle cx='46' cy='62' r='1'/><circle cx='50' cy='64' r='1'/><circle cx='70' cy='64' r='1'/><circle cx='74' cy='62' r='1'/></g>" : '');
      return "<svg class='char pose-" + pose + (cls ? ' ' + cls : '') + "' viewBox='0 0 120 172' role='img' aria-label='" + o.name + ", an adventurer' xmlns='http://www.w3.org/2000/svg'>" +
        "<ellipse class='shadow' cx='60' cy='168' rx='34' ry='5' fill='rgba(0,0,0,.28)'/>" +
        "<g class='bob'>" +
        "<rect x='30' y='80' width='60' height='56' rx='16' fill='" + o.pack + "' stroke='" + INK + "' stroke-width='3' transform='translate(0 -2)'/>" +
        "<rect x='40' y='138' width='18' height='28' rx='6' fill='" + o.pants + "' stroke='" + INK + "' stroke-width='3'/><rect x='62' y='138' width='18' height='28' rx='6' fill='" + o.pants + "' stroke='" + INK + "' stroke-width='3'/>" +
        "<rect x='37' y='160' width='24' height='9' rx='4.5' fill='#3a2410'/><rect x='59' y='160' width='24' height='9' rx='4.5' fill='#3a2410'/>" +
        hairBack(o) +
        "<path d='M32 92Q32 76 60 76Q88 76 88 92L90 142Q60 150 30 142Z' fill='" + o.top + "' stroke='" + INK + "' stroke-width='3'/>" +
        "<path d='M52 78Q60 92 68 78' fill='none' stroke='rgba(255,255,255,.55)' stroke-width='3'/><rect x='44' y='118' width='32' height='14' rx='5' fill='rgba(0,0,0,.14)'/>" +
        arms(o, pose) +
        "<circle cx='60' cy='54' r='25' fill='" + o.skin + "' stroke='" + INK + "' stroke-width='3'/>" +
        hairFront(o) + face + headgear(o) +
        '</g></svg>';
    },
    /* wagon: skin id -> colours */
    wagon: function (skinId) {
      var sk = CC.SKINS.filter(function (s) { return s.id === skinId; })[0] || CC.SKINS[0];
      var id = 'wg' + (uid++);
      return "<svg class='wagon' viewBox='0 0 100 76' aria-hidden='true' xmlns='http://www.w3.org/2000/svg'>" +
        "<defs><linearGradient id='" + id + "' x1='0' y1='0' x2='0' y2='1'><stop offset='0' stop-color='" + sk.c1 + "'/><stop offset='1' stop-color='" + sk.c2 + "'/></linearGradient></defs>" +
        "<ellipse cx='50' cy='72' rx='42' ry='4' fill='rgba(0,0,0,.28)'/>" +
        "<path d='M50 6V-2' stroke='" + INK + "' stroke-width='3'/><path d='M50 -2h14l-4 5 4 5H50z' fill='#e53b30' stroke='" + INK + "' stroke-width='2' transform='translate(0 4)'/>" +
        "<rect x='14' y='38' width='72' height='20' rx='6' fill='#8a5426' stroke='" + INK + "' stroke-width='3'/>" +
        "<path d='M12 40Q14 12 50 12Q86 12 88 40Z' fill='url(#" + id + ")' stroke='" + INK + "' stroke-width='3'/>" +
        "<path d='M30 40Q32 18 50 18M70 40Q68 18 50 18' fill='none' stroke='rgba(255,255,255,.55)' stroke-width='3'/>" +
        "<g class='wheel'><circle cx='30' cy='60' r='11' fill='#5a3410' stroke='" + INK + "' stroke-width='3'/><circle cx='30' cy='60' r='4' fill='#ffc43a'/><path d='M30 50v20M20 60h20' stroke='#ffc43a' stroke-width='2'/></g>" +
        "<g class='wheel'><circle cx='70' cy='60' r='11' fill='#5a3410' stroke='" + INK + "' stroke-width='3'/><circle cx='70' cy='60' r='4' fill='#ffc43a'/><path d='M70 50v20M60 60h20' stroke='#ffc43a' stroke-width='2'/></g>" +
        '</svg>';
    },
    crewHTML: function (poses) {
      var out = '';
      for (var i = 0; i < CREW.length; i++) out += "<div class='crew-m m" + i + "'>" + this.svg(i, (poses && poses[i]) || 'idle') + '</div>';
      return out;
    }
  };
  CC.Characters = Characters;
})();
