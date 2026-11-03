import { useEffect, useState } from "react";
import { fetchRoom, fetchAmenities, getErrorMessage } from "../api.js";
import RoomGallery from "./RoomGallery.jsx";
import Icon from "./Icon.jsx";

export default function RoomPage({
  roomId,
  revision,
  canEdit,
  busy,
  onBack,
  onEdit,
  onBook,
}) {
  const [room, setRoom] = useState(null);
  const [amenities, setAmenities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    Promise.all([
      fetchRoom(roomId, controller.signal),
      fetchAmenities(controller.signal),
    ])
      .then(([data, options]) => {
        if (!controller.signal.aborted) {
          setRoom(data);
          setAmenities(options);
        }
      })
      .catch((err) => {
        if (!controller.signal.aborted) setError(err);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [roomId, revision, attempt]);

  useEffect(() => {
    if (room && !loading && !error)
      document.title = room.name + " — Переговория";
  }, [room, loading, error]);

  return (
    <div className="room-page">
      <button className="back-link" onClick={onBack}>
        <span aria-hidden="true">←</span> Все помещения
      </button>
      {loading ? (
        <div className="loading-panel" role="status">
          <span className="spinner" />
          Загружаем информацию о помещении…
        </div>
      ) : error ? (
        <div className="empty" role="alert">
          <h1>
            {error.status === 404
              ? "Помещение не найдено"
              : "Не удалось загрузить помещение"}
          </h1>
          <p>{getErrorMessage(error)}</p>
          {error.status !== 404 && (
            <button
              className="secondary"
              onClick={() => setAttempt((value) => value + 1)}
            >
              Повторить
            </button>
          )}
        </div>
      ) : (
        room && (
          <>
            <header className="room-page-heading">
              <div>
                <span className="section-eyebrow">
                  ПОМЕЩЕНИЕ № {room.roomNumber}
                </span>
                <h1>{room.name}</h1>
                <p>
                  <Icon name="pin" />
                  {room.location} · {room.floor} этаж
                </p>
              </div>
              {canEdit && (
                <button
                  className="secondary"
                  disabled={busy}
                  onClick={() => onEdit(room)}
                >
                  <Icon name="edit" />
                  Редактировать
                </button>
              )}
            </header>
            <div className="room-page-layout">
              <div className="room-page-content">
                <RoomGallery
                  key={JSON.stringify([room.imageUrl, room.galleryUrls])}
                  room={room}
                />
                <section className="room-information">
                  <h2>О помещении</h2>
                  <p className="full-description">
                    {room.description ||
                      "Подробное описание пока не добавлено."}
                  </p>
                </section>
                <section className="room-information">
                  <h2>Оснащение и удобства</h2>
                  <div className="room-amenities-grid">
                    {amenities.map((item) => {
                      const available =
                        room.amenityIds?.includes(item.id) ||
                        room.amenities?.includes(item.label);
                      return (
                        <div
                          key={item.id}
                          className={
                            "room-amenity " +
                            (available ? "available" : "missing")
                          }
                          aria-label={
                            item.label +
                            (available ? " — есть" : " — не указано")
                          }
                        >
                          <Icon name={item.icon} />
                          <span>{item.label}</span>
                          <strong aria-hidden="true">
                            {available ? "✓" : "−"}
                          </strong>
                        </div>
                      );
                    })}
                  </div>
                </section>
              </div>
              <aside
                className="room-booking-summary"
                aria-label="Характеристики и бронирование"
              >
                <span
                  className={
                    "status " + (room.isActive ? "active" : "inactive")
                  }
                >
                  <i />
                  {room.isActive
                    ? "Доступно для бронирования"
                    : "Временно недоступно"}
                </span>
                <h2>Место для вашей встречи</h2>
                <dl className="room-specs">
                  <div>
                    <dt>
                      <Icon name="users" />
                      Вместимость
                    </dt>
                    <dd>До {room.capacity} человек</dd>
                  </div>
                  <div>
                    <dt>
                      <Icon name="pin" />
                      Расположение
                    </dt>
                    <dd>{room.location}</dd>
                  </div>
                  <div>
                    <dt>
                      <Icon name="rooms" />
                      Этаж / номер
                    </dt>
                    <dd>
                      {room.floor} этаж · № {room.roomNumber}
                    </dd>
                  </div>
                </dl>
                {canEdit ? (
                  <p className="booking-help">
                    Пользователи могут отправить заявку на это помещение.
                    Изменить фото и описание можно через «Редактировать».
                  </p>
                ) : (
                  <>
                    <button
                      className="primary full-width book-room-button"
                      disabled={busy || !room.isActive}
                      onClick={() => onBook(room)}
                    >
                      <Icon name="calendar" />
                      {room.isActive
                        ? "Забронировать помещение"
                        : "Бронирование недоступно"}
                    </button>
                    <p className="booking-help">
                      {room.isActive
                        ? "Выберите время и количество участников. После отправки заявка появится в «Моих бронированиях» со статусом «На рассмотрении»."
                        : "Сейчас приём заявок на это помещение закрыт."}
                    </p>
                  </>
                )}
              </aside>
            </div>
          </>
        )
      )}
    </div>
  );
}
