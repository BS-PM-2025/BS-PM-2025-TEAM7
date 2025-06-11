// routes/chat.js
const express = require("express");
const router  = express.Router();
const { authenticateToken, authorizeRole } = require("../middleware/auth");
const chatCtrl = require("../controllers/chatController");
const aiController = require("../controllers/aiController");
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
router.post(
  "/ai",
  authenticateToken,
  aiController.chatWithAI
);
router.get('/test-key', (req, res) => {
  res.json({
    keyExists: !!process.env.OPENAI_API_KEY,
    keyPrefix: process.env.OPENAI_API_KEY?.slice(0, 8) + '...'
  });
});
module.exports = router;
