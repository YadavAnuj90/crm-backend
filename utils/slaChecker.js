
const Ticket = require("../models/ticket.model");

async function checkSla() {
  try {
    const now = new Date();

    const overdueTickets = await Ticket.updateMany(
      {
        slaDueAt: { $lte: now },
        isOverdue: false,
        ticketStatus: { $in: ["OPEN", "IN_PROGRESS"] }
      },
      { $set: { isOverdue: true } }
    );

    if (overdueTickets.modifiedCount > 0) {
      console.error(`⚠ ${overdueTickets.modifiedCount} tickets became overdue`);
    }
  } catch (err) {
    console.error("SLA check error:", err);
  }
}

module.exports = { checkSla };
