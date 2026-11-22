'use strict';

const crypto = require('node:crypto');
const http = require('node:http');
const { WebSocket, WebSocketServer } = require('ws');
const D = require('../js/core.js');

const ROOM_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const TIMER_SECONDS = [[20, 15], [30, 25], [45, 35]];
const RECONNECT_GRACE_MS = 20_000;
const EMPTY_ROOM_TTL_MS = 60_000;
const MAX_ROOMS = 1000;
const MESSAGE_WINDOW_MS = 10_000;
const MAX_MESSAGES_PER_WINDOW = 120;
const MAX_MESSAGE_BYTES = 30_000;
const MAX_POINTS_PER_STROKE_MESSAGE = 64;

function randomToken() {
  return crypto.randomBytes(32).toString('base64url');
}

function randomRoomCode() {
  let code = '';
  for (let i = 0; i < 5; i++) {
    code += ROOM_CODE_ALPHABET[crypto.randomInt(ROOM_CODE_ALPHABET.length)];
  }
  return code;
}

function parseAllowedOrigins(value) {
  if (Array.isArray(value)) return new Set(value);
  if (typeof value !== 'string' || !value.trim()) return new Set();
  return new Set(value.split(',').map((origin) => origin.trim()).filter(Boolean));
}

function createServer(options = {}) {
  const rooms = new Map();
  const clients = new Set();
  const allowedOrigins = parseAllowedOrigins(
    options.allowedOrigins === undefined ? process.env.ALLOWED_ORIGINS : options.allowedOrigins
  );
  const resultDelayMs = Number.isInteger(options.resultDelayMs) ? options.resultDelayMs : 4000;
  const reconnectGraceMs = Number.isInteger(options.reconnectGraceMs)
    ? options.reconnectGraceMs
    : RECONNECT_GRACE_MS;
  const emptyRoomTtlMs = Number.isInteger(options.emptyRoomTtlMs)
    ? options.emptyRoomTtlMs
    : EMPTY_ROOM_TTL_MS;

  const httpServer = http.createServer((request, response) => {
    const pathname = new URL(request.url, 'http://localhost').pathname;
    if (request.method === 'GET' && (pathname === '/' || pathname === '/health')) {
      response.writeHead(200, { 'content-type': 'application/json; charset=utf-8' });
      response.end(JSON.stringify({ ok: true, service: 'doodle-duel-server' }));
      return;
    }

    response.writeHead(404, { 'content-type': 'application/json; charset=utf-8' });
    response.end(JSON.stringify({ error: 'Not found' }));
  });

  const webSocketServer = new WebSocketServer({
    noServer: true,
    maxPayload: MAX_MESSAGE_BYTES
  });

  httpServer.on('upgrade', (request, socket, head) => {
    let pathname;
    try {
      pathname = new URL(request.url, 'http://localhost').pathname;
    } catch {
      socket.destroy();
      return;
    }

    if (pathname !== '/ws') {
      socket.write('HTTP/1.1 404 Not Found\r\nConnection: close\r\n\r\n');
      socket.destroy();
      return;
    }

    const origin = request.headers.origin;
    if (allowedOrigins.size && origin && !allowedOrigins.has(origin)) {
      socket.write('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n');
      socket.destroy();
      return;
    }

    webSocketServer.handleUpgrade(request, socket, head, (webSocket) => {
      webSocketServer.emit('connection', webSocket, request);
    });
  });

  function send(client, message) {
    if (client && client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(JSON.stringify(message));
    }
  }

  function sendError(client, code) {
    send(client, { t: 'err', code });
  }

  function clearTimer(timer) {
    if (timer) clearTimeout(timer);
  }

  function publicPlayer(player) {
    return {
      id: player.id,
      n: player.n,
      ch: player.ch,
      score: player.score,
      ready: player.ready,
      on: player.on,
      k: player.k
    };
  }

  function roomView(room) {
    return {
      t: 'room',
      code: room.code,
      host: room.host,
      phase: room.phase,
      rounds: room.rounds,
      timer: room.timer,
      players: room.players.map(publicPlayer)
    };
  }

  function sendRoom(room) {
    const message = roomView(room);
    room.players.forEach((player) => {
      if (player.on && player.client) send(player.client, message);
    });
  }

  function sendRoomError(room, code, exceptId) {
    room.players.forEach((player) => {
      if (player.id !== exceptId && player.on && player.client) {
        sendError(player.client, code);
        player.client.ws.close(1000, code);
      }
    });
  }

  function clearRoomTimers(room) {
    clearTimer(room.roundTimer);
    clearTimer(room.resultTimer);
    clearTimer(room.cleanupTimer);
    room.players.forEach((player) => clearTimer(player.disconnectTimer));
  }

  function deleteRoom(room) {
    clearRoomTimers(room);
    rooms.delete(room.code);
    room.players.forEach((player) => {
      if (player.client) {
        player.client.room = null;
        player.client.player = null;
      }
      player.client = null;
      player.on = false;
    });
  }

  function closeRoom(room, code, exceptId) {
    sendRoomError(room, code, exceptId);
    deleteRoom(room);
  }

  function closeIfEmpty(room) {
    const connected = room.players.some((player) => player.on && player.client);
    if (connected) {
      clearTimer(room.cleanupTimer);
      room.cleanupTimer = null;
      return;
    }

    clearTimer(room.cleanupTimer);
    room.cleanupTimer = setTimeout(() => {
      if (!room.players.some((player) => player.on && player.client)) deleteRoom(room);
    }, emptyRoomTtlMs);
    if (room.cleanupTimer.unref) room.cleanupTimer.unref();
  }

  function safeProfile(message) {
    const parts = Array.isArray(message.n) ? message.n : [];
    const first = Number.isInteger(parts[0]) && parts[0] >= 0 && parts[0] < D.NICK_A.length ? parts[0] : 0;
    const second = Number.isInteger(parts[1]) && parts[1] >= 0 && parts[1] < D.NICK_B.length ? parts[1] : 0;
    const character = Number.isInteger(message.ch) && (message.ch === 0 || message.ch === 1)
      ? message.ch
      : 0;
    const uid = typeof message.u === 'string' && /^[a-f0-9]{16}$/i.test(message.u)
      ? message.u.toLowerCase()
      : crypto.randomBytes(8).toString('hex');
    return { n: [first, second], ch: character, k: uid };
  }

  function makePlayer(client) {
    return {
      id: client.id,
      token: client.token,
      n: client.profile.n,
      ch: client.profile.ch,
      k: client.profile.k,
      score: 0,
      ready: false,
      on: true,
      client,
      disconnectTimer: null
    };
  }

  function attachPlayer(client, room, player) {
    clearTimer(player.disconnectTimer);
    player.disconnectTimer = null;
    clearTimer(room.cleanupTimer);
    room.cleanupTimer = null;
    player.on = true;
    player.client = client;
    client.id = player.id;
    client.player = player;
    client.room = room;
    client.intentHandled = true;
  }

  function findRoomCode() {
    for (let i = 0; i < 40; i++) {
      const code = randomRoomCode();
      if (!rooms.has(code)) return code;
    }
    return null;
  }

  function removePlayer(room, player, errorCode) {
    if (!room || !player || !room.players.includes(player)) return;
    clearTimer(player.disconnectTimer);
    player.disconnectTimer = null;

    if (player.client) {
      const client = player.client;
      client.room = null;
      client.player = null;
      player.client = null;
      player.on = false;
      if (errorCode) {
        sendError(client, errorCode);
        client.ws.close(1000, errorCode);
      }
    }

    room.players = room.players.filter((current) => current !== player);
    if (!room.players.length) {
      deleteRoom(room);
      return;
    }

    if (room.phase === 'playing' && room.players.filter((current) => current.on).length < D.CONFIG.MIN_PLAYERS) {
      closeRoom(room, 'few');
      return;
    }

    sendRoom(room);
    closeIfEmpty(room);
    resolveWhenEveryoneAnswered(room);
  }

  function disconnectPlayer(client) {
    const room = client.room;
    const player = client.player;
    if (!room || !player || player.client !== client) return;

    client.room = null;
    client.player = null;
    player.client = null;
    player.on = false;
    sendRoom(room);
    closeIfEmpty(room);

    player.disconnectTimer = setTimeout(() => {
      if (!player.on && room.players.includes(player)) {
        if (player.id === room.host) {
          closeRoom(room, 'closed');
        } else {
          removePlayer(room, player);
        }
      }
    }, reconnectGraceMs);
    if (player.disconnectTimer.unref) player.disconnectTimer.unref();
    resolveWhenEveryoneAnswered(room);
  }

  function handleHello(client, message) {
    client.ready = true;
    client.profile = safeProfile(message);
    const resume = message.resume;

    if (resume && typeof resume.room === 'string' && typeof resume.token === 'string') {
      const room = rooms.get(resume.room);
      const player = room && room.players.find((candidate) => candidate.token === resume.token);
      if (!room || !player || player.on) {
        sendError(client, 'noresume');
        client.ws.close(1000, 'noresume');
        return;
      }

      if (player.client && player.client !== client) {
        const oldClient = player.client;
        oldClient.room = null;
        oldClient.player = null;
        oldClient.ws.close(4001, 'replaced');
      }

      attachPlayer(client, room, player);
      send(client, { t: 'welcome', id: player.id, token: player.token, resumed: true });
      sendRoom(room);
      sendResumeState(room, player);
      return;
    }

    send(client, { t: 'welcome', id: client.id, token: client.token, resumed: false });
  }

  function createRoom(client, intent) {
    if (rooms.size >= MAX_ROOMS) {
      sendError(client, 'full');
      return;
    }
    if (![4, 6, 8].includes(intent.rounds) || !Number.isInteger(intent.timer) || intent.timer < 0 || intent.timer > 2) {
      sendError(client, 'bad');
      return;
    }

    const code = findRoomCode();
    if (!code) {
      sendError(client, 'full');
      return;
    }

    const room = {
      code,
      host: null,
      players: [],
      phase: 'lobby',
      rounds: intent.rounds,
      timer: intent.timer,
      roundIndex: -1,
      prompts: [],
      currentRound: null,
      roundTimer: null,
      resultTimer: null,
      cleanupTimer: null,
      lastEnd: null,
      finalBoard: null
    };
    const player = makePlayer(client);
    player.ready = true;
    room.host = player.id;
    room.players.push(player);
    rooms.set(code, room);
    attachPlayer(client, room, player);
    sendRoom(room);
  }

  function joinRoom(client, intent) {
    if (typeof intent.code !== 'string' || !/^[A-HJ-NP-Z2-9]{5}$/.test(intent.code)) {
      sendError(client, 'nocode');
      return;
    }

    const room = rooms.get(intent.code);
    if (!room) {
      sendError(client, 'nocode');
      return;
    }
    if (room.phase !== 'lobby') {
      sendError(client, 'started');
      return;
    }
    if (room.players.length >= D.CONFIG.MAX_PLAYERS) {
      sendError(client, 'full');
      return;
    }

    const player = makePlayer(client);
    room.players.push(player);
    attachPlayer(client, room, player);
    sendRoom(room);
  }

  function broadcast(room, message, exceptId) {
    room.players.forEach((player) => {
      if (player.id !== exceptId && player.on && player.client) send(player.client, message);
    });
  }

  function roundPayload(room, player) {
    const round = room.currentRound;
    const drawer = player.id === round.drawerId;
    const elapsed = Date.now() - round.startedAt;
    const remaining = Math.max(0, round.durationMs - elapsed);
    const message = {
      t: 'round',
      n: room.roundIndex + 1,
      of: room.rounds,
      ms: remaining,
      you: drawer ? 'draw' : 'guess',
      drawer: round.drawerId
    };
    if (drawer) message.prompt = round.prompt;
    else message.choices = round.choices.ids;
    return message;
  }

  function sendRound(room) {
    room.players.forEach((player) => {
      if (player.on && player.client) send(player.client, roundPayload(room, player));
    });
  }

  function sendResumeState(room, player) {
    if (room.phase === 'over') {
      send(player.client, { t: 'over', board: room.finalBoard || [] });
      return;
    }
    if (room.phase === 'result' && room.lastEnd) {
      send(player.client, room.lastEnd);
      return;
    }
    if (room.phase !== 'playing' || !room.currentRound) return;

    const round = room.currentRound;
    const answer = round.answers.get(player.id);
    const sync = {
      t: 'sync',
      round: roundPayload(room, player),
      guessed: Array.from(round.correct),
      strokes: round.strokes.map((stroke) => ({
        id: stroke.id,
        c: stroke.c,
        w: stroke.w,
        p: stroke.p.map((point) => point.slice())
      })),
      answered: !!answer
    };
    if (answer) {
      sync.correctIdx = round.choices.correctIndex;
      sync.picked = answer.index;
    }
    send(player.client, sync);
  }

  function startRound(room) {
    if (!rooms.has(room.code)) return;
    const activePlayers = room.players.filter((player) => player.on && player.client);
    if (activePlayers.length < D.CONFIG.MIN_PLAYERS) {
      closeRoom(room, 'few');
      return;
    }

    room.roundIndex++;
    if (room.roundIndex >= room.rounds) {
      room.phase = 'over';
      room.currentRound = null;
      room.finalBoard = room.players
        .map((player) => ({ id: player.id, score: player.score }))
        .sort((a, b) => b.score - a.score);
      broadcast(room, { t: 'over', board: room.finalBoard });
      return;
    }

    const drawer = activePlayers[room.roundIndex % activePlayers.length];
    const prompt = room.prompts[room.roundIndex];
    const choices = D.buildChoices(prompt);
    const durationMs = TIMER_SECONDS[room.timer][0] * 1000;
    room.phase = 'playing';
    room.currentRound = {
      drawerId: drawer.id,
      prompt,
      choices,
      startedAt: Date.now(),
      durationMs,
      strokes: [],
      currentStrokeId: null,
      answers: new Map(),
      correct: new Set(),
      resolved: false
    };
    sendRound(room);
    clearTimer(room.roundTimer);
    room.roundTimer = setTimeout(() => resolveRound(room), durationMs);
    if (room.roundTimer.unref) room.roundTimer.unref();
  }

  function startGame(room) {
    room.players.forEach((player) => { player.score = 0; });
    room.prompts = D.pickPrompts(room.rounds);
    room.roundIndex = -1;
    room.finalBoard = null;
    room.lastEnd = null;
    startRound(room);
  }

  function resolveWhenEveryoneAnswered(room) {
    const round = room.currentRound;
    if (room.phase !== 'playing' || !round || round.resolved) return;
    const guessers = room.players.filter((player) => player.id !== round.drawerId && player.on);
    if (guessers.length && guessers.every((player) => round.answers.has(player.id))) resolveRound(room);
  }

  function resolveRound(room) {
    const round = room.currentRound;
    if (!round || round.resolved || room.phase !== 'playing') return;
    round.resolved = true;
    clearTimer(room.roundTimer);
    room.roundTimer = null;

    const deltas = {};
    const scores = {};
    room.players.forEach((player) => {
      const answer = round.answers.get(player.id);
      deltas[player.id] = answer ? answer.points : 0;
      scores[player.id] = player.score;
    });

    const drawer = room.players.find((player) => player.id === round.drawerId);
    if (drawer) {
      const colors = new Set(round.strokes.map((stroke) => stroke.c));
      const points = D.scoreDraw({
        strokes: round.strokes.length,
        identified: round.correct.size > 0,
        colors: colors.size
      });
      drawer.score += points;
      deltas[drawer.id] = points;
    }

    room.players.forEach((player) => { scores[player.id] = player.score; });
    const endMessage = {
      t: 'end',
      s: scores,
      d: deltas,
      answer: round.prompt
    };
    room.lastEnd = endMessage;
    room.phase = 'result';
    broadcast(room, endMessage);

    clearTimer(room.resultTimer);
    room.resultTimer = setTimeout(() => {
      if (room.roundIndex + 1 < room.rounds) {
        startRound(room);
      } else {
        room.phase = 'over';
        room.currentRound = null;
        room.finalBoard = room.players
          .map((player) => ({ id: player.id, score: player.score }))
          .sort((a, b) => b.score - a.score);
        broadcast(room, { t: 'over', board: room.finalBoard });
      }
    }, resultDelayMs);
    if (room.resultTimer.unref) room.resultTimer.unref();
  }

  function handleStroke(room, player, message) {
    const round = room.currentRound;
    if (room.phase !== 'playing' || !round || player.id !== round.drawerId) return;

    const points = D.validatePoints(message.pts);
    if (!points || points.length > MAX_POINTS_PER_STROKE_MESSAGE || !D.validStrokeId(message.id)) return;

    if (message.first === true) {
      if (message.id !== round.strokes.length || round.strokes.length >= D.CONFIG.MAX_STROKES) return;
      if (!D.validColor(message.c) || !D.validWidth(message.w)) return;
      const stroke = { id: message.id, c: message.c, w: message.w, p: points.slice(0, D.CONFIG.MAX_POINTS) };
      round.strokes.push(stroke);
      round.currentStrokeId = message.id;
      broadcast(room, {
        t: 'stroke',
        id: stroke.id,
        c: stroke.c,
        w: stroke.w,
        pts: stroke.p,
        first: true
      }, player.id);
      return;
    }

    const stroke = round.strokes[round.strokes.length - 1];
    if (!stroke || stroke.id !== message.id || round.currentStrokeId !== message.id) return;
    const available = D.CONFIG.MAX_POINTS - stroke.p.length;
    if (available <= 0) return;
    const accepted = points.slice(0, available);
    stroke.p.push(...accepted);
    broadcast(room, { t: 'stroke', id: stroke.id, pts: accepted }, player.id);
  }

  function handleGuess(room, player, message) {
    const round = room.currentRound;
    if (room.phase !== 'playing' || !round || player.id === round.drawerId || round.answers.has(player.id)) return;
    if (!Number.isInteger(message.i) || message.i < 0 || message.i >= round.choices.ids.length) return;

    const correct = message.i === round.choices.correctIndex;
    const remainingMs = Math.max(0, round.durationMs - (Date.now() - round.startedAt));
    const points = D.scoreGuess({ correct, remainingMs, totalMs: round.durationMs });
    round.answers.set(player.id, { index: message.i, correct, points });
    player.score += points;
    send(player.client, { t: 'ack', correct, pts: points });

    if (correct) {
      round.correct.add(player.id);
      broadcast(room, { t: 'guessed', pid: player.id });
    }
    resolveWhenEveryoneAnswered(room);
  }

  function handleRoomMessage(client, message) {
    const room = client.room;
    const player = client.player;
    if (!room || !player || !room.players.includes(player)) return;

    switch (message.t) {
      case 'ping':
        send(client, { t: 'pong' });
        break;
      case 'voice-signal':
        if (message.signal && typeof message.signal === 'object') {
          broadcast(room, {
            t: 'voice-signal',
            from: player.id,
            name: typeof message.name === 'string' ? message.name.slice(0, 20) : player.n,
            signal: message.signal
          }, player.id);
        }
        break;
      case 'ready':
        if (room.phase === 'lobby' && player.id !== room.host && typeof message.v === 'boolean') {
          player.ready = message.v;
          sendRoom(room);
        }
        break;
      case 'start': {
        if (room.phase !== 'lobby' || player.id !== room.host) break;
        const guests = room.players.filter((candidate) => candidate.id !== room.host);
        if (room.players.filter((candidate) => candidate.on).length < D.CONFIG.MIN_PLAYERS ||
            guests.some((guest) => !guest.on || !guest.ready)) break;
        startGame(room);
        break;
      }
      case 'stroke':
        handleStroke(room, player, message);
        break;
      case 'undo':
        if (room.phase === 'playing' && room.currentRound && player.id === room.currentRound.drawerId) {
          const removed = room.currentRound.strokes.pop();
          room.currentRound.currentStrokeId = null;
          if (removed) broadcast(room, { t: 'undo' }, player.id);
        }
        break;
      case 'clear':
        if (room.phase === 'playing' && room.currentRound && player.id === room.currentRound.drawerId) {
          room.currentRound.strokes = [];
          room.currentRound.currentStrokeId = null;
          broadcast(room, { t: 'clear' }, player.id);
        }
        break;
      case 'done':
        if (room.phase === 'playing' && room.currentRound && player.id === room.currentRound.drawerId) {
          resolveRound(room);
        }
        break;
      case 'guess':
        handleGuess(room, player, message);
        break;
      case 'react':
        if (room.phase === 'playing' && Number.isInteger(message.r) &&
            message.r >= 0 && message.r < D.REACTION_COUNT &&
            Date.now() - client.lastReactAt >= 800) {
          client.lastReactAt = Date.now();
          broadcast(room, { t: 'react', r: message.r, pid: player.id });
        }
        break;
      case 'kick': {
        if (player.id !== room.host || typeof message.pid !== 'string') break;
        const target = room.players.find((candidate) => candidate.id === message.pid && candidate.id !== room.host);
        if (target) removePlayer(room, target, 'kicked');
        break;
      }
      case 'report':
        if (typeof message.pid === 'string' && Number.isInteger(message.why) && message.why >= 0 && message.why <= 3) {
          const target = room.players.find((candidate) => candidate.id === message.pid && candidate.id !== player.id);
          if (target) send(target.client, { t: 'reported' });
        }
        break;
      case 'leave':
        if (player.id === room.host) closeRoom(room, 'closed', player.id);
        else removePlayer(room, player);
        break;
      case 'again':
        if (player.id === room.host && room.phase === 'over') {
          room.phase = 'lobby';
          room.currentRound = null;
          room.lastEnd = null;
          room.finalBoard = null;
          room.players.forEach((candidate) => {
            candidate.score = 0;
            candidate.ready = candidate.id === room.host;
          });
          sendRoom(room);
        }
        break;
      default:
        break;
    }
  }

  function handleMessage(client, raw) {
    if (!client.rateStart || Date.now() - client.rateStart >= MESSAGE_WINDOW_MS) {
      client.rateStart = Date.now();
      client.messageCount = 0;
    }
    client.messageCount++;
    if (client.messageCount > MAX_MESSAGES_PER_WINDOW) {
      client.ws.close(1008, 'rate limit');
      return;
    }

    let message;
    try {
      message = JSON.parse(raw.toString());
    } catch {
      sendError(client, 'bad');
      return;
    }
    if (!message || typeof message !== 'object' || Array.isArray(message) || typeof message.t !== 'string') {
      sendError(client, 'bad');
      return;
    }

    if (!client.ready) {
      if (message.t !== 'hello') {
        client.ws.close(1008, 'hello required');
        return;
      }
      handleHello(client, message);
      return;
    }
    if (message.t === 'hello') {
      client.ws.close(1008, 'already initialized');
      return;
    }

    if (!client.room) {
      if (client.intentHandled) return;
      client.intentHandled = true;
      if (message.t === 'create') createRoom(client, message);
      else if (message.t === 'join') joinRoom(client, message);
      else sendError(client, 'bad');
      return;
    }
    handleRoomMessage(client, message);
  }

  webSocketServer.on('connection', (ws) => {
    const client = {
      ws,
      ready: false,
      id: crypto.randomUUID(),
      token: randomToken(),
      profile: null,
      room: null,
      player: null,
      intentHandled: false,
      messageCount: 0,
      rateStart: 0,
      lastReactAt: 0
    };
    clients.add(client);
    ws.on('message', (raw) => handleMessage(client, raw));
    ws.isAlive = true;
    ws.on('pong', () => { ws.isAlive = true; });
    ws.on('close', () => {
      clients.delete(client);
      disconnectPlayer(client);
    });
    ws.on('error', () => {});
  });

  const heartbeatMs = Number.isInteger(options.heartbeatMs) ? options.heartbeatMs : 30_000;
  const heartbeat = heartbeatMs > 0 ? setInterval(() => {
    clients.forEach((client) => {
      if (!client.ws.isAlive) {
        client.ws.terminate();
        return;
      }
      client.ws.isAlive = false;
      client.ws.ping();
    });
  }, heartbeatMs) : null;
  if (heartbeat && heartbeat.unref) heartbeat.unref();
  return {
    httpServer,
    webSocketServer,
    rooms,
    listen(port = process.env.PORT || 10000, host = '0.0.0.0') {
      return new Promise((resolve, reject) => {
        const onError = (error) => {
          httpServer.off('listening', onListening);
          reject(error);
        };
        const onListening = () => {
          httpServer.off('error', onError);
          resolve(httpServer.address());
        };
        httpServer.once('error', onError);
        httpServer.once('listening', onListening);
        httpServer.listen(port, host);
      });
    },
    close() {
      if (heartbeat) clearInterval(heartbeat);
      clients.forEach((client) => client.ws.close(1001, 'server shutdown'));
      rooms.forEach(deleteRoom);
      return new Promise((resolve) => {
        webSocketServer.close(() => {
          if (httpServer.listening) httpServer.close(() => resolve());
          else resolve();
        });
      });
    }
  };
}

if (require.main === module) {
  const server = createServer();
  const port = Number(process.env.PORT) || 10000;
  server.listen(port, '0.0.0.0').then((address) => {
    process.stdout.write(`Doodle Duel server listening on ${address.port}\n`);
  }).catch((error) => {
    process.stderr.write(`Unable to start Doodle Duel server: ${error.message}\n`);
    process.exitCode = 1;
  });
}

module.exports = { createServer };
