const mongoose = require('mongoose');

const organizationSchema = new mongoose.Schema({
  name: { type: String, required: true },
  slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  plan: {
    type: String,
    enum: ["FREE", "STARTER", "PRO", "ENTERPRISE"],
    default: "FREE"
  },
  isActive: { type: Boolean, default: true },
  settings: {
    allowSelfSignup: { type: Boolean, default: true },
    maxUsers: { type: Number, default: 10 },
    maxTicketsPerMonth: { type: Number, default: 100 }
  }
}, { timestamps: true });

module.exports = mongoose.model('Organization', organizationSchema);
