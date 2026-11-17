/* DOODLE DUEL — original vector art: UI glyphs, prompt icons wrapper and the two doodle characters. */
(function (root) {
  'use strict';
  var ICO_STYLE = 'fill="currentColor"';
  var UI = {
    play: '<path d="M7 4.5v15l13-7.5z"/>',
    pause: '<rect x="5.5" y="4.5" width="4.6" height="15" rx="1.4"/><rect x="13.9" y="4.5" width="4.6" height="15" rx="1.4"/>',
    home: '<path d="M12 3L2 12h3v8h5v-5.5h4V20h5v-8h3z"/>',
    gear: '<path d="M10.2 2h3.6l.6 2.7 1.7.7 2.3-1.5 2.5 2.5-1.5 2.3.7 1.7 2.7.6v3.6l-2.7.6-.7 1.7 1.5 2.3-2.5 2.5-2.3-1.5-1.7.7-.6 2.7h-3.6l-.6-2.7-1.7-.7-2.3 1.5-2.5-2.5 1.5-2.3-.7-1.7L2 13.8v-3.6l2.7-.6.7-1.7-1.5-2.3 2.5-2.5 2.3 1.5 1.7-.7zM12 8.6a3.4 3.4 0 100 6.8 3.4 3.4 0 000-6.8z" fill-rule="evenodd"/>',
    back: '<path d="M3 12l8-8v5h10v6H11v5z"/>',
    close: '<path d="M5 3.5L12 10.5l7-7L20.5 5l-7 7 7 7-1.5 1.5-7-7-7 7L3.5 19l7-7-7-7z"/>',
    check: '<path d="M2.5 13l3-3 4 4L18.5 5l3 3-12 12z"/>',
    retry: '<path d="M12 3a9 9 0 108.5 6h-3.2A6 6 0 1112 6V10l6-5-6-5z" transform="translate(0 2) scale(1 .92)"/>',
    undo: '<path d="M9 4L2.5 10 9 16v-4c5 0 8 1.4 10 5.5-.5-6-4-10-10-10.2z"/>',
    trash: '<path d="M8 3h8l1 2h4v2.2H3V5h4zM5 9h14l-1.2 12H6.2z"/>',
    info: '<circle cx="12" cy="5.2" r="2.4"/><path d="M9.2 9.5h5.6V19h2.2v2.5H7V19h2.2v-6.8H7.8z"/>',
    question: '<path d="M8 8.2C8 5.5 9.8 4 12.2 4c2.600 0 4.300 1.500 4.300 3.600 0 1.700-.9 2.500-2.200 3.400-.9.600-1.200 1-1.200 2.100V13.600h-2.800v-1.300c0-1.800.7-2.800 2-3.700 1-.7 1.300-1.100 1.300-1.800 0-.8-.6-1.300-1.500-1.300-1 0-1.600.6-1.600 1.700zM10.500 16h3v3h-3z"/>',
    sound: '<path d="M3 9.500h4l5-4.500v14l-5-4.500H3z"/><path d="M15 8.500a5 5 0 010 7M17.500 5.500a9 9 0 010 13" fill="none" stroke="currentColor" stroke-width="2.200" stroke-linecap="round"/>',
    mute: '<path d="M3 9.500h4l5-4.500v14l-5-4.500H3z"/><path d="M15 9.500l6 6M21 9.500l-6 6" fill="none" stroke="currentColor" stroke-width="2.400" stroke-linecap="round"/>',
    music: '<path d="M9 4.500l11-2v13.300a3.300 3.300 0 11-2.200-3.100V6.600L11 8v10.300a3.300 3.300 0 11-2-3.100z"/>',
    plus: '<path d="M10 4h4v6h6v4h-6v6h-4v-6H4v-4h6z"/>',
    minus: '<rect x="4" y="10" width="16" height="4.200" rx="1"/>',
    star: '<path d="M12 2l3 6.600 7.200.8-5.400 4.800 1.600 7.100L12 17.600 5.600 21.300l1.600-7.100L1.800 9.400 9 8.600z"/>',
    trophy: '<path d="M6 3h12v4.500c0 3.300-2.200 5.700-5 6.300V17h3.500v2.500H7.500V17H11v-3.200c-2.800-.6-5-3-5-6.300zM3 5h3v2.600c0 1.400.6 2.200 1.500 2.800C5 10.400 3 8.700 3 6zM21 5h-3v2.600c0 1.400-.6 2.200-1.500 2.800C19 10.400 21 8.700 21 6z"/>',
    flag: '<path d="M5 2h2v20H5zM8 3h12l-3 4.500L20 12H8z"/>',
    block: '<path d="M12 2a10 10 0 100 20 10 10 0 000-20zm0 3.400a6.600 6.600 0 015.300 10.500L7.100 6.700A6.600 6.600 0 0112 5.400zm0 13.200a6.600 6.600 0 01-5.300-10.500l10.200 9.200A6.600 6.600 0 0112 18.600z" fill-rule="evenodd"/>',
    user: '<circle cx="12" cy="7.500" r="4.500"/><path d="M3 21c0-5 4-7.500 9-7.500s9 2.500 9 7.500z"/>',
    users: '<circle cx="8.500" cy="8" r="3.800"/><circle cx="17" cy="9" r="3"/><path d="M1.500 20c0-4.300 3.200-6.500 7-6.500s7 2.200 7 6.500zM16 14.200c3.200 0 6.500 1.700 6.500 5.800H17c0-2.200-.4-4-1-5.800z"/>',
    share: '<circle cx="18" cy="5" r="3.200"/><circle cx="6" cy="12" r="3.200"/><circle cx="18" cy="19" r="3.200"/><path d="M7.500 10.700l9-4.700M7.500 13.300l9 4.700" stroke="currentColor" stroke-width="2" fill="none"/>',
    copy: '<path d="M8 2h11v14H8zM4 6h2.500v12.500H16V21H4z"/>',
    shield: '<path d="M12 2l8.500 3v6.500c0 5-3.600 8.800-8.500 10.500-4.900-1.700-8.500-5.500-8.500-10.500V5z"/><path d="M8 12l3 3 5-6" fill="none" stroke="#fff" stroke-width="2.200" stroke-linecap="round" stroke-linejoin="round" opacity=".85"/>',
    list: '<rect x="4" y="5" width="16" height="3" rx="1.200"/><rect x="4" y="10.500" width="16" height="3" rx="1.200"/><rect x="4" y="16" width="16" height="3" rx="1.200"/>',
    crown: '<path d="M3 18.500V7l5 4.500L12 4l4 7.500L21 7v11.500z"/><rect x="3" y="19.500" width="18" height="2.500" rx="1"/>',
    clock: '<circle cx="12" cy="12.500" r="9" fill="none" stroke="currentColor" stroke-width="3"/><path d="M12 7v6l4 2.500" fill="none" stroke="currentColor" stroke-width="2.800" stroke-linecap="round"/>',
    eye: '<path d="M12 5C6 5 2 12 2 12s4 7 10 7 10-7 10-7-4-7-10-7zm0 3.500a3.500 3.500 0 110 7 3.500 3.500 0 010-7z" fill-rule="evenodd"/>',
    brush: '<path d="M20.500 2.500c1.500 1.500-.6 5.600-6.800 11l-3-3C16 4.400 19 1 20.500 2.500zM9 12l3 3c0 3-2.300 6-7 6.500 1.500-1.800.5-3.500 1.300-5.300C7 14 7.800 12.500 9 12z"/>',
    heart: '<path d="M12 21C4 15 2 10 4.500 6.500 6.500 4 10 4.500 12 8c2-3.500 5.500-4 7.500-1.500C22 10 20 15 12 21z"/>',
    bolt: '<path d="M13 2L4 14h6l-1.500 8L19 9.500h-6.500z"/>',
    thumb: '<path d="M2 10h4v11H2zM8 10l4-8c1.800 0 3 1.200 2.600 3L14 8.500h6c1.300 0 2.200 1.200 1.900 2.400l-1.900 8.200c-.3 1.100-1.200 1.900-2.400 1.900H8z"/>',
    fire: '<path d="M12 22c-4.500 0-7.500-3-7.500-7 0-3.500 2.500-5.500 3.500-8 1.500 1 2 2.200 2.200 3.300C11.500 8 12.500 5 11.500 2 16 4 19.500 8.500 19.500 14.500c0 4.500-3 7.500-7.500 7.500z"/>',
    wow: '<circle cx="12" cy="12" r="10"/><circle cx="8.500" cy="9.500" r="1.600" fill="#fff"/><circle cx="15.500" cy="9.500" r="1.600" fill="#fff"/><ellipse cx="12" cy="16.200" rx="2.500" ry="3" fill="#fff"/>',
    think: '<circle cx="12" cy="12" r="10"/><circle cx="8.500" cy="10" r="1.500" fill="#fff"/><circle cx="15.500" cy="10" r="1.500" fill="#fff"/><path d="M8 16.500h8" stroke="#fff" stroke-width="2" stroke-linecap="round"/>',
    smile: '<circle cx="12" cy="12" r="10"/><circle cx="8.500" cy="9.500" r="1.600" fill="#fff"/><circle cx="15.500" cy="9.500" r="1.600" fill="#fff"/><path d="M7.500 14c1 3.500 8 3.500 9 0z" fill="#fff"/>'
  };

  function ui(name, cls) {
    return '<svg class="ico ' + (cls || '') + '" viewBox="0 0 24 24" aria-hidden="true" focusable="false" ' + ICO_STYLE + '>' + (UI[name] || '') + '</svg>';
  }
  function promptIcon(id, cls) {
    var d = root.DD && root.DD.ICONS[id];
    return '<svg class="pic ' + (cls || '') + '" viewBox="0 0 100 100" aria-hidden="true" focusable="false">' + (d || '') + '</svg>';
  }

  /* ───────── the two original doodle characters ─────────
     kind 0 = blue (confident, energetic) · kind 1 = red (competitive, playful)
     states are CSS classes on the wrapper: st-idle | st-win | st-sad | st-react */
  var PAL = [
    { main: '#1e7bff', dark: '#0b3fb8', light: '#4fe3ff', glow: '#00d5ff' },
    { main: '#ff3a2e', dark: '#b3140d', light: '#ff9a3c', glow: '#ff7a1c' }
  ];
  var uid = 0;
  function char(kind, state, opts) {
    opts = opts || {};
    var p = PAL[kind === 1 ? 1 : 0], id = 'c' + (++uid), flip = opts.flip ? ' flip' : '';
    var k = kind === 1 ? 'red' : 'blue';
    var brow = kind === 1
      ? '<path class="brow" d="M66 52 L92 62 M134 52 L108 62" />'
      : '<path class="brow" d="M66 60 L92 54 M134 60 L108 54" />';
    return '<div class="char ' + k + ' st-' + (state || 'idle') + flip + '" role="img" aria-label="' + (opts.label || (kind === 1 ? 'Red doodle fighter' : 'Blue doodle fighter')) + '">' +
      '<svg viewBox="0 -14 200 264" class="char-svg" focusable="false" aria-hidden="true">' +
      '<defs><radialGradient id="' + id + 'g" cx="35%" cy="30%" r="80%"><stop offset="0" stop-color="' + p.light + '"/><stop offset="1" stop-color="' + p.main + '"/></radialGradient></defs>' +
      '<ellipse class="shadow" cx="100" cy="240" rx="52" ry="8" fill="#000" opacity=".22"/>' +
      '<g class="bob">' +
        /* legs */
        '<g class="legs" fill="none" stroke-linecap="round" stroke-linejoin="round">' +
          '<path d="M90 176 L72 232 M110 176 L128 232" stroke="#111" stroke-width="22"/>' +
          '<path d="M90 176 L72 232 M110 176 L128 232" stroke="' + p.main + '" stroke-width="13"/>' +
        '</g>' +
        /* torso */
        '<g fill="none" stroke-linecap="round"><path d="M100 118 L100 176" stroke="#111" stroke-width="34"/><path d="M100 118 L100 176" stroke="' + p.main + '" stroke-width="24"/></g>' +
        /* arms: resting set + raised set (toggled by state) */
        '<g class="arms rest" fill="none" stroke-linecap="round" stroke-linejoin="round">' +
          '<path d="M86 132 L52 168" stroke="#111" stroke-width="20"/><path d="M86 132 L52 168" stroke="' + p.main + '" stroke-width="11"/>' +
          '<g class="marker-arm"><path d="M114 132 L150 152" stroke="#111" stroke-width="20"/><path d="M114 132 L150 152" stroke="' + p.main + '" stroke-width="11"/>' +
          '<g transform="translate(150 152) rotate(-35)"><rect x="-6" y="-34" width="12" height="40" rx="4" fill="' + p.main + '" stroke="#111" stroke-width="4"/><rect x="-6" y="-34" width="12" height="9" rx="3" fill="' + p.light + '" stroke="#111" stroke-width="3"/><path d="M-4 6 L0 15 L4 6z" fill="#222" stroke="#111" stroke-width="2"/></g>' +
          '<circle cx="150" cy="152" r="10" fill="' + p.main + '" stroke="#111" stroke-width="4"/></g>' +
          '<circle cx="52" cy="168" r="10" fill="' + p.main + '" stroke="#111" stroke-width="4"/>' +
        '</g>' +
        '<g class="arms up" fill="none" stroke-linecap="round" stroke-linejoin="round">' +
          '<path d="M86 130 L50 84" stroke="#111" stroke-width="20"/><path d="M86 130 L50 84" stroke="' + p.main + '" stroke-width="11"/><circle cx="48" cy="80" r="11" fill="' + p.main + '" stroke="#111" stroke-width="4"/>' +
          '<path d="M114 130 L150 84" stroke="#111" stroke-width="20"/><path d="M114 130 L150 84" stroke="' + p.main + '" stroke-width="11"/><circle cx="152" cy="80" r="11" fill="' + p.main + '" stroke="#111" stroke-width="4"/>' +
        '</g>' +
        /* head */
        '<g class="head">' +
          '<circle cx="100" cy="76" r="54" fill="#111"/><circle cx="100" cy="76" r="49" fill="url(#' + id + 'g)"/><circle cx="100" cy="78" r="39" fill="#fff"/>' +
          '<ellipse cx="82" cy="63" rx="12" ry="6" fill="#fff" opacity=".7" transform="rotate(-25 82 63)"/>' +
          '<g class="eyes"><g class="eye l"><ellipse cx="82" cy="82" rx="8" ry="12" fill="#111"/><circle cx="85" cy="77" r="3.200" fill="#fff"/></g><g class="eye r"><ellipse cx="118" cy="82" rx="8" ry="12" fill="#111"/><circle cx="121" cy="77" r="3.200" fill="#fff"/></g></g>' +
          '<g class="brows" fill="none" stroke="#111" stroke-width="6" stroke-linecap="round" transform="translate(0 6)">' + brow + '</g>' +
          '<path class="mouth m-idle" d="M88 104 Q100 108 112 104" fill="none" stroke="#111" stroke-width="5" stroke-linecap="round"/>' +
          '<path class="mouth m-win" d="M84 98 Q100 122 116 98 Z" fill="#111" stroke="#111" stroke-width="4" stroke-linejoin="round"/>' +
          '<path class="mouth m-sad" d="M88 110 Q100 98 112 110" fill="none" stroke="#111" stroke-width="5" stroke-linecap="round"/>' +
          '<path class="mouth m-react" d="M100 100 a7 9 0 1 0 .1 0z" fill="#111"/>' +
        '</g>' +
        '<g class="crown-g"><path d="M70 30 L74 6 L88 20 L100 -2 L112 20 L126 6 L130 30 Z" fill="#ffd23f" stroke="#111" stroke-width="5" stroke-linejoin="round"/><rect x="70" y="28" width="60" height="9" rx="3" fill="#ffb300" stroke="#111" stroke-width="4"/></g>' +
      '</g></svg></div>';
  }

  function stars(n, max) {
    var s = '';
    for (var i = 0; i < (max || 3); i++) s += '<span class="star' + (i < n ? ' on' : '') + '" style="--i:' + i + '">' + ui('star') + '</span>';
    return s;
  }

  root.ART = { ui: ui, UI: UI, promptIcon: promptIcon, char: char, stars: stars, PAL: PAL };
})(typeof self !== 'undefined' ? self : this);
