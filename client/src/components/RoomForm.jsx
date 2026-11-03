import RoomPreview from "./RoomPreview.jsx";
import { useEffect, useState } from "react";

const emptyRoom = {
  name: "",
  roomNumber: "",
  location: "",
  floor: "1",
  capacity: "1",
  description: "",
  imageUrl: "",
  isActive: true,
};

export default function RoomForm({ room, initialValues, onSave, onCancel }) {
  const [form, setForm] = useState(emptyRoom);
  const [error, setError] = useState("");

  useEffect(() => {
    const source = initialValues || room;
    setForm(
      source
        ? {
            ...emptyRoom,
            ...source,
            imageUrl: source.imageUrl || "",
            floor: String(source.floor),
            capacity: String(source.capacity),
          }
        : emptyRoom,
    );
    setError("");
  }, [room, initialValues]);

  function updateField(event) {
    const { name, type, value, checked } = event.target;
    setForm((previous) => ({
      ...previous,
      [name]: type === "checkbox" ? checked : value,
    }));
    setError("");
  }

  function submit(event) {
    event.preventDefault();

    // На сервер отправляем только поля модели Room, без id и createdAt.
    const normalized = {
      name: form.name.trim(),
      roomNumber: form.roomNumber.trim(),
      location: form.location.trim(),
      description: form.description.trim(),
      imageUrl: form.imageUrl.trim() || null,
      floor: Number(form.floor),
      capacity: Number(form.capacity),
      isActive: form.isActive,
    };

    if (!normalized.name || !normalized.roomNumber || !normalized.location) {
      setError("Заполните название, номер и расположение.");
      return;
    }
    if (
      !Number.isInteger(normalized.floor) ||
      normalized.floor < 0 ||
      !Number.isInteger(normalized.capacity) ||
      normalized.capacity < 1
    ) {
      setError(
        "Этаж должен быть целым неотрицательным числом, а вместимость — целым числом от 1.",
      );
      return;
    }

    if (onSave(normalized) === false) {
      setError(
        "Помещение с таким номером уже существует или операция недоступна.",
      );
    }
  }

  return (
    <form className="room-form" onSubmit={submit}>
      <div className="form-heading">
        <h2>{room ? "Редактировать помещение" : "Добавить помещение"}</h2>
        <button
          type="button"
          className="icon-button"
          onClick={onCancel}
          aria-label="Закрыть"
        >
          ×
        </button>
      </div>

      <div className="form-grid">
        <label>
          Название *
          <input
            name="name"
            value={form.name}
            onChange={updateField}
            maxLength={100}
            required
            placeholder="Конференц-зал"
          />
        </label>
        <label>
          Номер *
          <input
            name="roomNumber"
            value={form.roomNumber}
            onChange={updateField}
            maxLength={20}
            required
            placeholder="301"
          />
        </label>
        <label>
          Расположение *
          <input
            name="location"
            value={form.location}
            onChange={updateField}
            maxLength={150}
            required
            placeholder="Корпус 1"
          />
        </label>
        <label>
          Этаж *
          <input
            name="floor"
            type="number"
            min="0"
            step="1"
            value={form.floor}
            onChange={updateField}
            required
          />
        </label>
        <label>
          Вместимость *
          <input
            name="capacity"
            type="number"
            min="1"
            step="1"
            value={form.capacity}
            onChange={updateField}
            required
          />
        </label>
        <label className="checkbox-field">
          <input
            name="isActive"
            type="checkbox"
            checked={form.isActive}
            onChange={updateField}
          />
          Доступно для бронирования
        </label>
      </div>

      <label className="image-url-field">
        Ссылка на фото
        <input
          name="imageUrl"
          type="url"
          pattern="https?://.+"
          maxLength={2048}
          value={form.imageUrl}
          onChange={updateField}
          placeholder="https://example.com/room.jpg"
        />
        <small className="muted">
          Необязательно. Без фото показывается пример интерьера.
        </small>
      </label>
      <RoomPreview room={{ ...form, imageUrl: form.imageUrl.trim() }} />
      <label>
        Описание
        <textarea
          name="description"
          rows="3"
          maxLength={500}
          value={form.description}
          onChange={updateField}
          placeholder="Оборудование и особенности помещения"
        />
      </label>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}

      <div className="form-actions">
        <button className="secondary" type="button" onClick={onCancel}>
          Отмена
        </button>
        <button className="primary" type="submit">
          {room ? "Сохранить изменения" : "Добавить помещение"}
        </button>
      </div>
    </form>
  );
}
