const mongoose = require('mongoose');

const sourceSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    unique: true,
    required: true,
  },
  role: {
    type: String,
    required: true,
  },
  company: {
    type: String,
    required: true,
  },
  companyType: {
    type: String,
    enum: ['startup', 'mnc', 'mid-size'],
    required: true,
  },
  country: {
    type: String,
    required: true,
  },
  dailyEmailCount: {
    type: Number,
    default: 0,
  },
  lastResetDate: Date,
  isActive: {
    type: Boolean,
    default: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Source', sourceSchema);
