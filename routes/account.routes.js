const express = require('express');
const router = express.Router();
const verifyToken = require('../middlewares/authJwt');
const { isAdmin } = require('../middlewares/roleMiddleware');
const { validate } = require('../middlewares/validate');
const { CreateAccountSchema } = require('../validators/note.validator');
const ctrl = require('../controllers/account.controller');

router.get('/', verifyToken, ctrl.getAllAccounts);
router.post('/', verifyToken, validate(CreateAccountSchema), ctrl.createAccount);
router.get('/:id', verifyToken, ctrl.getAccount);
router.put('/:id', verifyToken, validate(CreateAccountSchema.partial()), ctrl.updateAccount);
router.delete('/:id', verifyToken, isAdmin, ctrl.deleteAccount);

// Sub-resources
router.get('/:id/contacts', verifyToken, ctrl.getAccountContacts);
router.get('/:id/leads', verifyToken, ctrl.getAccountLeads);

module.exports = router;
