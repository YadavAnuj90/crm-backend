
const Payment = require("../models/payment.model");
const User = require("../models/user.model");

exports.getAllPayments = async (req, res) => {
  const { adminId } = req.query; 

  try {
    let filter = {};

    if (adminId) {
      filter.userId = adminId;
    }

    const payments = await Payment.find(filter)
      .sort({ createdAt: -1 });

    res.status(200).send({
      count: payments.length,
      payments
    });

  } catch (err) {
    console.error("Payment history error:", err);
    res.status(500).send({ message: "Internal server error" });
  }
};
