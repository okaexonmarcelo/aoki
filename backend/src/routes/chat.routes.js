const express = require("express");
const { runConversation } = require("../agent/orchestrator");

const router = express.Router();

router.post("/chat", async (req, res) => {
  const { messages } = req.body;
  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: "messages requerido" });
  }

  try {
    const reply = await runConversation(messages);
    res.json({ reply });
  } catch (err) {
    console.error("Aoki error:", err.message);
    res.status(500).json({ error: "Error interno del agente" });
  }
});

module.exports = router;
