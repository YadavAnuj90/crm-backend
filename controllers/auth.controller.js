const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const User = require("../models/user.model");
const jwt = require("jsonwebtoken");
const constants = require("../utils/constants");
const { generateToken, generateRefreshToken } = require("../utils/token");
const { sendEmail } = require("../utils/email");
const logger = require("../config/logger");

let speakeasy;
try {
  speakeasy = require("speakeasy");
} catch (e) {
  speakeasy = null;
}

let redisClient = null;
function getRedis() {
  if (!redisClient && process.env.REDIS_URL) {
    try {
      const Redis = require('ioredis');
      redisClient = new Redis(process.env.REDIS_URL, { lazyConnect: true });
    } catch (e) {
      logger.warn('Redis not available: ' + e.message);
    }
  }
  return redisClient;
}

exports.signup = async (req, res) => {
  const { name, userId, email, userType, password } = req.body;

  const userStatus =
    !userType || userType === constants.userTypes.customer
      ? constants.userStatuses.approved
      : constants.userStatuses.pending;

  const verificationToken = crypto.randomBytes(32).toString('hex');
  const verificationExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h

  const userObj = {
    name, userId, email, userType, userStatus,
    password: await bcrypt.hash(password, 10),
    emailVerificationToken: verificationToken,
    emailVerificationExpiry: verificationExpiry,
    isEmailVerified: false
  };

  try {
    const userCreated = await User.create(userObj);

    // Send verification email if email is configured
    if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
      try {
        const verifyUrl = `${process.env.APP_URL || 'http://localhost:5000'}/api/v1/auth/verify-email?token=${verificationToken}&email=${email}`;
        await sendEmail(
          email,
          'Verify Your Email - CRM System',
          `Please verify your email by clicking: ${verifyUrl}`
        );
      } catch (emailErr) {
        logger.warn('Email verification not sent: ' + emailErr.message);
      }
    }

    res.status(201).send({
      message: 'User created successfully. Please check your email to verify your account.',
      name: userCreated.name,
      userId: userCreated.userId,
      email: userCreated.email,
      userType: userCreated.userType,
      userStatus: userCreated.userStatus
    });
  } catch (err) {
    logger.error("Error while creating user: " + err.message);
    res.status(500).send({ message: "Internal server error while creating user" });
  }
};

exports.verifyEmail = async (req, res) => {
  const { token, email } = req.query;
  if (!token || !email) return res.status(400).json({ message: 'Invalid verification link' });

  try {
    const user = await User.findOne({ email, emailVerificationToken: token });
    if (!user) return res.status(400).json({ message: 'Invalid or expired verification link' });
    if (user.emailVerificationExpiry < new Date()) {
      return res.status(400).json({ message: 'Verification link has expired. Please request a new one.' });
    }

    user.isEmailVerified = true;
    user.emailVerificationToken = null;
    user.emailVerificationExpiry = null;
    await user.save();

    res.status(200).json({ message: 'Email verified successfully. You can now log in.' });
  } catch (err) {
    logger.error('Email verify error: ' + err.message);
    res.status(500).json({ message: 'Internal server error' });
  }
};

exports.resendVerificationEmail = async (req, res) => {
  const { email } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (user.isEmailVerified) return res.status(400).json({ message: 'Email is already verified' });

    const verificationToken = crypto.randomBytes(32).toString('hex');
    user.emailVerificationToken = verificationToken;
    user.emailVerificationExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await user.save();

    if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
      try {
        const verifyUrl = `${process.env.APP_URL || 'http://localhost:5000'}/api/v1/auth/verify-email?token=${verificationToken}&email=${email}`;
        await sendEmail(email, 'Verify Your Email', `Click to verify: ${verifyUrl}`);
      } catch (emailErr) {
        logger.warn('Verification email not sent: ' + emailErr.message);
      }
    }
    res.status(200).json({ message: 'Verification email sent' });
  } catch (err) {
    res.status(500).json({ message: 'Internal server error' });
  }
};

