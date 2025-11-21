const Notification = require("../models/notification.model");

exports.notifyUser = async (userId, title, message) => {
  try {
    await Notification.create({
      userId,
      title,
      message
    });
  } catch (err) {
    console.error("Notification error:", err);
  }
};
