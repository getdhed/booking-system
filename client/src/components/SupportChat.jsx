import { useCallback, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { getChatConnection, getProfile } from '../api.js';
import Icon from './Icon.jsx';

const merge = (previous, incoming) => [...new Map([...previous, ...incoming].map(m => [m.id, m])).values()].sort((a, b) => a.id - b.id);
const time = value => new Date(value).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

function request(socket, event, payload = {}) {
  return new Promise((resolve, reject) => {
    if (!socket?.connected) return reject(new Error('Нет соединения. Дождитесь подключения.'));
    socket.timeout(8000).emit(event, payload, (error, result) => {
      if (error) reject(new Error('Сервер не ответил. Повторите действие.'));
      else if (!result?.ok) reject(new Error(result?.error || 'Не удалось выполнить действие.'));
      else resolve(result);
    });
  });
}

export default function SupportChat({ profile }) {
  const admin = profile.role === 'admin';
  const [conversations, setConversations] = useState([]);
  const [selected, setSelected] = useState(admin ? null : profile.id);
  const [messages, setMessages] = useState([]);
  const [presence, setPresence] = useState({ userIds: [], adminOnline: false });
  const [status, setStatus] = useState('Подключение…');
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const [typing, setTyping] = useState({});
  const [notices, setNotices] = useState([]);
  const [unread, setUnread] = useState({});
  const socketRef = useRef(null);
  const selectedRef = useRef(selected);
  const requestVersion = useRef(0);
  const pendingMessage = useRef(null);
  const typingTimer = useRef(null);
  const typingSentAt = useRef(0);
  const bottom = useRef(null);
  const historyPrepend = useRef(false);

  const join = useCallback(async (socket, id) => {
    const version = ++requestVersion.current;
    setLoading(true);
    try {
      const result = await request(socket, 'chat:join', { userId: id });
      if (version !== requestVersion.current || selectedRef.current !== id) return;
      setMessages(previous => merge(previous, result.messages));
      setHasMore(result.hasMore);
      setError('');
    } catch (err) {
      if (version === requestVersion.current) setError(err.message);
    } finally {
      if (version === requestVersion.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const config = getChatConnection();
    const socket = io(config.url, { path: config.path, auth: cb => cb({ token: getChatConnection().token }), autoConnect: false });
    socketRef.current = socket;
    let disposed = false;
    let refreshing = false;
    async function reconnectSession() {
      if (refreshing || disposed) return;
      refreshing = true;
      try {
        await getProfile(); // Reuses the existing refresh-token flow, then the auth callback reads the new JWT.
        if (!disposed) socket.connect();
      } catch {
        if (!disposed) { setStatus('Сессия истекла'); setError('Войдите в аккаунт повторно.'); }
      } finally { refreshing = false; }
    }
    socket.on('connect', async () => {
      setConnected(true); setStatus('Подключено'); setError('');
      try {
        const result = await request(socket, 'chat:list');
        if (disposed) return;
        setConversations(result.conversations); setPresence(result.presence);
        if (selectedRef.current) await join(socket, selectedRef.current);
      } catch (err) { if (!disposed) setError(err.message); }
    });
    socket.on('disconnect', reason => {
      setConnected(false); setStatus('Соединение потеряно'); setTyping({});
      if (reason === 'io server disconnect') void reconnectSession();
    });
    socket.on('connect_error', err => {
      setConnected(false); setStatus('Нет соединения');
      if (err.data?.code === 'UNAUTHORIZED') void reconnectSession();
      else setError('Не удалось подключиться к чату. Проверьте, запущен ли сервер.');
    });
    socket.on('chat:message', message => {
      if (message.userId === selectedRef.current) {
        setMessages(previous => merge(previous, [message]));
        setTyping(previous => { const next = { ...previous }; delete next[message.senderId]; return next; });
      } else if (message.senderId !== profile.id) {
        setUnread(previous => ({ ...previous, [message.userId]: (previous[message.userId] || 0) + 1 }));
      }
    });
    socket.on('chat:conversation', conversation => {
      setConversations(previous => {
        const existing = previous.find(c => c.user.id === conversation.user.id);
        if (existing?.lastMessage?.id > conversation.lastMessage.id) return previous;
        return [...previous.filter(c => c.user.id !== conversation.user.id), conversation];
      });
      // Administrators receive previews even when they are viewing another room.
      if (conversation.user.id !== selectedRef.current && conversation.lastMessage.senderId !== profile.id) {
        setUnread(previous => ({ ...previous, [conversation.user.id]: (previous[conversation.user.id] || 0) + 1 }));
      }
    });
    socket.on('chat:presence', setPresence);
    socket.on('chat:notice', notice => {
      setNotices(previous => [...previous.slice(-3), notice]);
      if (admin && notice.user.role === 'user') setConversations(previous => previous.some(c => c.user.id === notice.user.id) ? previous : [...previous, { user: notice.user, lastMessage: null }]);
    });
    socket.on('chat:typing', event => {
      if (event.userId !== selectedRef.current || event.senderId === profile.id) return;
      setTyping(previous => {
        const next = { ...previous };
        if (event.typing) next[event.senderId] = { name: event.senderName, until: Date.now() + 3000 };
        else delete next[event.senderId];
        return next;
      });
    });
    const timer = setInterval(() => setTyping(previous => {
      const active = Object.entries(previous).filter(([, value]) => value.until > Date.now());
      return active.length === Object.keys(previous).length ? previous : Object.fromEntries(active);
    }), 1000);
    socket.connect();
    return () => {
      disposed = true; ++requestVersion.current;
      clearInterval(timer); clearTimeout(typingTimer.current);
      socket.removeAllListeners(); socket.disconnect(); socketRef.current = null;
    };
  }, [profile.id, admin, join]);

  useEffect(() => {
    if (historyPrepend.current) { historyPrepend.current = false; return; }
    bottom.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [messages, typing]);

  function emitTyping(value, id = selectedRef.current) {
    if (!value) typingSentAt.current = 0;
    const socket = socketRef.current;
    if (socket?.connected && id) socket.volatile.emit('chat:typing', { userId: id, typing: value });
  }
  async function select(id) {
    if (id === selectedRef.current || loading || sending) return;
    emitTyping(false); clearTimeout(typingTimer.current);
    selectedRef.current = id; setSelected(id); setMessages([]); setText(''); setTyping({}); setHasMore(false); setError('');
    pendingMessage.current = null;
    setUnread(previous => ({ ...previous, [id]: 0 }));
    await join(socketRef.current, id);
  }
  function changeText(value) {
    setText(value); pendingMessage.current = null;
    clearTimeout(typingTimer.current);
    if (Date.now() - typingSentAt.current > 700 || !value) { emitTyping(Boolean(value)); typingSentAt.current = Date.now(); }
    typingTimer.current = setTimeout(() => emitTyping(false), 1500);
  }
  async function send(event) {
    event.preventDefault();
    if (!text.trim() || sending || !selected) return;
    const id = selected;
    const payload = pendingMessage.current || { userId: id, text: text.trim(), clientMessageId: crypto.randomUUID() };
    pendingMessage.current = payload; setSending(true); setError('');
    try {
      const result = await request(socketRef.current, 'chat:message', payload);
      if (selectedRef.current === id) {
        setMessages(previous => merge(previous, [result.message])); setText(''); pendingMessage.current = null;
      }
      clearTimeout(typingTimer.current); emitTyping(false, id);
    } catch (err) { setError(err.message); }
    finally { setSending(false); }
  }
  async function older() {
    const id = selected;
    setLoading(true); setError('');
    try {
      const result = await request(socketRef.current, 'chat:history', { userId: id, before: messages[0]?.id });
      if (selectedRef.current !== id) return;
      historyPrepend.current = true;
      setMessages(previous => merge(result.messages, previous)); setHasMore(result.hasMore);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }

  const owner = conversations.find(c => c.user.id === selected)?.user;
  const peerOnline = admin ? presence.userIds.includes(selected) : presence.adminOnline;
  const sorted = [...conversations].sort((a, b) => (b.lastMessage?.id || 0) - (a.lastMessage?.id || 0) || a.user.id - b.user.id);
  return <>
    <div className="workspace-heading">
      <div><span className="section-eyebrow">{admin ? 'АДМИНИСТРИРОВАНИЕ / ПОДДЕРЖКА' : 'ЛИЧНЫЙ КАБИНЕТ / ПОДДЕРЖКА'}</span>
        <h1>{admin ? 'Сообщения пользователей' : 'Чат с администратором'}</h1>
        <p>Обсудите бронирование, время встречи и вопросы о помещениях.</p></div>
      <span className={'chat-status ' + (connected ? 'online' : '')} role="status">{status}</span>
    </div>
    {error && <div className="notice notice-error" role="alert"><span>{error}</span>
      <button onClick={() => { if (socketRef.current?.connected && selected) void join(socketRef.current, selected); else socketRef.current?.connect(); }}>Повторить</button></div>}
    <div className={'support-chat panel ' + (!admin ? 'support-chat-user' : '')}>
      {admin && <aside className="chat-sidebar" aria-label="Диалоги пользователей">
        <div className="chat-sidebar-heading"><strong>Диалоги</strong><span>{conversations.length}</span></div>
        {sorted.length === 0 && <p className="chat-empty">Пока нет пользователей. Зарегистрируйте пользователя в другом браузере.</p>}
        {sorted.map(c => <button key={c.user.id} className={'chat-conversation ' + (selected === c.user.id ? 'selected' : '')} onClick={() => void select(c.user.id)} disabled={loading || sending}>
          <span className={'chat-avatar ' + (presence.userIds.includes(c.user.id) ? 'online' : '')}>{c.user.fullName.slice(0, 1)}</span>
          <span className="chat-preview"><strong>{c.user.fullName}</strong><small>{c.lastMessage?.text || 'Начать переписку'}</small></span>
          {unread[c.user.id] > 0 && <span className="chat-unread" aria-label="Новые сообщения">{unread[c.user.id]}</span>}
        </button>)}
      </aside>}
      <section className="chat-thread" aria-label="Переписка">
        {!selected ? <div className="chat-welcome"><Icon name="message" /><h2>Выберите диалог</h2><p>Сообщения каждого пользователя видны ему и администраторам.</p></div> : <>
          <div className="chat-thread-heading"><span className="chat-avatar"><Icon name={admin ? 'user' : 'message'} /></span>
            <div><h2>{admin ? owner?.fullName || 'Пользователь' : 'Поддержка Переговории'}</h2>
              <p className={peerOnline && connected ? 'chat-peer-online' : ''}>{connected && peerOnline ? 'В сети' : connected ? 'Сейчас не в сети · сообщение сохранится' : 'Ожидаем подключения…'}</p></div></div>
          <div className="chat-messages" role="log" aria-label="Сообщения диалога" aria-live="polite">
            {hasMore && <button className="secondary chat-older" onClick={older} disabled={loading || !connected}>Загрузить предыдущие</button>}
            {loading && <p className="chat-empty" role="status">Загрузка истории…</p>}
            {!loading && messages.length === 0 && <div className="chat-empty"><Icon name="message" /><p>Здесь начнётся ваша переписка.</p><small>Напишите первый вопрос о бронировании.</small></div>}
            {messages.map(message => <article key={message.id} className={'chat-bubble ' + (message.senderId === profile.id ? 'mine' : '')}>
              <strong>{message.senderRole === 'admin' ? 'Администратор · ' : ''}{message.senderName}</strong>
              <p>{message.text}</p><time dateTime={message.createdAt}>{time(message.createdAt)}</time>
            </article>)}
            <div ref={bottom} />
          </div>
          <div className="chat-typing" role="status">{Object.values(typing).length ? Object.values(typing).map(p => p.name).join(', ') + ' печатает…' : '\u00a0'}</div>
          <form className="chat-composer" onSubmit={send}>
            <label className="chat-input-label">Сообщение
              <textarea value={text} maxLength={2000} rows={2} disabled={!connected || sending || loading} placeholder="Напишите сообщение…" onChange={event => changeText(event.target.value)} onKeyDown={event => {
                if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); void send(event); }
              }} /></label>
            <button className="primary" disabled={!connected || loading || sending || !text.trim()} type="submit">{sending ? 'Отправка…' : 'Отправить'}</button>
            <small>{text.length}/2000 · Enter — отправить, Shift+Enter — новая строка</small>
          </form>
        </>}
      </section>
    </div>
    <div className="chat-notices" aria-live="polite">{notices.map((notice, index) => <p key={index}>{time(notice.at)} · {notice.user.role === 'admin' ? 'Администратор' : notice.user.fullName} {notice.connected ? 'подключился к чату' : 'отключился от чата'}</p>)}</div>
  </>;
}
