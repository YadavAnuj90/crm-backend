
const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true }, 
    orderId: { type: String, required: true },
    paymentId: { type: String },
    signature: { type: String },
    amount: { type: Number, required: true },
    currency: { type: String, default: "INR" },
    status: { type: String, default: "PENDING" }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Payment", paymentSchema);
