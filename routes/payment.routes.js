const express = require("express");
const router = express.Router();

const verifyToken = require("../middlewares/authJwt");
const controller = require("../controllers/payment.controller");

/**
 * @swagger
 * tags:
 *   name: Payment
 *   description: Payment processing APIs
 */

/**
 * @swagger
 * /payment/create-order:
 *   post:
 *     summary: Create a payment order
 *     tags: [Payment]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - amount
 *             properties:
 *               amount:
 *                 type: number
 *                 example: 999
 *     responses:
 *       201:
 *         description: Payment order created successfully
 */
router.post("/create-order", verifyToken, controller.createOrder);

/**
 * @swagger
 * /payment/verify:
 *   post:
 *     summary: Verify payment signature
 *     tags: [Payment]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Payment verified successfully
 *       400:
 *         description: Payment verification failed
 */
router.post("/verify", controller.verifyPayment);

module.exports = router;
