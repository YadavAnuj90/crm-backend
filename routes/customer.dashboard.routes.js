const express = require("express");
const router = express.Router();

const verifyToken = require("../middlewares/authJwt");
const { isCustomer } = require("../middlewares/roleMiddleware");
const { getCustomerDashboard } = require("../controllers/customer.dashboard.controller");

/**
 * @swagger
 * tags:
 *   name: Customer
 *   description: Customer related APIs
 */

/**
 * @swagger
 * /customer/dashboard:
 *   get:
 *     summary: Get customer dashboard data
 *     tags: [Customer]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Customer dashboard data retrieved successfully
 *       403:
 *         description: Forbidden – Customer access only
 */
router.get("/dashboard", verifyToken, isCustomer, getCustomerDashboard);

module.exports = router;
