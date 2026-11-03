require('dotenv').config();

const express = require('express');
const { sequelize } = require('./models');
const bookingRoutes = require('./routes/bookingRoutes');
const userRoutes = require('./routes/userRoutes');
const roomRoutes = require('./routes/roomRoutes');
const equipmentRoutes = require('./routes/equipmentRoutes');
const errorHandler = require('./middlewares/errorHandler');
const authRoutes = require('./routes/authRoutes');
const profileRoutes = require('./routes/profileRoutes');
const app = express();
const port = 3000;

// Разрешаем запросы из Vite во время локальной разработки.
// Для другого адреса фронтенда задайте CLIENT_ORIGINS через .env.
const allowedOrigins = new Set(
  (process.env.CLIENT_ORIGINS || 'http://localhost:5173,http://127.0.0.1:5173')
    .split(',')
    .map(origin => origin.trim())
);
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && allowedOrigins.has(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  }
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

app.use(express.json());

app.use('/bookings', bookingRoutes);
app.use('/users', userRoutes);
app.use('/rooms', roomRoutes);
app.use('/equipment', equipmentRoutes);
app.use('/auth', authRoutes);
app.use('/profile', profileRoutes);

app.use(errorHandler);

async function startServer() {
  try {
    await sequelize.authenticate();
    console.log('бд подключена!');
    app.listen(port, () => {
      console.log(`сервер запущен на http://localhost:${port}`);
    });
  } catch (error) {
    console.error('не удалось установить соединение с бд:', error);
  }
}
startServer();