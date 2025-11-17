const express = require("express");
const router = express.Router();

const verifyToken = require("../middlewares/authJwt");
const { isAdmin } = require("../middlewares/roleMiddleware");
const { getOverdueTickets } = require("../controllers/sla.controller");

router.get("/overdue", verifyToken, isAdmin, getOverdueTickets);

module.exports = router;
