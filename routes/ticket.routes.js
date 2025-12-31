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
const { addFeedback } = require("../controllers/ticket.controller");

/**
 * @swagger
 * tags:
 *   name: Tickets
 *   description: Ticket management APIs
 */

/**
 * @swagger
 * /tickets:
 *   post:
 *     summary: Create a ticket (Customer only)
 *     tags: [Tickets]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               attachments:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *     responses:
 *       201:
 *         description: Ticket created successfully
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
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               attachments:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *     responses:
 *       200:
 *         description: Attachments uploaded successfully
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
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *     responses:
 *       200:
 *         description: Ticket assigned successfully
 */
router.put("/:id/assign", verifyToken, isAdmin, ticketController.assignTicket);

/**
 * @swagger
 * /tickets/engineer/me:
 *   get:
 *     summary: Get tickets for logged-in engineer
 *     tags: [Tickets]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Engineer tickets fetched successfully
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
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *     responses:
 *       200:
 *         description: Ticket status updated
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
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - rating
 *             properties:
 *               rating:
 *                 type: number
 *                 example: 5
 *               comment:
 *                 type: string
 *                 example: Issue resolved successfully
 *     responses:
 *       200:
 *         description: Feedback added successfully
 */

router.post("/:id/feedback", verifyToken, isCustomer, addFeedback);

/**
 * @swagger
 * /tickets/search:
 *   get:
 *     summary: Search tickets
 *     tags: [Tickets]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Search results fetched
 */
router.get("/search", verifyToken, searchTickets);

module.exports = router;
