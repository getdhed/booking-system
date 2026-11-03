import { useEffect, useState } from "react";

export default function RoomPreview({ room, priority = false }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    setFailed(false);
  }, [room.imageUrl]);
  const custom = Boolean(room.imageUrl) && !failed;
  const example =
    room.capacity > 10 ? "/rooms/conference-room.jpg" : "/rooms/workspace.jpg";
  return (
    <div className="room-preview">
      <img
        src={custom ? room.imageUrl : example}
        width="420"
        height="280"
        loading={priority ? "eager" : "lazy"}
        decoding="async"
        referrerPolicy="no-referrer"
        alt={
          custom
            ? "Фото помещения «" + room.name + "»"
            : "Пример интерьера, не фотография конкретного помещения"
        }
        onError={() => {
          if (custom) setFailed(true);
        }}
      />
      {!custom && <span className="preview-caption">Пример интерьера</span>}
    </div>
  );
}
