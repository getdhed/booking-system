'use strict';

require('dotenv').config();
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const http = require('node:http');
const jwt = require('jsonwebtoken');
const { io: client } = require('socket.io-client');
const { attachSupportChat } = require('../services/supportChat');

// Use a disposable, migrated PostgreSQL database. No existing rows are modified.
test('ЛР7: реальный Socket.IO + PostgreSQL', { timeout: 45000 }, async t => {
  assert.equal(process.env.LAB7_TEST, '1', 'Set LAB7_TEST=1 and use an isolated migrated database');
  const models = require('../models');
  const { User, ChatMessage, sequelize } = models;
  sequelize.options.logging = false;
  const server = http.createServer();
  const io = attachSupportChat(server, { allowedOrigins: new Set(['http://localhost:5173']), models });
  const sockets = [];
  const accounts = [];
  const listen = new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  await listen;
  const url = `http://127.0.0.1:${server.address().port}`;
  const event = (socket, name, predicate = () => true) => new Promise((resolve, reject) => {
    const timer = setTimeout(() => { socket.off(name, handler); reject(new Error(`Timed out: ${name}`)); }, 4000);
    function handler(value) { if (predicate(value)) { clearTimeout(timer); socket.off(name, handler); resolve(value); } }
    socket.on(name, handler);
  });
  const emit = (socket, name, value = {}) => socket.timeout(5000).emitWithAck(name, value);
  async function connect(user, options = {}) {
    const socket = client(url, { auth: { token: jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '5m' }) }, reconnection: false, autoConnect: false, ...options });
    sockets.push(socket);
    const ready = event(socket, 'connect'); socket.connect(); await ready; return socket;
  }
  try {
    for (const role of ['admin', 'user', 'user']) accounts.push(await User.create({ fullName: `ЛР7 ${role}`, role, email: `${randomUUID()}@example.test` }));
    const [admin, alice, bob] = accounts;
    const a = await connect(admin, { transports: ['websocket'] });
    const u = await connect(alice, { transports: ['websocket'] });
    const v = await connect(bob, { transports: ['polling'] });
    let first;

    await t.test('отклоняет отсутствующий/поддельный/просроченный JWT и чужой Origin', async () => {
      for (const auth of [{}, { token: 'bad' }, { token: jwt.sign({ id: alice.id }, process.env.JWT_SECRET, { expiresIn: -1 }) }]) {
        const socket = client(url, { auth, reconnection: false, autoConnect: false }); sockets.push(socket);
        const failed = event(socket, 'connect_error'); socket.connect();
        assert.equal((await failed).data.code, 'UNAUTHORIZED'); socket.disconnect();
      }
      const socket = client(url, { transports: ['websocket'], extraHeaders: { Origin: 'https://untrusted.example' }, reconnection: false, autoConnect: false }); sockets.push(socket);
      const failed = event(socket, 'connect_error'); socket.connect(); await failed; assert.equal(socket.connected, false);
    });

    await t.test('список диалогов и изоляция пользователя', async () => {
      const own = await emit(u, 'chat:list'); assert.equal(own.ok, true); assert.deepEqual(own.conversations.map(c => c.user.id), [alice.id]);
      const all = await emit(a, 'chat:list'); assert.ok(all.conversations.some(c => c.user.id === bob.id));
      assert.equal((await emit(u, 'chat:join', { userId: bob.id })).ok, false);
      assert.equal((await emit(u, 'chat:history', { userId: bob.id, before: 999 })).ok, false);
      assert.equal((await emit(u, 'chat:message', { userId: bob.id, text: 'forbidden', clientMessageId: randomUUID() })).ok, false);
    });

    await t.test('доставка в обе стороны, ack, авторство с сервера, изоляция комнат', async () => {
      await emit(a, 'chat:join', { userId: alice.id }); await emit(u, 'chat:join', { userId: alice.id });
      const leaked = []; v.on('chat:message', message => leaked.push(message));
      const received = event(a, 'chat:message');
      const payload = { userId: alice.id, text: 'Можно забронировать переговорную?', clientMessageId: randomUUID(), senderId: admin.id, senderRole: 'admin' };
      const ack = await emit(u, 'chat:message', payload); first = ack.message;
      assert.equal(ack.ok, true); assert.equal((await received).id, first.id); assert.equal(first.senderId, alice.id); assert.equal(first.senderRole, 'user');
      const reply = event(u, 'chat:message', m => m.senderId === admin.id);
      assert.equal((await emit(a, 'chat:message', { userId: alice.id, text: 'Да, выберите время в каталоге.', clientMessageId: randomUUID() })).ok, true);
      assert.equal((await reply).senderRole, 'admin');
      const duplicate = await emit(u, 'chat:message', payload); assert.equal(duplicate.message.id, first.id);
      assert.equal(await ChatMessage.count({ where: { senderId: alice.id, clientMessageId: payload.clientMessageId } }), 1);
      await emit(v, 'chat:list'); assert.deepEqual(leaked, []);
      const notice = event(a, 'chat:conversation', c => c.user.id === bob.id);
      assert.equal((await emit(v, 'chat:message', { userId: bob.id, text: 'Сообщение через polling', clientMessageId: randomUUID() })).ok, true);
      assert.equal((await notice).user.id, bob.id);
    });

    await t.test('typing без сохранения текста, переключение комнаты и leave', async () => {
      const count = await ChatMessage.count();
      const typing = event(a, 'chat:typing', value => value.typing);
      assert.equal((await emit(u, 'chat:typing', { userId: alice.id, typing: true })).ok, true);
      assert.equal((await typing).senderId, alice.id); assert.equal(await ChatMessage.count(), count);
      await emit(a, 'chat:join', { userId: bob.id });
      assert.equal(io.sockets.sockets.get(a.id).rooms.has(`support:${alice.id}`), false);
      assert.equal(io.sockets.sockets.get(a.id).rooms.has(`support:${bob.id}`), true);
    });

    await t.test('история из БД, страницы по 50, повторное подключение', async () => {
      await ChatMessage.bulkCreate(Array.from({ length: 55 }, (_, index) => ({ userId: alice.id, senderId: alice.id, senderName: alice.fullName, senderRole: 'user', text: `История ${index}`, clientMessageId: randomUUID() })));
      const latest = await emit(u, 'chat:join', { userId: alice.id });
      assert.equal(latest.messages.length, 50); assert.equal(latest.hasMore, true);
      const older = await emit(u, 'chat:history', { userId: alice.id, before: latest.messages[0].id });
      assert.equal(older.messages.length, 7); assert.equal(older.messages[0].id, first.id); assert.equal(older.hasMore, false);
      const offline = event(a, 'chat:presence', value => !value.userIds.includes(alice.id)); u.disconnect(); await offline;
      const online = event(a, 'chat:notice', value => value.user.id === alice.id && value.connected);
      const again = await connect(alice); await online;
      const history = await emit(again, 'chat:join', { userId: alice.id }); assert.equal(history.messages.length, 50);
      const second = await connect(alice);
      // Closing one of two tabs must not mark the account offline.
      const left = event(io.sockets.sockets.get(again.id), 'disconnect');
      again.disconnect(); await left;
      const state = await emit(a, 'chat:list'); assert.ok(state.presence.userIds.includes(alice.id));
      second.disconnect();
    });

    await t.test('валидация и лимит сообщений', async () => {
      for (const text of ['', '   ', 'x'.repeat(2001), { object: true }]) assert.equal((await emit(v, 'chat:message', { userId: bob.id, text, clientMessageId: randomUUID() })).ok, false);
      assert.equal((await emit(v, 'chat:message', { userId: bob.id, text: 'ok', clientMessageId: 'bad' })).ok, false);
      let limited;
      for (let i = 0; i < 11; i++) limited = await emit(v, 'chat:message', { userId: bob.id, text: `Лимит ${i}`, clientMessageId: randomUUID() });
      assert.equal(limited.ok, false); assert.match(limited.error, /Слишком много/);
    });
  } finally {
    sockets.forEach(socket => socket.disconnect());
    await new Promise(resolve => io.close(resolve));
    if (accounts.length) {
      await ChatMessage.destroy({ where: { userId: accounts.map(user => user.id) } });
      await User.destroy({ where: { id: accounts.map(user => user.id) } });
    }
    await sequelize.close();
  }
});
