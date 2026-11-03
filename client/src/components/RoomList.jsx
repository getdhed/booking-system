import RoomForm from './RoomForm.jsx';

export default function RoomList({
  rooms, editingRoom, onEdit, onDelete, onSave, onCancel, canEdit, busy
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
              <div className="card-actions">
                <button className="secondary" onClick={() => onEdit(room)}
                  disabled={!canEdit || busy || room.pending}>Редактировать</button>
                <button className="danger" onClick={() => onDelete(room.id)}
                  disabled={!canEdit || busy || room.pending}>Удалить</button>
              </div>
            </>
          )}
        </article>
      ))}
    </div>
  );
}
