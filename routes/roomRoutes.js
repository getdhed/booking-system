const express = require('express');
const authorization = require('../middlewares/authorization');
const requireAdmin = require('../middlewares/requireAdmin');
const { getAllRooms, getRoomById, createRoom, updateRoom, deleteRoom } = require('../controllers/roomController');

const router = express.Router();
router.use(authorization);
router.get('/', getAllRooms);
router.get('/:id', getRoomById);
router.post('/', requireAdmin, createRoom);
router.put('/:id', requireAdmin, updateRoom);
router.delete('/:id', requireAdmin, deleteRoom);
module.exports = router;
