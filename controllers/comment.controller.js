const commentModel = require("../models/comment.model");
const Comment = require("../models/comment.model");
const Ticket = require("../models/ticket.model");

exports.addComment = async (req, res) => {
  const { comment } = req.body;
  const ticketId = req.params.id;

  if (!comment) {
    return res.status(400).send({ message: "comment is required" });
  }
  try {
    const ticket = await Ticket.findById(ticketId);
    if (!ticket) {
      return res.status(404).send({ message: "Ticket not found" });
    }
    const savedComment = await Comment.create({
      ticketId,
      userId: req.user.userId,
      comment,
    });
    res.status(201).send({
      message: "Comment added successfully",
      data: savedComment,
    });
  } catch (err) {
    console.error("Add comment error:", err);
    res.status(500).send({ message: "Internal server error" });
  }
};
exports.getComments = async (req, res) => {
  const ticketId = req.params.id;
  try {
    const comments = await Comment.find({ ticketId }).sort({ createdAt: 1 });

    res.status(200).send(comments);
  } catch (err) {
    console.error("Fetch comments error:", err);
    res.status(500).send({ message: "Internal server error" });
  }
};
