import { useCallback, useEffect, useRef, useState } from 'react';
import RoomForm from './components/RoomForm.jsx';
import RoomList from './components/RoomList.jsx';
import BookingForm from './components/BookingForm.jsx';
import AuthPage, { Brand } from './components/AuthPage.jsx';
import {
  hasSession, getProfile, getErrorMessage, fetchRooms, addRoom, updateRoom, deleteRoom,
  getMyBookings, getUsers, createBooking, signOut
} from './api.js';

function currentRoute() {
  return window.location.pathname === '/register' ? '/register' : '/login';
}

function roleLabel(role) {
  return role === 'admin' ? 'Администратор' : 'Пользователь';
}

export default function App() {
  const [route, setRoute] = useState(currentRoute);
  const [profile, setProfile] = useState(null);
  const [checking, setChecking] = useState(hasSession());
  const [authError, setAuthError] = useState('');
  const [activeTab, setActiveTab] = useState('rooms');

  // Первая страница доступна только после проверки /profile на сервере.
  const loadProfile = useCallback(async () => {
    setChecking(true);
    setAuthError('');
    try {
      const user = await getProfile();
      if (!['user', 'admin'].includes(user?.role)) throw new Error('Неизвестная роль аккаунта.');
      setProfile(user);
      setActiveTab('rooms');
      window.history.replaceState({}, '', '/');
    } catch (error) {
      setProfile(null);
      setAuthError(getErrorMessage(error));
    } finally { setChecking(false); }
  }, []);

  useEffect(() => {
    if (hasSession()) void loadProfile();
    const onPopState = () => setRoute(currentRoute());
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [loadProfile]);

  function navigate(url) {
    window.history.pushState({}, '', url);
    setRoute(url);
    setAuthError('');
  }

  async function logout() {
    try { await signOut(); }
    catch (error) { console.warn('Ошибка серверного выхода:', getErrorMessage(error)); }
    setProfile(null);
    setRooms([]);
    navigate('/login');
  }

  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState(null);
  const [mutationPending, setMutationPending] = useState(false);
  const controllerRef = useRef(null);

  const [search, setSearch] = useState('');
  const [roomType, setRoomType] = useState('all');
  const [status, setStatus] = useState('all');
  const [sort, setSort] = useState('number');
  const [formOpen, setFormOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState(null);
  const [draft, setDraft] = useState(null);
  const [bookingRoom, setBookingRoom] = useState(null);
  const [bookingBusy, setBookingBusy] = useState(false);

  const [bookings, setBookings] = useState([]);
  const [bookingsLoading, setBookingsLoading] = useState(false);
  const [bookingsError, setBookingsError] = useState('');
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersError, setUsersError] = useState('');

  const isAdmin = profile?.role === 'admin';

  const loadRooms = useCallback(async () => {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    setLoading(true);
    setError('');
    try {
      const data = await fetchRooms(controller.signal);
      if (!Array.isArray(data)) throw new Error('Некорректный ответ сервера.');
      if (!controller.signal.aborted) setRooms(data);
    } catch (err) {
      if (!controller.signal.aborted) setError(getErrorMessage(err));
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (profile) void loadRooms();
    return () => controllerRef.current?.abort();
  }, [profile?.id, loadRooms]);

  const loadBookings = useCallback(async () => {
    setBookingsLoading(true);
    setBookingsError('');
    try {
      const data = await getMyBookings();
      setBookings(Array.isArray(data) ? data : []);
    } catch (err) { setBookingsError(getErrorMessage(err)); }
    finally { setBookingsLoading(false); }
  }, []);

  const loadUsers = useCallback(async () => {
    setUsersLoading(true);
    setUsersError('');
    try {
      const data = await getUsers();
      setUsers(Array.isArray(data) ? data : []);
    } catch (err) { setUsersError(getErrorMessage(err)); }
    finally { setUsersLoading(false); }
  }, []);

  useEffect(() => {
    if (!profile) return;
    if (activeTab === 'bookings') void loadBookings();
    if (activeTab === 'users' && isAdmin) void loadUsers();
  }, [profile?.id, activeTab, isAdmin, loadBookings, loadUsers]);

  useEffect(() => {
    document.title = profile ? 'Личный кабинет — BookingSpace' : 'Вход — BookingSpace';
  }, [profile]);

  function closeForm() { setEditingRoom(null); setFormOpen(false); setDraft(null); }

  function showMutationError(err) {
    setNotice({ type: 'error', message: getErrorMessage(err) + ' Изменение отменено.' });
    if (err.status === 401) void loadProfile();
  }

  async function createOptimistically(data) {
    const tempId = 'temp-' + Date.now() + '-' + Math.random().toString(36).slice(2);
    setMutationPending(true);
    setRooms(previous => [...previous, { ...data, id: tempId, pending: true }]);
    closeForm();
    try {
      const created = await addRoom(data);
      setRooms(previous => previous.map(room => room.id === tempId ? created : room));
      setNotice({ type: 'success', message: 'Помещение успешно добавлено.' });
    } catch (err) {
      setRooms(previous => previous.filter(room => room.id !== tempId));
      setDraft(data);
      setFormOpen(true);
      showMutationError(err);
    } finally { setMutationPending(false); }
  }

  async function updateOptimistically(original, data) {
    setMutationPending(true);
    setRooms(previous => previous.map(room =>
      room.id === original.id ? { ...room, ...data, pending: true } : room
    ));
    closeForm();
    try {
      const updated = await updateRoom(original.id, data);
      setRooms(previous => previous.map(room => room.id === original.id ? updated : room));
      setNotice({ type: 'success', message: 'Изменения сохранены.' });
    } catch (err) {
      setRooms(previous => previous.map(room => room.id === original.id ? original : room));
      setEditingRoom(original);
      showMutationError(err);
    } finally { setMutationPending(false); }
  }

  function saveRoom(data) {
    if (!isAdmin || mutationPending) return false;
    if (rooms.some(room => room.roomNumber.toLowerCase() === data.roomNumber.toLowerCase() &&
      room.id !== editingRoom?.id)) return false;
    if (editingRoom) void updateOptimistically(editingRoom, data);
    else void createOptimistically(data);
    return true;
  }

  async function removeRoom(id) {
    if (!isAdmin || mutationPending || !window.confirm('Удалить помещение?')) return;
    const index = rooms.findIndex(room => room.id === id);
    if (index < 0) return;
    const removed = rooms[index];
    setMutationPending(true);
    setRooms(previous => previous.filter(room => room.id !== id));
    try {
      await deleteRoom(id);
      setNotice({ type: 'success', message: 'Помещение удалено.' });
    } catch (err) {
      setRooms(previous => {
        const next = [...previous];
        next.splice(Math.min(index, next.length), 0, removed);
        return next;
      });
      showMutationError(err);
    } finally { setMutationPending(false); }
  }

  async function submitBooking(data) {
    if (isAdmin || bookingBusy) return;
    setBookingBusy(true);
    try {
      await createBooking(data);
      setBookingRoom(null);
      setNotice({ type: 'success', message: 'Заявка создана. Посмотрите её в разделе «Мои бронирования».' });
      setActiveTab('bookings');
    } catch (err) {
      setNotice({ type: 'error', message: getErrorMessage(err) });
    } finally { setBookingBusy(false); }
  }

  const roomTypes = [...new Set(rooms.map(room => room.name).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b, 'ru'));
  const selectedType = roomTypes.includes(roomType) ? roomType : 'all';
  const query = search.trim().toLowerCase();
  const filteredRooms = rooms.filter(room => {
    const text = [room.name, room.roomNumber, room.location].join(' ').toLowerCase();
    return text.includes(query) && (selectedType === 'all' || selectedType === room.name) &&
      (status === 'all' || (status === 'active' ? room.isActive : !room.isActive));
  }).sort((a, b) => {
    if (sort === 'capacity') return b.capacity - a.capacity;
    if (sort === 'name') return a.name.localeCompare(b.name, 'ru');
    return a.roomNumber.localeCompare(b.roomNumber, 'ru', { numeric: true });
  });

  if (checking) {
    return <div className="app-loading" role="status"><span className="spinner" />Проверяем вашу сессию...</div>;
  }
  if (!profile) {
    return <><AuthPage key={route} mode={route === '/register' ? 'register' : 'login'}
      onNavigate={navigate} onAuthenticated={loadProfile} />
      {authError && <div className="session-error" role="alert">{authError}</div>}</>;
  }

  return <div className="dashboard-shell">
    <header className="site-header">
      <div className="site-header-inner">
        <div className="site-brand"><Brand /></div>
        <nav className="site-nav" aria-label="Основная навигация">
          <button className={'nav-link ' + (activeTab === 'rooms' ? 'selected' : '')}
            onClick={() => setActiveTab('rooms')}>Помещения</button>
          <button className={'nav-link ' + (activeTab === 'bookings' ? 'selected' : '')}
            onClick={() => setActiveTab('bookings')}>{isAdmin ? 'Бронирования' : 'Мои бронирования'}</button>
          {isAdmin && <button className={'nav-link ' + (activeTab === 'users' ? 'selected' : '')}
            onClick={() => setActiveTab('users')}>Пользователи</button>}
          <button className={'nav-link ' + (activeTab === 'profile' ? 'selected' : '')}
            onClick={() => setActiveTab('profile')}>Профиль</button>
        </nav>
        <div className="site-account">
          <div className="account-copy"><strong>{profile.fullName}</strong>
            <span>{roleLabel(profile.role)}</span></div>
          <button type="button" className="logout-button" onClick={logout}>Выйти</button>
        </div>
      </div>
    </header>
    <div className="dashboard-main">
      <main className="workspace">
        {notice && <div className={'notice ' + (notice.type === 'error' ? 'notice-error' : 'notice-success')}
          role={notice.type === 'error' ? 'alert' : 'status'}>
          <span>{notice.message}</span><button aria-label="Закрыть" onClick={() => setNotice(null)}>×</button>
        </div>}

        {activeTab === 'rooms' && <>
          <div className="workspace-heading"><div>
            <span className="section-eyebrow">{isAdmin ? 'ПАНЕЛЬ АДМИНИСТРАТОРА' : 'ВАШЕ ПРОСТРАНСТВО'}</span>
            <h1>{isAdmin ? 'Управление помещениями' : 'Доступные помещения'}</h1>
            <p>{isAdmin ? 'Создавайте помещения и управляйте их доступностью.' :
              'Исследуйте каталог помещений и выбирайте подходящее пространство.'}</p></div>
            {isAdmin && <button className="primary" disabled={mutationPending || loading || Boolean(error)}
              onClick={() => { setEditingRoom(null); setDraft(null); setFormOpen(true); }}>+ Добавить помещение</button>}
          </div>
          <div className="stat-grid">
            <div className="stat-card"><span>Всего помещений</span><strong>{rooms.length}</strong><small>В базе данных</small></div>
            <div className="stat-card"><span>Доступно</span><strong>{rooms.filter(r => r.isActive).length}</strong><small>Для использования</small></div>
            <div className="stat-card"><span>Недоступно</span><strong>{rooms.filter(r => !r.isActive).length}</strong><small>Временно закрыто</small></div>
          </div>
          {formOpen && isAdmin && <section className="panel"><RoomForm room={null} initialValues={draft} onSave={saveRoom} onCancel={closeForm} /></section>}
          {bookingRoom && !isAdmin && <BookingForm room={bookingRoom} busy={bookingBusy}
            onCancel={() => setBookingRoom(null)} onCreate={submitBooking} />}
          <div className="catalog-layout">
            <aside className="catalog-filters">
              <section className="panel search-panel">
            <label className="search-field">Поиск помещения
              <input value={search} type="search" placeholder="Название, номер или расположение..."
                onChange={event => setSearch(event.target.value)} /></label>
            <div className="filters-row">
              <label>Тип помещения<select value={selectedType} onChange={event => setRoomType(event.target.value)}>
                <option value="all">Все типы</option>
                {roomTypes.map(type => <option key={type} value={type}>{type}</option>)}
              </select></label>
              <label>Статус<select value={status} onChange={event => setStatus(event.target.value)}>
                <option value="all">Все помещения</option><option value="active">Доступные</option>
                <option value="inactive">Недоступные</option>
              </select></label>
              <label>Сортировка<select value={sort} onChange={event => setSort(event.target.value)}>
                <option value="number">По номеру</option><option value="name">По названию</option>
                <option value="capacity">По вместимости ↓</option>
              </select></label>
            </div>
              </section>
            </aside>
            <section className="catalog-results">
          <div className="results-heading"><h2>Список помещений</h2><span className="muted">Найдено: {filteredRooms.length}</span></div>
          {loading ? <div className="loading-panel" role="status"><span className="spinner" />Загрузка с сервера...</div> :
            error ? <div className="loading-panel" role="alert"><p className="error">{error}</p>
              <button className="secondary" onClick={loadRooms}>Повторить</button></div> :
            <RoomList rooms={filteredRooms} editingRoom={editingRoom} onEdit={room => {setEditingRoom(room);setFormOpen(false);}}
              onDelete={removeRoom} onSave={saveRoom} onCancel={closeForm}
              canEdit={isAdmin} busy={mutationPending || bookingBusy}
              onBook={room => setBookingRoom(room)} />}
            </section>
          </div>
          {mutationPending && <p className="muted" role="status">Сохранение изменений на сервере...</p>}
        </>}

        {activeTab === 'bookings' && <>
          <div className="workspace-heading"><div><span className="section-eyebrow">БРОНИРОВАНИЯ</span>
            <h1>{isAdmin ? 'Все бронирования' : 'Мои бронирования'}</h1>
            <p>{isAdmin ? 'Просмотр записей всех пользователей.' : 'История бронирований вашей учётной записи.'}</p></div>
            <button className="secondary" onClick={loadBookings}>↻ Обновить</button></div>
          {bookingsLoading ? <div className="loading-panel"><span className="spinner" />Загрузка...</div> :
            bookingsError ? <div className="loading-panel"><p className="error">{bookingsError}</p><button onClick={loadBookings}>Повторить</button></div> :
            bookings.length ? <div className="data-table-wrap"><table className="data-table"><thead><tr>
              <th>№</th><th>Помещение</th><th>Начало</th><th>Окончание</th><th>Статус</th></tr></thead><tbody>
              {bookings.map(booking => <tr key={booking.id}><td>#{booking.id}</td>
                <td>{booking.room?.name || 'Помещение №' + booking.roomId}</td>
                <td>{new Date(booking.startTime).toLocaleString('ru-RU')}</td>
                <td>{new Date(booking.endTime).toLocaleString('ru-RU')}</td>
                <td><span className="table-status">{booking.status}</span></td></tr>)}
            </tbody></table></div> :
            <div className="empty">Бронирований пока нет.</div>}
        </>}

        {activeTab === 'users' && isAdmin && <>
          <div className="workspace-heading"><div><span className="section-eyebrow">АДМИНИСТРИРОВАНИЕ</span>
            <h1>Пользователи</h1><p>Зарегистрированные аккаунты и их роли в системе.</p></div>
            <button className="secondary" onClick={loadUsers}>↻ Обновить</button></div>
          {usersLoading ? <div className="loading-panel"><span className="spinner" />Загрузка...</div> :
            usersError ? <div className="loading-panel"><p className="error">{usersError}</p><button onClick={loadUsers}>Повторить</button></div> :
            <div className="data-table-wrap"><table className="data-table"><thead>
              <tr><th>ID</th><th>Имя</th><th>Почта</th><th>Роль</th></tr></thead><tbody>
              {users.map(user => <tr key={user.id}><td>#{user.id}</td><td>{user.fullName}</td>
                <td>{user.email}</td><td><span className="table-status">{roleLabel(user.role)}</span></td></tr>)}
              </tbody></table></div>}
        </>}

        {activeTab === 'profile' && <><div className="workspace-heading"><div>
          <span className="section-eyebrow">ЛИЧНЫЙ КАБИНЕТ</span><h1>Мой профиль</h1>
          <p>Информация вашей учётной записи.</p></div></div>
          <section className="profile-panel">
            <div className="profile-head"><div className="avatar avatar-large">
              {profile.fullName?.charAt(0)?.toUpperCase() || 'U'}</div>
              <div><h2>{profile.fullName}</h2><span className={'role-pill ' + (isAdmin ? 'role-admin' : '')}>
                {roleLabel(profile.role)}</span></div></div>
            <div className="profile-fields"><div><span>Электронная почта</span><strong>{profile.email}</strong></div>
              <div><span>Идентификатор аккаунта</span><strong>#{profile.id}</strong></div>
              <div><span>Уровень доступа</span><strong>{roleLabel(profile.role)}</strong></div></div>
          </section></>}
      </main>
    </div>
  </div>;
}
