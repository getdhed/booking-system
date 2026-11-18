'use strict';

const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const { Op } = require('sequelize');

const room = id => `support:${id}`;
const publicUser = user => ({ id: user.id, fullName: user.fullName, role: user.role });
const plain = value => value.toJSON ? value.toJSON() : value;
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Models can be injected by integration tests; production uses the project's PostgreSQL.
function attachSupportChat(server, { allowedOrigins, models = require('../models'), secret = process.env.JWT_SECRET } = {}) {
  const { User, ChatMessage } = models;
  const io = new Server(server, {
    cors: { origin: [...allowedOrigins], methods: ['GET', 'POST'] },
    allowRequest: (req, done) => done(null, !req.headers.origin || allowedOrigins.has(req.headers.origin)),
    maxHttpBufferSize: 16 * 1024,
  });
  const online = new Map();
  const rates = new Map();
  const isOnline = id => (online.get(Number(id)) || 0) > 0;
  const presence = () => ({
    userIds: [...online.keys()],
    adminOnline: [...io.sockets.sockets.values()].some(s => s.data.user.role === 'admin'),
  });
  function publishPresence(user, connected) {
    const state = presence();
    io.to('support:admins').emit('chat:presence', state);
    // Users only see their own presence and support availability.
    for (const s of io.sockets.sockets.values()) {
      if (s.data.user.role !== 'admin') s.emit('chat:presence', {
        userIds: isOnline(s.data.user.id) ? [s.data.user.id] : [], adminOnline: state.adminOnline,
      });
    }
    const event = { user: publicUser(user), connected, at: new Date().toISOString() };
    if (user.role === 'admin') {
      io.emit('chat:notice', event);
    } else {
      io.to('support:admins').to(room(user.id)).emit('chat:notice', event);
    }
  }

  io.use(async (socket, next) => {
    try {
      const decoded = jwt.verify(socket.handshake.auth?.token, secret);
      const user = await User.findByPk(decoded.id, { attributes: ['id', 'fullName', 'role'] });
      if (!user || !['user', 'admin'].includes(user.role)) throw new Error('Unknown user');
      socket.data.user = publicUser(user);
      socket.data.expiresAt = decoded.exp * 1000;
      next();
    } catch {
      const error = new Error('Сессия истекла. Войдите повторно.');
      error.data = { code: 'UNAUTHORIZED' };
      next(error);
    }
  });

  io.on('connection', socket => {
    const user = socket.data.user;
    online.set(user.id, (online.get(user.id) || 0) + 1);
    if (user.role === 'admin') socket.join('support:admins');
    else { socket.join(room(user.id)); socket.data.conversation = user.id; }
    const expiry = setTimeout(() => socket.disconnect(true), Math.max(0, socket.data.expiresAt - Date.now()));
    expiry.unref();

    // Every action rechecks the account: the client never supplies the sender or role.
    function handle(event, action) {
      socket.on(event, async (payload, ack) => {
        const reply = typeof ack === 'function' ? ack : () => {};
        try {
          const current = await User.findByPk(user.id, { attributes: ['id', 'fullName', 'role'] });
          if (!socket.connected || Date.now() >= socket.data.expiresAt || !current || current.role !== user.role) {
            reply({ ok: false, error: 'Сессия изменилась. Подключитесь заново.' });
            socket.disconnect(true);
            return;
          }
          reply({ ok: true, ...await action(payload || {}) });
        } catch (error) {
          if (!error.chatError) console.error('Support chat:', error);
          reply({ ok: false, error: error.chatError ? error.message : 'Не удалось выполнить действие. Попробуйте ещё раз.' });
        }
      });
    }
    function fail(message) { const error = new Error(message); error.chatError = true; throw error; }
    async function target(payload) {
      const id = Number(payload.userId);
      if (!Number.isSafeInteger(id) || id <= 0) fail('Выберите диалог.');
      if (user.role !== 'admin' && id !== user.id) fail('Нет доступа к чужому диалогу.');
      const owner = await User.findByPk(id, { attributes: ['id', 'fullName', 'role'] });
      if (!owner || owner.role !== 'user') fail('Пользователь не найден.');
      return owner;
    }
    function consumeRate() {
      const now = Date.now();
      let rate = rates.get(user.id);
      if (!rate || now - rate.start >= 10000) { rate = { start: now, count: 0 }; rates.set(user.id, rate); }
      if (++rate.count > 10) fail('Слишком много сообщений. Подождите 10 секунд.');
    }

    handle('chat:list', async () => {
      const users = user.role === 'admin'
        ? await User.findAll({ where: { role: 'user' }, attributes: ['id', 'fullName', 'role'], order: [['id', 'ASC']] })
        : [user];
      const conversations = await Promise.all(users.map(async owner => {
        const last = await ChatMessage.findOne({ where: { userId: owner.id }, order: [['id', 'DESC']] });
        return { user: publicUser(owner), online: isOnline(owner.id), lastMessage: last ? plain(last) : null };
      }));
      return { conversations, presence: user.role === 'admin' ? presence() : { userIds: isOnline(user.id) ? [user.id] : [], adminOnline: presence().adminOnline } };
    });
    handle('chat:join', async payload => {
      const owner = await target(payload);
      // The client serializes joins; a server queue also prevents overlapping joins.
      const previous = socket.data.joinQueue || Promise.resolve();
      const joined = previous.catch(() => {}).then(async () => {
        if (user.role === 'admin' && socket.data.conversation) await socket.leave(room(socket.data.conversation));
        await socket.join(room(owner.id));
        socket.data.conversation = owner.id;
        const messages = await ChatMessage.findAll({ where: { userId: owner.id }, order: [['id', 'DESC']], limit: 50 });
        return { userId: owner.id, messages: messages.reverse().map(plain), hasMore: messages.length === 50 };
      });
      socket.data.joinQueue = joined;
      return joined;
    });
    handle('chat:history', async payload => {
      const owner = await target(payload);
      const before = Number(payload.before);
      if (!Number.isSafeInteger(before) || before <= 0) fail('Некорректная граница истории.');
      const messages = await ChatMessage.findAll({ where: { userId: owner.id, id: { [Op.lt]: before } }, order: [['id', 'DESC']], limit: 50 });
      return { messages: messages.reverse().map(plain), hasMore: messages.length === 50 };
    });
    handle('chat:message', async payload => {
      const owner = await target(payload);
      if (typeof payload.text !== 'string' || !payload.text.trim() || payload.text.trim().length > 2000) fail('Сообщение должно содержать от 1 до 2000 символов.');
      if (typeof payload.clientMessageId !== 'string' || !uuid.test(payload.clientMessageId)) fail('Некорректный идентификатор сообщения.');
      consumeRate();
      // The unique index makes a retry after a lost acknowledgement idempotent.
      const [saved] = await ChatMessage.findOrCreate({
        where: { senderId: user.id, clientMessageId: payload.clientMessageId },
        defaults: { userId: owner.id, senderName: user.fullName, senderRole: user.role, text: payload.text.trim() },
      });
      const message = plain(saved);
      if (message.userId !== owner.id || message.text !== payload.text.trim()) fail('Этот идентификатор уже использован.');
      io.to(room(owner.id)).emit('chat:message', message);
      io.to('support:admins').emit('chat:conversation', { user: publicUser(owner), online: isOnline(owner.id), lastMessage: message });
      socket.to(room(owner.id)).volatile.emit('chat:typing', { userId: owner.id, senderId: user.id, senderName: user.fullName, typing: false });
      return { message };
    });
    handle('chat:typing', async payload => {
      if (typeof payload.typing !== 'boolean') fail('Некорректный индикатор набора.');
      if (Date.now() - (socket.data.lastTyping || 0) < 400 && payload.typing) return {};
      const owner = await target(payload);
      socket.data.lastTyping = payload.typing ? Date.now() : 0;
      if (socket.data.conversation !== owner.id) fail('Сначала откройте диалог.');
      socket.to(room(owner.id)).volatile.emit('chat:typing', { userId: owner.id, senderId: user.id, senderName: user.fullName, typing: payload.typing });
      return {};
    });
    socket.on('disconnect', () => {
      clearTimeout(expiry);
      const remaining = (online.get(user.id) || 1) - 1;
      if (remaining) online.set(user.id, remaining); else { online.delete(user.id); rates.delete(user.id); }
      if (socket.data.conversation) socket.to(room(socket.data.conversation)).emit('chat:typing', { userId: socket.data.conversation, senderId: user.id, typing: false });
      // Several tabs count as one online account.
      if (!remaining) publishPresence(user, false);
    });
    if (online.get(user.id) === 1) publishPresence(user, true);
  });
  return io;
}

module.exports = { attachSupportChat };
