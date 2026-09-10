const { Room } = require('../models');

async function getAllRooms(req, res, next) {
  try {
    const rooms = await Room.findAll({
      order: [['id', 'ASC']]
    });

    res.status(200).json(rooms);
  } catch (error) {
    next(error);
  }
}

async function getRoomById(req, res, next) {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        error: 'Invalid room id'
      });
    }

    const room = await Room.findByPk(id);

    if (!room) {
      return res.status(404).json({
        error: 'Room not found'
      });
    }

    res.status(200).json(room);
  } catch (error) {
    next(error);
  }
}

async function createRoom(req, res, next) {
  try {
    const {
      name,
      roomNumber,
      location,
      floor,
      capacity,
      description,
      isActive
    } = req.body;

    if (
      !name ||
      !roomNumber ||
      !location ||
      floor == null ||
      capacity == null
    ) {
      return res.status(400).json({
        error: 'Required fields are missing'
      });
    }

    const room = await Room.create({
      name,
      roomNumber,
      location,
      floor,
      capacity,
      description,
      isActive
    });

    res.status(201).json(room);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getAllRooms,
  getRoomById,
  createRoom
};