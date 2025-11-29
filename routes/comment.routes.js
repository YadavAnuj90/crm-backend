const express = require("express");
const router = express.Router();

const verifyToken = require("../middlewares/authJwt");
const { addComment, getComments } = require("../controllers/comment.controller");

/**
 * @swagger
 * tags:
 *   name: Comments
 *   description: Ticket comment APIs
 */

/**
 * @swagger
 * /tickets/{id}/comments:
 *   post:
 *     summary: Add a comment to a ticket
 *     tags: [Comments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - message
 *             properties:
 *               message:
 *                 type: string
 *                 example: Please check this issue again.
 *     responses:
 *       201:
 *         description: Comment added successfully
 */
router.post("/:id/comments", verifyToken, addComment);

/**
 * @swagger
 * /tickets/{id}/comments:
 *   get:
 *     summary: Get all comments for a ticket
 *     tags: [Comments]
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
 *         description: List of comments
 */
router.get("/:id/comments", verifyToken, getComments);

module.exports = router;
