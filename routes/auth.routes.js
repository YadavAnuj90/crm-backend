
const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const validateuserRequestBody = require('../middlewares/validateUserRequest');



router.post('/signup', validateuserRequestBody, authController.signup);
router.post('/login', authController.login);

module.exports = router;