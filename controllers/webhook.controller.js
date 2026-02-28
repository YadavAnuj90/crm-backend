const Webhook = require('../models/webhook.model');
const crypto = require('crypto');

exports.createWebhook = async (req, res) => {
  try {
    const { url, events } = req.body;
    if (!url || !events || !events.length) {
      return res.status(400).json({ message: 'url and events are required' });
    }
    const secret = crypto.randomBytes(32).toString('hex');
    const webhook = await Webhook.create({
      organizationId: req.user.organizationId,
      url, events, secret
    });
    res.status(201).json({ message: 'Webhook created', webhook, secret });
  } catch (err) {
    res.status(500).json({ message: 'Internal server error' });
  }
};

exports.listWebhooks = async (req, res) => {
  try {
    const webhooks = await Webhook.find({ organizationId: req.user.organizationId }).select('-secret');
    res.status(200).json({ webhooks });
  } catch (err) {
    res.status(500).json({ message: 'Internal server error' });
  }
};

exports.deleteWebhook = async (req, res) => {
  try {
    await Webhook.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: 'Webhook deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Internal server error' });
  }
};

exports.toggleWebhook = async (req, res) => {
  try {
    const webhook = await Webhook.findById(req.params.id);
    if (!webhook) return res.status(404).json({ message: 'Webhook not found' });
    webhook.isActive = !webhook.isActive;
    await webhook.save();
    res.status(200).json({ message: `Webhook ${webhook.isActive ? 'enabled' : 'disabled'}`, webhook });
  } catch (err) {
    res.status(500).json({ message: 'Internal server error' });
  }
};
