import { useEffect, useState } from "react";
import { fetchRoom, fetchAmenities, getErrorMessage } from "../api.js";
import RoomForm from "./RoomForm.jsx";

export default function RoomEditorPage({
  roomId,
  draft,
  onSave,
  onBack,
  onCancel,
}) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setData(null);
    setError(null);
    Promise.all([
      fetchAmenities(controller.signal),
      roomId ? fetchRoom(roomId, controller.signal) : Promise.resolve(null),
    ])
      .then(([amenities, room]) => {
        if (!controller.signal.aborted) setData({ amenities, room });
      })
      .catch((err) => {
        if (!controller.signal.aborted) setError(err);
      });
    return () => controller.abort();
  }, [roomId, attempt]);
  useEffect(() => {
    document.title =
      (roomId ? "Редактировать помещение" : "Новое помещение") +
      " — Переговория";
  }, [roomId]);
  return (
    <div className="room-editor-page">
      <button className="back-link" onClick={onBack}>
        <span aria-hidden="true">←</span> Все помещения
      </button>
      <header className="workspace-heading">
        <div>
          <span className="section-eyebrow">УПРАВЛЕНИЕ ПОМЕЩЕНИЯМИ</span>
          <h1>{roomId ? "Редактировать помещение" : "Новое помещение"}</h1>
          <p>
            {roomId
              ? "Обновите описание, фотографии и удобства."
              : "Добавьте пространство и подготовьте его к бронированию."}
          </p>
        </div>
      </header>
      {error ? (
        <div className="empty" role="alert">
          <h2>Не удалось открыть редактор</h2>
          <p>{getErrorMessage(error)}</p>
          <button
            className="secondary"
            onClick={() => setAttempt((value) => value + 1)}
          >
            Повторить
          </button>
        </div>
      ) : !data ? (
        <div className="loading-panel" role="status">
          <span className="spinner" />
          Загружаем данные редактора…
        </div>
      ) : (
        <RoomForm
          room={data.room}
          initialValues={draft}
          amenities={data.amenities}
          onSave={onSave}
          onCancel={onCancel}
        />
      )}
    </div>
  );
}
