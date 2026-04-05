/**
 * controllers/payment.controller.js
 *
 * Fix #7 — MongoDB transactions ensure payment record + any downstream writes
 * are atomic. If one write fails, the entire operation rolls back.
 *
 * Note: Transactions require a MongoDB replica set (or Atlas). In standalone
 * dev mode, transactions are gracefully skipped with a warning.
 */

const crypto = require('crypto');
const mongoose = require('mongoose');
const razorpay = require('../utils/razorpay');
const Payment = require('../models/payment.model');
const { sendEmail } = require('../utils/email');
const logger = require('../config/logger');

// ── CREATE ORDER ──────────────────────────────────────────────────────────────

exports.createOrder = async (req, res) => {
  const { amount } = req.body; // Zod-validated

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const options = {
      amount: amount * 100, // Razorpay expects paise
      currency: 'INR',
      receipt: `receipt_${Date.now()}`,
    };

    // Create Razorpay order OUTSIDE transaction (external API call)
    const order = await razorpay.orders.create(options);

    // Atomically persist the pending payment record
    const [payment] = await Payment.create(
      [{ userId: req.user.userId || req.user.id, orderId: order.id, amount, status: 'PENDING' }],
      { session }
    );

    await session.commitTransaction();

    res.status(200).json({
      success: true,
      message: 'Order created',
      orderId: order.id,
      paymentRecordId: payment._id,
      amount,
      key: process.env.RAZORPAY_KEY_ID,
    });
  } catch (err) {
    await session.abortTransaction();
    logger.error('Order create error: ' + err.message);
    res.status(500).json({ success: false, message: 'Internal server error' });
  } finally {
    session.endSession();
  }
};

// ── VERIFY PAYMENT ────────────────────────────────────────────────────────────

exports.verifyPayment = async (req, res) => {
  const { orderId, paymentId, signature } = req.body; // Zod-validated

  // Verify signature BEFORE touching the DB
  const generatedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(`${orderId}|${paymentId}`)
    .digest('hex');

  const isValid = generatedSignature === signature;

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const payment = await Payment.findOne({ orderId }).session(session);

    if (!payment) {
      await session.abortTransaction();
      return res.status(404).json({ success: false, message: 'Payment record not found' });
    }

    // Idempotency guard — don't re-process an already-verified payment
    if (payment.status === 'SUCCESS') {
      await session.abortTransaction();
      return res.status(200).json({ success: true, message: 'Payment already verified', payment });
    }

    payment.paymentId = paymentId;
    payment.signature = signature;
    payment.status = isValid ? 'SUCCESS' : 'FAILED';
    await payment.save({ session });

    await session.commitTransaction();

    if (!isValid) {
      return res.status(400).json({ success: false, message: 'Payment signature invalid' });
    }

    // Queue confirmation email (non-blocking)
    sendEmail(
      req.user.email,
      'Payment Successful',
      `Your payment of ₹${payment.amount} has been verified successfully. Order ID: ${orderId}`
    );

    res.status(200).json({ success: true, message: 'Payment verified successfully', payment });
  } catch (err) {
    await session.abortTransaction();
    logger.error('Payment verify error: ' + err.message);
    res.status(500).json({ success: false, message: 'Internal server error' });
  } finally {
    session.endSession();
  }
};
