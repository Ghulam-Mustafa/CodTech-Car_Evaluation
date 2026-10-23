import express from "express";
import { config } from "../config.js";
import { auth } from "../middleware/auth.js";
import { inspectExterior } from "../services/gemini.js";

const router = express.Router();

router.post("/inspect-exterior", auth, async (req, res) => {
  const { images = [], car = {} } = req.body;
  if (!Array.isArray(images) || images.length < 2 || images.length > 6) {
    return res.status(400).json({ error: "Upload between 2 and 6 exterior photos." });
  }
  if (images.some(image => typeof image !== "string" || !/^data:image\/(jpeg|jpg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(image))) {
    return res.status(400).json({ error: "Photos must be JPG, PNG, or WebP images." });
  }
  if (!config.geminiKey) return res.status(503).json({ error: "Add GEMINI_API_KEY to use photo inspection." });
  try {
    const data = await inspectExterior(images, car);
    const report = JSON.parse(data.candidates?.[0]?.content?.parts?.map(part => part.text || "").join("").trim());
    const score = Math.max(0, Math.min(100, Number(report.score)));
    const adjustment = Math.max(-15, Math.min(6, Number(report.adjustment_percent)));
    if (!Number.isFinite(score) || !Number.isFinite(adjustment) || !Array.isArray(report.observations)) {
      throw new Error("Invalid inspection response");
    }
    res.json({ ...report, score: Math.round(score), adjustment_percent: adjustment, source: "gemini-vision" });
  } catch (error) {
    console.error("Exterior inspection failed:", error.message);
    res.status(502).json({ error: "Photo inspection is temporarily unavailable. You can still estimate using the manual condition fields." });
  }
});

export default router;
