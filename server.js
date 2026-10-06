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