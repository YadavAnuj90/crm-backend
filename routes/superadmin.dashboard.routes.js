const express = require("express");
const router = express.Router();

const verifyToken = require("../middlewares/authJwt");
const { isSuperAdmin } = require("../middlewares/roleMiddleware");
const ctrl = require("../controllers/superadmin.dashboard.controller");

/**
 * @swagger
 * tags:
 *   name: SuperAdmin Dashboard
 *   description: Super Admin dashboard & system management APIs
 */

/**
 * @swagger
 * /superadmin/dashboard/summary:
 *   get:
 *     summary: Get system summary
 *     tags: [SuperAdmin Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: System summary retrieved successfully
 */
router.get("/summary", verifyToken, isSuperAdmin, ctrl.getSystemSummary);

/**
 * @swagger
 * /superadmin/dashboard/users:
 *   get:
 *     summary: List all users
 *     tags: [SuperAdmin Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Users fetched successfully
 */
router.get("/users", verifyToken, isSuperAdmin, ctrl.listUsers);

/**
 * @swagger
 * /superadmin/dashboard/users:
 *   post:
 *     summary: Create a new admin user
 *     tags: [SuperAdmin Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *         description: Admin created successfully
 */
router.post("/users", verifyToken, isSuperAdmin, ctrl.createAdmin);

/**
 * @swagger
 * /superadmin/dashboard/users/{userId}:
 *   put:
 *     summary: Update a user
 *     tags: [SuperAdmin Dashboard]
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
 *         description: User updated successfully
 */
router.put("/users/:userId", verifyToken, isSuperAdmin, ctrl.updateUser);

/**
 * @swagger
 * /superadmin/dashboard/users/{userId}/status:
 *   post:
 *     summary: Enable or disable a user
 *     tags: [SuperAdmin Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *     responses:
 *       200:
 *         description: User status updated
 */
router.post(
  "/users/:userId/status",
  verifyToken,
  isSuperAdmin,
  ctrl.toggleUserStatus
);

/**
 * @swagger
 * /superadmin/dashboard/users/{userId}:
 *   delete:
 *     summary: Delete a user
 *     tags: [SuperAdmin Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *     responses:
 *       200:
 *         description: User deleted successfully
 */
router.delete("/users/:userId", verifyToken, isSuperAdmin, ctrl.deleteUser);

/**
 * @swagger
 * /superadmin/dashboard/audits:
 *   get:
 *     summary: Get recent audit logs
 *     tags: [SuperAdmin Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Audit logs fetched
 */
router.get("/audits", verifyToken, isSuperAdmin, ctrl.getRecentAudits);

/**
 * @swagger
 * /superadmin/dashboard/export/users:
 *   get:
 *     summary: Export users list
 *     tags: [SuperAdmin Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Users export started
 */
router.get("/export/users", verifyToken, isSuperAdmin, ctrl.exportUsers);

module.exports = router;
