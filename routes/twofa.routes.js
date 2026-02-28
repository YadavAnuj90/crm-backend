const express = require('express');
const router = express.Router();
const verifyToken = require('../middlewares/authJwt');
const twoFAController = require('../controllers/auth2fa.controller');

router.post('/setup', verifyToken, twoFAController.setup2FA);
router.post('/verify', verifyToken, twoFAController.verify2FA);
router.post('/disable', verifyToken, twoFAController.disable2FA);

module.exports = router;
