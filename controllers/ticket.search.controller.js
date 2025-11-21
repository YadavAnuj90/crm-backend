
const Ticket = require("../models/ticket.model");

exports.searchTickets = async (req, res) => {
  try {
    const {
      status,
      priority,
      assignedTo,
      reportedBy,
      fromDate,
      toDate,
      keyword,
      page = 1,
      limit = 10,
      sortBy = "createdAt",
      order = "desc"
    } = req.query;

    const query = {};

    if (req.userType === "CUSTOMER") {
      query.reportedBy = req.userId;
    } else if (req.userType === "ENGINEER") {
      query.assignedTo = req.userId;
    }

    
    if (status) query.ticketStatus = status;
    if (priority) query.ticketPriority = priority;
    if (assignedTo) query.assignedTo = assignedTo;
    if (reportedBy) query.reportedBy = reportedBy;

    // Date range filter
    if (fromDate || toDate) {
      query.createdAt = {};
      if (fromDate) query.createdAt.$gte = new Date(fromDate);
      if (toDate) {
        const end = new Date(toDate);
        end.setHours(23, 59, 59, 999);
        query.createdAt.$lte = end;
      }
    }


    if (keyword) {
      query.$or = [
        { title: new RegExp(keyword, "i") },
        { description: new RegExp(keyword, "i") }
      ];
    }

  
    const skip = (page - 1) * limit;

 
    const sortOrder = order === "asc" ? 1 : -1;

    const tickets = await Ticket.find(query)
      .sort({ [sortBy]: sortOrder })
      .skip(skip)
      .limit(Number(limit))
      .select("-__v");

    const total = await Ticket.countDocuments(query);

    res.status(200).send({
      pagination: {
        totalRecords: total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / limit)
      },
      data: tickets
    });

  } catch (err) {
    console.error("Search error:", err);
    res.status(500).send({ message: "Internal server error" });
  }
};
