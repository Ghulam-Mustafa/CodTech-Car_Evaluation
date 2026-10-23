import { config } from "../config.js";

const geminiRequest = async (body, options = {}) => {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${config.geminiModel}:generateContent`,
    {
      method: "POST",
      headers: { "content-type": "application/json", "x-goog-api-key": config.geminiKey },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(options.timeout || 15000),
    }
  );
  const data = await response.json();
  if (!response.ok) throw new Error(data.error?.message || `Gemini returned ${response.status}`);
  return data;
};

export const inspectExterior = async (images, car) => {
  const parts = [{
    text: `Assess only visible exterior condition for this vehicle: ${String(car.brand || "")} ${String(car.model || "")}.
Return strict JSON only with this shape:
{"score": number 0-100, "label": "Excellent"|"Good"|"Fair"|"Needs work", "adjustment_percent": number from -15 to 6, "observations": ["short visible observation", "..."], "confidence": "low"|"medium"|"high"}
Use conservative estimates. Do not infer mechanical condition, accident history, mileage, ownership, or hidden damage. Mention uncertainty in observations.`,
  }];
  for (const image of images) {
    const [, mime, data] = image.match(/^data:(image\/(?:jpeg|jpg|png|webp));base64,(.+)$/);
    parts.push({ inlineData: { mimeType: mime === "image/jpg" ? "image/jpeg" : mime, data } });
  }
  return geminiRequest({
    contents: [{ role: "user", parts }],
    generationConfig: { temperature: 0.1, maxOutputTokens: 500, responseMimeType: "application/json" },
  });
};

export const chatWithAdvisor = async (system, turns, detailed = false) => {
  let lastError;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const data = await geminiRequest({
        systemInstruction: { parts: [{ text: system }] },
        contents: turns,
        generationConfig: { temperature: 0.35, maxOutputTokens: detailed ? 1800 : 1400 },
      });
      return data.candidates[0].content.parts.map(part => part.text || "").join("");
    } catch (error) {
      lastError = error;
      if (!/^(Gemini (429|500|502|503|504):|fetch failed|The operation was aborted)/.test(error.message)) break;
      await new Promise(resolve => setTimeout(resolve, 500 * (attempt + 1)));
    }
  }
  throw lastError;
};
