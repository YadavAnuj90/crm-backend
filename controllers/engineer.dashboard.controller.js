
const Ticket = require("../models/ticket.model");
const mongoose = require("mongoose");


exports.getEngineerDashboard = async (req, res) => {
  try {
    const userId = req.user.userId;

    const totalAssigned = await Ticket.countDocuments({ assignedTo: userId });
    const resolvedCount = await Ticket.countDocuments({
      assignedTo: userId,
      ticketStatus: "RESOLVED"
    });
    const inProgressCount = await Ticket.countDocuments({
      assignedTo: userId,
      ticketStatus: "IN_PROGRESS"
    });
    const openCount = await Ticket.countDocuments({
      assignedTo: userId,
      ticketStatus: "OPEN"
    });

    const ticketsByStatus = await Ticket.aggregate([
      { $match: { assignedTo: userId } },
      { $group: { _id: "$ticketStatus", count: { $sum: 1 } } }
    ]);


    const avgResolutionAgg = await Ticket.aggregate([
      { $match: { assignedTo: userId, ticketStatus: "RESOLVED", updatedAt: { $exists: true } } },
      {
        $project: {
          diffMs: { $subtract: ["$updatedAt", "$createdAt"] }
        }
      },
      {
        $group: {
          _id: null,
          avgMs: { $avg: "$diffMs" },
          count: { $sum: 1 }
        }
      }
    ]);

    let avgResolutionHours = null;
    if (avgResolutionAgg.length && avgResolutionAgg[0].avgMs != null) {
      avgResolutionHours = +(avgResolutionAgg[0].avgMs / (1000 * 60 * 60)).toFixed(2); 
    }

    const recentAssigned = await Ticket.find({ assignedTo: userId })
      .sort({ createdAt: -1 })
      .limit(10)
      .select("-__v");

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6); 
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const resolvedLast7 = await Ticket.aggregate([
      {
        $match: {
          assignedTo: userId,
          ticketStatus: "RESOLVED",
          updatedAt: { $gte: sevenDaysAgo }
        }
      },
      {
        $project: {
          day: {
            $dateToString: { format: "%Y-%m-%d", date: "$updatedAt" }
          }
        }
      },
      {
        $group: {
          _id: "$day",
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(sevenDaysAgo);
      d.setDate(sevenDaysAgo.getDate() + i);
      days.push(d.toISOString().slice(0, 10)); 
    }

    const resolvedSparkline = days.map((d) => {
      const found = resolvedLast7.find((x) => x._id === d);
      return { day: d, count: found ? found.count : 0 };
    });

   
    res.status(200).send({
      summary: {
        totalAssigned,
        openCount,
        inProgressCount,
        resolvedCount,
        avgResolutionHours 
      },
      ticketsByStatus,
      recentAssigned,
      resolvedLast7: resolvedSparkline
    });
  } catch (err) {
    console.error("Engineer dashboard error:", err);
    res.status(500).send({ message: "Internal server error" });
  }
};