exports.login = async (req, res) => {
  const { email, password, twoFactorToken } = req.body;

  if (!email || !password) {
    return res.status(400).send({ message: "email and password are required" });
  }

  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(400).send({ message: "Invalid email or password" });

    if (user.userStatus !== constants.userStatuses.approved) {
      return res.status(403).send({ message: `User is not approved yet. Current status: ${user.userStatus}` });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) return res.status(400).send({ message: "Invalid email or password" });

    // 2FA check
    if (user.twoFactorEnabled && speakeasy) {
      if (!twoFactorToken) {
        return res.status(200).json({ requiresTwoFactor: true, message: 'Please provide your 2FA token' });
      }
      const verified = speakeasy.totp.verify({
        secret: user.twoFactorSecret,
        encoding: 'base32',
        token: twoFactorToken,
        window: 1
      });
      if (!verified) return res.status(401).json({ message: 'Invalid 2FA token' });
    }

    const tokenPayload = { id: user._id, email: user.email, userType: user.userType };
    const token = generateToken(tokenPayload);
    const refreshToken = generateRefreshToken({ id: user._id });

    user.refreshToken = refreshToken;
    await user.save();

    res.status(200).send({
      message: "Signin successful",
      data: {
        token, refreshToken,
        name: user.name, userId: user.userId,
        email: user.email, userType: user.userType, userStatus: user.userStatus
      }
    });
  } catch (err) {
    logger.error('Login error: ' + err.message);
    res.status(500).json({ message: 'Internal server error' });
  }
};

exports.refreshToken = async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(401).send({ message: "Refresh token required" });

  try {
    const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
    const user = await User.findOne({ _id: decoded.id, refreshToken });
    if (!user) return res.status(403).send({ message: "Invalid refresh token" });

    const newAccessToken = generateToken({ id: user._id, email: user.email, userType: user.userType });
    res.status(200).send({ token: newAccessToken });
  } catch (err) {
    return res.status(403).send({ message: "Refresh token expired" });
  }
};

exports.logout = async (req, res) => {
  try {
    // Get token from header for blacklisting
    const authHeader = req.headers["x-access-token"] || req.headers.authorization;
    const token = authHeader && authHeader.startsWith("Bearer ") ? authHeader.slice(7) : authHeader;

    // Blacklist the access token in Redis
    if (token && process.env.REDIS_URL) {
      try {
        const decoded = jwt.decode(token);
        if (decoded && decoded.exp) {
          const ttl = decoded.exp - Math.floor(Date.now() / 1000);
          if (ttl > 0) {
            const redis = getRedis();
            if (redis) await redis.setex(`blacklist:${token}`, ttl, '1');
          }
        }
      } catch (e) {
        logger.error('Token blacklist error: ' + e.message);
      }
    }

    // Clear refresh token - fix: use req.user.id from auth middleware
    const userId = req.user?.id || req.body?.userId;
    if (userId) {
      await User.findByIdAndUpdate(userId, { $unset: { refreshToken: 1 } });
    }

    res.status(200).send({ message: "Logout successful" });
  } catch (err) {
    logger.error("Logout error: " + err.message);
    res.status(500).send({ message: "Internal server error" });
  }
};

exports.forgotPassword = async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: 'Email is required' });

  try {
    const user = await User.findOne({ email });
    // Always return success to prevent email enumeration
    if (!user) return res.status(200).json({ message: 'If that email is registered, a reset link has been sent.' });

    const resetToken = crypto.randomBytes(32).toString('hex');
    user.passwordResetToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    user.passwordResetExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await user.save();

    if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
      try {
        const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;
        await sendEmail(
          email,
          'Password Reset Request',
          `Click to reset your password: ${resetUrl} (expires in 1 hour)`
        );
      } catch (emailErr) {
        logger.warn('Password reset email not sent: ' + emailErr.message);
      }
    }

    res.status(200).json({ message: 'If that email is registered, a reset link has been sent.' });
  } catch (err) {
    logger.error('Forgot password error: ' + err.message);
    res.status(500).json({ message: 'Internal server error' });
  }
};

exports.resetPassword = async (req, res) => {
  const { token, newPassword } = req.body;
  if (!token || !newPassword) return res.status(400).json({ message: 'Token and new password are required' });
  if (newPassword.length < 8) return res.status(400).json({ message: 'Password must be at least 8 characters' });

  try {
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpiry: { $gt: new Date() }
    });

    if (!user) return res.status(400).json({ message: 'Invalid or expired reset token' });

    user.password = await bcrypt.hash(newPassword, 10);
    user.passwordResetToken = null;
    user.passwordResetExpiry = null;
    user.refreshToken = null; // Invalidate all sessions
    await user.save();

    if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
      try {
        await sendEmail(user.email, 'Password Changed Successfully', 'Your password has been changed. If this was not you, contact support immediately.');
      } catch (emailErr) {
        logger.warn('Password change confirmation email not sent: ' + emailErr.message);
      }
    }
    
    res.status(200).json({ message: 'Password reset successful' });
  } catch (err) {
    logger.error('Reset password error: ' + err.message);
    res.status(500).json({ message: 'Internal server error' });
  }
};
