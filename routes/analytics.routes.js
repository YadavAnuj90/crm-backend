const express = require("express");
const router = express.Router();

const verifyToken = require("../middlewares/authJwt");
const { isSuperAdmin, isAdmin } = require("../middlewares/roleMiddleware");
const analyticsController = require("../controllers/analytics.controller");

/**
 * @swagger
 * tags:
 *   name: Analytics
 *   description: Admin analytics & reports APIs
 */

/**
 * @swagger
 * /admin/analytics/revenue:
 *   get:
 *     summary: Get monthly revenue analytics
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Monthly revenue analytics retrieved successfully
 *       403:
 *         description: Forbidden – Admin only
 */
router.get("/revenue", verifyToken, isAdmin, analyticsController.revenueMonthly);

/**
 * @swagger
 * /admin/analytics/revenue/yearly:
 *   get:
 *     summary: Get yearly revenue analytics
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Yearly revenue analytics retrieved successfully
 */
router.get(
  "/revenue/yearly",
  verifyToken,
  isAdmin,
  analyticsController.revenueYearly
);

/**
 * @swagger
 * /admin/analytics/tickets:
 *   get:
 *     summary: Get monthly ticket analytics
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Ticket analytics retrieved successfully
 */
router.get("/tickets", verifyToken, isAdmin, analyticsController.ticketsMonthly);

/**
 * @swagger
 * /admin/analytics/engineer-workload:
 *   get:
 *     summary: Get engineer workload analytics
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Engineer workload data retrieved successfully
 */
router.get(
  "/engineer-workload",
  verifyToken,
  isAdmin,
  analyticsController.engineerWorkload
);

module.exports = router;
