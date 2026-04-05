const mongoose = require('mongoose');

const ticketSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  ticketPriority: {
    type: String, default: "LOW",
    enum: ["LOW", "MEDIUM", "HIGH", "CRITICAL"]
  },
  ticketStatus: {
    type: String, default: "OPEN",
    enum: ["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"]
  },
  category: {
    type: String,
    enum: ["TECHNICAL", "BILLING", "GENERAL", "FEATURE_REQUEST", "BUG", "OTHER"],
    default: "GENERAL"
  },
  tags: [{ type: String, trim: true }],
  reportedBy: { type: String, required: true },
  attachments: { type: [String], default: [] },
  assignedTo: { type: String, default: null },
  slaDueAt: { type: Date },
  isOverdue: { type: Boolean, default: false },
  escalationLevel: { type: Number, default: 0 },
  lastEscalatedAt: { type: Date, default: null },
  rating: { type: Number, min: 1, max: 5 },
  feedback: { type: String },
  organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', default: null },

  // ── Soft Delete ─────────────────────────────────────────────────────────────
  // isDeleted: true hides the ticket from all normal queries.
  // permanentDeleteAt marks when a scheduled cleanup job should hard-delete the record.
  isDeleted: { type: Boolean, default: false },
  deletedAt: { type: Date, default: null },
  deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  permanentDeleteAt: { type: Date, default: null }
}, { timestamps: true });

// Indexes for performance
ticketSchema.index({ ticketStatus: 1 });
ticketSchema.index({ reportedBy: 1 });
ticketSchema.index({ assignedTo: 1 });
ticketSchema.index({ isOverdue: 1 });
ticketSchema.index({ organizationId: 1 });
ticketSchema.index({ tags: 1 });
ticketSchema.index({ isDeleted: 1 });
ticketSchema.index({ permanentDeleteAt: 1 }); // For scheduled hard-delete cleanup job
ticketSchema.index({ title: 'text', description: 'text' });

module.exports = mongoose.model("Ticket", ticketSchema);
