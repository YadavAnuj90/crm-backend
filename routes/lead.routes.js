const express = require('express');
const router = express.Router();
const verifyToken = require('../middlewares/authJwt');
const { isAdmin, isAdminOrEngineer } = require('../middlewares/roleMiddleware');
const { validate } = require('../middlewares/validate');
const { CreateLeadSchema, UpdateLeadSchema, AddFollowUpSchema } = require('../validators/lead.validator');
const ctrl = require('../controllers/lead.controller');

// Pipeline board — all authenticated users
router.get('/board', verifyToken, ctrl.getPipelineBoard);
router.get('/analytics', verifyToken, isAdminOrEngineer, ctrl.getPipelineAnalytics);

// CRUD
router.get('/', verifyToken, ctrl.getAllLeads);
router.post('/', verifyToken, validate(CreateLeadSchema), ctrl.createLead);
router.get('/:id', verifyToken, ctrl.getLead);
router.put('/:id', verifyToken, validate(UpdateLeadSchema), ctrl.updateLead);
router.delete('/:id', verifyToken, isAdmin, ctrl.deleteLead);

// Follow-ups
router.post('/:id/follow-ups', verifyToken, validate(AddFollowUpSchema), ctrl.addFollowUp);
router.patch('/:id/follow-ups/:followUpId/complete', verifyToken, ctrl.completeFollowUp);

module.exports = router;
