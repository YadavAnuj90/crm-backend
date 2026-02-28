const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const validateuserRequestBody = require('../middlewares/validateUserRequest');
const verifyToken = require('../middlewares/authJwt');

router.post('/signup', validateuserRequestBody, authController.signup);
router.post('/login', authController.login);
router.post('/logout', verifyToken, authController.logout);
router.post('/refresh-token', authController.refreshToken);

// Email verification
router.get('/verify-email', authController.verifyEmail);
router.post('/resend-verification', authController.resendVerificationEmail);

// Password reset
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);

module.exports = router;
