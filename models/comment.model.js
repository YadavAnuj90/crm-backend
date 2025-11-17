
const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
      ticketId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Ticket",
      required: true
    },
    userId: {
      type: String,   
      required: true
    },
    comment: {
      type: String,
      required: true
    }
  },{ timestamps: true });

  module.exports = mongoose.model("Comment", commentSchema);
  