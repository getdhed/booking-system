# Лабораторная работа №6 — MongoDB и Mongoose

Ветка: **26**. Основа: ветка 25 проекта booking-system.
Предметная область: система бронирования помещений.

Для лабораторной добавлен **отдельный Express API** в папке `lab6-mongodb/`.
Он работает с MongoDB, не требует PostgreSQL и не изменяет старые
React/Express/Sequelize файлы лабораторной №5. Это допускается методичкой.

## Подготовка

Нужны Node.js 22+, MongoDB Community Server (локально) **или** Atlas.

```bash
git fetch origin
git switch 26
cd lab6-mongodb
npm install
```

Скопируйте `.env.example` в `.env`:

```dotenv
PORT=3001
MONGO_URI=mongodb://127.0.0.1:27017/booking_system_lab6
```

При использовании Atlas: создайте бесплатный кластер, пользователя базы,
добавьте свой IP в Network Access, затем вставьте MongoDB URI
из Connect → Drivers вместо локального адреса. Пароль никому не отправляйте,
файл `.env` не добавляйте в Git.

Запуск:

```bash
npm start
```

Успешное подключение:
```text
MongoDB connected
Сервер запущен: http://localhost:3001
```

Адрес API: `http://localhost:3001/rooms`.
Это отдельное API для Postman; существующий React-клиент из лабы №5
продолжает обращаться к старому PostgreSQL-серверу.

## CRUD в Postman

Все запросы POST, PUT и PATCH: Body → raw → JSON.

1. **POST** `http://localhost:3001/rooms`

```json
{
  "name": "Переговорная Альфа",
  "roomNumber": "101",
  "location": "Главный корпус",
  "floor": 1,
  "capacity": 12,
  "description": "Для встреч",
  "amenities": ["Wi-Fi", "Проектор"],
  "isActive": true
}
```

В ответе будет поле `_id` — скопируйте его как `ROOM_ID`.

2. **GET** `http://localhost:3001/rooms` — список.
3. **GET** `http://localhost:3001/rooms/ROOM_ID` — одна комната.
4. **PUT** `http://localhost:3001/rooms/ROOM_ID`:

```json
{"capacity": 15}
```

5. **POST** `http://localhost:3001/rooms/ROOM_ID/bookings`:

```json
{
  "userId": 1,
  "startTime": "2026-11-18T10:00:00.000Z",
  "endTime": "2026-11-18T11:00:00.000Z",
  "purpose": "Собрание",
  "attendeeCount": 5
}
```

Скопируйте `_id` бронирования как `BOOKING_ID`.

6. **PATCH** `http://localhost:3001/rooms/ROOM_ID/bookings/BOOKING_ID`:

```json
{"status": "confirmed"}
```

7. **GET** `http://localhost:3001/rooms/ROOM_ID` — убедитесь,
что `bookings[0].status` стал `confirmed`.
8. **DELETE** `http://localhost:3001/rooms/ROOM_ID` — удалить комнату.

## Что показывать преподавателю

- Mongoose подключается в `lab6-mongodb/server.js`.
- Модель и вложенные бронирования: `lab6-mongodb/models/MongoRoom.js`.
- GET, POST, PUT, DELETE и работа с массивом: `lab6-mongodb/routes/rooms.js`.
- В MongoDB Atlas Data Explorer / Compass откройте базу `booking_system_lab6`
  и коллекцию `rooms`. Разверните вложенный массив `bookings`.

**Отличие от PostgreSQL:** в старой реализации `Rooms` и `Bookings` —
отдельные таблицы, связанные по `roomId`. В MongoDB лабораторной
бронирования лежат прямо внутри документа комнаты в `bookings`.

Отчёт и скриншоты делаются после проверки работоспособности.
