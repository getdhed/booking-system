const express = require('express');

const { sequelize } = require('./models');

const bookingRoutes = require('./routes/bookingRoutes');
const userRoutes = require('./routes/userRoutes');
const roomRoutes = require('./routes/roomRoutes');
const equipmentRoutes = require('./routes/equipmentRoutes');

const errorHandler = require('./middlewares/errorHandler');

const app = express();

const port = 3000;

app.use(express.json());

app.use('/bookings', bookingRoutes);

app.use('/users', userRoutes);

app.use('/rooms', roomRoutes);

app.use('/equipment', equipmentRoutes);

app.use(errorHandler);

async function startServer() {
  try {
    await sequelize.authenticate();

    console.log('Database connection established successfully');

    app.listen(port, () => {
      console.log(`Server running on http://localhost:${port}`);
    });
  } catch (error) {
    console.error('Unable to connect to the database:', error);
  }
}

startServer();