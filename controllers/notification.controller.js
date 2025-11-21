
const Notification = require("../models/notification.model");


exports.getMyNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({ userId: req.user.userId })
      .sort({ createdAt: -1 });

    res.status(200).send(notifications);
  } catch (err) {
    console.error("Fetch notification error:", err);
    res.status(500).send({ message: "Internal server error" });
  }
};


exports.markRead = async (req, res) => {
  const { id } = req.params;

  try {
    const noti = await Notification.findById(id);

    if (!noti) return res.status(404).send({ message: "Notification not found" });

    if (noti.userId !== req.user.userId)
      return res.status(403).send({ message: "Not allowed" });

    noti.isRead = true;
    await noti.save();

    res.status(200).send({ message: "Notification marked as read" });

  } catch (err) {
    console.error("Mark read error:", err);
    res.status(500).send({ message: "Internal server error" });
  }
};


exports.markAllRead = async (req, res) => {
  try {
    await Notification.updateMany(
      { userId: req.user.userId, isRead: false },
      { $set: { isRead: true } }
    );

    res.status(200).send({ message: "All notifications marked as read" });
  } catch (err) {
    console.error("Bulk read error:", err);
    res.status(500).send({ message: "Internal server error" });
  }
};
