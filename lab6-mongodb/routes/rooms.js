const express = require('express');
const MongoRoom = require('../models/MongoRoom');

const router = express.Router();

// CRUD: получить список.
router.get('/', async (req, res) => {
  const rooms = await MongoRoom.find();
  res.json(rooms);
});

// CRUD: получить документ по ObjectId.
router.get('/:id', async (req, res) => {
  const room = await MongoRoom.findById(req.params.id);
  if (!room) return res.status(404).json({ error: 'Комната не найдена' });
  res.json(room);
});

// CRUD: создать документ.
router.post('/', async (req, res) => {
  const room = await MongoRoom.create(req.body);
  res.status(201).json(room);
});

// CRUD: изменить документ.
router.put('/:id', async (req, res) => {
  const room = await MongoRoom.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true
  });
  if (!room) return res.status(404).json({ error: 'Комната не найдена' });
  res.json(room);
});

// CRUD: удалить документ.
router.delete('/:id', async (req, res) => {
  const room = await MongoRoom.findByIdAndDelete(req.params.id);
  if (!room) return res.status(404).json({ error: 'Комната не найдена' });
  res.json(room);
});

// Добавление вложенного документа в массив bookings.
router.post('/:id/bookings', async (req, res) => {
  const room = await MongoRoom.findById(req.params.id);
  if (!room) return res.status(404).json({ error: 'Комната не найдена' });

  room.bookings.push(req.body);
  await room.save();

  res.status(201).json(room.bookings[room.bookings.length - 1]);
});

// Обновление одного элемента массива с помощью позиционного оператора $.
router.patch('/:id/bookings/:bookingId', async (req, res) => {
  const status = req.body.status;
  const allowed = ['pending', 'confirmed', 'rejected', 'cancelled', 'completed'];
  if (!allowed.includes(status)) {
    return res.status(400).json({ error: 'Неверный статус бронирования' });
  }

  const room = await MongoRoom.findOneAndUpdate(
    { _id: req.params.id, 'bookings._id': req.params.bookingId },
    { $set: { 'bookings.$.status': status } },
    { new: true, runValidators: true }
  );

  if (!room) {
    return res.status(404).json({ error: 'Комната или бронирование не найдены' });
  }
  res.json(room);
});

module.exports = router;
