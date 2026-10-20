import RoomForm from './RoomForm.jsx';

export default function RoomList({ rooms, editingRoom, onEdit, onDelete, onSave, onCancel }) {
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
        <article key={room.id} className={editingRoom?.id === room.id ? 'room-card editing-card' : 'room-card'}>
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
              <p className="description">
                {room.description || 'Описание не указано'}
              </p>
              <div className="card-actions">
                <button className="secondary" onClick={() => onEdit(room)}>Редактировать</button>
                <button className="danger" onClick={() => onDelete(room.id)}>Удалить</button>
              </div>
            </>
          )}
        </article>
      ))}
    </div>
  );
}
