import express from "express";

const router = express.Router();
const topics = [
  ["Model news", (query, fuel) => `"${query}" ${fuel} India launch sales recall review`],
  ["Fuel trends", (query, fuel) => `"${query}" ${fuel} India fuel price running cost`],
  ["Market watch", (query, fuel) => `"${query}" ${fuel} India used car price demand resale market`],
  ["Company watch", (query, fuel) => `"${query}" ${fuel} automaker India company results crisis`],
];

const decode = value => value
  .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
  .replace(/<[^>]+>/g, "")
  .replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&apos;/g, "'")
  .replace(/&lt;/g, "<").replace(/&gt;/g, ">").trim();

const readItems = xml => [...xml.matchAll(/<item>([\s\S]*?)<\/item>/gi)].map(match => {
  const item = match[1];
  const get = tag => decode(item.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"))?.[1] || "");
  return { title: get("title"), link: get("link"), published: get("pubDate"), summary: get("description") };
}).filter(item => item.title && item.link);

router.get("/news", async (req, res) => {
  const brand = String(req.query.brand || "").trim();
  const model = String(req.query.model || "").trim();
  const fuel = String(req.query.fuel || "").trim();
  if (!brand || !model || !fuel) return res.status(400).json({ error: "Select a brand, model, and fuel type to load relevant news." });
  const query = `${brand} ${model}`;
  try {
    const groups = await Promise.all(topics.map(async ([topic, makeQuery]) => {
      const url = `https://news.google.com/rss/search?q=${encodeURIComponent(makeQuery(query, fuel))}&hl=en-IN&gl=IN&ceid=IN:en`;
      const response = await fetch(url, { signal: AbortSignal.timeout(10000) });
      if (!response.ok) throw new Error(`News source returned ${response.status}`);
      const xml = await response.text();
      return readItems(xml).slice(0, 4).map(article => ({ ...article, topic }));
    }));
    const articles = [...new Map(groups.flat().map(article => [article.link, article])).values()];
    res.json({ query, fuel, updated_at: new Date().toISOString(), articles });
  } catch (error) {
    console.error("News request failed:", error.message);
    res.status(502).json({ error: "Current news is temporarily unavailable. Try again shortly." });
  }
});

export default router;
