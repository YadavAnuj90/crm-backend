
const mongoose = require("mongoose");

const activitySchema = new mongoose.Schema(
  {
    ticketId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Ticket",
      required: true
    },
    actionBy: {
      type: String,  
      required: true
    },
    action: {
      type: String,
      required: true
    },
    oldValue: { type: String },
    newValue: { type: String }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Activity", activitySchema);
