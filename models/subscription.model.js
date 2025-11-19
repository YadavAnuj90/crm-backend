
const mongoose = require("mongoose");

const subscriptionSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true },
    planId: { type: String, required: true },       
    subscriptionId: { type: String, required: true }, 
    status: { type: String, default: "PENDING" },   
    currentStart: { type: Date },
    currentEnd: { type: Date },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Subscription", subscriptionSchema);
