
const mongoose = require('mongoose');

    const ticketSchema = new mongoose.Schema({
         title: {
              type: String,
              required: true
         },
          description: {
              type: String,
              required: true
          },
              ticketPriority: {
                 type: String,
            default: "LOW",
            enum: ["LOW", "MEDIUM", "HIGH"]
              },
              ticketStatus: {
            type: String,
            default: "OPEN",
            enum: ["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"]
        },
        reportedBy: {
            type: String,
            required: true
        },
        attachments: {
  type: [String], 
  default: []
},
         assignedTo: {
            type: String,
            default: null
        },
        slaDueAt: { type: Date },
    isOverdue: { 
        type: Boolean,
         default: false
         },
          rating: { type: Number, min: 1, max: 5 },
  feedback: { type: String }

           
    }, { timestamps: true })

    module.exports = mongoose.model("Ticket", ticketSchema);