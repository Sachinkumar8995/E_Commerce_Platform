/**
 * Audit-logging helper.
 * Writes a record to the AuditLog collection for every mutation event.
 */

const AuditLog = require('../models/AuditLog');

/**
 * Create an audit-log entry.
 * @param {string} action   – "CREATE" | "UPDATE" | "DELETE" | "STATUS_CHANGE"
 * @param {string} entity   – Model name, e.g. "Product", "Order", "User"
 * @param {ObjectId} entityId – The _id of the document that was mutated
 * @param {ObjectId} userId  – The _id of the user performing the action
 * @param {object} changes  – Free-form object describing what changed
 * @param {string} ip       – Client IP address
 */
const logAudit = async (action, entity, entityId, userId, changes, ip) => {
  await AuditLog.create({
    action,
    entity,
    entityId,
    user: userId,
    changes,
    ipAddress: ip || 'unknown',
  });
};

module.exports = { logAudit };
