const express = require('express');

const {
  getAllBookings,
  getBookingById,
  createBooking,
  updateBooking,
  deleteBooking
} = require('../controllers/bookingController');

const router = express.Router();

router.get('/', getAllBookings);

router.get('/:id', getBookingById);

router.post('/', createBooking);

router.put('/:id', updateBooking);

router.delete('/:id', deleteBooking);

module.exports = router;