const mongoose = require('mongoose');

// В PostgreSQL бронирования находятся в таблице Bookings.
// Здесь каждое бронирование — вложенный документ в массиве rooms.bookings.
const bookingSchema = new mongoose.Schema({
  userId: Number,
  startTime: { type: Date, required: true },
  endTime: { type: Date, required: true },
  purpose: { type: String, required: true },
  notes: String,
  attendeeCount: { type: Number, min: 1, default: 1 },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'rejected', 'cancelled', 'completed'],
    default: 'pending'
  }
});

const roomSchema = new mongoose.Schema({
  name: { type: String, required: true },
  roomNumber: { type: String, required: true, unique: true },
  location: { type: String, required: true },
  floor: { type: Number, required: true },
  capacity: { type: Number, required: true, min: 1 },
  description: String,
  galleryUrls: [String],
  amenities: [String],
  isActive: { type: Boolean, default: true },
  bookings: [bookingSchema]
});

module.exports = mongoose.model('MongoRoom', roomSchema, 'rooms');
