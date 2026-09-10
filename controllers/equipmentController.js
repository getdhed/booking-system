const { Equipment } = require('../models');

async function getAllEquipment(req, res, next) {
  try {
    const equipment = await Equipment.findAll({
      order: [['id', 'ASC']]
    });

    res.status(200).json(equipment);
  } catch (error) {
    next(error);
  }
}

async function getEquipmentById(req, res, next) {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        error: 'Invalid equipment id'
      });
    }

    const equipment = await Equipment.findByPk(id);

    if (!equipment) {
      return res.status(404).json({
        error: 'Equipment not found'
      });
    }

    res.status(200).json(equipment);
  } catch (error) {
    next(error);
  }
}

async function createEquipment(req, res, next) {
  try {
    const {
      name,
      type,
      totalQuantity,
      description,
      isActive
    } = req.body;

    if (
      !name ||
      !type ||
      totalQuantity == null
    ) {
      return res.status(400).json({
        error: 'Required fields are missing'
      });
    }

    const equipment = await Equipment.create({
      name,
      type,
      totalQuantity,
      description,
      isActive
    });

    res.status(201).json(equipment);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getAllEquipment,
  getEquipmentById,
  createEquipment
};