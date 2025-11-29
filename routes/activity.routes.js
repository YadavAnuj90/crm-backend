const express = require("express");
const router = express.Router();

const verifyToken = require("../middlewares/authJwt");
const { getLogsForTicket } = require("../controllers/activity.controller");

/**
 * @swagger
 * tags:
 *   name: Activities
 *   description: Ticket activity & audit log APIs
 */

/**
 * @swagger
 * /tickets/{id}/logs:
 *   get:
 *     summary: Get activity logs for a ticket
 *     tags: [Activities]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Ticket activity logs retrieved successfully
 */
router.get("/:id/logs", verifyToken, getLogsForTicket);

module.exports = router;
