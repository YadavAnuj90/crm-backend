
const express = require("express");
const router = express.Router();

const verifyToken = require("../middlewares/authJwt");
const controller = require("../controllers/notification.controller");

router.get("/", verifyToken, controller.getMyNotifications);
router.patch("/:id/read", verifyToken, controller.markRead);
router.patch("/mark-all", verifyToken, controller.markAllRead);

module.exports = router;
