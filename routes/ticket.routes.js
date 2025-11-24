
const express = require("express");
const router = express.Router();

const verifyToken = require('../middlewares/authJwt')
const {isAdmin, isEngineer , isCustomer} = require('../middlewares/roleMiddleware');
const { upload } = require("../config/cloudinary");


const ticketController = require("../controllers/ticket.controller");
const { searchTickets } = require("../controllers/ticket.search.controller");
const { addFeedback } = require("../controllers/ticket.controller");

router.post(
  "/",
  verifyToken,
  isCustomer,
  upload.array("attachments", 5),
  ticketController.createTicket
);
router.post(
  "/:id/attachments",
  verifyToken,
  upload.array("attachments", 5),
  ticketController.addAttachment
);


router.post('/', verifyToken, isCustomer, ticketController.createTicket);

router.put('/:id/assign', verifyToken, isAdmin, ticketController.assignTicket);

router.get("/engineer/me", verifyToken, isEngineer, ticketController.getTicketsForEngineer);

router.put("/:id/status", verifyToken, ticketController.updateStatus);
router.post("/:id/feedback", verifyToken, isCustomer, addFeedback);
router.get("/search", verifyToken, searchTickets);


module.exports = router;
