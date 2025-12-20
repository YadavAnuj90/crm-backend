const razorpay = require("../utils/razorrpay");
const Subscription = require("../models/subscription.model");

exports.createPlan = async (req, res) => {
  const { planType, amount } = req.body;

  let period;
  let interval;

  switch (planType) {
    case "MONTHLY":
      period = "monthly";
      interval = 1;
      break;

    case "QUARTERLY":
      period = "monthly";
      interval = 3;
      break;

    case "YEARLY":
      period = "yearly";
      interval = 1;
      break;

    default:
      return res.status(400).send({
        message: "Invalid planType. Use MONTHLY | QUARTERLY | YEARLY",
      });
  }

  try {
    console.log("Creating plan with:", { period, interval });

    const plan = await razorpay.plans.create({
      period,
      interval,
      item: {
        name: `CRM ${planType} Plan`,
        amount: amount * 100,
        currency: "INR",
      },
    });

    res.status(201).send({
      message: "Plan created successfully",
      plan,
    });
  } catch (err) {
    console.error("Plan create error:", err);
    res.status(500).send({
      message: err.error?.description || "Razorpay plan creation failed",
    });
  }
};

exports.createSubscription = async (req, res) => {
  const { planId } = req.body;

  try {
    const subscription = await razorpay.subscriptions.create({
      plan_id: planId,
      customer_notify: 1,
      total_count: 12,
    });

    await Subscription.create({
      userId: req.user.id,
      planId,
      subscriptionId: subscription.id,
      status: "PENDING",
    });

    res.status(200).send({
      message: "Subscription created",
      subscriptionId: subscription.id,
    });
  } catch (err) {
    console.error("Subscription create error:", err);
    res.status(500).send({
      message: "Subscription creation failed",
    });
  }
};

exports.webhook = async (req, res) => {
  try {
    const event = req.body.event;

    if (event === "subscription.activated") {
      const entity = req.body.payload.subscription.entity;

      await Subscription.findOneAndUpdate(
        { subscriptionId: entity.id },
        {
          status: "ACTIVE",
          currentStart: entity.current_start,
          currentEnd: entity.current_end,
        }
      );
    }

    if (event === "subscription.expired") {
      await Subscription.findOneAndUpdate(
        { subscriptionId: req.body.payload.subscription.entity.id },
        { status: "EXPIRED" }
      );
    }

    res.status(200).send({ message: "Webhook processed" });
  } catch (err) {
    console.error("Webhook error:", err);
    res.status(500).send({ message: "Webhook processing failed" });
  }
};
