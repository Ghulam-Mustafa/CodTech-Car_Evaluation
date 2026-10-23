import express from "express";
import { config } from "../config.js";
import { auth } from "../middleware/auth.js";
import { advisorPrompt, offlineReply } from "../services/advisor.js";
import { chatWithAdvisor } from "../services/gemini.js";

const router = express.Router();

router.post("/chat", auth, async (req, res) => {
  const { messages = [], evaluation = {} } = req.body;
  if (!config.geminiKey) return res.json({ reply: offlineReply(evaluation), source: "offline" });
  try {
    const turns = messages.slice(-10)
      .map(message => ({
        role: message.role === "assistant" ? "model" : "user",
        parts: [{ text: String(message.content).slice(0, 2000) }],
      }));
    while (turns.length && turns[0].role !== "user") turns.shift();
    const latestMessage = turns.at(-1)?.parts?.[0]?.text || "";
    const detailed = /\b(in detail|detailed|deep dive|thorough|comprehensive|explain fully|long answer)\b/i.test(latestMessage);
    const reply = await chatWithAdvisor(advisorPrompt(evaluation, detailed), turns, detailed);
    res.json({ reply, source: "gemini" });
  } catch (error) {
    console.error("Gemini request failed; using offline advisor:", error.message);
    res.json({ reply: offlineReply(evaluation), source: "offline", reason: "Gemini is temporarily unavailable." });
  }
});

export default router;
