const {Booking,User,Room,Equipment} = require('../models');

const bookingInclude = [
  {
    model: User,
    as: 'user',
    attributes: ['id', 'fullName', 'email', 'role']
  },
  {
    model: Room,
    as: 'room'
  },
  {
    model: Equipment,
    as: 'equipment',
    through: {
      attributes: ['quantity']
    }
  }
];

const statuses = ['pending', 'confirmed', 'rejected', 'cancelled', 'completed'];

async function validateBooking(data) {
  if (!Number.isInteger(data.roomId) || data.roomId <= 0)
    return 'Invalid room';
  if (!data.startTime || !data.endTime || !Number.isFinite(new Date(data.startTime).getTime()) ||
      !Number.isFinite(new Date(data.endTime).getTime()) ||
      new Date(data.endTime) <= new Date(data.startTime))
    return 'Invalid booking time';
  if (typeof data.purpose !== 'string' || !data.purpose.trim() || data.purpose.length > 500)
    return 'Invalid booking purpose';
  if (!statuses.includes(data.status)) return 'Invalid booking status';
  if (data.notes != null && (typeof data.notes !== 'string' || data.notes.length > 2000))
    return 'Invalid booking notes';
  const room = await Room.findByPk(data.roomId);
  if (!room) return 'Room not found';
  if (!Number.isInteger(data.attendeeCount) || data.attendeeCount < 1 || data.attendeeCount > room.capacity)
    return 'Attendee count exceeds room capacity';
  if (data.status === 'confirmed' && !room.isActive) return 'Room is unavailable';
  return null;
}

async function getAllBookings(req, res, next) {
  try {
    const bookings = await Booking.findAll({
      where: req.user.role === 'admin' ? {} : { userId: req.user.id },
      include: bookingInclude,
      order: [['id', 'ASC']]
    });

    res.status(200).json(bookings);
  } catch (error) {
    next(error);
  }
}

async function getBookingById(req, res, next) {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        error: 'Invalid booking id'
      });
    }

    const booking = await Booking.findByPk(id, {
      include: bookingInclude
    });

    if (!booking || (req.user.role !== 'admin' && booking.userId !== req.user.id)) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    res.status(200).json(booking);
  } catch (error) {
    next(error);
  }
}

async function createBooking(req, res, next) {
  try {
    const {userId,roomId,startTime,endTime,purpose,attendeeCount,status} = req.body;

    if (
      roomId == null ||
      !startTime ||
      !endTime ||
      !purpose ||
      attendeeCount == null
    ) {
      return res.status(400).json({
        error: 'Required fields are missing'
      });
    }

    const data = {
      userId: req.user.id,
      roomId,
      startTime,
      endTime,
      purpose,
      attendeeCount,
      // Обычный пользователь не может выдать себе подтверждённое бронирование.
      status: req.user.role === 'admin' && status ? status : 'pending'
    };
    const validationError = await validateBooking(data);
    if (validationError) return res.status(400).json({ error: validationError });
    const room = await Room.findByPk(roomId);
    if (!room.isActive) return res.status(400).json({ error: 'Room is unavailable' });
    const booking = await Booking.create({ ...data, purpose: purpose.trim() });

    const createdBooking = await Booking.findByPk(booking.id, {
      include: bookingInclude
    });

    res.status(201).json(createdBooking);
  } catch (error) {
    next(error);
  }
}

async function updateBooking(req, res, next) {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        error: 'Invalid booking id'
      });
    }

    const booking = await Booking.findByPk(id);

    if (!booking) {
      return res.status(404).json({
        error: 'Booking not found'
      });
    }

    // Владелец заявки не меняется при согласовании времени и условий.
    if (req.body.userId !== undefined && req.body.userId !== booking.userId)
      return res.status(400).json({ error: 'Booking owner cannot be changed' });
    const fields = ['roomId', 'startTime', 'endTime', 'purpose', 'attendeeCount', 'status', 'notes'];
    const data = Object.fromEntries(fields.map(field => [field,
      req.body[field] !== undefined ? req.body[field] : booking[field]
    ]));
    const validationError = await validateBooking(data);
    if (validationError) return res.status(400).json({ error: validationError });
    await booking.update({ ...data, purpose: data.purpose.trim(), notes: data.notes?.trim() || null });

    const updatedBooking = await Booking.findByPk(id, {
      include: bookingInclude
    });

    res.status(200).json(updatedBooking);
  } catch (error) {
    next(error);
  }
}

async function deleteBooking(req, res, next) {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        error: 'Invalid booking id'
      });
    }

    const booking = await Booking.findByPk(id);

    if (!booking) {
      return res.status(404).json({
        error: 'Booking not found'
      });
    }

    await booking.destroy();

    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getAllBookings,
  getBookingById,
  createBooking,
  updateBooking,
  deleteBooking
};
