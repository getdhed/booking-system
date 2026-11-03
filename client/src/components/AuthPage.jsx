import { useState } from "react";
import { registerAccount, signIn, getErrorMessage } from "../api.js";

function Brand({ large = false }) {
  return (
    <div className={"brand " + (large ? "brand-large" : "")}>
      <img
        className="brand-symbol"
        src="/brand-mark.svg"
        alt=""
        aria-hidden="true"
      />
      <div>
        <strong>
          Переговор<span>ия.</span>
        </strong>
        {large && <small>Пространство для ваших встреч</small>}
      </div>
    </div>
  );
}

export { Brand };

function VisibilityIcon({ visible }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12z" />
      <circle cx="12" cy="12" r="2.7" />
      {!visible && <path d="M3 3l18 18" strokeWidth="2" />}
    </svg>
  );
}
function PasswordField({
  name,
  label,
  value,
  onChange,
  visible,
  onToggle,
  autoComplete,
  placeholder,
}) {
  return (
    <div className="auth-field">
      <label htmlFor={name}>{label}</label>
      <div className="password-wrapper">
        <input
          id={name}
          name={name}
          type={visible ? "text" : "password"}
          autoComplete={autoComplete}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          required
        />
        <button
          className="password-toggle"
          type="button"
          aria-label={
            visible
              ? "Скрыть " + label.toLowerCase()
              : "Показать " + label.toLowerCase()
          }
          aria-pressed={visible}
          onClick={onToggle}
        >
          <VisibilityIcon visible={visible} />
        </button>
      </div>
    </div>
  );
}

export default function AuthPage({ mode, onNavigate, onAuthenticated }) {
  const register = mode === "register";
  const [values, setValues] = useState({
    fullName: "",
    email: "",
    password: "",
    confirm: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [registered, setRegistered] = useState(false);
  function change(event) {
    setValues((previous) => ({
      ...previous,
      [event.target.name]: event.target.value,
    }));
    setError("");
  }
  async function submit(event) {
    event.preventDefault();
    if (register && values.password !== values.confirm) {
      setError("Пароли не совпадают.");
      return;
    }
    if (register && values.password.length < 8) {
      setError("Пароль должен содержать не менее 8 символов.");
      return;
    }
    setBusy(true);
    setError("");
    let accountCreated = false;
    try {
      const email = values.email.trim().toLowerCase();
      if (register) {
        // Создание учётной записи не выдаёт JWT, поэтому сразу выполняем вход.
        await registerAccount({
          fullName: values.fullName.trim(),
          email,
          password: values.password,
        });
        accountCreated = true;
      }

      // Используем обычный вход: signIn сохраняет access/refresh токены.
      await signIn(email, values.password);
      const authenticated = await onAuthenticated();
      if (!authenticated) {
        throw new Error(
          "Не удалось открыть личный кабинет. Попробуйте войти ещё раз.",
        );
      }
    } catch (err) {
      if (accountCreated) {
        // Не предлагаем зарегистрироваться повторно: пользователь уже есть в БД.
        setRegistered(true);
        setError(
          "Аккаунт создан, но автоматический вход не удался. " +
            getErrorMessage(err),
        );
      } else {
        setError(getErrorMessage(err));
      }
    } finally {
      setBusy(false);
    }
  }
  return (
    <main
      className={"auth-layout " + (register ? "auth-register" : "auth-login")}
    >
      <div className="auth-card">
        <div className="auth-brand">
          <Brand large />
        </div>
        <h1>{register ? "Регистрация" : "Вход"}</h1>
        {registered ? (
          <div className="auth-success" role="status">
            <p className="auth-error" role="alert">
              {error}
            </p>
            <button
              type="button"
              className="primary full-width"
              onClick={() => onNavigate("/login")}
            >
              Перейти ко входу
            </button>
          </div>
        ) : (
          <form className="auth-form" onSubmit={submit}>
            <fieldset disabled={busy}>
              {register && (
                <div className="auth-field">
                  <label htmlFor="fullName">Имя и фамилия</label>
                  <input
                    id="fullName"
                    name="fullName"
                    value={values.fullName}
                    onChange={change}
                    placeholder="Ваше имя"
                    autoComplete="name"
                    minLength={2}
                    maxLength={100}
                    required
                  />
                </div>
              )}
              <div className="auth-field">
                <label htmlFor="email">Электронная почта</label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  value={values.email}
                  onChange={change}
                  autoComplete="email"
                  placeholder="Введите адрес электронной почты"
                  required
                />
              </div>
              <PasswordField
                name="password"
                label="Пароль"
                value={values.password}
                onChange={change}
                visible={showPassword}
                onToggle={() => setShowPassword((previous) => !previous)}
                autoComplete={register ? "new-password" : "current-password"}
                placeholder={
                  register ? "Не менее 8 символов" : "Введите пароль"
                }
              />
              {register && (
                <PasswordField
                  name="confirm"
                  label="Повторите пароль"
                  value={values.confirm}
                  onChange={change}
                  visible={showConfirmPassword}
                  onToggle={() =>
                    setShowConfirmPassword((previous) => !previous)
                  }
                  autoComplete="new-password"
                  placeholder="Подтвердите пароль"
                />
              )}
              {error && (
                <p className="auth-error" role="alert">
                  {error}
                </p>
              )}
              <button
                className="primary full-width auth-submit"
                disabled={busy}
                type="submit"
              >
                {busy ? (
                  <>
                    <span className="spinner small" />
                    Подождите…
                  </>
                ) : register ? (
                  "Зарегистрироваться"
                ) : (
                  "Войти"
                )}
              </button>
            </fieldset>
          </form>
        )}
        <div className="auth-switch">
          {register ? "Уже есть аккаунт?" : "Нет аккаунта?"}{" "}
          <button
            type="button"
            onClick={() => onNavigate(register ? "/login" : "/register")}
          >
            {register ? "Войти" : "Зарегистрироваться"}
          </button>
        </div>
      </div>
    </main>
  );
}
