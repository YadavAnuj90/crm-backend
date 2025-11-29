const express = require("express");
const router = express.Router();

const verifyToken = require("../middlewares/authJwt");
const { isAdmin } = require("../middlewares/roleMiddleware");
const adminController = require("../controllers/admin.controller");

/**
 * @swagger
 * tags:
 *   name: Admin
 *   description: Admin management APIs
 */

/**
 * @swagger
 * /admin/users:
 *   get:
 *     summary: Get all users
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Users fetched successfully
 *       403:
 *         description: Forbidden – Admin only
 */
router.get("/users", verifyToken, isAdmin, adminController.getAllUsers);

/**
 * @swagger
 * /admin/users/{userId}/status:
 *   put:
 *     summary: Update user status (Admin only)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User status updated successfully
 *       403:
 *         description: Forbidden – Admin only
 */
router.put(
  "/users/:userId/status",
  verifyToken,
  isAdmin,
  adminController.updateUserStatus
);

module.exports = router;
