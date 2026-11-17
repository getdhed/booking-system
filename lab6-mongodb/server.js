require('dotenv').config({ path: require('node:path').join(__dirname, '.env') });

const express = require('express');
const mongoose = require('mongoose');
const roomRoutes = require('./routes/rooms');

const app = express();
app.use(express.json());
app.use('/rooms', roomRoutes);

app.get('/', (req, res) => {
  res.json({ message: 'Лабораторная №6: MongoDB', routes: '/rooms' });
});

app.use((err, req, res, next) => {
  if (err instanceof mongoose.Error.CastError ||
      err instanceof mongoose.Error.ValidationError) {
    return res.status(400).json({ error: err.message });
  }
  if (err.code === 11000) {
    return res.status(409).json({ error: 'Комната с таким номером уже есть' });
  }
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Некорректный JSON' });
  }
  console.error(err);
  res.status(500).json({ error: 'Ошибка сервера' });
});

async function start() {
  if (!process.env.MONGO_URI) {
    console.error('Укажите MONGO_URI в lab6-mongodb/.env');
    process.exitCode = 1;
    return;
  }

  try {
    await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 5000 });
    console.log('MongoDB connected');

    const port = Number(process.env.PORT || 3001);
    app.listen(port, () => {
      console.log('Сервер запущен: http://localhost:' + port);
    });
  } catch (err) {
    console.error('Ошибка подключения к MongoDB:', err.message);
    process.exitCode = 1;
  }
}

if (require.main === module) start();
module.exports = app;
