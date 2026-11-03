import { useCallback, useEffect, useRef, useState } from "react";
import AccountMenu from "./components/AccountMenu.jsx";
import Modal from "./components/Modal.jsx";
import Icon from "./components/Icon.jsx";
import RoomEditorPage from "./components/RoomEditorPage.jsx";
import RoomPage from "./components/RoomPage.jsx";
import RoomList from "./components/RoomList.jsx";
import BookingForm from "./components/BookingForm.jsx";
import AuthPage, { Brand } from "./components/AuthPage.jsx";
import {
  hasSession,
  getProfile,
  getErrorMessage,
  fetchRooms,
  addRoom,
  updateRoom,
  deleteRoom,
  getMyBookings,
  createBooking,
  signOut,
} from "./api.js";

function currentRoute() {
  return window.location.pathname;
}

export default function App() {
  const [route, setRoute] = useState(currentRoute);
  const [profile, setProfile] = useState(null);
  const [checking, setChecking] = useState(hasSession());
  const [authError, setAuthError] = useState("");
  const activeTab = route === "/bookings" ? "bookings" : "rooms";
  const newRoom = route === "/rooms/new";
  const editRoomId = route.match(/^\/rooms\/(\d+)\/edit\/?$/)?.[1] || null;
  const editorOpen = newRoom || Boolean(editRoomId);
  const roomId = !newRoom
    ? route.match(/^\/rooms\/([^/]+)\/?$/)?.[1] || null
    : null;
  const [roomRevision, setRoomRevision] = useState(0);

  function setActiveTab(tab) {
    navigate(tab === "bookings" ? "/bookings" : "/");
  }
  function editRoom(room) {
    navigate("/rooms/" + room.id + "/edit");
  }
  function bookRoom(room) {
    setNotice(null);
    setBookingRoom(room);
  }

  // Первая страница доступна только после проверки /profile на сервере.
  const loadProfile = useCallback(async () => {
    setAuthError("");
    try {
      const user = await getProfile();
      if (!["user", "admin"].includes(user?.role))
        throw new Error("Неизвестная роль аккаунта.");
      setProfile(user);
      const path = currentRoute();
      const target = path === "/login" || path === "/register" ? "/" : path;
      window.history.replaceState({}, "", target);
      setRoute(target);
      return true;
    } catch (error) {
      setProfile(null);
      setAuthError(getErrorMessage(error));
      return false;
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    if (hasSession()) void loadProfile();
    const onPopState = () => {
      setRoute(currentRoute());
      setBookingRoom(null);
      setDraft(null);
      setNotice(null);
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [loadProfile]);

  function navigate(url) {
    if (window.location.pathname !== url) window.history.pushState({}, "", url);
    setRoute(url);
    setAuthError("");
    setNotice(null);
    setBookingRoom(null);
    setDraft(null);
  }

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [route]);

  async function logout() {
    try {
      await signOut();
    } catch (error) {
      console.warn("Ошибка серверного выхода:", getErrorMessage(error));
    }
    setProfile(null);
    setRooms([]);
    setBookings([]);
    setNotice(null);
    setSearch("");
    setRoomType("all");
    setStatus("all");
    setSort("number");
    setDraft(null);
    setBookingRoom(null);
    setDeletingRoom(null);
    navigate("/login");
  }

  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState(null);
  const [mutationPending, setMutationPending] = useState(false);
  const controllerRef = useRef(null);

  const [search, setSearch] = useState("");
  const [roomType, setRoomType] = useState("all");
  const [status, setStatus] = useState("all");
  const [sort, setSort] = useState("number");
  const [draft, setDraft] = useState(null);
  const [bookingRoom, setBookingRoom] = useState(null);
  const [deletingRoom, setDeletingRoom] = useState(null);
  const [bookingBusy, setBookingBusy] = useState(false);

  const [bookings, setBookings] = useState([]);
  const [bookingsLoading, setBookingsLoading] = useState(false);
  const [bookingsError, setBookingsError] = useState("");

  const isAdmin = profile?.role === "admin";

  const loadRooms = useCallback(async () => {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    setLoading(true);
    setError("");
    try {
      const data = await fetchRooms(controller.signal);
      if (!Array.isArray(data)) throw new Error("Некорректный ответ сервера.");
      if (!controller.signal.aborted) setRooms(data);
    } catch (err) {
      if (!controller.signal.aborted) setError(getErrorMessage(err));
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (profile) void loadRooms();
    return () => controllerRef.current?.abort();
  }, [profile?.id, loadRooms]);

  const loadBookings = useCallback(async () => {
    setBookingsLoading(true);
    setBookingsError("");
    try {
      const data = await getMyBookings();
      setBookings(Array.isArray(data) ? data : []);
    } catch (err) {
      setBookingsError(getErrorMessage(err));
    } finally {
      setBookingsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (profile && activeTab === "bookings") void loadBookings();
  }, [profile?.id, activeTab, loadBookings]);

  useEffect(() => {
    document.title = profile
      ? "Личный кабинет — Переговория"
      : route === "/register"
        ? "Регистрация — Переговория"
        : "Вход — Переговория";
  }, [profile, route]);

  function showMutationError(err) {
    setNotice({
      type: "error",
      message: getErrorMessage(err) + " Изменение отменено.",
    });
    if (err.status === 401) void loadProfile();
  }

  async function createOptimistically(data) {
    const tempId =
      "temp-" + Date.now() + "-" + Math.random().toString(36).slice(2);
    setMutationPending(true);
    setRooms((previous) => [
      ...previous,
      { ...data, id: tempId, pending: true },
    ]);
    navigate("/");
    try {
      const created = await addRoom(data);
      setRooms((previous) =>
        previous.map((room) => (room.id === tempId ? created : room)),
      );
      setNotice({ type: "success", message: "Помещение успешно добавлено." });
    } catch (err) {
      setRooms((previous) => previous.filter((room) => room.id !== tempId));
      navigate("/rooms/new");
      setDraft(data);
      showMutationError(err);
    } finally {
      setMutationPending(false);
    }
  }

  async function updateOptimistically(original, data) {
    setMutationPending(true);
    setRooms((previous) =>
      previous.map((room) =>
        room.id === original.id ? { ...room, ...data, pending: true } : room,
      ),
    );
    navigate("/");
    try {
      const updated = await updateRoom(original.id, data);
      setRooms((previous) =>
        previous.map((room) => (room.id === original.id ? updated : room)),
      );
      setRoomRevision((previous) => previous + 1);
      setNotice({ type: "success", message: "Изменения сохранены." });
    } catch (err) {
      setRooms((previous) =>
        previous.map((room) => (room.id === original.id ? original : room)),
      );
      navigate("/rooms/" + original.id + "/edit");
      setDraft(data);
      showMutationError(err);
    } finally {
      setMutationPending(false);
    }
  }

  function saveRoom(data, original = null) {
    if (!isAdmin || mutationPending) return false;
    if (
      rooms.some(
        (room) =>
          room.roomNumber.toLowerCase() === data.roomNumber.toLowerCase() &&
          room.id !== original?.id,
      )
    )
      return false;
    if (original) void updateOptimistically(original, data);
    else void createOptimistically(data);
    return true;
  }

  async function removeRoom(id) {
    if (!isAdmin || mutationPending) return;
    setDeletingRoom(null);
    const index = rooms.findIndex((room) => room.id === id);
    if (index < 0) return;
    const removed = rooms[index];
    setMutationPending(true);
    setRooms((previous) => previous.filter((room) => room.id !== id));
    try {
      await deleteRoom(id);
      setNotice({ type: "success", message: "Помещение удалено." });
    } catch (err) {
      setRooms((previous) => {
        const next = [...previous];
        next.splice(Math.min(index, next.length), 0, removed);
        return next;
      });
      showMutationError(err);
    } finally {
      setMutationPending(false);
    }
  }

  async function submitBooking(data) {
    if (isAdmin || bookingBusy) return;
    setBookingBusy(true);
    try {
      await createBooking(data);
      setBookingRoom(null);
      setActiveTab("bookings");
      setNotice({
        type: "success",
        message: "Заявка создана. Посмотрите её в разделе «Мои бронирования».",
      });
    } catch (err) {
      setNotice({ type: "error", message: getErrorMessage(err) });
    } finally {
      setBookingBusy(false);
    }
  }

  function resetFilters() {
    setSearch("");
    setRoomType("all");
    setStatus("all");
    setSort("number");
  }
  const filtersApplied = Boolean(
    search || roomType !== "all" || status !== "all" || sort !== "number",
  );

  const roomTypes = [
    ...new Set(rooms.map((room) => room.name).filter(Boolean)),
  ].sort((a, b) => a.localeCompare(b, "ru"));
  const selectedType = roomTypes.includes(roomType) ? roomType : "all";
  const query = search.trim().toLowerCase();
  const filteredRooms = rooms
    .filter((room) => {
      const text = [room.name, room.roomNumber, room.location]
        .join(" ")
        .toLowerCase();
      return (
        text.includes(query) &&
        (selectedType === "all" || selectedType === room.name) &&
        (status === "all" ||
          (status === "active" ? room.isActive : !room.isActive))
      );
    })
    .sort((a, b) => {
      if (sort === "capacity") return b.capacity - a.capacity;
      if (sort === "name") return a.name.localeCompare(b.name, "ru");
      return a.roomNumber.localeCompare(b.roomNumber, "ru", { numeric: true });
    });

  if (checking) {
    return (
      <div className="app-loading" role="status">
        <span className="spinner" />
        Проверяем вашу сессию...
      </div>
    );
  }
  if (!profile) {
    return (
      <>
        <AuthPage
          key={route}
          mode={route === "/register" ? "register" : "login"}
          onNavigate={navigate}
          onAuthenticated={loadProfile}
        />
        {authError && (
          <div className="session-error" role="alert">
            {authError}
          </div>
        )}
      </>
    );
  }

  return (
    <div className="dashboard-shell">
      <header className="site-header">
        <div className="site-header-inner">
          <button
            className="site-brand"
            aria-label="Переговория — каталог помещений"
            onClick={() => setActiveTab("rooms")}
          >
            <Brand />
          </button>
          <nav className="site-nav" aria-label="Основная навигация">
            <button
              className={
                "nav-link " + (activeTab === "rooms" ? "selected" : "")
              }
              aria-current={activeTab === "rooms" ? "page" : undefined}
              onClick={() => setActiveTab("rooms")}
            >
              <Icon name="rooms" />
              Помещения
            </button>
            <button
              className={
                "nav-link " + (activeTab === "bookings" ? "selected" : "")
              }
              aria-current={activeTab === "bookings" ? "page" : undefined}
              onClick={() => setActiveTab("bookings")}
            >
              <Icon name="calendar" />
              Мои бронирования
            </button>
          </nav>
          <AccountMenu profile={profile} onLogout={logout} />
        </div>
      </header>
      <div className="dashboard-main">
        <main className="workspace">
          {notice && (
            <div
              className={
                "notice " +
                (notice.type === "error" ? "notice-error" : "notice-success")
              }
              role={notice.type === "error" ? "alert" : "status"}
            >
              <span>{notice.message}</span>
              <button aria-label="Закрыть" onClick={() => setNotice(null)}>
                ×
              </button>
            </div>
          )}

          {activeTab === "rooms" && !roomId && !editorOpen && (
            <>
              <div className="workspace-heading">
                <div>
                  <span className="section-eyebrow">
                    {isAdmin
                      ? "АДМИНИСТРИРОВАНИЕ / КАТАЛОГ"
                      : "ЛИЧНЫЙ КАБИНЕТ / КАТАЛОГ"}
                  </span>
                  <h1>Пространства для встреч</h1>
                  <p>
                    {isAdmin
                      ? "Создавайте помещения и управляйте их доступностью."
                      : "Выберите помещение и отправьте заявку на удобное время."}
                  </p>
                </div>
                {isAdmin && (
                  <button
                    className="primary"
                    disabled={mutationPending || loading || Boolean(error)}
                    onClick={() => navigate("/rooms/new")}
                  >
                    <Icon name="plus" /> Добавить помещение
                  </button>
                )}
              </div>
              <div
                className="catalog-summary"
                role="group"
                aria-label="Фильтр по доступности"
              >
                {[
                  ["all", "Все помещения", rooms.length],
                  [
                    "active",
                    "Доступны",
                    rooms.filter((r) => r.isActive).length,
                  ],
                  [
                    "inactive",
                    "Недоступны",
                    rooms.filter((r) => !r.isActive).length,
                  ],
                ].map(([value, label, count]) => (
                  <button
                    key={value}
                    className={"summary-filter " + value}
                    aria-pressed={status === value}
                    disabled={loading || Boolean(error)}
                    onClick={() => setStatus(value)}
                  >
                    {value !== "all" && <i aria-hidden="true" />} {label}{" "}
                    <strong>{loading || error ? "—" : count}</strong>
                  </button>
                ))}
              </div>
              <div className="catalog-layout">
                <div className="catalog-filters">
                  <section className="panel search-panel">
                    <label className="search-field">
                      Поиск помещения
                      <input
                        value={search}
                        type="search"
                        placeholder="Название, номер, корпус…"
                        onChange={(event) => setSearch(event.target.value)}
                      />
                    </label>
                    <div className="filters-row">
                      <label>
                        Название помещения
                        <select
                          value={selectedType}
                          onChange={(event) => setRoomType(event.target.value)}
                        >
                          <option value="all">Все названия</option>
                          {roomTypes.map((type) => (
                            <option key={type} value={type}>
                              {type}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label>
                        Статус
                        <select
                          value={status}
                          onChange={(event) => setStatus(event.target.value)}
                        >
                          <option value="all">Все помещения</option>
                          <option value="active">Доступные</option>
                          <option value="inactive">Недоступные</option>
                        </select>
                      </label>
                      <label>
                        Сортировка
                        <select
                          value={sort}
                          onChange={(event) => setSort(event.target.value)}
                        >
                          <option value="number">По номеру</option>
                          <option value="name">По названию</option>
                          <option value="capacity">По вместимости ↓</option>
                        </select>
                      </label>
                    </div>
                    {filtersApplied && (
                      <button
                        className="text-button reset-filters"
                        onClick={resetFilters}
                      >
                        Сбросить фильтры
                      </button>
                    )}
                  </section>
                </div>
                <section className="catalog-results">
                  <div className="results-heading">
                    <h2>
                      Каталог помещений{" "}
                      <span className="count-badge">
                        {loading || error ? "—" : filteredRooms.length}
                      </span>
                    </h2>
                    <button
                      className="text-button"
                      disabled={loading || mutationPending}
                      onClick={loadRooms}
                    >
                      <Icon name="refresh" />
                      Обновить
                    </button>
                  </div>
                  {loading ? (
                    <div className="loading-panel" role="status">
                      <span className="spinner" />
                      Загрузка с сервера...
                    </div>
                  ) : error ? (
                    <div className="loading-panel" role="alert">
                      <p className="error">{error}</p>
                      <button className="secondary" onClick={loadRooms}>
                        Повторить
                      </button>
                    </div>
                  ) : (
                    <RoomList
                      rooms={filteredRooms}
                      onEdit={editRoom}
                      onDelete={(room) => setDeletingRoom(room)}
                      canEdit={isAdmin}
                      busy={mutationPending || bookingBusy}
                      hasFilters={filtersApplied}
                      onReset={resetFilters}
                      onOpen={(id) => navigate("/rooms/" + id)}
                    />
                  )}
                </section>
              </div>
              {mutationPending && (
                <p className="muted" role="status">
                  Сохранение изменений на сервере...
                </p>
              )}
            </>
          )}

          {roomId && (
            <RoomPage
              key={profile.id + ":" + roomId}
              roomId={roomId}
              revision={roomRevision}
              canEdit={isAdmin}
              busy={mutationPending || bookingBusy}
              onBack={() => navigate("/")}
              onEdit={editRoom}
              onBook={bookRoom}
            />
          )}

          {activeTab === "bookings" && (
            <>
              <div className="workspace-heading">
                <div>
                  <span className="section-eyebrow">БРОНИРОВАНИЯ</span>
                  <h1>{isAdmin ? "Все бронирования" : "Мои бронирования"}</h1>
                  <p>
                    {isAdmin
                      ? "Просмотр записей всех пользователей."
                      : "История бронирований вашей учётной записи."}
                  </p>
                </div>
                <button
                  className="secondary"
                  disabled={bookingsLoading}
                  onClick={loadBookings}
                >
                  <Icon name="refresh" />
                  Обновить
                </button>
              </div>
              {bookingsLoading ? (
                <div className="loading-panel" role="status">
                  <span className="spinner" />
                  Загрузка...
                </div>
              ) : bookingsError ? (
                <div className="loading-panel" role="alert">
                  <p className="error">{bookingsError}</p>
                  <button className="secondary" onClick={loadBookings}>
                    Повторить
                  </button>
                </div>
              ) : bookings.length ? (
                <div className="data-table-wrap">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>№</th>
                        <th>Помещение</th>
                        {isAdmin && <th>Пользователь</th>}
                        <th>Начало</th>
                        <th>Окончание</th>
                        <th>Статус</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bookings.map((booking) => (
                        <tr key={booking.id}>
                          <td>#{booking.id}</td>
                          <td>
                            <strong>
                              {booking.room?.name ||
                                "Помещение №" + booking.roomId}
                            </strong>
                            <span className="table-detail">
                              {booking.purpose}
                            </span>
                          </td>
                          {isAdmin && <td>{booking.user?.fullName || "—"}</td>}
                          <td>
                            {new Date(booking.startTime).toLocaleString(
                              "ru-RU",
                            )}
                          </td>
                          <td>
                            {new Date(booking.endTime).toLocaleString("ru-RU")}
                          </td>
                          <td>
                            <span className={"table-status " + booking.status}>
                              {{
                                pending: "На рассмотрении",
                                confirmed: "Подтверждено",
                                cancelled: "Отменено",
                                completed: "Завершено",
                              }[booking.status] || booking.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="empty">
                  <Icon name="calendar" />
                  <h2>Бронирований пока нет</h2>
                  <p>
                    {isAdmin
                      ? "Заявки пользователей появятся здесь."
                      : "Выберите подходящее помещение в каталоге и отправьте первую заявку."}
                  </p>
                  <button
                    className="secondary"
                    onClick={() => setActiveTab("rooms")}
                  >
                    Открыть каталог
                  </button>
                </div>
              )}
            </>
          )}

          {editorOpen &&
            (isAdmin ? (
              <RoomEditorPage
                key={route + ":" + profile.id}
                roomId={editRoomId}
                draft={draft}
                onSave={saveRoom}
                onBack={() => navigate("/")}
                onCancel={() =>
                  navigate(editRoomId ? "/rooms/" + editRoomId : "/")
                }
              />
            ) : (
              <div className="empty" role="alert">
                <h1>Доступ только администратору</h1>
                <p>Вы можете просматривать помещения и отправлять заявки.</p>
                <button className="secondary" onClick={() => navigate("/")}>
                  Открыть каталог
                </button>
              </div>
            ))}
          {bookingRoom && !isAdmin && (
            <Modal
              title="Новое бронирование"
              busy={bookingBusy}
              onClose={() => setBookingRoom(null)}
            >
              {notice?.type === "error" && (
                <p className="error" role="alert">
                  {notice.message}
                </p>
              )}
              <BookingForm
                key={bookingRoom.id}
                room={bookingRoom}
                busy={bookingBusy}
                onCancel={() => setBookingRoom(null)}
                onCreate={submitBooking}
              />
            </Modal>
          )}
          {deletingRoom && (
            <Modal
              title="Удалить помещение?"
              onClose={() => setDeletingRoom(null)}
            >
              <div className="confirm-dialog">
                <div className="confirm-icon">
                  <Icon name="trash" />
                </div>
                <h2>Удалить помещение?</h2>
                <p>
                  «{deletingRoom.name}», № {deletingRoom.roomNumber}, будет
                  удалено из каталога. Это действие нельзя отменить после
                  сохранения.
                </p>
                <div className="form-actions">
                  <button
                    className="secondary"
                    onClick={() => setDeletingRoom(null)}
                  >
                    Отмена
                  </button>
                  <button
                    className="danger danger-filled"
                    onClick={() => removeRoom(deletingRoom.id)}
                  >
                    Удалить помещение
                  </button>
                </div>
              </div>
            </Modal>
          )}
        </main>
      </div>
    </div>
  );
}
