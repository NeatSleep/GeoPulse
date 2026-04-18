const express = require("express");
const logger = require("../utils/logger");
const { assistantChat } = require("../modules/assistant/assistant.service");

const router = express.Router();

/**
 * POST /api/assistant/chat
 * Chat with the AI assistant that can fetch real-time news
 */
router.post("/chat", async (req, res) => {
  try {
    const { message, conversation_history } = req.body;

    if (!message || message.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: "Message is required"
      });
    }

    logger.info(`Assistant endpoint called with message: "${message.substring(0, 50)}..."`, "assistant.routes");

    const result = await assistantChat(message, conversation_history || []);

    return res.status(result.success ? 200 : 400).json(result);
  } catch (err) {
    logger.error(`Assistant route error: ${err.message}`, "assistant.routes");
    return res.status(500).json({
      success: false,
      error: "Chat failed",
      message: err.message
    });
  }
});

module.exports = router;
