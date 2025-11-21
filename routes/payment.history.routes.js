
const express = require("express");
const router = express.Router();

const verifyToken = require("../middlewares/authJwt");
const { isSuperAdmin } = require("../middlewares/roleMiddleware");
const { getAllPayments } = require("../controllers/payment.history.controller");


router.get("/history", verifyToken, isSuperAdmin, getAllPayments);

module.exports = router;
