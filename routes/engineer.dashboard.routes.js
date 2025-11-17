
const express = require("express");
const router = express.Router();

const verifyToken = require("../middlewares/authJwt");
const { isEngineer } = require("../middlewares/roleMiddleware");
const { getEngineerDashboard } = require("../controllers/engineer.dashboard.controller");


router.get("/dashboard", verifyToken, isEngineer, getEngineerDashboard);

module.exports = router;
