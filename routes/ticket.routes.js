const express = require("express");
const router = express.Router();

const verifyToken = require("../middlewares/authJwt");
const {
  isAdmin,
  isEngineer,
  isCustomer,
  isAdminOrEngineer
} = require("../middlewares/roleMiddleware");

const { upload } = require("../config/cloudinary");

const ticketController = require("../controllers/ticket.controller");
const { searchTickets } = require("../controllers/ticket.search.controller");

// GET routes
router.get("/", verifyToken, isAdminOrEngineer, ticketController.getAllTickets);
router.get("/my", verifyToken, isCustomer, ticketController.getMyTickets);
router.get("/search", verifyToken, searchTickets);
router.get("/engineer/me", verifyToken, isEngineer, ticketController.getTicketsForEngineer);

// POST routes
router.post("/", verifyToken, isCustomer, upload.array("attachments", 5), ticketController.createTicket);
router.post("/:id/attachments", verifyToken, upload.array("attachments", 5), ticketController.addAttachment);
router.post("/:id/feedback", verifyToken, isCustomer, ticketController.addFeedback);

// Bulk operations (Admin/Engineer)
router.post("/bulk/assign", verifyToken, isAdmin, ticketController.bulkAssignTickets);
router.post("/bulk/status", verifyToken, isAdminOrEngineer, ticketController.bulkUpdateStatus);

// PUT routes
router.put("/:id/assign", verifyToken, isAdmin, ticketController.assignTicket);
router.put("/:id/status", verifyToken, isAdminOrEngineer, ticketController.updateStatus);

module.exports = router;
