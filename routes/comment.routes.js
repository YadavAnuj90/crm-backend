
const express = require("express");
const router = express.Router();

const verifyToken = require("../middlewares/authJwt");
const { addComment, getComments } = require("../controllers/comment.controller");



router.post("/:id/comments", verifyToken, addComment);
router.get("/:id/comments", verifyToken, getComments);

module.exports = router;