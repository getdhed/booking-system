// Единая точка для HTTP-запросов. Адрес задаётся в client/.env.
const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3000').replace(/\/+$/, '');
const ACCESS_KEY = 'booking-system-access-token';
const REFRESH_KEY = 'booking-system-refresh-token';

let pendingRefresh = null;

export function hasSession() {
  return Boolean(localStorage.getItem(ACCESS_KEY));
}

function clearSession() {
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
}

function saveSession(data) {
  if (!data || typeof data.accessToken !== 'string' ||
      typeof data.refreshToken !== 'string') {
    throw new Error('Сервер не вернул токены авторизации.');
  }
  localStorage.setItem(ACCESS_KEY, data.accessToken);
  localStorage.setItem(REFRESH_KEY, data.refreshToken);
}

function httpError(status, responseData) {
  const serverMessage = responseData && responseData.error;
  let message = 'Ошибка HTTP ' + status + '.';

  if (status === 400) message = 'Сервер отклонил данные. Проверьте поля формы.';
  if (status === 401) message = 'Неверные учётные данные или истёк срок действия сессии.';
  if (status === 403) message = 'Недостаточно прав для этой операции.';
  if (status === 404) message = 'Помещение или адрес запроса не найден.';
  if (status === 409) {
    message = serverMessage === 'Room has bookings and cannot be deleted'
      ? 'Нельзя удалить помещение, для которого существуют бронирования.'
      : 'Конфликт данных: возможно, такой номер помещения уже существует.';
  }
  if (status >= 500) message = 'Ошибка сервера (' + status + '). Попробуйте позже.';

  const error = new Error(message);
  error.status = status;
  return error;
}

async function request(path, options = {}) {
  const { method = 'GET', body, signal, auth = true, retry = true } = options;
  const headers = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  const accessToken = localStorage.getItem(ACCESS_KEY);
  if (auth && accessToken) headers.Authorization = 'Bearer ' + accessToken;

  let response;
  try {
    response = await fetch(API_URL + path, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal
    });
  } catch (error) {
    if (error.name === 'AbortError') throw error;
    throw new Error('Нет соединения с сервером. Проверьте запуск Express и адрес API.');
  }

  // При истечении access token пробуем один раз обновить его refresh token.
  if (response.status === 401 && auth) {
    const refreshToken = localStorage.getItem(REFRESH_KEY);
    if (retry && refreshToken && !signal?.aborted) {
      try {
        if (!pendingRefresh) {
          pendingRefresh = request('/auth/refresh', {
            method: 'POST', body: { refreshToken }, auth: false, retry: false
          }).then(data => {
            saveSession(data);
          }).finally(() => {
            pendingRefresh = null;
          });
        }
        await pendingRefresh;
        return request(path, { method, body, signal, auth, retry: false });
      } catch (error) {
        if (signal?.aborted) {
          throw new DOMException('Запрос отменён', 'AbortError');
        }
        clearSession();
        const sessionError = new Error('Сессия истекла. Войдите повторно.');
        sessionError.status = 401;
        throw sessionError;
      }
    }
    clearSession();
  }

  if (!response.ok) {
    const responseData = await response.json().catch(() => null);
    throw httpError(response.status, responseData);
  }

  if (response.status === 204) return null;
  return response.json();
}

export function fetchRooms(signal) {
  return request('/rooms', { signal });
}

export function addRoom(room) {
  return request('/rooms', { method: 'POST', body: room });
}

export function updateRoom(id, room) {
  return request('/rooms/' + id, { method: 'PUT', body: room });
}

export function deleteRoom(id) {
  return request('/rooms/' + id, { method: 'DELETE' });
}

export async function signIn(email, password) {
  const tokens = await request('/auth/login', {
    method: 'POST', body: { email, password }, auth: false
  });
  saveSession(tokens);
}

export async function signOut() {
  const refreshToken = localStorage.getItem(REFRESH_KEY);
  try {
    if (refreshToken) {
      await request('/auth/logout', {
        method: 'POST', body: { refreshToken }, auth: false
      });
    }
  } finally {
    clearSession();
  }
}

export function getErrorMessage(error) {
  return error instanceof Error ? error.message : 'Произошла неизвестная ошибка.';
}
