const express = require("express");
const router = express.Router();

const verifyToken = require("../middlewares/authJwt");
const { isAdmin } = require("../middlewares/roleMiddleware");
const { getAdminDashboard } = require("../controllers/admin.dashboard.controller");

/**
 * @swagger
 * tags:
 *   name: Admin Dashboard
 *   description: Admin dashboard APIs
 */

/**
 * @swagger
 * /admin/dashboard:
 *   get:
 *     summary: Get admin dashboard data
 *     tags: [Admin Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Admin dashboard data retrieved successfully
 *       403:
 *         description: Forbidden – Admin access only
 */
router.get("/dashboard", verifyToken, isAdmin, getAdminDashboard);

module.exports = router;
