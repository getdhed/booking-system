import { useEffect, useState } from 'react';
import RoomForm from './components/RoomForm.jsx';
import RoomList from './components/RoomList.jsx';
import { useLocalStorage } from './hooks/useLocalStorage.js';

// Примеры помещений, если в браузере ещё нет сохранённых данных.
const initialRooms = [
  {
    id: 'example-1', name: 'Конференц-зал', roomNumber: '301',
    location: 'Корпус 1', floor: 3, capacity: 30,
    description: 'Проектор и экран', isActive: true,
  },
  {
    id: 'example-2', name: 'Переговорная комната', roomNumber: '205',
    location: 'Корпус 2', floor: 2, capacity: 8,
    description: 'Доска для записей', isActive: true,
  },
  {
    id: 'example-3', name: 'Учебная аудитория', roomNumber: '104',
    location: 'Корпус 1', floor: 1, capacity: 24,
    description: 'Временно закрыта на обслуживание', isActive: false,
  },
];

export default function App() {
  const [rooms, setRooms] = useLocalStorage('booking-system-rooms', initialRooms);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [sort, setSort] = useState('number');
  const [formOpen, setFormOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState(null);

  // Дополнительный эффект: обновляем заголовок вкладки браузера.
  useEffect(() => {
    document.title = `Помещения (${rooms.length}) — Booking System`;
  }, [rooms.length]);

  // Поиск, фильтрация и сортировка не меняют исходный массив rooms.
  const query = search.trim().toLowerCase();
  const filteredRooms = rooms
    .filter(room => {
      const text = `${room.name} ${room.roomNumber} ${room.location}`.toLowerCase();
      const matchesSearch = text.includes(query);
      const matchesStatus = status === 'all' ||
        (status === 'active' ? room.isActive : !room.isActive);
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      if (sort === 'capacity') return b.capacity - a.capacity;
      if (sort === 'name') return a.name.localeCompare(b.name, 'ru');
      return a.roomNumber.localeCompare(b.roomNumber, 'ru', { numeric: true });
    });

  function closeForm() {
    setEditingRoom(null);
    setFormOpen(false);
  }

  function saveRoom(data) {
    const duplicate = rooms.some(room =>
      room.roomNumber.toLowerCase() === data.roomNumber.toLowerCase() &&
      room.id !== editingRoom?.id
    );
    if (duplicate) return false;

    if (editingRoom) {
      // Редактирование: заменяем данные только нужного помещения.
      setRooms(previous => previous.map(room =>
        room.id === editingRoom.id ? { ...room, ...data } : room
      ));
    } else {
      // Добавление: создаём новый объект с уникальным идентификатором.
      setRooms(previous => [...previous, { ...data, id: crypto.randomUUID() }]);
    }

    closeForm();
    return true;
  }

  function deleteRoom(id) {
    if (window.confirm('Удалить помещение?')) {
      setRooms(previous => previous.filter(room => room.id !== id));
    }
  }

  function openCreate() {
    setEditingRoom(null);
    setFormOpen(true);
  }

  function openEdit(room) {
    setEditingRoom(room);
    setFormOpen(true);
  }

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
        <section className="page-heading">
          <div>
            <span className="eyebrow">Лабораторная работа №4</span>
            <h1>Помещения</h1>
            <p className="muted">Управляйте списком помещений для бронирования.</p>
          </div>
          {!formOpen && (
            <button className="primary add-button" onClick={openCreate}>
              + Добавить помещение
            </button>
          )}
        </section>

        <div className="stats">
          <div className="stat"><span>Всего помещений</span><strong>{rooms.length}</strong></div>
          <div className="stat"><span>Доступно</span><strong>{availableCount}</strong></div>
          <div className="stat"><span>Недоступно</span><strong>{rooms.length - availableCount}</strong></div>
        </div>

        {formOpen && (
          <section className="panel">
            <RoomForm room={editingRoom} onSave={saveRoom} onCancel={closeForm} />
          </section>
        )}

        <section className="panel filters">
          <label>
            Поиск
            <input type="search" value={search} onChange={event => setSearch(event.target.value)}
              placeholder="Название, номер или корпус" />
          </label>
          <label>
            Доступность
            <select value={status} onChange={event => setStatus(event.target.value)}>
              <option value="all">Все помещения</option>
              <option value="active">Доступные</option>
              <option value="inactive">Недоступные</option>
            </select>
          </label>
          <label>
            Сортировка
            <select value={sort} onChange={event => setSort(event.target.value)}>
              <option value="number">По номеру</option>
              <option value="name">По названию</option>
              <option value="capacity">По вместимости ↓</option>
            </select>
          </label>
        </section>

        <div className="results-heading">
          <h2>Список помещений</h2>
          <span className="muted">Найдено: {filteredRooms.length}</span>
        </div>
        <RoomList rooms={filteredRooms} onEdit={openEdit} onDelete={deleteRoom} />
        <footer>Данные хранятся локально в вашем браузере (localStorage).</footer>
      </main>
    </div>
  );
}
