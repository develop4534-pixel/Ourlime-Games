/* DOODLE DUEL — UI text (English + Spanish). The game is icon-first; text is kept short. */
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
  var ES = {
    welcome: 'Bienvenido', howto: 'Cómo jugar', skip: 'Saltar', play: 'Jugar', rooms: 'Salas', settings: 'Ajustes', winner: '¡Ganador!', results: 'Resultados',
    again: 'Jugar otra vez', create: 'Crear sala', join: 'Unirse', private_note: 'Solo salas privadas. Comparte el código con tus amigos para jugar juntos.',
    rounds: 'Rondas', timer: 'Tiempo', session_note: 'Una partida completa dura unos 2–4 minutos.', code: 'Código de sala', lobby: 'Sala de espera', ready: 'Listo', unready: 'No listo', start: 'Iniciar',
    character: 'Personaje', ok: 'OK', nick_note: 'Los apodos salen de una lista segura. No se pide información personal.', audio: 'Audio', access: 'Accesibilidad', gameopts: 'Juego',
    privacy: 'Privacidad y seguridad', credits: 'Créditos', mute: 'Silenciar todo', unmute: 'Activar sonido', audio_note: 'El juego se puede jugar sin sonido.',
    reduced: 'Menos movimiento', contrast: 'Alto contraste', bigtext: 'Texto grande', language: 'Idioma', server: 'Servidor en línea', save: 'Guardar', reset: 'Borrar datos',
    stats: 'Mejores puntajes', report: 'Reportar / bloquear', report_note: 'Elige a un jugador. Los reportes se revisan; bloquear oculta sus reacciones y dibujos para ti.',
    connecting: 'Conectando…', reconnecting: 'Reconectando…', cancel: 'Cancelar', oops: '¡Uy!', retry: 'Reintentar', menu: 'Menú', next: 'Siguiente', paused: 'Pausa', resume: 'Continuar',
    restart: 'Reiniciar', yes: 'Sí', no: 'No',
    tut1h: '¡Dibújalo!', tut1: 'Recibes una imagen. Dibújala con solo 5 trazos antes de que se acabe el tiempo.',
    tut2h: '¡Adivínalo!', tut2: 'Mira cómo aparece el garabato y toca el ícono que coincide. ¡Solo un intento!',
    tut3h: 'Gana puntos', tut3: 'Las respuestas correctas dan puntos y las más rápidas dan bonus. Los dibujos claros también puntúan.',
    tut4h: 'Juega con amigos', tut4: 'Crea una sala privada y comparte el código. Sin chat abierto, solo reacciones seguras.',
    draw_this: 'Dibuja esto', guess_this: 'Adivina', you_draw: '¡Tú dibujas!', you_guess: '¡Adivina!', strokes_left: 'trazos restantes',
    r_correct: '¡Correcto!', r_wrong: 'Casi', r_expired: 'Se acabó el tiempo', r_identified: '¡El rival acertó!', r_missed: 'El rival falló', r_empty: 'Lienzo vacío',
    r_over: 'Fin de ronda', rival_note: 'El rival de práctica es simulado.', speed: 'Rapidez', drawn: 'Dibujo', clear: 'Claridad', creative: 'Creativo', round_no: 'Ronda',
    best: 'Mejor', new_best: '¡Nuevo récord!', score: 'Puntos',
    exit_q: '¿Salir del juego?', exit_m: '¿Volver a la pantalla de inicio?', quit_q: '¿Salir de la partida?', quit_m: 'Perderás el progreso de esta partida.',
    clear_q: '¿Borrar el lienzo?', clear_m: 'Se quitarán todos los trazos.', reset_q: '¿Borrar todos los datos?', reset_m: 'Se borrarán ajustes, puntajes y jugadores bloqueados de este dispositivo.',
    leave_q: '¿Salir de la sala?', leave_m: 'Dejarás esta sala.',
    copied: '¡Copiado!', invite: 'Únete a mi sala de DOODLE DUEL', copy_fail: 'No se pudo copiar. Selecciona el código a mano.',
    server_none: 'No hay servidor en línea. Añade uno en Ajustes → Juego o juega Práctica sin conexión.', go_settings: 'Ajustes',
    e_url: 'Esa dirección de servidor no es válida. Usa wss:// (ws:// solo para pruebas locales).', e_connect: 'No se pudo llegar al servidor. Revisa tu conexión e inténtalo de nuevo.',
    e_lost: 'Se perdió la conexión. No se pudo restaurar la sala.', e_full: 'Esa sala está llena (6 jugadores).', e_nocode: 'No hay ninguna sala con ese código.',
    e_started: 'Esa partida ya empezó. Pide al anfitrión una sala nueva.', e_rate: 'Demasiados intentos. Espera un momento.', e_bad: 'Algo salió mal. Inténtalo de nuevo.',
    e_maint: 'El servidor está en mantenimiento. Inténtalo más tarde.', e_kicked: 'El anfitrión te sacó de la sala.', e_code: 'Escribe el código de 5 caracteres.',
    e_host_left: 'La sala se cerró.', e_few: 'No hay suficientes jugadores. La partida terminó.',
    waiting_draw: 'está dibujando…', waiting_players: 'Esperando jugadores…', waiting_host: 'Esperando al anfitrión…', waiting_end: 'Esperando a los demás…', locked: '¡Respuesta enviada!',
    you: 'Tú', host: 'Anfitrión', wait_all_ready: 'Todos deben estar listos', need_two: 'Se necesitan al menos 2 jugadores', joined: 'entró', left: 'salió', away: 'reconectando…',
    rematch: 'Volver a la sala', slots: 'Jugadores', empty_slot: 'Esperando…', reported: 'Reporte enviado. ¡Gracias!', blocked: 'Jugador bloqueado', unblocked: 'Jugador desbloqueado',
    block: 'Bloquear', unblock: 'Desbloquear', kick: 'Quitar', why0: 'Dibujo inapropiado', why1: 'Mal comportamiento', why2: 'Trampa', why3: 'Otro', no_players: 'Aún no hay otros jugadores.',
    stat_games: 'Partidas', stat_best: 'Mejor puntaje', stat_correct: 'Aciertos', stat_acc: 'Precisión', short: 'Corto', normal: 'Normal', long: 'Largo', fail_url: 'Dirección no válida',
    saved: 'Guardado', done_reset: 'Datos borrados', blocked_hint: 'Jugador bloqueado', hidden_drawing: 'Dibujo oculto (jugador bloqueado)', ready_up: '¡Pulsa Listo!', hint_limit: '¡Máximo 5 trazos!',
    privacy_html: '<h3>Tus datos</h3><ul><li>El <b>modo Práctica</b> funciona sin conexión. Sin cuenta ni registro.</li><li>Ajustes, mejores puntajes y tu lista de bloqueados se guardan <b>solo en este dispositivo</b>.</li><li>Sin anuncios, sin compras, sin analíticas, sin rastreo.</li></ul><h3>Salas en línea (opcional)</h3><ul><li>Solo cuando creas o te unes a una sala, el juego se conecta al servidor de salas.</li><li>Recibe: tu apodo seguro y personaje, un código aleatorio del dispositivo (no tu identidad), tus trazos y respuestas durante la ronda.</li><li>Los datos de la sala viven en la memoria del servidor solo mientras la sala está abierta.</li><li>El juego nunca usa tu cámara, micrófono, contactos ni ubicación.</li></ul><h3>Mantente seguro</h3><ul><li>Las salas son privadas: solo entra quien tiene el código.</li><li>No hay <b>chat de texto abierto</b>. Se usan apodos de una lista segura y reacciones predefinidas.</li><li>Usa <b>Reportar / bloquear</b> en la sala o durante una ronda. Los anfitriones pueden quitar jugadores.</li><li>Las revisiones automáticas de dibujos ayudan, pero no son perfectas; por eso importan los reportes.</li><li>Nunca compartas información personal fuera del juego.</li></ul><h3>Edades</h3><ul><li>Pensado para mayores de 13 años. Los menores deben jugar con un adulto.</li></ul>',
    credits_html: '<h3>DOODLE DUEL</h3><p>Versión <b>__V__</b>. Gratis, sin anuncios.</p><h3>Arte y sonido</h3><p>Todos los personajes, íconos, interfaz de madera, música y efectos son originales, dibujados o generados en código para este juego.</p><h3>Logo</h3><p>El logo de la pantalla de inicio pertenece a su propietario.</p><h3>Código abierto</h3><p>El servidor en línea usa la librería WebSocket <b>ws</b> (licencia MIT).</p><h3>Legal</h3><p>Este juego se ofrece tal cual. Revisa los requisitos locales de privacidad y seguridad infantil antes de publicarlo.</p>'
  };
  var AL = { 'Previous': 'Anterior', 'Next': 'Siguiente', 'Back': 'Atrás', 'Pause': 'Pausa', 'Undo': 'Deshacer', 'Clear': 'Borrar', 'Done': 'Listo', 'Exit': 'Salir', 'Character': 'Personaje', 'Best scores': 'Mejores puntajes', 'Copy code': 'Copiar código', 'Share invite': 'Compartir invitación', 'Leave': 'Salir', 'Menu': 'Menú', 'Edit profile': 'Editar perfil', 'Room code': 'Código de sala', 'Report or block': 'Reportar o bloquear', 'Privacy and safety': 'Privacidad y seguridad', 'How to play': 'Cómo jugar', 'Drawing canvas': 'Lienzo de dibujo', 'Colours': 'Colores', 'Brush size': 'Tamaño del pincel' };
  var lang = 'en';
  function t(k, v) {
    var s = (lang === 'es' && ES[k] != null ? ES[k] : EN[k]);
    if (s == null) return k;
    if (v) for (var x in v) s = s.split('{' + x + '}').join(v[x]);
    return s;
  }
  function al(s) { return lang === 'es' && AL[s] ? AL[s] : s; }
  root.I18N = { t: t, al: al, setLang: function (l) { lang = l === 'es' ? 'es' : 'en'; }, getLang: function () { return lang; }, detect: function () { var n = (navigator.language || 'en').toLowerCase(); return n.indexOf('es') === 0 ? 'es' : 'en'; } };
})(typeof self !== 'undefined' ? self : this);
