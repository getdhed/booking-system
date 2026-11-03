import Icon from "./Icon.jsx";

export default function RoomList({
  rooms,
  onEdit,
  onDelete,
  canEdit,
  busy,
  onBook,
  hasFilters,
  onReset,
}) {
  if (!rooms.length)
    return (
      <div className="empty">
        <Icon name="rooms" />
        <h2>{hasFilters ? "Ничего не найдено" : "Каталог пока пуст"}</h2>
        <p>
          {hasFilters
            ? "Попробуйте другой запрос или сбросьте фильтры."
            : canEdit
              ? "Добавьте первое помещение, чтобы открыть его для бронирования."
              : "Помещения появятся здесь после добавления администратором."}
        </p>
        {hasFilters && (
          <button className="secondary" onClick={onReset}>
            Сбросить фильтры
          </button>
        )}
      </div>
    );

  return (
    <div className="room-grid">
      {rooms.map((room) => (
        <article
          key={room.id}
          className={"room-card" + (room.pending ? " pending-card" : "")}
        >
          <div className="room-details">
            <div className="card-top">
              <span className="room-number">ПОМЕЩЕНИЕ № {room.roomNumber}</span>
              <span
                className={"status " + (room.isActive ? "active" : "inactive")}
              >
                <i />
                {room.isActive ? "Доступно" : "Недоступно"}
              </span>
            </div>
            <h3>{room.name}</h3>
            <p className="room-location">
              <Icon name="pin" />
              {room.location} · {room.floor} этаж
            </p>
            <p className="description">
              {room.description || "Дополнительное описание не указано."}
            </p>
          </div>
          <div className="room-footer">
            <span className="room-capacity">
              <Icon name="users" />
              До {room.capacity} чел.
            </span>
            <div className="card-actions">
              {canEdit ? (
                <>
                  <button
                    className="secondary"
                    onClick={() => onEdit(room)}
                    disabled={busy || room.pending}
                  >
                    <Icon name="edit" />
                    Изменить
                  </button>
                  <button
                    className="danger delete-button"
                    aria-label={"Удалить помещение " + room.roomNumber}
                    onClick={() => onDelete(room)}
                    disabled={busy || room.pending}
                  >
                    <Icon name="trash" />
                  </button>
                </>
              ) : (
                <button
                  className="primary"
                  disabled={busy || room.pending || !room.isActive}
                  onClick={() => onBook(room)}
                >
                  {room.isActive ? "Забронировать" : "Недоступно"}
                </button>
              )}
            </div>
          </div>
          {room.pending && (
            <div className="pending-label" role="status">
              <span className="spinner small" />
              Сохранение…
            </div>
          )}
        </article>
      ))}
    </div>
  );
}
