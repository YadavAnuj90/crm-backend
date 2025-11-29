const express = require("express");
const router = express.Router();

const verifyToken = require("../middlewares/authJwt");
const { isSuperAdmin } = require("../middlewares/roleMiddleware");
const { createAdmin } = require("../controllers/superadmin.controller");

/**
 * @swagger
 * tags:
 *   name: SuperAdmin
 *   description: Super Admin APIs
 */

/**
 * @swagger
 * /superadmin/create-admin:
 *   post:
 *     summary: Create a new Admin (SuperAdmin only)
 *     tags: [SuperAdmin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 example: admin@example.com
 *               password:
 *                 type: string
 *                 example: Admin@123
 *     responses:
 *       201:
 *         description: Admin created successfully
 *       403:
 *         description: Forbidden – SuperAdmin only
 */
router.post(
  "/create-admin",
  verifyToken,
  isSuperAdmin,
  createAdmin
);

module.exports = router;
