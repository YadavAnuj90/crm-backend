const express = require('express');
const router = express.Router();
const verifyToken = require('../middlewares/authJwt');
const { isAdmin } = require('../middlewares/roleMiddleware');
const ctrl = require('../controllers/emailInbox.controller');

router.get('/status', verifyToken, isAdmin, ctrl.getInboxStatus);
router.get('/threads', verifyToken, isAdmin, ctrl.listThreads);
router.get('/threads/ticket/:ticketId', verifyToken, ctrl.getTicketThreads);
router.post('/poll', verifyToken, isAdmin, ctrl.triggerPoll); // Manual trigger

module.exports = router;
