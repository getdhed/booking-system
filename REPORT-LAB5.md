# ОТЧЁТ — Лабораторная работа №5

**Дисциплина:** ИТиВП. Часть 2. Клиентская разработка на React  
**Тема:** Взаимодействие React-приложения с сервером  
**Студент, группа:** [вписать]  
**Преподаватель:** [вписать]  
**Год:** 2026  
**GitHub:** https://github.com/getdhed/booking-system/tree/25

> Это черновик. Сведения о реально выполненных тестах и скриншоты нужно добавить после запуска приложения. Пустые места не являются подтверждением тестирования.

## Цель

Освоить GET, POST, PUT, DELETE из React, обработку загрузки и ошибок, оптимистичное обновление интерфейса с откатом, JWT-авторизацию и отмену GET-запроса при размонтировании.

## Схема взаимодействия

React (App, RoomList, RoomForm) → fetch (client/src/api.js) → HTTP /rooms, /auth на Express :3000 → Sequelize → PostgreSQL. GET получает массив помещений. POST/PUT/DELETE отправляют JSON и заголовок Authorization: Bearer accessToken. Ответ сервера с сохранёнными данными обновляет React state. Ошибки показываются в интерфейсе; при неудачных мутациях состояние откатывается. CORS позволяет запросы с Vite :5173.

## Основные файлы (листинги взять из ветки 25)

- `client/src/api.js`: request, fetchRooms, addRoom, updateRoom, deleteRoom, signIn, signOut.
- `client/src/App.jsx`: loadRooms с AbortController, createOptimistically, updateOptimistically, removeRoom.
- `client/src/components/RoomForm.jsx`: проверка и нормализация данных.
- `routes/roomRoutes.js` и `controllers/roomController.js`: серверные CRUD-маршруты.

Основные фрагменты:

    const [rooms, setRooms] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Создание: временно помещаем карточку в React state,
    // делаем POST и заменяем её серверным объектом.
    setRooms(previous => [...previous, { ...data, id: temporaryId, pending: true }]);
    const saved = await addRoom(data);
    setRooms(previous => previous.map(room => room.id === temporaryId ? saved : room));

    // При ошибке POST:
    setRooms(previous => previous.filter(room => room.id !== temporaryId));

## Скриншоты (вставить после проверки на своём компьютере)

1. [СКРИНШОТ] Индикатор загрузки данных (Slow 3G в DevTools).
2. [СКРИНШОТ] Загруженный из PostgreSQL список помещений.
3. [СКРИНШОТ] Добавление: форма до сохранения и карточка после POST.
4. [СКРИНШОТ] Удаление: карточка до и её отсутствие после DELETE.
5. [СКРИНШОТ] Отключённый сервер: сообщение ошибки и «Повторить».
6. [СКРИНШОТ] AbortController: отменённый GET в DevTools Network.
7. [СКРИНШОТ, желательно] Откат удаления после ответа 409 и уведомление.

## Ответы на контрольные вопросы

**1. В чём разница между fetch и axios?**  
`fetch` встроен в браузер и не требует установки; HTTP-ошибки 4xx/5xx не отклоняют Promise автоматически, поэтому нужен `response.ok`. Axios — внешняя библиотека с автоматическим преобразованием JSON, удобными interceptors и отклонением Promise по ошибочным HTTP-статусам; недостаток — дополнительная зависимость. В проекте используется `fetch`.

**2. Как обработать loading в React?**  
Состояние `const [loading, setLoading] = useState(true)`. Перед GET вызываем `setLoading(true)`, в `finally` — `setLoading(false)` (если запрос не отменён). При `loading` выводим спиннер; см. `App.jsx: loadRooms`.

**3. Что такое оптимистичное обновление на примере добавления?**  
Сначала добавляем помещение во временный массив с `temp-...` ID; отправляем POST; при успехе заменяем временный объект серверным; при ошибке удаляем временный и восстанавливаем введённую форму. См. `createOptimistically`.

**4. Как показать ошибку 500?**  
Проверить `response.ok`, при статусе 500 создать ошибку и поместить её текст в состояние. В `api.js` HTTP 5xx преобразуются в сообщение «Ошибка сервера», которое затем отображается через `role="alert"`.

