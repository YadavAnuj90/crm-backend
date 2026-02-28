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
  organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', default: null }
}, { timestamps: true });

// Indexes for performance
ticketSchema.index({ ticketStatus: 1 });
ticketSchema.index({ reportedBy: 1 });
ticketSchema.index({ assignedTo: 1 });
ticketSchema.index({ isOverdue: 1 });
ticketSchema.index({ organizationId: 1 });
ticketSchema.index({ tags: 1 });
ticketSchema.index({ title: 'text', description: 'text' });

module.exports = mongoose.model("Ticket", ticketSchema);
