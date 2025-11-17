
const express = require("express");
const router = express.Router();
const verifyToken = require("../middlewares/authJwt");
const { isAdmin } = require("../middlewares/roleMiddleware");
const adminController = require("../controllers/admin.controller");
router.get("/users", verifyToken, isAdmin, adminController.getAllUsers);


router.put("/users/:userId/status", verifyToken, isAdmin, adminController.updateUserStatus);

module.exports = router;