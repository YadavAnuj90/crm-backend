const express = require("express");
const router = express.Router();

const verifyToken = require("../middlewares/authJwt");
const { isAdmin, isEngineer, isCustomer } = require("../middlewares/roleMiddleware");

/**
 * @swagger
 * tags:
 *   name: Roles
 *   description: Role-based access test APIs
 */

/**
 * @swagger
 * /role/admin:
 *   get:
 *     summary: Admin access test
 *     tags: [Roles]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Admin access verified
 *       403:
 *         description: Forbidden – Admin only
 */
router.get("/admin", verifyToken, isAdmin, (req, res) => {
  res.send({ message: "Welcome Admin!" });
});

/**
 * @swagger
 * /role/engineer:
 *   get:
 *     summary: Engineer access test
 *     tags: [Roles]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Engineer access verified
 *       403:
 *         description: Forbidden – Engineer only
 */
router.get("/engineer", verifyToken, isEngineer, (req, res) => {
  res.send({ message: "Welcome Engineer!" });
});

/**
 * @swagger
 * /role/customer:
 *   get:
 *     summary: Customer access test
 *     tags: [Roles]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Customer access verified
 *       403:
 *         description: Forbidden – Customer only
 */
router.get("/customer", verifyToken, isCustomer, (req, res) => {
  res.send({ message: "Welcome Customer!" });
});

module.exports = router;
