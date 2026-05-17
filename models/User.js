const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['client', 'admin'], default: 'client' },
  phone: { type: String },
  resetPasswordOtp: { type: String },
  resetPasswordExpires: { type: Date },
  loyaltyPoints: { type: Number, default: 0 },
  loyaltyLevel: { type: String, enum: ['Bronze', 'Silver', 'Gold'], default: 'Bronze' },
  badges: [{ type: String }],
  systemNotifications: [{
    message: { type: String },
    type: { type: String, default: 'reward' }, // 'reward', 'system'
    read: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now }
  }]
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
