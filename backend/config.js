const SECRET = process.env.JWT_SECRET;

if (!SECRET) throw new Error("JWT_SECRET is required. Add it to backend/.env.");

export const config = {
  secret: SECRET,
  mlUrl: process.env.ML_URL || "http://localhost:8000",
  geminiKey: process.env.GEMINI_API_KEY,
  geminiModel: process.env.GEMINI_MODEL || "gemini-3.8-flash",
};
