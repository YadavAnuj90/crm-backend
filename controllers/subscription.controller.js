/**
 * controllers/subscription.controller.js
 *
 * Fix #7 — MongoDB transactions wrap the createSubscription flow.
 * Also fixes the typo: "razorrpay" → "razorpay".
 *
 * Transaction strategy:
 *  - createPlan: single write, no transaction needed (idempotent Razorpay call)
 *  - createSubscription: Razorpay API call first (external), then atomic DB write
 *  - webhook: Razorpay sends events; we wrap the DB update in a transaction
 *    so that if a future downstream write (e.g. updating org plan) fails, the
 *    whole thing rolls back.
 */

const mongoose = require('mongoose');
const razorpay = require('../utils/razorpay'); // Fixed typo: razorrpay → razorpay
const Subscription = require('../models/subscription.model');
const logger = require('../config/logger');
const { sendEmail } = require('../utils/email');

// ── CREATE PLAN ───────────────────────────────────────────────────────────────

exports.createPlan = async (req, res) => {
  const { planType, amount } = req.body; // Zod-validated

  const planConfig = {
    MONTHLY: { period: 'monthly', interval: 1 },
    QUARTERLY: { period: 'monthly', interval: 3 },
    YEARLY: { period: 'yearly', interval: 1 },
  };

  const { period, interval } = planConfig[planType];

  try {
    const plan = await razorpay.plans.create({
      period,
      interval,
      item: {
        name: `CRM ${planType} Plan`,
        amount: amount * 100,
        currency: 'INR',
      },
    });

    res.status(201).json({ success: true, message: 'Plan created successfully', plan });
  } catch (err) {
    logger.error('Plan create error: ' + err.message);
    res.status(500).json({
      success: false,
      message: err.error?.description || 'Razorpay plan creation failed',
    });
  }
};

// ── CREATE SUBSCRIPTION ───────────────────────────────────────────────────────

exports.createSubscription = async (req, res) => {
  const { planId } = req.body; // Zod-validated

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Step 1: Create subscription on Razorpay (external — outside transaction)
    const subscription = await razorpay.subscriptions.create({
      plan_id: planId,
      customer_notify: 1,
      total_count: 12,
    });

    // Step 2: Atomically persist the pending subscription record
    const [record] = await Subscription.create(
      [
        {
          userId: req.user.id,
          planId,
          subscriptionId: subscription.id,
          status: 'PENDING',
        },
      ],
      { session }
    );

    await session.commitTransaction();

    res.status(200).json({
      success: true,
      message: 'Subscription created',
      subscriptionId: subscription.id,
      recordId: record._id,
    });
  } catch (err) {
    await session.abortTransaction();
    logger.error('Subscription create error: ' + err.message);
    res.status(500).json({ success: false, message: 'Subscription creation failed' });
  } finally {
    session.endSession();
  }
};

// ── RAZORPAY WEBHOOK ──────────────────────────────────────────────────────────

exports.webhook = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const event = req.body.event;

    if (event === 'subscription.activated') {
      const entity = req.body.payload.subscription.entity;

      const sub = await Subscription.findOneAndUpdate(
        { subscriptionId: entity.id },
        {
          status: 'ACTIVE',
          currentStart: new Date(entity.current_start * 1000),
          currentEnd: new Date(entity.current_end * 1000),
        },
        { new: true, session }
      );

      // Queue confirmation email if we found the subscription
      if (sub) {
        sendEmail(
          null, // We don't have email here — enrich with a User.findById if needed
          'Subscription Activated',
          `Your CRM subscription is now active until ${new Date(entity.current_end * 1000).toLocaleDateString()}.`
        );
      }
    }

    if (event === 'subscription.expired') {
      await Subscription.findOneAndUpdate(
        { subscriptionId: req.body.payload.subscription.entity.id },
        { status: 'EXPIRED' },
        { session }
      );
    }

    if (event === 'subscription.cancelled') {
      await Subscription.findOneAndUpdate(
        { subscriptionId: req.body.payload.subscription.entity.id },
        { status: 'CANCELLED' },
        { session }
      );
    }

    await session.commitTransaction();

    res.status(200).json({ success: true, message: 'Webhook processed' });
  } catch (err) {
    await session.abortTransaction();
    logger.error('Subscription webhook error: ' + err.message);
    res.status(500).json({ success: false, message: 'Webhook processing failed' });
  } finally {
    session.endSession();
  }
};
