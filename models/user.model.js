const mongoose = require('mongoose');
const constants = require('../utils/constants');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  avatar: { type: String, default: null },
  userId: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  email: {
    type: String, required: true, unique: true,
    lowercase: true, trim: true, minLength: 5
  },
  userType: {
    type: String,
    enum: [constants.userTypes.customer, constants.userTypes.engineer, constants.userTypes.superadmin, constants.userTypes.admin],
    required: true,
    default: constants.userTypes.customer
  },
  userStatus: {
    type: String,
    enum: [constants.userStatuses.approved, constants.userStatuses.pending, constants.userStatuses.rejected],
    required: true,
    default: constants.userStatuses.pending
  },
  // Refresh token
  refreshToken: { type: String, default: null },
  // Email verification
  isEmailVerified: { type: Boolean, default: false },
  emailVerificationToken: { type: String, default: null },
  emailVerificationExpiry: { type: Date, default: null },
  // Password reset
  passwordResetToken: { type: String, default: null },
  passwordResetExpiry: { type: Date, default: null },
  // 2FA
  twoFactorSecret: { type: String, default: null },
  twoFactorEnabled: { type: Boolean, default: false },
  // Multi-tenancy
  organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', default: null }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
