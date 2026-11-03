import { useState } from "react";
import Modal from "./Modal.jsx";
import { bookingStatuses, toLocalInput } from "../booking.js";

export default function BookingReview({ booking, rooms, busy, error, onSave, onClose }) {
  const [form, setForm] = useState(() => ({
    roomId: String(booking.roomId),
    startTime: toLocalInput(booking.startTime),
    endTime: toLocalInput(booking.endTime),
    attendeeCount: String(booking.attendeeCount),
    purpose: booking.purpose,
    notes: booking.notes || "",
    status: booking.status,
  }));
  const [validation, setValidation] = useState("");
  const options = rooms.some(room => room.id === booking.roomId)
    ? rooms : [...rooms, booking.room].filter(Boolean);
  const selectedRoom = options.find(room => room.id === Number(form.roomId));
  function change(event) {
    setForm(previous => ({ ...previous, [event.target.name]: event.target.value }));
    setValidation("");
  }
  function submit(event) {
    event.preventDefault();
    if (busy) return;
    const start = new Date(form.startTime), end = new Date(form.endTime);
    const count = Number(form.attendeeCount);
    const status = event.nativeEvent.submitter?.value || form.status;
    if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || end <= start) {
      setValidation("Время окончания должно быть позже времени начала."); return;
    }
    if (!selectedRoom || !Number.isInteger(count) || count < 1 || count > selectedRoom.capacity) {
      setValidation("Проверьте помещение и количество участников: максимум " + (selectedRoom?.capacity || "—") + "."); return;
    }
    if (!form.purpose.trim()) { setValidation("Укажите цель бронирования."); return; }
    if (status === "confirmed" && !selectedRoom.isActive) {
      setValidation("Это помещение недоступно. Выберите другое перед одобрением."); return;
    }
    onSave({
      roomId: selectedRoom.id,
      startTime: start.toISOString(), endTime: end.toISOString(),
      attendeeCount: count, purpose: form.purpose.trim(),
      notes: form.notes.trim(), status,
    });
  }
  return (
    <Modal title={"Рассмотрение заявки № " + booking.id} onClose={onClose} busy={busy}>
      <section className="booking-review">
        <div className="form-heading">
          <div><span className="section-eyebrow">СОГЛАСОВАНИЕ БРОНИРОВАНИЯ</span><h2>Заявка № {booking.id}</h2></div>
          <button className="icon-button" type="button" onClick={onClose} disabled={busy} aria-label="Закрыть">×</button>
        </div>
        <div className="booking-contact">
          <span className="muted">Заявитель</span>
          <strong>{booking.user?.fullName || "Пользователь № " + booking.userId}</strong>
          {booking.user?.email && <a href={"mailto:" + booking.user.email}>{booking.user.email}</a>}
          <p>Согласуйте изменения с заявителем. Почта открывается в вашем почтовом приложении.</p>
        </div>
        <form onSubmit={submit}>
          <fieldset disabled={busy} className="review-fields">
            <label>Помещение *
              <select name="roomId" value={form.roomId} onChange={change} required>
                {options.map(room => <option value={room.id} key={room.id}>{room.name} · № {room.roomNumber} · до {room.capacity} чел.{!room.isActive ? " · недоступно" : ""}</option>)}
              </select>
            </label>
            <div className="form-grid">
              <label>Начало *<input name="startTime" type="datetime-local" value={form.startTime} onChange={change} required /></label>
              <label>Окончание *<input name="endTime" type="datetime-local" value={form.endTime} onChange={change} required /></label>
              <label>Количество участников *<input name="attendeeCount" type="number" min="1" max={selectedRoom?.capacity} value={form.attendeeCount} onChange={change} required /></label>
              <label>Статус<select name="status" value={form.status} onChange={change}>{bookingStatuses.map(item => <option value={item.value} key={item.value}>{item.label}</option>)}</select></label>
            </div>
            <small className="muted">Время указано по часовому поясу вашего устройства.</small>
            <label>Цель бронирования *<textarea name="purpose" rows="2" maxLength={500} value={form.purpose} onChange={change} required /></label>
            <label>Комментарий для заявителя<textarea name="notes" rows="3" maxLength={2000} value={form.notes} onChange={change} placeholder="Например, согласованное время или причина отклонения" /></label>
          </fieldset>
          {(validation || error) && <p className="editor-error" role="alert">{validation || error}</p>}
          <div className="review-actions">
            <button type="button" className="secondary" onClick={onClose} disabled={busy}>Отмена</button>
            <button type="submit" className="secondary" disabled={busy}>{busy ? "Сохранение…" : "Сохранить изменения"}</button>
            {booking.status === "pending" && <>
              <button type="submit" value="rejected" className="danger" disabled={busy}>Отклонить</button>
              <button type="submit" value="confirmed" className="primary" disabled={busy}>Одобрить</button>
            </>}
          </div>
          <p className="review-hint muted">Изменения применятся вместе с выбранным решением. Комментарий будет виден пользователю.</p>
        </form>
      </section>
    </Modal>
  );
}
