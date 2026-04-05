const express = require('express');
const router = express.Router();
const verifyToken = require('../middlewares/authJwt');
const { isAdmin } = require('../middlewares/roleMiddleware');
const webhookController = require('../controllers/webhook.controller');
const { validate } = require('../middlewares/validate');
const { CreateWebhookSchema } = require('../validators/webhook.validator');

router.post('/', verifyToken, isAdmin, validate(CreateWebhookSchema), webhookController.createWebhook);
router.get('/', verifyToken, isAdmin, webhookController.listWebhooks);
router.delete('/:id', verifyToken, isAdmin, webhookController.deleteWebhook);
router.patch('/:id/toggle', verifyToken, isAdmin, webhookController.toggleWebhook);

module.exports = router;
