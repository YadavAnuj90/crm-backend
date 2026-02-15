const express = require("express");
const router = express.Router();

const verifyToken = require("../middlewares/authJwt");
const { isEngineer } = require("../middlewares/roleMiddleware");
const { getEngineerDashboard } = require("../controllers/engineer.dashboard.controller");

/**
 * @swagger
 * tags:
 *   name: Engineer Dashboard
 *   description: Engineer dashboard APIs
 */

/**
 * @swagger
 * /engineer/dashboard:
 *   get:
 *     summary: Get engineer dashboard data
 *     tags: [Engineer Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Engineer dashboard data retrieved successfully
 *       403:
 *         description: Forbidden – Engineer access only
 */

// ✅ Only dashboard here (no duplicate path)
router.get("/dashboard", verifyToken, isEngineer, getEngineerDashboard);

module.exports = router;
