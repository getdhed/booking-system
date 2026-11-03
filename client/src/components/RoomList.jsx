import RoomForm from './RoomForm.jsx';

export default function RoomList({
  rooms, editingRoom, onEdit, onDelete, onSave, onCancel, canEdit, busy, onBook
}) {
  if (rooms.length === 0) {
    return (
      <div className="empty">
        Помещения не найдены. Измените фильтры или добавьте новое помещение.
      </div>
    );
  }

  return (
    <div className="room-grid">
      {rooms.map(room => (
        <article key={room.id}
          className={'room-card' + (editingRoom?.id === room.id ? ' editing-card' : '') +
            (room.pending ? ' pending-card' : '')}>
          {editingRoom?.id === room.id ? (
            <RoomForm room={room} onSave={onSave} onCancel={onCancel} />
          ) : (
            <>
              <div className="room-details">
                <div className="card-top">
                <span className="room-number">№ {room.roomNumber}</span>
                <span className={room.isActive ? 'status active' : 'status inactive'}>
                  {room.isActive ? 'Доступно' : 'Недоступно'}
                </span>
              </div>
              <h3>{room.name}</h3>
              <p className="muted">{room.location} · {room.floor} этаж</p>
              <p>Вместимость: <strong>{room.capacity} чел.</strong></p>
              <p className="description">{room.description || 'Описание не указано'}</p>
              {room.pending && <p className="pending-label" role="status">Сохранение...</p>}
              </div>
              <div className="card-actions">
                {!canEdit && room.isActive && <button className="primary" disabled={busy || room.pending}
                  onClick={() => onBook(room)}>Забронировать</button>}
                {canEdit && <button className="secondary" onClick={() => onEdit(room)}
                  disabled={busy || room.pending}>Редактировать</button>}
                {canEdit && <button className="danger" onClick={() => onDelete(room.id)}
                  disabled={busy || room.pending}>Удалить</button>}
              </div>
            </>
          )}
        </article>
      ))}
    </div>
  );
}
