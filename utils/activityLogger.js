
const Activity = require("../models/activity.model");

exports.logActivity = async (ticketId, actionBy, action, oldValue = null, newValue = null) => {
  try {
    await Activity.create({
      ticketId,
      actionBy,
      action,
      oldValue,
      newValue
    });
  } catch (err) {
    console.error("Activity log error:", err);
  }
};
