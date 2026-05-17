const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  name: { type: String, required: true },
  rating: { type: Number, required: true },
  comment: { type: String, required: true },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'User',
  },
}, { timestamps: true });

const serviceSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String },
  price: { type: Number, required: true },
  duration: { type: Number, required: true }, // in minutes
  category: { type: String, required: true },
  image: { type: String },
  reviews: [reviewSchema],
  rating: { type: Number, required: true, default: 0 },
  numReviews: { type: Number, required: true, default: 0 },
  workPhotos: [{ type: String }],
  availability: {
    daysOff: [{ type: Number }], // Array of days (0=Sunday, 1=Monday, etc.)
    startTime: { type: String, default: "09:00" },
    endTime: { type: String, default: "20:00" },
    isCustom: { type: Boolean, default: false }
  }
}, { timestamps: true });

module.exports = mongoose.model('Service', serviceSchema);
