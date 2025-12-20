const mongoose = require("mongoose");

const subscriptionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    planId: {
      type: String,
      required: true
    },
    subscriptionId: {
      type: String,
      required: true
    },
    status: {
      type: String,
      enum: ["PENDING", "ACTIVE", "EXPIRED", "CANCELLED"],
      default: "PENDING"
    },
    currentStart: {
      type: Date
    },
    currentEnd: {
      type: Date
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Subscription", subscriptionSchema);
