
const Audit = require('../models/audit.model');

async function logAudit(actionBy, actionType, targetType = null, targetId = null, payload = {}) {
  try {
    await Audit.create({ actionBy, actionType, targetType, targetId, payload });
  } catch (err) {
    console.error('Audit logging failed:', err);
  }
}

module.exports = { logAudit };
