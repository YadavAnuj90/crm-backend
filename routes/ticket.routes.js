const express = require('express');
const router = express.Router();

const verifyToken = require('../middlewares/authJwt');
const { isAdmin, isEngineer, isCustomer, isAdminOrEngineer } = require('../middlewares/roleMiddleware');
const { upload } = require('../config/cloudinary');
const { validate } = require('../middlewares/validate');
const {
  CreateTicketSchema,
  UpdateStatusSchema,
  AssignTicketSchema,
  AddFeedbackSchema,
  BulkAssignSchema,
  BulkStatusSchema,
} = require('../validators/ticket.validator');

const ticketController = require('../controllers/ticket.controller');
const { searchTickets } = require('../controllers/ticket.search.controller');

// GET routes
router.get('/', verifyToken, isAdminOrEngineer, ticketController.getAllTickets);
router.get('/my', verifyToken, isCustomer, ticketController.getMyTickets);
router.get('/search', verifyToken, searchTickets);
router.get('/engineer/me', verifyToken, isEngineer, ticketController.getTicketsForEngineer);
router.get('/deleted', verifyToken, isAdmin, ticketController.getDeletedTickets);

// POST routes — validate AFTER upload middleware (multer parses body)
router.post('/', verifyToken, isCustomer, upload.array('attachments', 5), validate(CreateTicketSchema), ticketController.createTicket);
router.post('/:id/attachments', verifyToken, upload.array('attachments', 5), ticketController.addAttachment);
router.post('/:id/feedback', verifyToken, isCustomer, validate(AddFeedbackSchema), ticketController.addFeedback);

// Bulk operations
router.post('/bulk/assign', verifyToken, isAdmin, validate(BulkAssignSchema), ticketController.bulkAssignTickets);
router.post('/bulk/status', verifyToken, isAdminOrEngineer, validate(BulkStatusSchema), ticketController.bulkUpdateStatus);

// PUT routes
router.put('/:id/assign', verifyToken, isAdmin, validate(AssignTicketSchema), ticketController.assignTicket);
router.put('/:id/status', verifyToken, isAdminOrEngineer, validate(UpdateStatusSchema), ticketController.updateStatus);

// Soft delete & restore
router.delete('/:id', verifyToken, isAdmin, ticketController.softDeleteTicket);
router.patch('/:id/restore', verifyToken, isAdmin, ticketController.restoreTicket);

module.exports = router;
