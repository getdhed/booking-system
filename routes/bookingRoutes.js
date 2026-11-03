const express = require('express');
const authorization = require('../middlewares/authorization');
const requireAdmin = require('../middlewares/requireAdmin');
const {
  getAllBookings, getBookingById, createBooking, updateBooking, deleteBooking
} = require('../controllers/bookingController');
const router = express.Router();
router.use(authorization);
router.get('/', getAllBookings);
router.get('/:id', getBookingById);
router.post('/', createBooking);
router.put('/:id', requireAdmin, updateBooking);
router.patch('/:id', requireAdmin, updateBooking);
router.delete('/:id', requireAdmin, deleteBooking);
module.exports = router;
