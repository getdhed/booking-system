const express = require('express');
const authorization = require('../middlewares/authorization');
const requireAdmin = require('../middlewares/requireAdmin');
const { getAllRooms, getRoomById, createRoom, updateRoom, deleteRoom, getAmenities } = require('../controllers/roomController');

const { uploadPhotos } = require('../services/roomPhotos');
const router = express.Router();
router.use(authorization);
router.get('/amenities', getAmenities);
router.post('/photos', requireAdmin, uploadPhotos);
router.get('/', getAllRooms);
router.get('/:id', getRoomById);
router.post('/', requireAdmin, createRoom);
router.put('/:id', requireAdmin, updateRoom);
router.delete('/:id', requireAdmin, deleteRoom);
module.exports = router;
