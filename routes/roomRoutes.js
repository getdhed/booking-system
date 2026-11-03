const express = require('express');
const authorization = require('../middlewares/authorization');
const {
  getAllRooms,
  getRoomById,
  createRoom,
  updateRoom,
  deleteRoom
} = require('../controllers/roomController');

const router = express.Router();

// Просмотр помещений открыт всем. Изменения требуют JWT.
router.get('/', getAllRooms);
router.get('/:id', getRoomById);
router.post('/', authorization, createRoom);
router.put('/:id', authorization, updateRoom);
router.delete('/:id', authorization, deleteRoom);

module.exports = router;
