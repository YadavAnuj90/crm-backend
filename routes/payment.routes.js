
const express = require("express");
const router = express.Router();

const verifyToken = require("../middlewares/authJwt");
const controller = require("../controllers/payment.controller");


router.post("/create-order", verifyToken, controller.createOrder);


router.post("/verify", controller.verifyPayment);

module.exports = router;
