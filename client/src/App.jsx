import { useCallback, useEffect, useRef, useState } from 'react';
import RoomForm from './components/RoomForm.jsx';
import RoomList from './components/RoomList.jsx';
import {
  fetchRooms, addRoom, updateRoom, deleteRoom,
  signIn, signOut, hasSession, getErrorMessage
} from './api.js';

export default function App() {
  // Список хранится в React, а источник истины теперь PostgreSQL.
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState(null);
  const [mutationPending, setMutationPending] = useState(false);
  const controllerRef = useRef(null);

  const [authenticated, setAuthenticated] = useState(hasSession());
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authBusy, setAuthBusy] = useState(false);
  const [authError, setAuthError] = useState('');

  const [search, setSearch] = useState('');
  const [roomType, setRoomType] = useState('all');
  const [status, setStatus] = useState('all');
  const [sort, setSort] = useState('number');
  const [formOpen, setFormOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState(null);
  const [draft, setDraft] = useState(null);

  // Выбранное улучшение ЛР №5: AbortController отменяет устаревший GET.
  const loadRooms = useCallback(async () => {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    setLoading(true);
    setError('');
    try {
      const data = await fetchRooms(controller.signal);
      if (!Array.isArray(data)) throw new Error('Сервер вернул некорректный список.');
      if (!controller.signal.aborted) setRooms(data);
    } catch (requestError) {
      if (!controller.signal.aborted) setError(getErrorMessage(requestError));
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRooms();
    return () => controllerRef.current?.abort();
  }, [loadRooms]);

  useEffect(() => {
    document.title = 'Помещения (' + rooms.length + ') — Booking System';
  }, [rooms.length]);

  async function login(event) {
    event.preventDefault();
    setAuthBusy(true);
    setAuthError('');
    try {
      await signIn(email.trim(), password);
      setAuthenticated(true);
      setPassword('');
      setNotice({ type: 'success', message: 'Вход выполнен. Изменения будут сохранены на сервере.' });
    } catch (loginError) {
      setAuthError(getErrorMessage(loginError));
    } finally {
      setAuthBusy(false);
    }
  }

  async function logout() {
    if (mutationPending) return;
    setAuthBusy(true);
    try {
      await signOut();
      setNotice({ type: 'success', message: 'Вы вышли из системы.' });
    } catch (logoutError) {
      setNotice({ type: 'error', message: 'Локальный выход выполнен. ' + getErrorMessage(logoutError) });
    } finally {
      setAuthenticated(false);
      setAuthBusy(false);
      closeForm();
    }
  }

  function closeForm() {
    setEditingRoom(null);
    setFormOpen(false);
    setDraft(null);
  }

  function showMutationError(mutationError) {
    if (mutationError.status === 401) setAuthenticated(false);
    setNotice({ type: 'error', message: getErrorMessage(mutationError) + ' Изменение отменено.' });
  }

  async function createOptimistically(data) {
    const temporaryId = 'temp-' + Date.now() + '-' + Math.random().toString(36).slice(2);
    setMutationPending(true);
    setRooms(previous => [...previous, { ...data, id: temporaryId, pending: true }]);
    closeForm();

    try {
      const saved = await addRoom(data);
      setRooms(previous => previous.map(room => room.id === temporaryId ? saved : room));
      setNotice({ type: 'success', message: 'Помещение добавлено в базу данных.' });
    } catch (requestError) {
      // POST не удался: убираем временную карточку и восстанавливаем форму.
      setRooms(previous => previous.filter(room => room.id !== temporaryId));
      setDraft(data);
      setFormOpen(true);
      showMutationError(requestError);
    } finally {
      setMutationPending(false);
    }
  }

  async function updateOptimistically(original, data) {
    setMutationPending(true);
    setRooms(previous => previous.map(room =>
      room.id === original.id ? { ...room, ...data, pending: true } : room
    ));
    closeForm();

    try {
      const saved = await updateRoom(original.id, data);
      setRooms(previous => previous.map(room => room.id === original.id ? saved : room));
      setNotice({ type: 'success', message: 'Изменения сохранены на сервере.' });
    } catch (requestError) {
      // PUT не удался: возвращаем прежнюю карточку и редактор.
      setRooms(previous => previous.map(room => room.id === original.id ? original : room));
      setEditingRoom(original);
      showMutationError(requestError);
    } finally {
      setMutationPending(false);
    }
  }

  function saveRoom(data) {
    if (!authenticated || mutationPending) return false;

    const duplicate = rooms.some(room =>
      room.roomNumber.toLowerCase() === data.roomNumber.toLowerCase() &&
      room.id !== editingRoom?.id
    );
    if (duplicate) return false;

    if (editingRoom) {
      void updateOptimistically(editingRoom, data);
    } else {
      void createOptimistically(data);
    }
    return true;
  }

  async function removeRoom(id) {
    if (!authenticated || mutationPending) return;
    if (!window.confirm('Удалить помещение?')) return;

    const index = rooms.findIndex(room => room.id === id);
    if (index < 0) return;
    const removed = rooms[index];

    setMutationPending(true);
    setRooms(previous => previous.filter(room => room.id !== id));
    try {
      await deleteRoom(id);
      setNotice({ type: 'success', message: 'Помещение удалено из базы данных.' });
    } catch (requestError) {
      // DELETE не удался: возвращаем карточку на исходное место.
      setRooms(previous => {
        const restored = [...previous];
        restored.splice(Math.min(index, restored.length), 0, removed);
        return restored;
      });
      showMutationError(requestError);
    } finally {
      setMutationPending(false);
    }
  }

  function openCreate() {
    if (!authenticated || mutationPending) return;
    setEditingRoom(null);
    setDraft(null);
    setFormOpen(true);
  }

  function openEdit(room) {
    if (!authenticated || mutationPending) return;
    setEditingRoom(room);
    setFormOpen(false);
  }

  // Локальные поиск и фильтрация из ЛР №4 сохранены.
  const roomTypes = [...new Set(rooms.map(room => room.name).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b, 'ru'));
  const selectedType = roomTypes.includes(roomType) ? roomType : 'all';
  const query = search.trim().toLowerCase();
  const filteredRooms = rooms
    .filter(room => {
      const text = [room.name, room.roomNumber, room.location].join(' ').toLowerCase();
      const matchesSearch = text.includes(query);
      const matchesStatus = status === 'all' ||
        (status === 'active' ? room.isActive : !room.isActive);
      const matchesType = selectedType === 'all' || room.name === selectedType;
      return matchesSearch && matchesType && matchesStatus;
    })
    .sort((a, b) => {
      if (sort === 'capacity') return b.capacity - a.capacity;
      if (sort === 'name') return a.name.localeCompare(b.name, 'ru');
      return a.roomNumber.localeCompare(b.roomNumber, 'ru', { numeric: true });
    });

  const availableCount = rooms.filter(room => room.isActive).length;

  return (
    <div className="app-shell">
      <header className="site-header">
        <div className="container header-inner">
          <span className="logo-mark">B</span>
          <strong>Booking System</strong>
          <span className="header-tag">Управление помещениями</span>
        </div>
      </header>

      <main className="container">
        {authenticated ? (
          <section className="auth-status">
            <span>Авторизация: выполнена</span>
            <button type="button" className="secondary" disabled={authBusy || mutationPending} onClick={logout}>
              {authBusy ? 'Выход...' : 'Выйти'}
            </button>
          </section>
        ) : (
          <section className="panel auth-panel">
            <h2>Вход для управления помещениями</h2>
            <p className="muted">Просмотр открыт всем. Для добавления, изменения и удаления войдите с учётной записью сервера.</p>
            <form className="login-form" onSubmit={login}>
              <label>Email
                <input type="email" autoComplete="username" value={email}
                  onChange={event => setEmail(event.target.value)} required />
              </label>
              <label>Пароль
                <input type="password" autoComplete="current-password" value={password}
                  onChange={event => setPassword(event.target.value)} required />
              </label>
              <button type="submit" className="primary" disabled={authBusy}>
                {authBusy ? 'Вход...' : 'Войти'}
              </button>
            </form>
            {authError && <p className="error" role="alert">{authError}</p>}
          </section>
        )}

        {notice && (
          <div className={'notice ' + (notice.type === 'error' ? 'notice-error' : 'notice-success')}
            role={notice.type === 'error' ? 'alert' : 'status'}>
            <span>{notice.message}</span>
            <button type="button" aria-label="Закрыть уведомление" onClick={() => setNotice(null)}>×</button>
          </div>
        )}

        {formOpen && !editingRoom ? (
          <section className="panel editor-panel">
            <RoomForm room={null} initialValues={draft} onSave={saveRoom} onCancel={closeForm} />
          </section>
        ) : (
          <>
            <section className="page-heading">
              <div>
                <h1>Помещения</h1>
                <div className="summary">
                  <span>Всего: <strong>{rooms.length}</strong></span>
                  <span>Доступно: <strong>{availableCount}</strong></span>
                </div>
              </div>
              <button className="primary add-button" onClick={openCreate}
                disabled={!authenticated || mutationPending || loading || Boolean(error)}>
                + Добавить помещение
              </button>
            </section>

            <section className="panel search-panel">
              <label className="search-field">
                Поиск помещений
                <input type="search" value={search} onChange={event => setSearch(event.target.value)}
                  placeholder="Введите название, номер или корпус" />
              </label>
              <div className="filters-row">
                <label>Тип помещения
                  <select value={selectedType} onChange={event => setRoomType(event.target.value)}>
                    <option value="all">Все типы</option>
                    {roomTypes.map(type => <option key={type} value={type}>{type}</option>)}
                  </select>
                </label>
                <label>Доступность
                  <select value={status} onChange={event => setStatus(event.target.value)}>
                    <option value="all">Все помещения</option>
                    <option value="active">Доступные</option>
                    <option value="inactive">Недоступные</option>
                  </select>
                </label>
                <label>Сортировка
                  <select value={sort} onChange={event => setSort(event.target.value)}>
                    <option value="number">По номеру</option>
                    <option value="name">По названию</option>
                    <option value="capacity">По вместимости ↓</option>
                  </select>
                </label>
              </div>
            </section>

            <div className="results-heading">
              <h2>Список помещений</h2>
              <span className="muted">Найдено: {loading ? '...' : filteredRooms.length}</span>
            </div>

            {loading ? (
              <div className="loading-panel" role="status">
                <span className="spinner" aria-hidden="true" />
                Загрузка помещений с сервера...
              </div>
            ) : error ? (
              <div className="loading-panel" role="alert">
                <p className="error">{error}</p>
                <button className="secondary" type="button" onClick={loadRooms}>Повторить</button>
              </div>
            ) : (
              <RoomList rooms={filteredRooms} editingRoom={editingRoom}
                onEdit={openEdit} onDelete={removeRoom} onSave={saveRoom} onCancel={closeForm}
                canEdit={authenticated} busy={mutationPending} />
            )}
            {mutationPending && <p role="status" className="muted">Отправка изменений на сервер...</p>}
          </>
        )}
      </main>
    </div>
  );
}
