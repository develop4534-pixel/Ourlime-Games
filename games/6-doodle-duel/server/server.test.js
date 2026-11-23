'use strict';

const assert = require('node:assert/strict');
const { after, before, test } = require('node:test');
const WebSocket = require('ws');
const { createServer } = require('./server.js');
const D = require('../js/core.js');

class TestPeer {
  constructor(url) {
    this.messages = [];
    this.waiters = [];
    this.ws = new WebSocket(url);
    this.opened = new Promise((resolve, reject) => {
      this.ws.once('open', resolve);
      this.ws.once('error', reject);
    });
    this.ws.on('message', (data) => {
      const message = JSON.parse(data.toString());
      const waiterIndex = this.waiters.findIndex((waiter) => waiter.matches(message));
      if (waiterIndex >= 0) {
        const [waiter] = this.waiters.splice(waiterIndex, 1);
        clearTimeout(waiter.timer);
        waiter.resolve(message);
      } else {
        this.messages.push(message);
      }
    });
  }

  send(message) {
    this.ws.send(JSON.stringify(message));
  }

  waitFor(type, predicate = () => true) {
    const index = this.messages.findIndex((message) => message.t === type && predicate(message));
    if (index >= 0) return Promise.resolve(this.messages.splice(index, 1)[0]);

    return new Promise((resolve, reject) => {
      const waiter = {
        matches: (message) => message.t === type && predicate(message),
        resolve,
        timer: setTimeout(() => {
          this.waiters = this.waiters.filter((candidate) => candidate !== waiter);
          reject(new Error(`Timed out waiting for ${type}`));
        }, 2000)
      };
      this.waiters.push(waiter);
    });
  }

  close() {
    if (this.ws.readyState === WebSocket.CLOSED) return Promise.resolve();
    return new Promise((resolve) => {
      this.ws.once('close', resolve);
      this.ws.close();
    });
  }
}

let server;
let address;

before(async () => {
  server = createServer({ heartbeatMs: 0, resultDelayMs: 20 });
  address = await server.listen(0, '127.0.0.1');
});

after(async () => {
  await server.close();
});

async function connectPlayer(index) {
  const peer = new TestPeer(`ws://127.0.0.1:${address.port}/ws`);
  await peer.opened;
  peer.send({ t: 'hello', n: [index, index], ch: index % 2, u: `${index}`.padStart(16, '0') });
  const welcome = await peer.waitFor('welcome');
  return { peer, welcome };
}

test('health endpoint responds without creating a room', async () => {
  const response = await fetch(`http://127.0.0.1:${address.port}/health`);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { ok: true, service: 'doodle-duel-server' });
});

test('drawer scoring rejects drawings that are very different from the prompt', () => {
  const goodCat = D.DOODLES.cat.map((points) => ({
    c: '#1e6bff',
    w: 20,
    p: points.map(([x, y]) => [x * 10, y * 10])
  }));
  const wrongBox = [{
    c: '#1e6bff',
    w: 20,
    p: [[200, 150], [800, 150], [800, 850], [200, 850], [200, 150]]
  }];
  const incompleteCat = [{
    c: '#1e6bff',
    w: 20,
    p: [[500, 580], [500, 800]]
  }];
  const wrongMoon = [{
    c: '#1e6bff',
    w: 20,
    p: [[140, 640], [180, 410], [260, 300], [410, 260], [570, 280], [620, 500], [650, 760], [650, 760]]
  }];
  const wrongCar = [{
    c: '#1e6bff',
    w: 20,
    p: [[300, 500], [700, 500]]
  }];
  const goodCar = D.DOODLES.car.map((points) => ({
    c: '#1e6bff',
    w: 20,
    p: points.map(([x, y]) => [x * 10, y * 10])
  }));

  const goodQuality = D.drawingQuality(goodCat, 'cat');
  const wrongQuality = D.drawingQuality(wrongBox, 'cat');
  const incompleteQuality = D.drawingQuality(incompleteCat, 'cat');
  const goodMoonQuality = D.drawingQuality(D.DOODLES.moon.map((points) => ({
    c: '#ffd23f',
    w: 20,
    p: points.map(([x, y]) => [x * 10, y * 10])
  })), 'moon');
  const wrongMoonQuality = D.drawingQuality(wrongMoon, 'moon');
  const goodCarQuality = D.drawingQuality(goodCar, 'car');
  const wrongCarQuality = D.drawingQuality(wrongCar, 'car');
  assert.ok(goodQuality >= 0.88);
  assert.ok(goodMoonQuality >= 0.88);
  assert.ok(goodCarQuality >= 0.88);
  assert.ok(wrongQuality < 0.88);
  assert.ok(wrongMoonQuality < 0.88);
  assert.ok(wrongCarQuality < 0.88);
  assert.equal(incompleteQuality, 0);
  assert.equal(D.scoreDraw({ strokes: 1, identified: true, colors: 1, recognizable: wrongQuality >= 0.88 }), 0);
  assert.equal(D.scoreDraw({ strokes: 1, identified: true, colors: 1, recognizable: false }), 0);
});

