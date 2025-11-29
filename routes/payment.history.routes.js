const express = require("express");
const router = express.Router();

const verifyToken = require("../middlewares/authJwt");
const { isSuperAdmin } = require("../middlewares/roleMiddleware");
const { getAllPayments } = require("../controllers/payment.history.controller");

/**
 * @swagger
 * tags:
 *   name: Payment History
 *   description: Payment history & transaction records
 */

/**
 * @swagger
 * /payment/history:
 *   get:
 *     summary: Get all payment history (SuperAdmin only)
 *     tags: [Payment History]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Payment history retrieved successfully
 *       403:
 *         description: Forbidden – SuperAdmin only
 */
router.get("/history", verifyToken, isSuperAdmin, getAllPayments);

module.exports = router;
