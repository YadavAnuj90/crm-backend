const express = require("express");
const router = express.Router();

const verifyToken = require("../middlewares/authJwt");
const controller = require("../controllers/subscription.controller");

/**
 * @swagger
 * tags:
 *   name: Subscription
 *   description: Subscription & billing APIs
 */

/**
 * @swagger
 * /subscription/create-plan:
 *   post:
 *     summary: Create a subscription plan
 *     tags: [Subscription]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - price
 *               - interval
 *             properties:
 *               name:
 *                 type: string
 *                 example: Pro Plan
 *               price:
 *                 type: number
 *                 example: 999
 *               interval:
 *                 type: string
 *                 example: month
 *     responses:
 *       201:
 *         description: Subscription plan created successfully
 */
router.post("/create-plan", verifyToken, controller.createPlan);

/**
 * @swagger
 * /subscription/create-subscription:
 *   post:
 *     summary: Create a subscription for a user
 *     tags: [Subscription]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - planId
 *             properties:
 *               planId:
 *                 type: string
 *                 example: plan_12345
 *     responses:
 *       200:
 *         description: Subscription created successfully
 */
router.post("/create-subscription", verifyToken, controller.createSubscription);

/**
 * @swagger
 * /subscription/webhook:
 *   post:
 *     summary: Payment provider webhook (Stripe/Razorpay)
 *     tags: [Subscription]
 *     description: Webhook endpoint for payment events. No authentication required.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Webhook processed successfully
 */
router.post("/webhook", express.json({ type: "*/*" }), controller.webhook);

module.exports = router;
