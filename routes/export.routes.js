
const express = require("express");
const router = express.Router();
const verifyToken = require("../middlewares/authJwt");
const { isAdmin } = require("../middlewares/roleMiddleware");

const { exportExcel, exportPDF } = require("../controllers/export.controller");

router.get("/excel", verifyToken, isAdmin, exportExcel);
router.get("/pdf", verifyToken, isAdmin, exportPDF);

module.exports = router;
