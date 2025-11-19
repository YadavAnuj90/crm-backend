
const express = require("express");
const router = express.Router();

const verifyToken = require("../middlewares/authJwt");
const controller = require("../controllers/subscription.controller");


router.post("/create-plan", verifyToken, controller.createPlan);


router.post("/create-subscription", verifyToken, controller.createSubscription);


router.post("/webhook", express.json({ type: "*/*" }), controller.webhook);

module.exports = router;
