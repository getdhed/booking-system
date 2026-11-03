import { useId, useRef, useEffect } from "react";
import RoomPreview from "./RoomPreview.jsx";
import Icon from "./Icon.jsx";

export default function PhotoPicker({ photos, onChange, onError, disabled }) {
  const inputId = useId();
  const urls = useRef(new Set());
  const counter = useRef(0);
  useEffect(
    () => () => {
      urls.current.forEach((url) => URL.revokeObjectURL(url));
    },
    [],
  );

  function select(event) {
    const files = [...event.target.files];
    event.target.value = "";
    if (!files.length) return;
    if (photos.length + files.length > 9) {
      onError("Можно добавить до 9 фотографий. Сначала удалите лишние.");
      return;
    }
    if (
      files.some(
        (file) =>
          !["image/jpeg", "image/png", "image/webp"].includes(file.type),
      )
    ) {
      onError("Выберите фотографии JPEG, PNG или WebP.");
      return;
    }
    if (files.some((file) => file.size > 5 * 1024 * 1024)) {
      onError("Размер каждой фотографии должен быть не больше 5 МБ.");
      return;
    }
    const added = files.map((file) => {
      const url = URL.createObjectURL(file);
      urls.current.add(url);
      return { key: "new-" + ++counter.current, url, file };
    });
    onError("");
    onChange([...photos, ...added]);
  }

  return (
    <div className="photo-picker">
      <div className="photo-upload-area">
        <span className="photo-upload-icon">
          <Icon name="image" />
        </span>
        <div>
          <strong>Покажите помещение с разных сторон</strong>
          <p>
            Выберите сразу несколько фото. Первое станет главным — порядок можно
            изменить.
          </p>
        </div>
        <label
          htmlFor={inputId}
          className={
            "secondary photo-upload-button" + (disabled ? " disabled" : "")
          }
        >
          <Icon name="plus" />
          Выбрать фотографии
        </label>
        <input
          id={inputId}
          className="visually-hidden"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          disabled={disabled}
          onChange={select}
        />
        <small>До 9 фото · JPEG, PNG, WebP · до 5 МБ каждое</small>
      </div>
      {photos.length > 0 && (
        <div className="editable-photo-grid">
          {photos.map((photo, index) => (
            <div
              className={"editable-photo " + (index === 0 ? "main-photo" : "")}
              key={photo.key}
            >
              <RoomPreview
                room={{ name: "Фото " + (index + 1), imageUrl: photo.url }}
              />
              <button
                type="button"
                className="photo-remove"
                aria-label={"Удалить фото " + (index + 1)}
                disabled={disabled}
                onClick={() =>
                  onChange(photos.filter((item) => item.key !== photo.key))
                }
              >
                ×
              </button>
              <button
                type="button"
                className="photo-set-main"
                aria-pressed={index === 0}
                disabled={disabled}
                onClick={() =>
                  onChange([
                    photo,
                    ...photos.filter((item) => item.key !== photo.key),
                  ])
                }
              >
                {index === 0 ? "✓ Главное фото" : "Сделать главным"}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
