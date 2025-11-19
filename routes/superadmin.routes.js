const express = require("express");
const router = express.Router();

const verifyToken = require("../middlewares/authJwt");
const { isSuperAdmin } = require("../middlewares/roleMiddleware");
const { createAdmin } = require("../controllers/superadmin.controller");

router.post("/create-admin", verifyToken, isSuperAdmin, createAdmin);

module.exports = router;