test('two players can create a room, join, draw, guess, and finish a round', async (t) => {
  const host = await connectPlayer(0);
  const guest = await connectPlayer(1);
  t.after(() => Promise.all([host.peer.close(), guest.peer.close()]));

  host.peer.send({ t: 'create', rounds: 4, timer: 1 });
  const hostRoom = await host.peer.waitFor('room', (room) => room.players.length === 1);
  assert.match(hostRoom.code, /^[A-HJ-NP-Z2-9]{5}$/);

  guest.peer.send({ t: 'join', code: hostRoom.code });
  const guestRoom = await guest.peer.waitFor('room', (room) => room.players.length === 2);
  await host.peer.waitFor('room', (room) => room.players.length === 2);
  assert.equal(guestRoom.players.some((player) => 'token' in player), false);

  guest.peer.send({ t: 'ready', v: true });
  await host.peer.waitFor('room', (room) => room.players[1].ready);
  await guest.peer.waitFor('room', (room) => room.players[1].ready);

  host.peer.send({ t: 'start' });
  let firstGuestEnd;
  for (let roundNumber = 0; roundNumber < 4; roundNumber++) {
    const hostRound = await host.peer.waitFor('round');
    const guestRound = await guest.peer.waitFor('round');
    const drawer = hostRound.you === 'draw' ? host : guest;
    const guesser = hostRound.you === 'draw' ? guest : host;
    const drawerRound = hostRound.you === 'draw' ? hostRound : guestRound;
    const guesserRound = hostRound.you === 'guess' ? hostRound : guestRound;
    const room = server.rooms.get(hostRoom.code);

    assert.equal(drawerRound.you, 'draw');
    assert.equal(guesserRound.you, 'guess');
    assert.equal('prompt' in guesserRound, false);
    const answerIndex = guesserRound.choices.indexOf(room.currentRound.prompt);
    assert.notEqual(answerIndex, -1);

    const promptStrokes = D.DOODLES[room.currentRound.prompt] || [];
    promptStrokes.slice(0, D.CONFIG.MAX_STROKES).forEach((points, strokeId) => {
      const payload = points.map(([x, y]) => [Math.round(x * 10), Math.round(y * 10)]);
      drawer.peer.send({ t: 'stroke', id: strokeId, c: '#1e6bff', w: 20, pts: payload, first: true });
    });
    await guesser.peer.waitFor('stroke');
    guesser.peer.send({ t: 'guess', i: answerIndex });
    assert.equal((await guesser.peer.waitFor('ack')).correct, true);

    const hostEnd = await host.peer.waitFor('end');
    const guestEnd = await guest.peer.waitFor('end');
    if (roundNumber === 0) firstGuestEnd = guestEnd;
    if (roundNumber === 0) {
      assert.ok(firstGuestEnd.s[guest.welcome.id] > 0);
      assert.equal(firstGuestEnd.d[guest.welcome.id], firstGuestEnd.s[guest.welcome.id]);
      assert.equal(firstGuestEnd.d[host.welcome.id], 80);
    }
    if (roundNumber === 3) {
      assert.ok(hostEnd.s[host.welcome.id] > 0);
      assert.ok(guestEnd.s[guest.welcome.id] > 0);
    }
  }

  const hostOver = await host.peer.waitFor('over');
  const guestOver = await guest.peer.waitFor('over');
  assert.equal(hostOver.board.length, 2);
  assert.deepEqual(guestOver.board, hostOver.board);
});

test('the server rejects room creation with invalid settings', async (t) => {
  const player = await connectPlayer(2);
  t.after(() => player.peer.close());
  const roomCount = server.rooms.size;

  player.peer.send({ t: 'create', rounds: 5, timer: 1 });
  const error = await player.peer.waitFor('err');
  assert.equal(error.code, 'bad');
  assert.equal(server.rooms.size, roomCount);
});

test('a disconnected player can resume a room with its private token', async (t) => {
  const player = await connectPlayer(3);
  let resumedPeer;
  t.after(async () => {
    await player.peer.close();
    if (resumedPeer) await resumedPeer.close();
  });

  player.peer.send({ t: 'create', rounds: 4, timer: 1 });
  const room = await player.peer.waitFor('room', (message) => message.players.length === 1);
  await player.peer.close();

  resumedPeer = new TestPeer(`ws://127.0.0.1:${address.port}/ws`);
  await resumedPeer.opened;
  resumedPeer.send({
    t: 'hello',
    n: [3, 3],
    ch: 1,
    u: '0000000000000003',
    resume: { room: room.code, token: player.welcome.token }
  });

  const welcome = await resumedPeer.waitFor('welcome');
  assert.equal(welcome.resumed, true);
  assert.equal(welcome.id, player.welcome.id);
  const resumedRoom = await resumedPeer.waitFor('room');
  assert.equal(resumedRoom.players.length, 1);
  assert.equal(resumedRoom.players[0].on, true);
});
