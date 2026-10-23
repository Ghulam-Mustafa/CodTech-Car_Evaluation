import express from "express";

const router = express.Router();

router.get("/car-image", async (req, res) => {
  const brand = String(req.query.brand || "").trim();
  const model = String(req.query.model || "").trim();
  if (!brand || !model) return res.json({ image: null });
  try {
    const modelWords = model.replace(new RegExp(`^${brand}\\s+`, "i"), "").split(/\s+/).filter(Boolean);
    const queries = [`${brand} ${model} car`, `${brand} ${model} vehicle`, `${brand} ${modelWords.slice(0, 2).join(" ")} car`, `${brand} ${modelWords[0] || model} car`];
    const excluded = /\b(logo|badge|emblem|symbol|diagram|brochure|advert|toy|模型|scale|interior|engine|wheel|wheelcap|motorcycle|truck|bus)\b/i;
    const wanted = modelWords.filter(word => word.length > 2 && !/^(car|vehicle|classic|grand|series|touring|sedan|hatchback)$/i.test(word));
    for (const text of [...new Set(queries)]) {
      const response = await fetch(`https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(text)}&gsrnamespace=6&gsrlimit=10&prop=imageinfo&iiprop=url|mime|size&iiurlwidth=1200&format=json`);
      if (!response.ok) continue;
      const data = await response.json();
      const candidates = Object.values(data.query?.pages || {})
        .map(page => ({ title: page.title || "", info: page.imageinfo?.[0] }))
        .filter(candidate => candidate.info?.mime?.startsWith("image/") && !excluded.test(candidate.title))
        .map(candidate => {
          const title = candidate.title.toLowerCase();
          const matches = wanted.filter(word => title.includes(word)).length;
          const landscape = candidate.info.width >= candidate.info.height;
          return { ...candidate, score: matches * 10 + (landscape ? 2 : 0) };
        })
        .filter(candidate => !wanted.length || candidate.title.toLowerCase().includes(wanted[0].toLowerCase()))
        .sort((a, b) => b.score - a.score);
      const best = candidates[0];
      if (best) return res.json({ image: best.info.thumburl || best.info.url, source: "Wikimedia Commons", title: best.title });
    }
    res.json({ image: null });
  } catch {
    res.json({ image: null });
  }
});

export default router;
