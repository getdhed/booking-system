import { useState } from 'react';
import { registerAccount, signIn, getErrorMessage } from '../api.js';

function Brand({ large = false }) {
  return <div className={'brand ' + (large ? 'brand-large' : '')}>
    <div className="brand-symbol"><svg width="27" height="27" viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <rect x="4" y="4" width="24" height="24" rx="7" stroke="currentColor" strokeWidth="2.4"/>
      <path d="M11 11h6a4 4 0 0 1 0 8h-6V11Zm0 8h8a3.5 3.5 0 0 1 0 7h-8v-7Z" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round"/>
    </svg></div>
    <div><strong>Booking<span>Space</span></strong>{large && <small>Удобное бронирование помещений</small>}</div>
  </div>;
}

export { Brand };

export default function AuthPage({ mode, onNavigate, onAuthenticated }) {
  const register = mode === 'register';
  const [values, setValues] = useState({ fullName: '', email: '', password: '', confirm: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  function change(event) {
    setValues(previous => ({ ...previous, [event.target.name]: event.target.value }));
    setError('');
  }
  async function submit(event) {
    event.preventDefault();
    if (register && values.password !== values.confirm) {
      setError('Пароли не совпадают.'); return;
    }
    if (register && values.password.length < 8) {
      setError('Пароль должен содержать не менее 8 символов.'); return;
    }
    setBusy(true); setError('');
    try {
      if (register) {
        await registerAccount({
          fullName: values.fullName.trim(), email: values.email.trim().toLowerCase(),
          password: values.password
        });
        setSuccess('Аккаунт создан. Теперь войдите с помощью почты и пароля.');
      } else {
        await signIn(values.email.trim().toLowerCase(), values.password);
        await onAuthenticated();
      }
    } catch (err) { setError(getErrorMessage(err)); }
    finally { setBusy(false); }
  }
  return <main className="auth-layout">
    <div className="auth-card">
      <div className="auth-brand"><Brand large /></div>
      <div className="auth-divider" />
      <h1>{register ? 'Регистрация' : 'Вход'}</h1>
      <p className="auth-subtitle">{register ? 'Создайте учётную запись для бронирования помещений.' : 'Войдите в систему бронирования помещений.'}</p>
      {success ? <div className="auth-success" role="status">{success}
        <button type="button" className="primary full-width" onClick={() => onNavigate('/login')}>Перейти ко входу</button>
      </div> :
      <form className="auth-form" onSubmit={submit}>
        {register && <label>Имя и фамилия
          <input name="fullName" value={values.fullName} onChange={change}
            placeholder="Ваше имя" autoComplete="name" minLength={2} maxLength={100} required /></label>}
        <label>Электронная почта
          <input name="email" type="email" value={values.email} onChange={change}
            autoComplete="email" placeholder="Введите адрес электронной почты" required /></label>
        <label>Пароль
          <div className="password-wrapper"><input name="password"
            type={showPassword ? 'text' : 'password'} value={values.password}
            onChange={change} autoComplete={register ? 'new-password' : 'current-password'}
            placeholder={register ? 'Не менее 8 символов' : 'Введите пароль'} required />
            <button className="password-toggle" type="button" onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? 'Скрыть пароль' : 'Показать пароль'}>{showPassword ? 'Скрыть' : 'Показать'}</button></div>
        </label>
        {register && <label>Повторите пароль
          <input name="confirm" type="password" value={values.confirm} onChange={change}
            autoComplete="new-password" placeholder="Подтвердите пароль" required /></label>}
        {error && <p className="auth-error" role="alert">{error}</p>}
        <button className="primary full-width auth-submit" disabled={busy} type="submit">
          {busy ? 'Подождите...' : register ? 'Зарегистрироваться' : 'Войти'}
        </button>
      </form>}
      <div className="auth-switch">
        {register ? 'Уже есть аккаунт?' : 'Нет аккаунта?'}{' '}
        <button type="button" onClick={() => onNavigate(register ? '/login' : '/register')}>
          {register ? 'Войти' : 'Зарегистрироваться'}
        </button>
      </div>
    </div>
    <footer className="auth-footer">BookingSpace · Система бронирования помещений</footer>
  </main>;
}
