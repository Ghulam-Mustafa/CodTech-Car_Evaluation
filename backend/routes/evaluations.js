import express from "express";
import { db } from "../db.js";
import { config } from "../config.js";
import { auth } from "../middleware/auth.js";

const router = express.Router();

router.post("/evaluations", auth, async (req, res) => {
  const { name, ...input } = req.body;
  try {
    const response = await fetch(`${config.mlUrl}/evaluate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) {
      const detail = await response.text();
      console.error("ML evaluation rejected:", response.status, detail);
      return res.status(response.status === 422 ? 400 : 502)
        .json({ error: response.status === 422 ? "Check the values you entered." : "Scoring service rejected the request." });
    }
    const result = await response.json();
    const car = `${input.brand} ${name || ""}`.trim();
    const id = db.prepare("INSERT INTO evaluations(user_id,car,input,result) VALUES(?,?,?,?)")
      .run(req.uid, car, JSON.stringify(input), JSON.stringify(result)).lastInsertRowid;
    res.json({ id, car, input, ...result });
  } catch (error) {
    console.error("ML evaluation request failed:", error.message);
    res.status(502).json({ error: `Scoring service unavailable at ${config.mlUrl}. Start ml-service first.` });
  }
});

router.get("/evaluations", auth, (req, res) => {
  res.json(db.prepare("SELECT * FROM evaluations WHERE user_id=? ORDER BY id DESC").all(req.uid)
    .map(evaluation => ({
      id: evaluation.id,
      car: evaluation.car,
      created_at: evaluation.created_at,
      input: JSON.parse(evaluation.input),
      ...JSON.parse(evaluation.result),
    })));
});

router.delete("/evaluations/:id", auth, (req, res) => {
  db.prepare("DELETE FROM evaluations WHERE id=? AND user_id=?").run(req.params.id, req.uid);
  res.json({ ok: true });
});

export default router;
