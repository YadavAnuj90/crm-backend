
const express = require("express");
const router = express.Router();

const verifyToken = require("../middlewares/authJwt");
const { isCustomer } = require("../middlewares/roleMiddleware");
const { getCustomerDashboard } = require("../controllers/customer.dashboard.controller");

router.get("/dashboard", verifyToken, isCustomer, getCustomerDashboard);

module.exports = router;
