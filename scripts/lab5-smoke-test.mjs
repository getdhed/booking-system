// Запуск: LAB5_EMAIL=... LAB5_PASSWORD=... node scripts/lab5-smoke-test.mjs
// Требует работающий Express, PostgreSQL и существующего пользователя.
import assert from 'node:assert/strict';

const base = (process.env.LAB5_API_URL || 'http://localhost:3000').replace(/\/+$/, '');
const email = process.env.LAB5_EMAIL;
const password = process.env.LAB5_PASSWORD;
if (!email || !password) {
  console.error('Задайте LAB5_EMAIL и LAB5_PASSWORD для тестового пользователя.');
  process.exit(2);
}

async function call(path, { method = 'GET', body, token, expectedStatus = 200 } = {}) {
  const response = await fetch(base + path, {
    method,
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: 'Bearer ' + token } : {})
    },
    body: body ? JSON.stringify(body) : undefined
  });
  const data = response.status === 204 ? null : await response.json().catch(() => null);
  assert.equal(response.status, expectedStatus,
    method + ' ' + path + ': ожидался ' + expectedStatus +
    ', получен ' + response.status + '; ' + JSON.stringify(data));
  return data;
}

const suffix = String(Date.now());
const room = {
  name: 'Тестовая комната ЛР5',
  roomNumber: 'LAB5-' + suffix,
  location: 'Тестовый корпус',
  floor: 1,
  capacity: 10,
  description: 'Создана автоматическим тестом; будет удалена',
  isActive: true
};

let createdId = null;
let token = null;
try {
  const initialRooms = await call('/rooms');
  assert.ok(Array.isArray(initialRooms), 'GET /rooms должен вернуть массив');
  console.log('✓ GET /rooms');

  await call('/rooms', { method: 'POST', body: room, expectedStatus: 401 });
  console.log('✓ Запись без JWT отклонена');

  const session = await call('/auth/login', {
    method: 'POST', body: { email, password }
  });
  assert.ok(session.accessToken, 'Не получен accessToken');
  token = session.accessToken;
  console.log('✓ Авторизация');

  const created = await call('/rooms', {
    method: 'POST', body: room, token, expectedStatus: 201
  });
  createdId = created.id;
  assert.ok(Number.isInteger(createdId) && createdId > 0);
  console.log('✓ POST /rooms, id=' + createdId);

  const updated = await call('/rooms/' + createdId, {
    method: 'PUT', body: { ...room, capacity: 12 }, token
  });
  assert.equal(updated.capacity, 12);
  console.log('✓ PUT /rooms/:id');

  const fetched = await call('/rooms/' + createdId);
  assert.equal(fetched.capacity, 12);
  console.log('✓ GET /rooms/:id после редактирования');

  await call('/rooms/' + createdId, {
    method: 'DELETE', token, expectedStatus: 204
  });
  createdId = null;
  console.log('✓ DELETE /rooms/:id');

  console.log('CRUD smoke test пройден.');
} finally {
  // Не затрагиваем чужие данные. Удаляем только созданное нами помещение.
  if (createdId && token) {
    try {
      await call('/rooms/' + createdId, {
        method: 'DELETE', token, expectedStatus: 204
      });
      console.log('Тестовое помещение удалено после ошибки.');
    } catch (cleanupError) {
      console.error('Не удалось очистить тестовые данные, id=' + createdId, cleanupError);
    }
  }
}
