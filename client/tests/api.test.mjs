import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

// Загружаем тот же API-сервис без Vite и изолируем localStorage для каждого теста.
const source = (
  await readFile(new URL("../src/api.js", import.meta.url), "utf8")
).replace("import.meta.env.VITE_API_URL", "'http://api.test'");
let sequence = 0;
async function setup(handler) {
  const storage = new Map();
  globalThis.localStorage = {
    getItem: (key) => storage.get(key) ?? null,
    setItem: (key, value) => storage.set(key, value),
    removeItem: (key) => storage.delete(key),
  };
  globalThis.fetch = handler;
  const api = await import(
    "data:text/javascript;base64," +
      Buffer.from(source + "\n//" + sequence++).toString("base64")
  );
  return { api, storage };
}
const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

test("JWT автоматически добавляется к GET; signal передаётся в fetch", async () => {
  const controller = new AbortController();
  const { api, storage } = await setup(async (url, options) => {
    assert.equal(url, "http://api.test/rooms");
    assert.equal(options.headers.Authorization, "Bearer access");
    assert.equal(options.signal, controller.signal);
    return json([{ id: 1 }]);
  });
  storage.set("booking-system-access-token", "access");
  assert.deepEqual(await api.fetchRooms(controller.signal), [{ id: 1 }]);
});

test("POST, PUT и DELETE используют корректные адреса, JSON и 204", async () => {
  const calls = [];
  const { api } = await setup(async (url, options) => {
    calls.push({ url, ...options });
    return options.method === "DELETE"
      ? new Response(null, { status: 204 })
      : json({ id: 7 });
  });
  await api.addRoom({ name: "Зал" });
  await api.updateRoom(7, { name: "Новый зал" });
  assert.equal(await api.deleteRoom(7), null);
  assert.deepEqual(
    calls.map((c) => [c.method, c.url]),
    [
      ["POST", "http://api.test/rooms"],
      ["PUT", "http://api.test/rooms/7"],
      ["DELETE", "http://api.test/rooms/7"],
    ],
  );
  assert.equal(calls[0].headers["Content-Type"], "application/json");
  assert.deepEqual(JSON.parse(calls[1].body), { name: "Новый зал" });
});

test("HTTP 500 и сетевая ошибка дают понятные сообщения", async () => {
  const { api } = await setup(async () =>
    json({ error: "Internal error" }, 500),
  );
  await assert.rejects(
    api.fetchRooms(),
    (error) => error.status === 500 && /Ошибка сервера/.test(error.message),
  );
  globalThis.fetch = async () => {
    throw new TypeError("Failed to fetch");
  };
  await assert.rejects(api.fetchRooms(), /Нет соединения с сервером/);
});

test("409 при регистрации сообщает о занятой почте", async () => {
  const { api } = await setup(async () =>
    json({ error: "User with this email already exists" }, 409),
  );
  await assert.rejects(
    api.registerAccount({}),
    /Аккаунт с такой почтой уже существует/,
  );
});

test("отмена запроса сохраняет AbortError", async () => {
  const { api } = await setup(async () => {
    throw new DOMException("Cancelled", "AbortError");
  });
  await assert.rejects(
    api.fetchRooms(),
    (error) => error.name === "AbortError",
  );
});

test("два параллельных 401 вызывают один refresh и повтор с новым JWT", async () => {
  let refreshes = 0;
  const { api, storage } = await setup(async (url, options) => {
    if (url.endsWith("/auth/refresh")) {
      refreshes++;
      await new Promise((resolve) => setTimeout(resolve, 5));
      return json({ accessToken: "new-access", refreshToken: "new-refresh" });
    }
    return options.headers.Authorization === "Bearer new-access"
      ? json([])
      : json({}, 401);
  });
  storage.set("booking-system-access-token", "old-access");
  storage.set("booking-system-refresh-token", "old-refresh");
  await Promise.all([api.fetchRooms(), api.getMyBookings()]);
  assert.equal(refreshes, 1);
  assert.equal(storage.get("booking-system-access-token"), "new-access");
});

test("отклонённый refresh очищает сессию и не зацикливает запросы", async () => {
  let calls = 0;
  const { api, storage } = await setup(async () => {
    calls++;
    return json({}, 401);
  });
  storage.set("booking-system-access-token", "expired");
  storage.set("booking-system-refresh-token", "revoked");
  await assert.rejects(api.fetchRooms(), (error) => error.status === 401);
  assert.equal(calls, 2);
  assert.equal(api.hasSession(), false);
  assert.equal(storage.has("booking-system-refresh-token"), false);
});

test("GET отдельного помещения передаёт signal и сохраняет 404", async () => {
  const controller = new AbortController();
  const { api } = await setup(async (url, options) => {
    assert.equal(url, "http://api.test/rooms/42");
    assert.equal(options.signal, controller.signal);
    return json({
      id: 42,
      name: "Переговорная",
      galleryUrls: [],
      amenities: ["Доска"],
    });
  });
  assert.equal(
    (await api.fetchRoom(42, controller.signal)).name,
    "Переговорная",
  );
  globalThis.fetch = async () => json({ error: "Room not found" }, 404);
  await assert.rejects(api.fetchRoom(999), (error) => error.status === 404);
});
