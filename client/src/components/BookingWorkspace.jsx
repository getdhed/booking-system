import { useCallback, useEffect, useRef, useState } from "react";
import { getMyBookings, updateBooking, getErrorMessage } from "../api.js";
import { bookingStatuses } from "../booking.js";
import BookingReview from "./BookingReview.jsx";
import Icon from "./Icon.jsx";

const dateFormat = new Intl.DateTimeFormat("ru-RU", { dateStyle: "medium", timeStyle: "short" });
export default function BookingWorkspace({ isAdmin, rooms, roomsLoading, roomsError, reloadRooms }) {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("all");
  const [review, setReview] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [notice, setNotice] = useState("");
  const controllerRef = useRef(null);
  const mounted = useRef(true);
  const load = useCallback(async () => {
    controllerRef.current?.abort();
    const controller = new AbortController(); controllerRef.current = controller;
    setLoading(true); setError("");
    try {
      const data = await getMyBookings(controller.signal);
      if (!Array.isArray(data)) throw new Error("Некорректный ответ сервера.");
      if (!controller.signal.aborted) setBookings(data);
    } catch (err) {
      if (!controller.signal.aborted) setError(getErrorMessage(err));
    } finally { if (!controller.signal.aborted) setLoading(false); }
  }, []);
  useEffect(() => {
    mounted.current = true; void load();
    return () => { mounted.current = false; controllerRef.current?.abort(); };
  }, [load]);
  async function save(data) {
    if (saving) return;
    setSaving(true); setSaveError("");
    try {
      const updated = await updateBooking(review.id, data);
      if (!mounted.current) return;
      setBookings(previous => previous.map(item => item.id === updated.id ? updated : item));
      setReview(null);
      setNotice("Заявка № " + updated.id + " сохранена. Статус: «" + (bookingStatuses.find(item => item.value === updated.status)?.label || updated.status) + "».");
    } catch (err) {
      if (mounted.current) setSaveError(getErrorMessage(err));
    } finally { if (mounted.current) setSaving(false); }
  }
  const visible = bookings.filter(item => filter === "all" || item.status === filter)
    .sort((a, b) => (a.status !== "pending") - (b.status !== "pending") || b.id - a.id);
  return (
    <>
      <div className="workspace-heading">
        <div><span className="section-eyebrow">{isAdmin ? "СОГЛАСОВАНИЕ ЗАЯВОК" : "БРОНИРОВАНИЯ"}</span>
          <h1>{isAdmin ? "Заявки и бронирования" : "Мои бронирования"}</h1>
          <p>{isAdmin ? "Рассматривайте заявки, согласовывайте условия и управляйте бронированиями." : "Следите за решением и согласованными параметрами ваших встреч."}</p>
        </div>
        <button className="secondary" onClick={load} disabled={loading || saving}><Icon name="refresh" />Обновить</button>
      </div>
      {notice && <div className="notice notice-success" role="status"><span>{notice}</span><button type="button" className="icon-button" onClick={() => setNotice("")} aria-label="Закрыть уведомление">×</button></div>}
      <div className="booking-filters" role="group" aria-label="Фильтр заявок по статусу">
        {[{ value: "all", label: "Все заявки" }, ...bookingStatuses].map(item => <button key={item.value} className={"booking-filter " + (filter === item.value ? "selected" : "")} aria-pressed={filter === item.value} onClick={() => setFilter(item.value)}>
          {item.label}<span>{bookings.filter(booking => item.value === "all" || booking.status === item.value).length}</span>
        </button>)}
      </div>
      {loading ? <div className="loading-panel" role="status"><span className="spinner" />Загрузка заявок…</div>
        : error ? <div className="loading-panel" role="alert"><p className="error">{error}</p><button className="secondary" onClick={load}>Повторить</button></div>
        : visible.length ? <div className="data-table-wrap"><table className="data-table bookings-table">
          <thead><tr><th>Заявка / помещение</th>{isAdmin && <th>Заявитель</th>}<th>Дата и время</th><th>Статус</th>{isAdmin && <th>Действие</th>}</tr></thead>
          <tbody>{visible.map(booking => <tr key={booking.id}>
            <td><span className="table-detail">Заявка № {booking.id}</span><strong>{booking.room?.name || "Помещение № " + booking.roomId}</strong><span className="table-detail">{booking.purpose}</span><span className="table-detail">Участников: {booking.attendeeCount}</span>{booking.notes && <p className="booking-note"><strong>Комментарий:</strong> {booking.notes}</p>}</td>
            {isAdmin && <td><strong>{booking.user?.fullName || "Пользователь № " + booking.userId}</strong>{booking.user?.email && <a className="booking-email" href={"mailto:" + booking.user.email}>{booking.user.email}</a>}</td>}
            <td className="booking-time"><span>{dateFormat.format(new Date(booking.startTime))}</span><span className="table-detail">до {dateFormat.format(new Date(booking.endTime))}</span></td>
            <td><span className={"table-status " + booking.status}>{bookingStatuses.find(item => item.value === booking.status)?.label || booking.status}</span></td>
            {isAdmin && <td><button className="secondary booking-review-button" onClick={() => { setSaveError(""); setReview(booking); }} disabled={saving || roomsLoading || Boolean(roomsError)} aria-label={(booking.status === "pending" ? "Рассмотреть заявку № " : "Изменить заявку № ") + booking.id}>{booking.status === "pending" ? "Рассмотреть" : "Изменить"}</button></td>}
          </tr>)}</tbody>
        </table></div> : <div className="empty"><Icon name="calendar" /><h2>{bookings.length ? "Нет заявок с таким статусом" : "Заявок пока нет"}</h2><p>{bookings.length ? "Выберите другой фильтр." : isAdmin ? "Здесь появятся заявки пользователей." : "Выберите помещение в каталоге и отправьте заявку."}</p></div>}
      {isAdmin && roomsError && <div className="editor-error" role="alert">Не удалось загрузить помещения для редактирования. <button className="secondary" onClick={reloadRooms}>Повторить</button></div>}
      {review && isAdmin && <BookingReview key={review.id} booking={review} rooms={rooms} busy={saving} error={saveError} onSave={save} onClose={() => { if (!saving) setReview(null); }} />}
    </>
  );
}
