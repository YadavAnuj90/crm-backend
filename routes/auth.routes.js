const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const verifyToken = require('../middlewares/authJwt');
const { validate } = require('../middlewares/validate');
const {
  SignupSchema,
  LoginSchema,
  ForgotPasswordSchema,
  ResetPasswordSchema,
  ResendVerificationSchema,
  RefreshTokenSchema,
} = require('../validators/auth.validator');

router.post('/signup', validate(SignupSchema), authController.signup);
router.post('/login', validate(LoginSchema), authController.login);
router.post('/logout', verifyToken, authController.logout);
router.post('/refresh-token', validate(RefreshTokenSchema), authController.refreshToken);

// Email verification
router.get('/verify-email', authController.verifyEmail);
router.post('/resend-verification', validate(ResendVerificationSchema), authController.resendVerificationEmail);

// Password reset
router.post('/forgot-password', validate(ForgotPasswordSchema), authController.forgotPassword);
router.post('/reset-password', validate(ResetPasswordSchema), authController.resetPassword);

module.exports = router;
