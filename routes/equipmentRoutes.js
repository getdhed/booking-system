const express = require('express');

const {
  getAllEquipment,
  getEquipmentById,
  createEquipment
} = require('../controllers/equipmentController');

const router = express.Router();

router.get('/', getAllEquipment);

router.get('/:id', getEquipmentById);

router.post('/', createEquipment);

module.exports = router;