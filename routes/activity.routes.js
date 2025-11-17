
const express = require("express");
const router = express.Router();
const verifyToken = require("../middlewares/authJwt");
const { getLogsForTicket } = require("../controllers/activity.controller");


router.get("/:id/logs", verifyToken, getLogsForTicket);

module.exports = router;
