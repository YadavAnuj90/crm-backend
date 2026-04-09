const express = require('express');
const multer = require('multer');
const router = express.Router();
const verifyToken = require('../middlewares/authJwt');
const { isAdmin, isAdminOrEngineer } = require('../middlewares/roleMiddleware');
const { validate } = require('../middlewares/validate');
const { CreateContactSchema, UpdateContactSchema, MergeContactSchema } = require('../validators/contact.validator');
const ctrl = require('../controllers/contact.controller');
const timelineCtrl = require('../controllers/timeline.controller');

// Memory storage for import (parse in-memory, don't write to disk)
const importUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
  fileFilter: (req, file, cb) => {
    const allowed = ['.xlsx', '.xls', '.csv'];
    const ext = '.' + file.originalname.split('.').pop().toLowerCase();
    if (allowed.includes(ext)) cb(null, true);
    else cb(new Error('Only .xlsx, .xls, and .csv files are allowed'));
  },
});

// CRUD
router.get('/', verifyToken, ctrl.getAllContacts);
router.post('/', verifyToken, validate(CreateContactSchema), ctrl.createContact);
router.get('/:id', verifyToken, ctrl.getContact);
router.put('/:id', verifyToken, validate(UpdateContactSchema), ctrl.updateContact);
router.delete('/:id', verifyToken, isAdmin, ctrl.deleteContact);

// Deduplication
router.get('/duplicates/find', verifyToken, isAdminOrEngineer, ctrl.findDuplicates);
router.post('/duplicates/merge', verifyToken, isAdmin, validate(MergeContactSchema), ctrl.mergeContacts);

// Bulk import
router.post('/import', verifyToken, isAdminOrEngineer, importUpload.single('file'), ctrl.importContacts);

// Timeline sub-resource
router.get('/:id/timeline', verifyToken, timelineCtrl.getContactTimeline);
router.post('/:id/timeline', verifyToken, timelineCtrl.logActivity);
router.get('/:id/timeline/summary', verifyToken, timelineCtrl.getContactSummary);

module.exports = router;
