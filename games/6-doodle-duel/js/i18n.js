/* DOODLE DUEL — English UI text. */
(function (root) {
  'use strict';
  var EN = {
    welcome: 'Welcome', howto: 'How to play', skip: 'Skip', play: 'Play', rooms: 'Rooms', settings: 'Settings', winner: 'Winner!', results: 'Results',
    again: 'Play again', create: 'Create room', join: 'Join room', private_note: 'Private rooms only. Share the code with friends to play together.',
    rounds: 'Rounds', timer: 'Timer', session_note: 'A full game takes about 2–4 minutes.', code: 'Room code', lobby: 'Lobby', ready: 'Ready', unready: 'Not ready', start: 'Start',
    character: 'Character', ok: 'OK', nick_note: 'Nicknames come from a safe list. No personal info needed.', audio: 'Audio', access: 'Accessibility', gameopts: 'Game',
    privacy: 'Privacy & safety', credits: 'Credits', mute: 'Mute all', unmute: 'Unmute', audio_note: 'The game is fully playable with sound off.',
    reduced: 'Reduced motion', contrast: 'High contrast', bigtext: 'Large text', language: 'Language', server: 'Online server', save: 'Save', reset: 'Reset data',
    stats: 'Best scores', report: 'Report / block', report_note: 'Pick a player. Reports are reviewed; blocking hides their reactions and drawings for you.',
    connecting: 'Connecting…', reconnecting: 'Reconnecting…', cancel: 'Cancel', oops: 'Oops!', retry: 'Retry', menu: 'Menu', next: 'Next', paused: 'Paused', resume: 'Resume',
    restart: 'Restart', yes: 'Yes', no: 'No',
    tut1h: 'Draw it!', tut1: 'You get a picture. Draw it using only 5 strokes before time runs out.',
    tut2h: 'Guess it!', tut2: 'Watch the doodle appear, then tap the icon that matches. One try only!',
    tut3h: 'Score big', tut3: 'Correct answers earn points, and faster answers earn a bonus. Clear drawings score too.',
    tut4h: 'Play with friends', tut4: 'Create a private room and share the code. No open chat, only safe reactions.',
    draw_this: 'Draw this', guess_this: 'Guess it', you_draw: 'You draw!', you_guess: 'Guess!', strokes_left: 'strokes left',
    r_correct: 'Correct!', r_wrong: 'Not quite', r_expired: "Time's up", r_identified: 'Rival got it!', r_missed: 'Rival missed it', r_empty: 'Empty canvas',
    r_over: 'Round over', rival_note: 'Practice rival is simulated.', speed: 'Speed', drawn: 'Drawn', clear: 'Clear', creative: 'Creative', round_no: 'Round',
    best: 'Best', new_best: 'New best!', score: 'Score',
    exit_q: 'Exit game?', exit_m: 'Return to the start screen?', quit_q: 'Leave game?', quit_m: 'Your progress in this game will be lost.',
    clear_q: 'Clear canvas?', clear_m: 'All strokes will be removed.', reset_q: 'Reset all data?', reset_m: 'Settings, scores and blocked players on this device will be erased.',
    leave_q: 'Leave room?', leave_m: 'You will leave this room.',
    copied: 'Copied!', invite: 'Join my DOODLE DUEL room', copy_fail: 'Could not copy. Select the code manually.',
    server_none: 'No online server is set. Add one in Settings → Game, or play Practice offline.', go_settings: 'Settings',
    e_url: 'That server address is not valid. Use wss:// (ws:// only for local testing).', e_connect: 'Could not reach the server. Check your connection and try again.',
    e_lost: 'Connection lost. The room could not be restored.', e_full: 'That room is full (6 players).', e_nocode: 'No room found with that code.',
    e_started: 'That game already started. Ask the host for a new room.', e_rate: 'Too many attempts. Please wait a moment.', e_bad: 'Something went wrong. Please try again.',
    e_maint: 'The server is under maintenance. Please try again later.', e_kicked: 'You were removed from the room by the host.', e_code: 'Enter the 5-character code.',
    e_host_left: 'The room was closed.', e_few: 'Not enough players. The game ended.',
    waiting_draw: 'is drawing…', waiting_players: 'Waiting for players…', waiting_host: 'Waiting for host…', waiting_end: 'Waiting for others…', locked: 'Answer locked in!',
    you: 'You', host: 'Host', wait_all_ready: 'Everyone must be ready', need_two: 'Need at least 2 players', joined: 'joined', left: 'left', away: 'reconnecting…',
    rematch: 'Back to lobby', slots: 'Players', empty_slot: 'Waiting…', reported: 'Report sent. Thank you!', blocked: 'Player blocked', unblocked: 'Player unblocked',
    block: 'Block', unblock: 'Unblock', kick: 'Remove', why0: 'Inappropriate drawing', why1: 'Mean behaviour', why2: 'Cheating', why3: 'Other', no_players: 'No other players yet.',
    stat_games: 'Games', stat_best: 'Best score', stat_correct: 'Correct guesses', stat_acc: 'Accuracy', short: 'Short', normal: 'Normal', long: 'Long', fail_url: 'Invalid address',
    saved: 'Saved', done_reset: 'Data reset', blocked_hint: 'Blocked player', hidden_drawing: 'Drawing hidden (blocked player)', ready_up: 'Press Ready!', hint_limit: '5 strokes max!',
    privacy_html: '<h3>Your data</h3><ul><li><b>Practice mode</b> works fully offline. No account, no sign-in.</li><li>Settings, best scores and your blocked list are stored <b>only on this device</b>.</li><li>No ads, no purchases, no analytics, no tracking.</li></ul><h3>Online rooms (optional)</h3><ul><li>Only when you create or join a room, the game connects to the room server.</li><li>It receives: your safe nickname and character, a random device code (not your identity), your drawing strokes and answers during a round.</li><li>Room data lives in server memory only while the room is open.</li><li>The game never uses your camera, microphone, contacts or location.</li></ul><h3>Staying safe</h3><ul><li>Rooms are private: only people with the code can join.</li><li>There is <b>no open text chat</b>. Players use nicknames from a safe list and preset reactions.</li><li>Use <b>Report / block</b> in the lobby or during a round. Hosts can remove players.</li><li>Automatic drawing checks are helpful but not perfect, so reports from players matter.</li><li>Never share personal information outside the game.</li></ul><h3>Ages</h3><ul><li>Made for ages 13 and up. Younger players should play with a parent or guardian.</li></ul>',
    credits_html: '<h3>DOODLE DUEL</h3><p>Version <b>__V__</b>. Free to play, no ads.</p><h3>Art & sound</h3><p>All characters, icons, wooden UI, music and sound effects are original and drawn or generated in code for this game.</p><h3>Logo</h3><p>The start-screen logo belongs to its owner.</p><h3>Open source</h3><p>Online server uses the <b>ws</b> WebSocket library (MIT License).</p><h3>Legal</h3><p>This game is provided as is. Please review local privacy and child-safety requirements before publishing.</p>'
  };
  function t(key, values) {
    var text = EN[key];
    if (text == null) return key;
    if (values) for (var name in values) text = text.split('{' + name + '}').join(values[name]);
    return text;
  }
  root.I18N = {
    t: t,
    al: function (text) { return text; },
    setLang: function () {},
    getLang: function () { return 'en'; },
    detect: function () { return 'en'; }
  };
})(typeof self !== 'undefined' ? self : this);
