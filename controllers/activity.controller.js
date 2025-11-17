
const Activity = require("../models/activity.model");

exports.getLogsForTicket = async (req, res) => {
  const ticketId = req.params.id;

  try {
    const logs = await Activity.find({ ticketId }).sort({ createdAt: 1 });
    res.status(200).send(logs);
  } catch (err) {
    console.error("Activity fetch error:", err);
    res.status(500).send({ message: "Internal server error" });
  }
};
