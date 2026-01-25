const express = require("express");
const router = express.Router();

router.use("/", require("./ticket.routes"));
router.use("/:ticketId/comments", require("./comment.routes"));
router.use("/:ticketId/activities", require("./activity.routes"));
module.exports = router;
