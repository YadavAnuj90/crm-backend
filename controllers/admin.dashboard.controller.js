const User = require("../models/user.model");
const Ticket = require("../models/ticket.model");
const Activity = require("../models/activity.model");
const constants = require("../utils/constants");

exports.getAdminDashboard = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalCustomers = await User.countDocuments({
      userType: constants.userTypes.customer,
    });
    const totalEngineers = await User.countDocuments({
      userType: constants.userTypes.engineer,
    });
    const totalAdmins = await User.countDocuments({
      userType: constants.userTypes.admin,
    });

    const pendingUsers = await User.countDocuments({
      userStatus: constants.userStatuses.pending,
    });

    const totalTickets = await Ticket.countDocuments();

    const ticketsByStatus = await Ticket.aggregate([
      { $group: { _id: "$ticketStatus", count: { $sum: 1 } } },
    ]);

    const ticketsByPriority = await Ticket.aggregate([
      { $group: { _id: "$ticketPriority", count: { $sum: 1 } } },
    ]);

    const assignedTickets = await Ticket.countDocuments({
      assignedTo: { $ne: null },
    });
    const unassignedTickets = await Ticket.countDocuments({ assignedTo: null });

    const engineerWorkload = await Ticket.aggregate([
      { $match: { assignedTo: { $ne: null } } },
      { $group: { _id: "$assignedTo", assignedCount: { $sum: 1 } } },
    ]);

    const recentActivities = await Activity.find()
      .sort({ createdAt: -1 })
      .limit(10);

    res.status(200).send({
      users: {
        totalUsers,
        totalCustomers,
        totalEngineers,
        totalAdmins,
        pendingUsers,
      },
      tickets: {
        totalTickets,
        ticketsByStatus,
        ticketsByPriority,
        assignedTickets,
        unassignedTickets,
      },
      engineerWorkload,
      recentActivities,
    });
  } catch (err) {
    console.error("Dashboard error:", err);
    res.status(500).send({ message: "Internal server error" });
  }
};
