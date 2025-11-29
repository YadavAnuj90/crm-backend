const express = require("express");
const router = express.Router();

const verifyToken = require("../middlewares/authJwt");
const controller = require("../controllers/notification.controller");

/**
 * @swagger
 * tags:
 *   name: Notifications
 *   description: User notification APIs
 */

/**
 * @swagger
 * /notifications:
 *   get:
 *     summary: Get logged-in user notifications
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Notifications fetched successfully
 */
router.get("/", verifyToken, controller.getMyNotifications);

/**
 * @swagger
 * /notifications/{id}/read:
 *   patch:
 *     summary: Mark a notification as read
 *     tags: [Notifications]
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
 *         description: Notification marked as read
 */
router.patch("/:id/read", verifyToken, controller.markRead);

/**
 * @swagger
 * /notifications/mark-all:
 *   patch:
 *     summary: Mark all notifications as read
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: All notifications marked as read
 */
router.patch("/mark-all", verifyToken, controller.markAllRead);

module.exports = router;
