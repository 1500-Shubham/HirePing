const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  googleId: {
    type: String,
    unique: true,
    sparse: true,
  },
  email: {
    type: String,
    unique: true,
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  avatar: String,
  gmailAccessToken: String,
  gmailRefreshToken: String,
  profile: {
    phone: String,
    location: String,
    summary: String,
    skills: [String],
    education: [
      {
        degree: String,
        institution: String,
        year: String,
      },
    ],
    experience: [
      {
        title: String,
        company: String,
        duration: String,
        highlights: [String],
      },
    ],
  },
  resume: {
    filename: String,
    uploadedAt: Date,
    parsedData: mongoose.Schema.Types.Mixed,
  },
  plan: {
    type: {
      type: String,
      enum: ['none', 'daily', 'weekly', 'monthly'],
      default: 'none',
    },
    purchasedAt: Date,
    expiresAt: Date,
    dailyLimit: {
      type: Number,
      default: 0,
    },
    upiTransactionId: String,
    amount: Number,
  },
  emailsSentToday: {
    type: Number,
    default: 0,
  },
  totalEmailsSent: {
    type: Number,
    default: 0,
  },
  lastResetDate: Date,
  lastEmails: [
    {
      to: String,
      subject: String,
      body: String,
      sentAt: Date,
    },
  ],
  payments: [
    {
      planType: String,
      amount: Number,
      upiTransactionId: String,
      purchasedAt: Date,
      expiresAt: Date,
    },
  ],
  isAdmin: {
    type: Boolean,
    default: false,
  },
  selectedCountries: [String],
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('User', userSchema);
