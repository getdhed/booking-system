const {
  Booking,
  User,
  Room,
  Equipment
} = require('../models');

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

async function getAllBookings(req, res, next) {
  try {
    const bookings = await Booking.findAll({
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

    if (!booking) {
      return res.status(404).json({
        error: 'Booking not found'
      });
    }

    res.status(200).json(booking);
  } catch (error) {
    next(error);
  }
}

async function createBooking(req, res, next) {
  try {
    const {
      userId,
      roomId,
      startTime,
      endTime,
      purpose,
      attendeeCount,
      status
    } = req.body;

    if (
      userId == null ||
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

    const booking = await Booking.create({
      userId,
      roomId,
      startTime,
      endTime,
      purpose,
      attendeeCount,
      status
    });

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

    const {
      userId,
      roomId,
      startTime,
      endTime,
      purpose,
      attendeeCount,
      status
    } = req.body;

    if (
      userId == null ||
      roomId == null ||
      !startTime ||
      !endTime ||
      !purpose ||
      attendeeCount == null ||
      !status
    ) {
      return res.status(400).json({
        error: 'All fields are required'
      });
    }

    await booking.update({
      userId,
      roomId,
      startTime,
      endTime,
      purpose,
      attendeeCount,
      status
    });

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