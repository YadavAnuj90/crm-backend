const express = require('express');
const router = express.Router();
const verifyToken = require('../middlewares/authJwt');
const { validate } = require('../middlewares/validate');
const { CreateNoteSchema, UpdateNoteSchema } = require('../validators/note.validator');
const ctrl = require('../controllers/note.controller');

router.get('/', verifyToken, ctrl.getNotes);          // ?contactId= / ?leadId= / ?ticketId=
router.post('/', verifyToken, validate(CreateNoteSchema), ctrl.createNote);
router.put('/:id', verifyToken, validate(UpdateNoteSchema), ctrl.updateNote);
router.delete('/:id', verifyToken, ctrl.deleteNote);

// My upcoming reminders
router.get('/reminders/mine', verifyToken, ctrl.getMyReminders);

module.exports = router;
