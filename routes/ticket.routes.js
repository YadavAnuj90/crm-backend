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

/**
 * @swagger
 * tags:
 *   name: Tickets
 *   description: Ticket management APIs
 */

/**
 * @swagger
 * /tickets:
 *   get:
 *     summary: Get all tickets (Admin/Engineer)
 *     tags: [Tickets]
 *     security:
 *       - bearerAuth: []
 */
router.get(
  "/",
  verifyToken,
  isAdminOrEngineer,
  ticketController.getAllTickets
);

/**
 * @swagger
 * /tickets/my:
 *   get:
 *     summary: Get logged-in customer's tickets
 *     tags: [Tickets]
 *     security:
 *       - bearerAuth: []
 */
router.get(
  "/my",
  verifyToken,
  isCustomer,
  ticketController.getMyTickets
);

/**
 * @swagger
 * /tickets:
 *   post:
 *     summary: Create a ticket (Customer only)
 *     tags: [Tickets]
 *     security:
 *       - bearerAuth: []
 */
router.post(
  "/",
  verifyToken,
  isCustomer,
  upload.array("attachments", 5),
  ticketController.createTicket
);

/**
 * @swagger
 * /tickets/{id}/attachments:
 *   post:
 *     summary: Add attachments to a ticket
 *     tags: [Tickets]
 *     security:
 *       - bearerAuth: []
 */
router.post(
  "/:id/attachments",
  verifyToken,
  upload.array("attachments", 5),
  ticketController.addAttachment
);

/**
 * @swagger
 * /tickets/{id}/assign:
 *   put:
 *     summary: Assign ticket to engineer (Admin only)
 *     tags: [Tickets]
 *     security:
 *       - bearerAuth: []
 */
router.put(
  "/:id/assign",
  verifyToken,
  isAdmin,
  ticketController.assignTicket
);

/**
 * @swagger
 * /tickets/engineer/me:
 *   get:
 *     summary: Get tickets for logged-in engineer
 *     tags: [Tickets]
 *     security:
 *       - bearerAuth: []
 */
router.get(
  "/engineer/me",
  verifyToken,
  isEngineer,
  ticketController.getTicketsForEngineer
);

/**
 * @swagger
 * /tickets/{id}/status:
 *   put:
 *     summary: Update ticket status
 *     tags: [Tickets]
 *     security:
 *       - bearerAuth: []
 */
router.put(
  "/:id/status",
  verifyToken,
  isAdminOrEngineer,
  ticketController.updateStatus
);

/**
 * @swagger
 * /tickets/{id}/feedback:
 *   post:
 *     summary: Add feedback to a ticket (Customer)
 *     tags: [Tickets]
 *     security:
 *       - bearerAuth: []
 */
router.post(
  "/:id/feedback",
  verifyToken,
  isCustomer,
  ticketController.addFeedback
);

/**
 * @swagger
 * /tickets/search:
 *   get:
 *     summary: Search tickets
 *     tags: [Tickets]
 *     security:
 *       - bearerAuth: []
 */
router.get(
  "/search",
  verifyToken,
  searchTickets
);

module.exports = router;