**5. Зачем нужен AbortController?**  
Чтобы отменять устаревший запрос (например, после ухода со страницы) и не использовать нерелевантный результат. `new AbortController()` создаёт `signal`, который передаём в `fetch`; затем вызываем `abort()`.

**6. Как отправить JSON через fetch и axios?**  
Fetch: `fetch('/rooms', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(room) })`. Axios: `axios.post('/rooms', room)` — объект сериализуется библиотекой. В проекте используется первый способ.

**7. Как обработать отсутствие сети?**  
С `fetch` — `try/catch` вокруг await: сетевые ошибки отклоняют Promise, а статус HTTP проверяется отдельно. У Axios сетевое исключение также попадает в `catch`; обычно у него нет `error.response`. В приложении показывается сообщение о недоступности Express.

**8. Как реализовать retry?**  
Псевдокод: для попыток 1–3 → вызвать GET → при успехе вернуть результат → при сетевой ошибке или подходящем 5xx, если попытки остались, подождать (например, 500, 1000, 2000 мс) и повторить → иначе показать ошибку. Не следует автоматически повторять неидемпотентный POST без механизма идемпотентности.

**9. Как добавить Bearer через axios interceptor?**  
`axiosInstance.interceptors.request.use(config => { const token = localStorage.getItem('token'); if (token) config.headers.Authorization = 'Bearer ' + token; return config; })`. В нашем `fetch`-сервисе аналогичная логика находится внутри `request`.

**10. Что такое debounce?**  
Это запуск функции после паузы во вводе, чтобы не отправлять запрос на каждую клавишу. Например, `setTimeout(searchRequest, 300)` и `clearTimeout` для предыдущего таймера. В данной лабораторной поиск остаётся локальным, а дополнительным улучшением выбран AbortController.

**11. Как отменить запрос при размонтировании?**  
В `useEffect` создать controller; передать `controller.signal` в GET; в cleanup вернуть `() => controller.abort()`. В `App.jsx` используется `controllerRef`, что также отменяет предыдущий GET при повторной загрузке.

**12. Как имитировать задержку?**  
В DevTools → Network → Throttling выбрать Slow 3G; это позволяет наблюдать индикатор загрузки без изменения серверного кода. Альтернатива — временно добавить задержку в тестовый серверный обработчик.

**13. Как реализовать infinite scroll с пагинацией?**  
Сервер должен принимать limit/offset (или cursor). Клиент получает первую страницу, затем `IntersectionObserver` отслеживает sentinel внизу, запрашивает следующую страницу, добавляет её к списку и останавливается, когда больше данных нет. Здесь это описан альтернативный вариант, не реализованный в проекте.

**14. Как выполнить откат оптимистичного обновления?**  
Сохранить прежний объект/позицию; сразу обновить состояние; отправить запрос; при ошибке восстановить первоначальные данные и показать уведомление. Это сделано для POST, PUT и DELETE.

**15. Какие HTTP-заголовки нужны для FormData?**  
При передаче `FormData` через браузерный fetch не устанавливать `Content-Type` вручную: браузер сам сформирует `multipart/form-data` вместе с boundary. Заголовок Authorization можно добавить при необходимости. Загрузка файлов не входит в выбранный вариант улучшения.

**16. Как показывать загрузку при фоновой операции?**  
Создать `mutationPending`, перед POST/PUT/DELETE установить `true`, в `finally` — `false`. Пока запрос идёт, показывать «Отправка изменений на сервер...», временную метку на карточке и отключать повторные действия.

## Вывод

[После локального запуска и проверки написать фактический вывод: какие операции подтверждены, какой сценарий отката воспроизведён, как проверена отмена GET. Не утверждать, что проверка пройдена, до реального запуска.]

## Источники

1. https://react.dev/reference/react/useEffect — React useEffect и cleanup.
2. https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch — Fetch, ошибки и AbortController.
3. https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequest_API/Using_FormData_Objects — FormData и Content-Type.
4. https://axios-http.com/docs/intro — документация Axios.
5. Исходный код лабораторной работы №5: https://github.com/getdhed/booking-system/tree/25 .
