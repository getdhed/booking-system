import { useEffect, useState } from 'react';

const emptyRoom = {
  name: '', roomNumber: '', location: '', floor: '1',
  capacity: '1', description: '', isActive: true,
};

export default function RoomForm({ room, onSave, onCancel }) {
  const [form, setForm] = useState(emptyRoom);
  const [error, setError] = useState('');

  useEffect(() => {
    setForm(room ? {
      ...room,
      floor: String(room.floor),
      capacity: String(room.capacity),
    } : emptyRoom);
    setError('');
  }, [room]);

  function updateField(event) {
    const { name, type, value, checked } = event.target;
    setForm(previous => ({
      ...previous,
      [name]: type === 'checkbox' ? checked : value,
    }));
    setError('');
  }

  function submit(event) {
    event.preventDefault();

    const normalized = {
      ...form,
      name: form.name.trim(),
      roomNumber: form.roomNumber.trim(),
      location: form.location.trim(),
      description: form.description.trim(),
      floor: Number(form.floor),
      capacity: Number(form.capacity),
    };

    if (!normalized.name || !normalized.roomNumber || !normalized.location) {
      setError('Заполните название, номер и расположение.');
      return;
    }
    if (!Number.isInteger(normalized.floor) || normalized.floor < 0 ||
        !Number.isInteger(normalized.capacity) || normalized.capacity < 1) {
      setError('Этаж должен быть целым неотрицательным числом, а вместимость — целым числом от 1.');
      return;
    }

    const result = onSave(normalized);
    if (result === false) {
      setError('Помещение с таким номером уже существует.');
    }
  }

  return (
    <form className="room-form" onSubmit={submit}>
      <div className="form-heading">
        <h2>{room ? 'Редактировать помещение' : 'Добавить помещение'}</h2>
        <button type="button" className="icon-button" onClick={onCancel} aria-label="Закрыть">×</button>
      </div>

      <div className="form-grid">
        <label>Название *
          <input name="name" value={form.name} onChange={updateField}
            maxLength={100} required placeholder="Конференц-зал" />
        </label>
        <label>Номер *
          <input name="roomNumber" value={form.roomNumber} onChange={updateField}
            maxLength={20} required placeholder="301" />
        </label>
        <label>Расположение *
          <input name="location" value={form.location} onChange={updateField}
            maxLength={150} required placeholder="Корпус 1" />
        </label>
        <label>Этаж *
          <input name="floor" type="number" min="0" step="1" value={form.floor}
            onChange={updateField} required />
        </label>
        <label>Вместимость *
          <input name="capacity" type="number" min="1" step="1" value={form.capacity}
            onChange={updateField} required />
        </label>
        <label className="checkbox-field">
          <input name="isActive" type="checkbox" checked={form.isActive}
            onChange={updateField} />
          Доступно для бронирования
        </label>
      </div>

      <label>Описание
        <textarea name="description" rows="3" maxLength={500}
          value={form.description} onChange={updateField}
          placeholder="Оборудование и особенности помещения" />
      </label>
      {error && <p className="error" role="alert">{error}</p>}

      <div className="form-actions">
        <button className="secondary" type="button" onClick={onCancel}>Отмена</button>
        <button className="primary" type="submit">
          {room ? 'Сохранить изменения' : 'Добавить помещение'}
        </button>
      </div>
    </form>
  );
}
