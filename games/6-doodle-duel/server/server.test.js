'use strict';

const assert = require('node:assert/strict');
const { after, before, test } = require('node:test');
const WebSocket = require('ws');
const { createServer } = require('./server.js');

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

    drawer.peer.send({ t: 'stroke', id: 0, c: '#1e6bff', w: 20, pts: [[100, 100]], first: true });
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
