import express from "express";
import { config } from "../config.js";

const router = express.Router();

router.get("/options", async (_req, res) => {
  try {
    const response = await fetch(`${config.mlUrl}/options`, { signal: AbortSignal.timeout(5000) });
    if (!response.ok) throw new Error(`ML service returned ${response.status}`);
    res.json(await response.json());
  } catch (error) {
    console.error("ML options request failed:", error.message);
    res.status(502).json({ error: `Scoring service unavailable at ${config.mlUrl}. Start ml-service first.` });
  }
});

router.get("/health", async (_req, res) => {
  try {
    const response = await fetch(`${config.mlUrl}/options`, { signal: AbortSignal.timeout(2000) });
    res.status(response.ok ? 200 : 502).json({ backend: "ok", ml_service: response.ok ? "ok" : "error", ml_url: config.mlUrl });
  } catch {
    res.status(502).json({ backend: "ok", ml_service: "unavailable", ml_url: config.mlUrl });
  }
});

export default router;
