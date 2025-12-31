const Ticket = require("../models/ticket.model");
const User = require("../models/user.model");
const constants = require("../utils/constants");
const { logActivity } = require("../utils/activityLogger");
const { sendEmail } = require("../utils/email");
const { notifyUser } = require("../utils/notify");

function getSlaExpiry(priority) {
  const now = new Date();
  if (priority === "HIGH") now.setHours(now.getHours() + 4);
  else if (priority === "MEDIUM") now.setHours(now.getHours() + 24);
  else now.setHours(now.getHours() + 48);
  return now;
}

exports.createTicket = async (req, res) => {
  const { title, description, priority } = req.body;
   const files = req.files ? req.files.map(f => f.path) : [];

  try {
    const ticket = await Ticket.create({
      title,
      description,
      ticketPriority: priority,
      ticketStatus: "OPEN",
      reportedBy: req.user.id,
      slaDueAt: getSlaExpiry(priority),
      attachments: files
    });

    const user = await User.findById(req.user.id);
  
    await sendEmail(
      user.email,
      "Ticket Created",
      `Your ticket "${ticket.title}" was created successfully.`
    );

    await notifyUser(
      user.userId,
      "Ticket Created",
      `Your ticket "${ticket.title}" was created successfully.`
    );

 
    await logActivity(
      ticket._id,
     req.user.id  ,
      "TICKET_CREATED",
      null,
      `Ticket created with priority ${priority}`
    );

    res.status(201).send({ ticket, message: "Ticket created successfully" });

  } catch (err) {
    console.error("Error creating ticket:", err);
    res.status(500).send({ message: "Internal server error" });
  }
};

exports.assignTicket = async (req, res) => {
  const ticketId = req.params.id;
  const { engineerId } = req.body;

  try {
    const engineer = await User.findOne({ userId: engineerId });
    if (!engineer) return res.status(404).send({ message: "Engineer not found" });

    const ticket = await Ticket.findById(ticketId);
    if (!ticket) return res.status(404).send({ message: "Ticket not found" });

    const previousAssigned = ticket.assignedTo || "None";

    ticket.assignedTo = engineerId;
    ticket.ticketStatus = "IN_PROGRESS";
    await ticket.save();

   
    await sendEmail(
      engineer.email,
      "New Ticket Assigned",
      `Ticket "${ticket.title}" is assigned to you.`
    );
    await notifyUser(
      engineer.userId,
      "New Ticket Assigned",
      `Ticket "${ticket.title}" is assigned to you.`
    );

    await logActivity(
      ticket._id,
      req.user.id,
      "TICKET_ASSIGNED",
      `Previous: ${previousAssigned}`,
      `Assigned to: ${engineerId}`
    );

    res.status(200).send({ message: "Ticket assigned successfully", ticket });

  } catch (err) {
    console.error("Assign error:", err);
    res.status(500).send({ message: "Internal server error" });
  }
};


exports.getTicketsForEngineer = async (req, res) => {
  try {
    const tickets = await Ticket.find({ assignedTo: req.user.id  });
    res.status(200).send(tickets);
  } catch (err) {
    console.error("Engineer ticket error:", err);
    res.status(500).send({ message: "Internal server error" });
  }
};

exports.updateStatus = async (req, res) => {
  const ticketId = req.params.id;
  const ticketStatus = req.body?.ticketStatus;

  // ✅ Validate body
  if (!ticketStatus) {
    return res.status(400).send({
      message: "ticketStatus is required"
    });
  }

  const allowedStatuses = ["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"];
  if (!allowedStatuses.includes(ticketStatus)) {
    return res.status(400).send({
      message: "Invalid status"
    });
  }

  try {
    const ticket = await Ticket.findById(ticketId);
    if (!ticket) {
      return res.status(404).send({ message: "Ticket not found" });
    }

    const oldStatus = ticket.ticketStatus;

    // SLA logic
    if (ticketStatus === "RESOLVED") {
      ticket.isOverdue = false;
    } else if (["OPEN", "IN_PROGRESS"].includes(ticketStatus)) {
      if (ticket.slaDueAt && ticket.slaDueAt < new Date()) {
        ticket.isOverdue = true;
      }
    }

    ticket.ticketStatus = ticketStatus;
    await ticket.save();

    // ✅ Correct user lookup
    const customer = await User.findById(ticket.reportedBy);

    // 🔥 Non-blocking side effects
    if (customer?.email) {
      sendEmail(
        customer.email,
        "Ticket Status Updated",
        `Your ticket "${ticket.title}" is now "${ticketStatus}".`
      ).catch(err => console.error("Email failed:", err.message));
    }

    if (customer?.userId) {
      notifyUser(
        customer.userId,
        "Ticket Status Updated",
        `Your ticket "${ticket.title}" is now "${ticketStatus}".`
      ).catch(err => console.error("Notify failed:", err.message));
    }

    await logActivity(
      ticket._id,
      req.user.id,
      "STATUS_UPDATED",
      `Old: ${oldStatus}`,
      `New: ${ticketStatus}`
    );

    return res.status(200).send({
      message: "Ticket status updated successfully",
      ticket
    });

  } catch (err) {
    console.error("Status update error:", err);
    return res.status(500).send({
      message: "Internal server error"
    });
  }
};


exports.addAttachment = async (req, res) => {
  const ticketId = req.params.id;

  try {
    const ticket = await Ticket.findById(ticketId);
    if (!ticket) {
      return res.status(404).send({ message: "Ticket not found" });
    }

    const newFiles = req.files.map(file => file.path); 
    ticket.attachments.push(...newFiles);
    await ticket.save();

    res.status(200).send({
      message: "Attachments uploaded successfully",
      attachments: ticket.attachments
    });

  } catch (err) {
    console.error("Attachment error:", err);
    res.status(500).send({ message: "Internal Server Error" });
  }
};



exports.addFeedback = async (req, res) => {
  const ticketId = req.params.id;
  const { rating, feedback } = req.body;

  if (!rating || rating < 1 || rating > 5) {
    return res.status(400).send({ message: "Rating must be between 1 and 5" });
  }

  try {
    const ticket = await Ticket.findById(ticketId);
    if (!ticket) return res.status(404).send({ message: "Ticket not found" });

    if (ticket.reportedBy !== req.user.id ) {
      return res.status(403).send({ message: "Not allowed to review this ticket" });
    }

    if (!["RESOLVED", "CLOSED"].includes(ticket.ticketStatus)) {
      return res.status(400).send({ message: "You can rate only RESOLVED or CLOSED tickets" });
    }

    ticket.rating = rating;
    ticket.feedback = feedback;
    await ticket.save();

    await notifyUser(
      ticket.reportedBy,
      "Feedback Submitted",
      `Feedback for your ticket "${ticket.title}" has been submitted.`
    );

    res.status(200).send({
      message: "Feedback submitted successfully",
      ticket
    });

  } catch (err) {
    console.error("Feedback error:", err);
    res.status(500).send({ message: "Internal server error" });
  }
};
