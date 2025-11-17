const express = require("express");
const router = express.Router();
const verifyToken = require("../middlewares/authJwt");
const { isAdmin, isEngineer, isCustomer } = require("../middlewares/roleMiddleware");

router.get("/admin", verifyToken, isAdmin, (req, res) => {
    res.send({ message: "Welcome Admin!" });
});

router.get("/engineer", verifyToken, isEngineer, (req, res) => {
    res.send({ message: "Welcome Engineer!" });
});

router.get("/customer", verifyToken, isCustomer, (req, res) => {
    res.send({ message: "Welcome Customer!" });
});

module.exports = router;
