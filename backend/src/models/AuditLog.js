const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  action:    { type: String, required: true },           // e.g. "CREATE", "UPDATE", "DELETE", "STATUS_CHANGE"
  entity:    { type: String, required: true },           // e.g. "Product", "Order", "User"
  entityId:  { type: mongoose.Schema.Types.ObjectId },
  user:      { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  changes:   { type: mongoose.Schema.Types.Mixed },     // Stores a diff or snapshot of what changed
  ipAddress: { type: String },
  timestamp: { type: Date, default: Date.now },
});

// Index for quick filtering by entity type and action
auditLogSchema.index({ entity: 1, action: 1 });
auditLogSchema.index({ timestamp: -1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
