
const crypto = require("crypto");
const razorpay = require("../utils/razorpay");
const Payment = require("../models/payment.model");

/**
 * CREATE ORDER
 */
exports.createOrder = async (req, res) => {
  const { amount } = req.body;

  if (!amount)
    return res.status(400).send({ message: "Amount is required" });

  try {
    const options = {
      amount: amount * 100, 
      currency: "INR",
      receipt: "receipt_" + Date.now()
    };

    const order = await razorpay.orders.create(options);


    await Payment.create({
      userId: req.user.userId,
      orderId: order.id,
      amount,
      status: "PENDING"
    });

    res.status(200).send({
      message: "Order created",
      orderId: order.id,
      amount,
      key: process.env.RAZORPAY_KEY_ID
    });

  } catch (err) {
    console.error("Order create error:", err);
    res.status(500).send({ message: "Internal server error" });
  }
};

/**
 * VERIFY PAYMENT
 */
exports.verifyPayment = async (req, res) => {
  const { orderId, paymentId, signature } = req.body;

  if (!orderId || !paymentId || !signature)
    return res.status(400).send({ message: "Missing required fields" });

  const generatedSignature = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
    .update(orderId + "|" + paymentId)
    .digest("hex");

  const isValid = generatedSignature === signature;

  try {
    const payment = await Payment.findOne({ orderId });

    if (!payment)
      return res.status(404).send({ message: "Payment record not found" });

    payment.paymentId = paymentId;
    payment.signature = signature;
    payment.status = isValid ? "SUCCESS" : "FAILED";
    await payment.save();

    if (!isValid)
      return res.status(400).send({ message: "Payment signature invalid" });

    res.status(200).send({
      message: "Payment verified successfully",
      payment
    });
  } catch (err) {
    console.error("Payment verify error:", err);
    res.status(500).send({ message: "Internal server error" });
  }
};
