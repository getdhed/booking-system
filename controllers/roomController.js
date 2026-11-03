const { ForeignKeyConstraintError, Op } = require('sequelize');
const { Room, Booking, Amenity, sequelize } = require('../models');
const includeAmenities = [{ model: Amenity, as: 'amenityOptions', through: { attributes: [] }, attributes: ['id', 'code', 'label', 'icon', 'sortOrder'] }];

function roomResponse(room) {
  const data = room.toJSON();
  const options = (data.amenityOptions || []).sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id);
  delete data.amenityOptions;
  return { ...data, amenities: options.map(item => item.label), amenityIds: options.map(item => item.id) };
}

async function getAmenities(req, res, next) {
  try { res.json(await Amenity.findAll({ order: [['sortOrder', 'ASC'], ['id', 'ASC']] })); }
  catch (error) { next(error); }
}

async function resolveAmenities(data) {
  const values = data.amenityIds !== undefined ? data.amenityIds : data.amenities;
  if (!values.length) return [];
  const key = data.amenityIds !== undefined ? 'id' : 'label';
  const options = await Amenity.findAll({ where: { [key]: { [Op.in]: values } }, order: [['sortOrder', 'ASC'], ['id', 'ASC']] });
  return options.length === values.length ? options : null;
}

function readRoomId(value) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

// Валидация на сервере обязательна даже при наличии проверок в React.
function normalizeRoom(body) {
  if (!body || typeof body !== 'object') return null;

  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const roomNumber = typeof body.roomNumber === 'string' ? body.roomNumber.trim() : '';
  const location = typeof body.location === 'string' ? body.location.trim() : '';
  const description = body.description == null ? '' : body.description;
  const imageUrl = body.imageUrl == null || body.imageUrl === '' ? null : body.imageUrl;
  const validImage = value => {
    if (typeof value !== 'string' || value.length > 2048) return false;
    if (/^\/uploads\/rooms\/[0-9a-f-]{36}\.(jpg|png|webp)$/.test(value)) return true;
    try {
      const url = new URL(value);
      return ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password;
    } catch { return false; }
  };
  if (imageUrl !== null && !validImage(imageUrl)) return null;
  const galleryUrls = body.galleryUrls == null ? [] : body.galleryUrls;
  const amenities = body.amenities == null ? [] : body.amenities;
  if (!Array.isArray(galleryUrls) || galleryUrls.length > 8 || !galleryUrls.every(validImage)) return null;
  const amenityIds = body.amenityIds === undefined ? undefined : body.amenityIds;
  if (amenityIds !== undefined && (!Array.isArray(amenityIds) || amenityIds.length > 50 || !amenityIds.every(id => Number.isInteger(id) && id > 0))) return null;
  if (!Array.isArray(amenities) || amenities.length > 50 ||
      !amenities.every(value => typeof value === 'string' && value.trim() && value.length <= 80)) return null;
  const floor = body.floor;
  const capacity = body.capacity;

  if (!name || name.length > 100 ||
      !roomNumber || roomNumber.length > 20 ||
      !location || location.length > 150 ||
      typeof description !== 'string' || description.length > 2000 ||
      !Number.isInteger(floor) || floor < 0 ||
      !Number.isInteger(capacity) || capacity < 1 ||
      typeof body.isActive !== 'boolean') {
    return null;
  }

  return { name, roomNumber, location, floor, capacity, description, imageUrl, galleryUrls: [...new Set(galleryUrls)], amenities: [...new Set(amenities.map(value => value.trim()))], amenityIds: amenityIds === undefined ? undefined : [...new Set(amenityIds)], isActive: body.isActive };
}

async function getAllRooms(req, res, next) {
  try {
    const rooms = await Room.findAll({ include: includeAmenities, order: [['id', 'ASC']] });
    res.status(200).json(rooms.map(roomResponse));
  } catch (error) {
    next(error);
  }
}

async function getRoomById(req, res, next) {
  try {
    const id = readRoomId(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invalid room id' });

    const room = await Room.findByPk(id, { include: includeAmenities });
    if (!room) return res.status(404).json({ error: 'Room not found' });
    res.status(200).json(roomResponse(room));
  } catch (error) {
    next(error);
  }
}

async function createRoom(req, res, next) {
  try {
    const data = normalizeRoom(req.body);
    if (!data) return res.status(400).json({ error: 'Invalid room data' });

    const options = await resolveAmenities(data);
    if (!options) return res.status(400).json({ error: 'Unknown amenity' });
    const { amenityIds, ...values } = data;
    const room = await sequelize.transaction(async transaction => {
      const created = await Room.create({ ...values, amenities: options.map(item => item.label) }, { transaction });
      await created.setAmenityOptions(options, { transaction });
      return Room.findByPk(created.id, { include: includeAmenities, transaction });
    });
    res.status(201).json(roomResponse(room));
  } catch (error) {
    next(error);
  }
}

async function updateRoom(req, res, next) {
  try {
    const id = readRoomId(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invalid room id' });

    const data = normalizeRoom(req.body);
    if (!data) return res.status(400).json({ error: 'Invalid room data' });

    const room = await Room.findByPk(id);
    if (!room) return res.status(404).json({ error: 'Room not found' });

    const options = await resolveAmenities(data);
    if (!options) return res.status(400).json({ error: 'Unknown amenity' });
    const { amenityIds, ...values } = data;
    const updated = await sequelize.transaction(async transaction => {
      await room.update({ ...values, amenities: options.map(item => item.label) }, { transaction });
      await room.setAmenityOptions(options, { transaction });
      return Room.findByPk(id, { include: includeAmenities, transaction });
    });
    res.status(200).json(roomResponse(updated));
  } catch (error) {
    next(error);
  }
}

async function deleteRoom(req, res, next) {
  try {
    const id = readRoomId(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invalid room id' });

    const room = await Room.findByPk(id);
    if (!room) return res.status(404).json({ error: 'Room not found' });

    // В БД для Bookings.roomId задан ON DELETE RESTRICT.
    if (await Booking.count({ where: { roomId: id } }) > 0) {
      return res.status(409).json({ error: 'Room has bookings and cannot be deleted' });
    }

    await room.destroy();
    res.status(204).send();
  } catch (error) {
    // Если бронирование появилось между проверкой и удалением.
    if (error instanceof ForeignKeyConstraintError) {
      return res.status(409).json({ error: 'Room has bookings and cannot be deleted' });
    }
    next(error);
  }
}

module.exports = {
  getAmenities,
  getAllRooms,
  getRoomById,
  createRoom,
  updateRoom,
  deleteRoom
};
