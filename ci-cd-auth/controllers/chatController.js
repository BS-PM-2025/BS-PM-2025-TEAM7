// controllers/chatController.js
const mongoose = require("mongoose");
const Message  = require("../models/Message");
const User     = require("../models/user");

// ➤ Send a new message
exports.sendMessage = async (req, res) => {
  const senderId    = req.user.id;
  const { recipientId, content } = req.body;

  if (!recipientId || !content) {
    return res.status(400).json({ message: "recipientId and content are required." });
  }

  // Optional: verify the recipient exists (you could skip the lecturer check if you want 1:1 student↔student too)
  const recipient = await User.findById(recipientId);
  if (!recipient) {
    return res.status(404).json({ message: "User not found." });
  }

  const msg = new Message({ sender: senderId, recipient: recipientId, content });
  await msg.save();
  res.status(201).json(msg);
};

// ➤ Get the conversation between me and one other user
exports.getConversation = async (req, res) => {
  const me        = req.user.id;
  const otherUser = req.params.userId;

  const messages = await Message
    .find({
      $or: [
        { sender: me,      recipient: otherUser },
        { sender: otherUser, recipient: me }
      ]
    })
    .sort("timestamp");

  res.json(messages);
};

// ➤ Delete a single message (lecturers only)
exports.deleteMessage = async (req, res) => {
  const { messageId } = req.params;
  const msg = await Message.findById(messageId);
  if (!msg) return res.status(404).json({ message: "Message not found." });

  if (req.user.role !== "lecturer") {
    return res.status(403).json({ message: "Forbidden." });
  }

  await Message.findByIdAndDelete(messageId);
  res.json({ message: "Message deleted." });
};

// ➤ List all conversations (one per “other user”), with last message & timestamp
exports.listConversations = async (req, res) => {
  const me = mongoose.Types.ObjectId(req.user.id);

  const convos = await Message.aggregate([
    { $match: { $or: [{ sender: me }, { recipient: me }] } },
    { $addFields: {
        other: {
          $cond: [{ $eq: ["$sender", me] }, "$recipient", "$sender"]
        }
    }},
    { $sort: { timestamp: -1 } },
    { $group: {
        _id: "$other",
        lastMessage:   { $first: "$content" },
        lastTimestamp: { $first: "$timestamp" }
    }},
    { $lookup: {
        from: "users",
        localField: "_id",
        foreignField: "_id",
        as: "userInfo"
    }},
    { $unwind: "$userInfo" },
    { $project: {
        userId:       "$_id",
        username:     "$userInfo.username",
        lastMessage:  1,
        lastTimestamp: 1
    }},
    { $sort: { lastTimestamp: -1 } }
  ]);

  res.json(convos);
};
