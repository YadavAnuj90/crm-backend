
// models/audit.model.js
const mongoose = require('mongoose');

const auditSchema = new mongoose.Schema({
  actionBy: { type: String, required: true }, // userId
  actionType: { type: String, required: true }, // e.g. USER_CREATED, ADMIN_UPDATED
  targetType: { type: String }, // USER, TICKET, SETTINGS
  targetId: { type: String }, // userId / ticketId
  payload: { type: Object }, // optional extra data
}, { timestamps: true });

module.exports = mongoose.model('Audit', auditSchema);
