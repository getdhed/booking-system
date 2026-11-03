import { useState } from "react";
import RoomPreview from "./RoomPreview.jsx";

export default function RoomGallery({ room }) {
  const photos = [
    ...new Set([room.imageUrl, ...(room.galleryUrls || [])].filter(Boolean)),
  ];
  const [selected, setSelected] = useState(0);
  const index = Math.min(selected, Math.max(photos.length - 1, 0));
  return (
    <section className="room-gallery" aria-label="Фотографии помещения">
      <div className="gallery-main">
        <RoomPreview
          room={{ ...room, imageUrl: photos[index] || null }}
          priority
        />
        {photos.length > 1 && (
          <span className="gallery-counter">
            {index + 1} / {photos.length}
          </span>
        )}
      </div>
      {photos.length > 1 && (
        <div className="gallery-thumbnails" aria-label="Выбор фотографии">
          {photos.map((url, i) => (
            <button
              key={url}
              type="button"
              aria-label={"Фото " + (i + 1)}
              aria-pressed={i === index}
              onClick={() => setSelected(i)}
            >
              <RoomPreview room={{ ...room, imageUrl: url }} />
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
