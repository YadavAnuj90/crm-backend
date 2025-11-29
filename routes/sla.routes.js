const express = require("express");
const router = express.Router();

const verifyToken = require("../middlewares/authJwt");
const { isAdmin } = require("../middlewares/roleMiddleware");
const { getOverdueTickets } = require("../controllers/sla.controller");

/**
 * @swagger
 * tags:
 *   name: SLA
 *   description: Service Level Agreement (SLA) APIs
 */

/**
 * @swagger
 * /sla/overdue:
 *   get:
 *     summary: Get overdue tickets (Admin only)
 *     tags: [SLA]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of overdue tickets
 *       403:
 *         description: Forbidden – Admin only
 */
router.get("/overdue", verifyToken, isAdmin, getOverdueTickets);

module.exports = router;
