import { useId, useState } from "react";
import Icon from "./Icon.jsx";

export default function AccountMenu({ profile, onLogout }) {
  const id = useId();
  const [leaving, setLeaving] = useState(false);
  async function logout() {
    setLeaving(true);
    try {
      await onLogout();
    } finally {
      setLeaving(false);
    }
  }
  return (
    <div className="account-menu">
      <button
        type="button"
        className="account-trigger"
        popoverTarget={id}
        aria-label={"Открыть аккаунт: " + profile.fullName}
      >
        <span className="avatar account-avatar" aria-hidden="true">
          <Icon name="user" />
        </span>
        <span className="account-name">{profile.fullName}</span>
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden="true"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>
      <section
        id={id}
        popover="auto"
        className="account-popover"
        aria-label="Информация об аккаунте"
      >
        <div className="account-summary">
          <span className="avatar" aria-hidden="true">
            <Icon name="user" />
          </span>
          <strong>{profile.fullName}</strong>
        </div>
        <dl className="account-facts">
          <div>
            <dt>Электронная почта</dt>
            <dd>{profile.email}</dd>
          </div>
          <div>
            <dt>Тип аккаунта</dt>
            <dd>
              {profile.role === "admin" ? "Администратор" : "Пользователь"}
            </dd>
          </div>
          <div>
            <dt>ID профиля</dt>
            <dd>#{profile.id}</dd>
          </div>
        </dl>
        <button
          className="account-logout"
          type="button"
          disabled={leaving}
          onClick={logout}
        >
          <Icon name="logout" />
          {leaving ? "Выходим…" : "Выйти из аккаунта"}
        </button>
      </section>
    </div>
  );
}
