const express = require("express");
const router = express.Router();

router.use("/", require("./ticket.routes"));
router.use("/", require("./comment.routes"));
router.use("/", require("./activity.routes"));

module.exports = router;
