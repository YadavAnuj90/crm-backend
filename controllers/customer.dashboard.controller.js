
const Ticket = require("../models/ticket.model");

exports.getCustomerDashboard = async (req, res) => {
  try {
    const userId = req.user.userId;

    const totalCreated = await Ticket.countDocuments({ reportedBy: userId });
    const openCount = await Ticket.countDocuments({
      reportedBy: userId,
      ticketStatus: "OPEN"
    });
    const inProgressCount = await Ticket.countDocuments({
      reportedBy: userId,
      ticketStatus: "IN_PROGRESS"
    });
    const resolvedCount = await Ticket.countDocuments({
      reportedBy: userId,
      ticketStatus: "RESOLVED"
    });

    const ticketsByPriority = await Ticket.aggregate([
      { $match: { reportedBy: userId } },
      { $group: { _id: "$ticketPriority", count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);

    const ticketsByStatus = await Ticket.aggregate([
      { $match: { reportedBy: userId } },
      { $group: { _id: "$ticketStatus", count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);

    const recentTickets = await Ticket.find({ reportedBy: userId })
      .sort({ createdAt: -1 })
      .limit(10)
      .select("-__v");
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const createdTrend = await Ticket.aggregate([
      {
        $match: {
          reportedBy: userId,
          createdAt: { $gte: sevenDaysAgo }
        }
      },
      {
        $project: {
          day: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }
        }
      },
      {
        $group: { _id: "$day", count: { $sum: 1 } }
      },
      { $sort: { _id: 1 } }
    ]);
    const resolvedTrend = await Ticket.aggregate([
      {
        $match: {
          reportedBy: userId,
          ticketStatus: "RESOLVED",
          updatedAt: { $gte: sevenDaysAgo }
        }
      },
      {
        $project: {
          day: { $dateToString: { format: "%Y-%m-%d", date: "$updatedAt" } }
        }
      },
      {
        $group: { _id: "$day", count: { $sum: 1 } }
      },
      { $sort: { _id: 1 } }
    ]);
    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(sevenDaysAgo);
      d.setDate(sevenDaysAgo.getDate() + i);
      days.push(d.toISOString().slice(0, 10));
    }

    const createdTrendFinal = days.map((d) => {
      const found = createdTrend.find((x) => x._id === d);
      return { day: d, count: found ? found.count : 0 };
    });

    const resolvedTrendFinal = days.map((d) => {
      const found = resolvedTrend.find((x) => x._id === d);
      return { day: d, count: found ? found.count : 0 };
    });

    res.status(200).send({
      summary: {
        totalCreated,
        openCount,
        inProgressCount,
        resolvedCount
      },
      ticketsByPriority,
      ticketsByStatus,
      recentTickets,
      createdLast7Days: createdTrendFinal,
      resolvedLast7Days: resolvedTrendFinal
    });

  } catch (err) {
    console.error("Customer dashboard error:", err);
    res.status(500).send({ message: "Internal server error" });
  }
};
