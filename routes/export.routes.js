const express = require("express");
const router = express.Router();

const verifyToken = require("../middlewares/authJwt");
const { isAdmin } = require("../middlewares/roleMiddleware");
const { exportExcel, exportPDF } = require("../controllers/export.controller");

/**
 * @swagger
 * tags:
 *   name: Export
 *   description: Data export APIs (Excel / PDF)
 */

/**
 * @swagger
 * /export/excel:
 *   get:
 *     summary: Export data in Excel format (Admin only)
 *     tags: [Export]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Excel file generated and downloaded
 *       403:
 *         description: Forbidden – Admin only
 */
router.get("/excel", verifyToken, isAdmin, exportExcel);

/**
 * @swagger
 * /export/pdf:
 *   get:
 *     summary: Export data in PDF format (Admin only)
 *     tags: [Export]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: PDF file generated and downloaded
 *       403:
 *         description: Forbidden – Admin only
 */
router.get("/pdf", verifyToken, isAdmin, exportPDF);

module.exports = router;
