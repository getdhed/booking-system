import { useEffect, useRef, useState } from "react";
import { uploadRoomPhotos, getErrorMessage } from "../api.js";
import PhotoPicker from "./PhotoPicker.jsx";
import Icon from "./Icon.jsx";

export default function RoomForm({
  room,
  initialValues,
  amenities,
  onSave,
  onCancel,
}) {
  const source = initialValues || room || {};
  const [form, setForm] = useState(() => ({
    name: source.name || "",
    roomNumber: source.roomNumber || "",
    location: source.location || "",
    floor: String(source.floor ?? 1),
    capacity: String(source.capacity ?? 1),
    description: source.description || "",
    isActive: source.isActive ?? true,
    amenityIds:
      source.amenityIds ||
      amenities
        .filter((item) => source.amenities?.includes(item.label))
        .map((item) => item.id),
  }));
  const [photos, setPhotos] = useState(() =>
    [
      ...new Set(
        [source.imageUrl, ...(source.galleryUrls || [])].filter(Boolean),
      ),
    ].map((url) => ({ key: "saved-" + url, url })),
  );
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const controller = useRef(null);
  const errorRef = useRef(null);
  useEffect(() => { if (error) errorRef.current?.scrollIntoView({block: 'center'}); }, [error]);
  useEffect(() => () => controller.current?.abort(), []);

  function change(event) {
    const { name, value, type, checked } = event.target;
    setForm((previous) => ({
      ...previous,
      [name]: type === "checkbox" ? checked : value,
    }));
    setError("");
  }
  function toggle(id) {
    setForm((previous) => ({
      ...previous,
      amenityIds: previous.amenityIds.includes(id)
        ? previous.amenityIds.filter((value) => value !== id)
        : [...previous.amenityIds, id],
    }));
  }
  async function submit(event) {
    event.preventDefault();
    if (uploading) return;
    if (!form.name.trim() || !form.roomNumber.trim() || !form.location.trim()) {
      setError("Заполните название, номер и расположение.");
      return;
    }
    const floor = Number(form.floor),
      capacity = Number(form.capacity);
    if (
      !Number.isInteger(floor) ||
      floor < 0 ||
      !Number.isInteger(capacity) ||
      capacity < 1
    ) {
      setError("Укажите целый этаж от 0 и вместимость от 1.");
      return;
    }
    setUploading(true);
    setError("");
    controller.current = new AbortController();
    try {
      const pending = photos.filter((photo) => photo.file);
      const response = pending.length
        ? await uploadRoomPhotos(
            pending.map((photo) => photo.file),
            controller.current.signal,
          )
        : { photos: [] };
      if (response.photos.length !== pending.length)
        throw new Error(
          "Сервер не сохранил все фотографии. Повторите попытку.",
        );
      let index = 0;
      const saved = photos.map((photo) =>
        photo.file ? { key: photo.key, url: response.photos[index++] } : photo,
      );
      setPhotos(saved);
      const data = {
        name: form.name.trim(),
        roomNumber: form.roomNumber.trim(),
        location: form.location.trim(),
        floor,
        capacity,
        description: form.description.trim(),
        isActive: form.isActive,
        imageUrl: saved[0]?.url || null,
        galleryUrls: saved.slice(1).map((photo) => photo.url),
        amenityIds: form.amenityIds,
        amenities: amenities
          .filter((item) => form.amenityIds.includes(item.id))
          .map((item) => item.label),
      };
      if (onSave(data, room) === false)
        setError(
          "Помещение с таким номером уже существует или сохранение пока недоступно.",
        );
    } catch (err) {
      if (err.name !== "AbortError") setError(getErrorMessage(err));
    } finally {
      if (!controller.current?.signal.aborted) setUploading(false);
    }
  }

  return (
    <form className="room-editor-form" onSubmit={submit}>
      {error && <div ref={errorRef} className="editor-error" role="alert">{error}</div>}
      <fieldset disabled={uploading} className="room-editor-layout">
        <div className="room-editor-main">
          <section className="editor-section">
            <div className="editor-section-heading">
              <span>01</span>
              <div>
                <h2>Основная информация</h2>
                <p>Название, расположение и описание помещения.</p>
              </div>
            </div>
            <div className="form-grid">
              <label>
                Название *
                <input
                  name="name"
                  value={form.name}
                  onChange={change}
                  maxLength={100}
                  required
                  placeholder="Например, переговорная «Атлас»"
                />
              </label>
              <label>
                Номер *
                <input
                  name="roomNumber"
                  value={form.roomNumber}
                  onChange={change}
                  maxLength={20}
                  required
                  placeholder="201"
                />
              </label>
              <label>
                Расположение *
                <input
                  name="location"
                  value={form.location}
                  onChange={change}
                  maxLength={150}
                  required
                  placeholder="Главный корпус"
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
                  onChange={change}
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
                  onChange={change}
                  required
                />
              </label>
            </div>
            <label>
              Описание
              <textarea
                name="description"
                rows="5"
                maxLength={2000}
                value={form.description}
                onChange={change}
                placeholder="Расскажите о пространстве: для каких встреч подходит, что важно знать гостям…"
              />
            </label>
          </section>
          <section className="editor-section">
            <div className="editor-section-heading">
              <span>02</span>
              <div>
                <h2>
                  Фотографии <small>{photos.length} / 9</small>
                </h2>
                <p>Главное фото появится в каталоге, остальные — в галерее.</p>
              </div>
            </div>
            <PhotoPicker
              photos={photos}
              onChange={setPhotos}
              onError={setError}
              disabled={uploading}
            />
          </section>
          <section className="editor-section">
            <div className="editor-section-heading">
              <span>03</span>
              <div>
                <h2>Удобства и оснащение</h2>
                <p>Отметьте то, что есть в этом помещении.</p>
              </div>
            </div>
            <div className="amenity-checkbox-grid">
              {amenities.map((item) => (
                <label
                  className={
                    "amenity-option " +
                    (form.amenityIds.includes(item.id) ? "chosen" : "")
                  }
                  key={item.id}
                >
                  <input
                    type="checkbox"
                    checked={form.amenityIds.includes(item.id)}
                    onChange={() => toggle(item.id)}
                  />
                  <Icon name={item.icon} />
                  <span>{item.label}</span>
                </label>
              ))}
            </div>
          </section>
        </div>
        <aside className="editor-save-panel">
          <span className="section-eyebrow">НАСТРОЙКИ ПОМЕЩЕНИЯ</span>
          <h2>Доступность</h2>
          <label className="editor-availability">
            <input
              type="checkbox"
              name="isActive"
              checked={form.isActive}
              onChange={change}
            />
            <span>Доступно для бронирования</span>
          </label>
          <p>
            Если выключить, помещение останется в каталоге, но отправить новую
            заявку будет нельзя.
          </p>
          <dl className="editor-totals">
            <div>
              <dt>Фотографии</dt>
              <dd>{photos.length}</dd>
            </div>
            <div>
              <dt>Выбрано удобств</dt>
              <dd>{form.amenityIds.length}</dd>
            </div>
          </dl>
          <button type="submit" className="primary full-width">
            {uploading ? (
              <>
                <span className="spinner small" />
                Сохраняем…
              </>
            ) : room ? (
              "Сохранить изменения"
            ) : (
              "Добавить помещение"
            )}
          </button>
          <button
            type="button"
            className="secondary full-width"
            onClick={onCancel}
          >
            Отмена
          </button>
        </aside>
      </fieldset>

    </form>
  );
}
