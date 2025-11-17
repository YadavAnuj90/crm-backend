const Ticket = require("../models/ticket.model");

exports.getOverdueTickets = async (req, res) => {
  try {
    const tickets = await Ticket.find({ isOverdue: true })
      .sort({ slaDueAt: 1 })
      .select("-__v");

    res.status(200).send({
      count: tickets.length,
      tickets
    });

  } catch (err) {
    console.error("Overdue API error:", err);
    res.status(500).send({ message: "Internal server error" });
  }
};
