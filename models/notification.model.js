
const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true }, 
    title: { type: String, required: true },
    message: { type: String, required: true },
    type: { type: String, enum: ["INFO", "TICKET", "PAYMENT", "SYSTEM"], default: "INFO" },
    isRead: { type: Boolean, default: false }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Notification", notificationSchema);
