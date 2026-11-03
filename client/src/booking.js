export const bookingStatuses = [
  { value: "pending", label: "На рассмотрении" },
  { value: "confirmed", label: "Одобрена" },
  { value: "rejected", label: "Отклонена" },
  { value: "completed", label: "Завершена" },
  { value: "cancelled", label: "Отменена" },
];
export function toLocalInput(value) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "";
  const pad = number => String(number).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
