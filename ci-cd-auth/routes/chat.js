// routes/chat.js
const express = require("express");
const router  = express.Router();
const { authenticateToken, authorizeRole } = require("../middleware/auth");
const chatCtrl = require("../controllers/chatController");

router.post(
  "/send",
  authenticateToken,
  chatCtrl.sendMessage
);

router.get(
  "/conversation/:userId",
  authenticateToken,
  chatCtrl.getConversation
);

// ➖ new: delete by messageId (lecturer only)
router.delete(
  "/:messageId",
  authenticateToken,
  authorizeRole("lecturer"),
  chatCtrl.deleteMessage
);

module.exports = router;
