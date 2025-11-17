
const express = require("express");
const router = express.Router();

const verifyToken = require("../middlewares/authJwt");
const { isAdmin } = require("../middlewares/roleMiddleware");

const { getAdminDashboard } = require("../controllers/admin.dashboard.controller");


router.get("/dashboard", verifyToken, isAdmin, getAdminDashboard);

module.exports = router;
