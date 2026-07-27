const express = require("express");
const fetch = require("node-fetch");
const db = require("../db");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();
const ML_SERVICE_URL = process.env.ML_SERVICE_URL || "http://127.0.0.1:8001";

router.use(requireAuth);

router.post("/", async (req, res) => {
  const { make, model, manufacture_year, num_services, major_accidents, minor_accidents } = req.body;

  if (
    manufacture_year == null ||
    num_services == null ||
    major_accidents == null ||
    minor_accidents == null
  ) {
    return res.status(400).json({
      error: "manufacture_year, num_services, major_accidents and minor_accidents are required",
    });
  }

  let mlResult;
  try {
    const mlRes = await fetch(`${ML_SERVICE_URL}/predict`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ manufacture_year, num_services, major_accidents, minor_accidents }),
    });

    if (!mlRes.ok) {
      const detail = await mlRes.text();
      return res.status(502).json({ error: "ML scoring service error", detail });
    }
    mlResult = await mlRes.json();
  } catch (err) {
    return res.status(503).json({ error: "Could not reach ML scoring service", detail: err.message });
  }

  const info = db
    .prepare(
      `INSERT INTO evaluations
        (user_id, make, model, manufacture_year, num_services, major_accidents, minor_accidents,
         score, condition, price_range_low, price_range_high, factors_json)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      req.user.id,
      make || null,
      model || null,
      manufacture_year,
      num_services,
      major_accidents,
      minor_accidents,
      mlResult.score,
      mlResult.condition,
      mlResult.price_range_low,
      mlResult.price_range_high,
      JSON.stringify(mlResult.factors)
    );

  const saved = db.prepare("SELECT * FROM evaluations WHERE id = ?").get(info.lastInsertRowid);
  res.status(201).json(serialize(saved));
});

router.get("/", (req, res) => {
  const rows = db
    .prepare("SELECT * FROM evaluations WHERE user_id = ? ORDER BY created_at DESC")
    .all(req.user.id);
  res.json(rows.map(serialize));
});

router.get("/:id", (req, res) => {
  const row = db
    .prepare("SELECT * FROM evaluations WHERE id = ? AND user_id = ?")
    .get(req.params.id, req.user.id);
  if (!row) return res.status(404).json({ error: "Evaluation not found" });
  res.json(serialize(row));
});

function serialize(row) {
  return {
    id: row.id,
    make: row.make,
    model: row.model,
    manufactureYear: row.manufacture_year,
    numServices: row.num_services,
    majorAccidents: row.major_accidents,
    minorAccidents: row.minor_accidents,
    score: row.score,
    condition: row.condition,
    priceRangeLow: row.price_range_low,
    priceRangeHigh: row.price_range_high,
    factors: JSON.parse(row.factors_json),
    createdAt: row.created_at,
  };
}

module.exports = router;
