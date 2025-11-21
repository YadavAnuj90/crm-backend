
const express = require("express");
const router = express.Router();
const verifyToken = require("../middlewares/authJwt");
const { isSuperAdmin, isAdmin } = require("../middlewares/roleMiddleware");
const analyticsController = require("../controllers/analytics.controller");

router.get("/revenue", verifyToken, isAdmin, analyticsController.revenueMonthly);
router.get("/revenue/yearly", verifyToken, isAdmin, analyticsController.revenueYearly);
router.get("/tickets", verifyToken, isAdmin, analyticsController.ticketsMonthly);
router.get("/engineer-workload", verifyToken, isAdmin, analyticsController.engineerWorkload);

module.exports = router;
