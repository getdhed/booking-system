import { useState } from "react";

export default function BookingForm({ room, onCancel, onCreate, busy }) {
  const [form, setForm] = useState({
    startTime: "",
    endTime: "",
    purpose: "",
    attendeeCount: "1",
  });
  const [error, setError] = useState("");

  function change(event) {
    setForm((previous) => ({
      ...previous,
      [event.target.name]: event.target.value,
    }));
    setError("");
  }

  function submit(event) {
    event.preventDefault();
    const start = new Date(form.startTime);
    const end = new Date(form.endTime);
    const count = Number(form.attendeeCount);
    if (
      !Number.isFinite(start.getTime()) ||
      !Number.isFinite(end.getTime()) ||
      end <= start
    ) {
      setError("Время окончания должно быть позже времени начала.");
      return;
    }
    if (start <= new Date()) {
      setError("Выберите время начала в будущем.");
      return;
    }
    if (!Number.isInteger(count) || count < 1 || count > room.capacity) {
      setError("Количество участников: от 1 до " + room.capacity + ".");
      return;
    }
    if (!form.purpose.trim()) {
      setError("Укажите цель бронирования.");
      return;
    }
    onCreate({
      roomId: room.id,
      startTime: start.toISOString(),
      endTime: end.toISOString(),
      attendeeCount: count,
      purpose: form.purpose.trim(),
    });
  }

  return (
    <section className="panel booking-form-panel">
      <div className="form-heading">
        <div>
          <span className="section-eyebrow">НОВОЕ БРОНИРОВАНИЕ</span>
          <h2>
            {room.name} · № {room.roomNumber}
          </h2>
        </div>
        <button
          type="button"
          className="icon-button"
          disabled={busy}
          onClick={onCancel}
          aria-label="Закрыть"
        >
          ×
        </button>
      </div>
      <p className="muted">
        Вместимость: {room.capacity} чел. · После отправки заявка получит статус
        «На рассмотрении».
      </p>
      <form onSubmit={submit} className="room-form">
        <fieldset disabled={busy} className="form-grid">
          <label>
            Начало *
            <input
              type="datetime-local"
              name="startTime"
              value={form.startTime}
              onChange={change}
              required
            />
          </label>
          <label>
            Окончание *
            <input
              type="datetime-local"
              name="endTime"
              value={form.endTime}
              onChange={change}
              required
            />
          </label>
          <label>
            Количество участников *
            <input
              type="number"
              name="attendeeCount"
              min="1"
              max={room.capacity}
              value={form.attendeeCount}
              onChange={change}
              required
            />
          </label>
          <label>
            Цель бронирования *
            <input
              name="purpose"
              maxLength={500}
              value={form.purpose}
              onChange={change}
              placeholder="Например, рабочая встреча"
              required
            />
          </label>
        </fieldset>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <div className="form-actions">
          <button
            type="button"
            className="secondary"
            disabled={busy}
            onClick={onCancel}
          >
            Отмена
          </button>
          <button
            type="submit"
            className="primary"
            disabled={busy || !room.isActive}
          >
            {busy ? "Отправка..." : "Отправить заявку"}
          </button>
        </div>
      </form>
    </section>
  );
}
