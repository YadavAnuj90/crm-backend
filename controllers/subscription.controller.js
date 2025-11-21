
const razorpay = require("../utils/razorrpay");
const Subscription = require("../models/subscription.model");


exports.createPlan = async (req, res) => {
  const { interval, period, amount } = req.body;

  try {
    const plan = await razorpay.plans.create({
      period,       
      interval,     
      item: {
        name: "CRM Subscription Plan",
        amount: amount * 100, 
        currency: "INR"
      }
    });

    res.status(201).send({ message: "Plan created", plan });
  } catch (err) {
    console.error("Plan create error:", err);
    res.status(500).send({ message: "Internal server error" });
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
      userId: req.user.userId,
      planId,
      subscriptionId: subscription.id,
      status: "PENDING"
    });

    res.status(200).send({
      message: "Subscription created",
      subscriptionId: subscription.id
    });

  } catch (err) {
    console.error("Subscription create error:", err);
    res.status(500).send({ message: "Internal server error" });
  }
};



exports.webhook = async (req, res) => {
  const event = req.body.event;

  try {
    if (event === "subscription.activated") {
      const subscriptionId = req.body.payload.subscription.entity.id;

      await Subscription.findOneAndUpdate(
        { subscriptionId },
        {
          status: "ACTIVE",
          currentStart: req.body.payload.subscription.entity.current_start,
          currentEnd: req.body.payload.subscription.entity.current_end,
        }
      );
    }

    if (event === "subscription.charged") {
 
      console.warn("Subscription charged");
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
    res.status(500).send({ message: "Internal server error" });
  }
};
