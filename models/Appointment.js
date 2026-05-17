const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  serviceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Service', required: true },
  date: { type: Date, required: true },
  endDate: { type: Date }, // Optional: for multi-day bookings like rentals
  time: { type: String }, // Optional for rentals
  status: { type: String, enum: ['pending', 'approved', 'cancelled', 'completed'], default: 'pending' },
  notes: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('Appointment', appointmentSchema);
