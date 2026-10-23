import "dotenv/config";
import express from "express";
import cors from "cors";
import "./db.js";
import authRoutes from "./routes/auth.js";
import chatRoutes from "./routes/chat.js";
import evaluationRoutes from "./routes/evaluations.js";
import imageRoutes from "./routes/images.js";
import inspectionRoutes from "./routes/inspection.js";
import mlRoutes from "./routes/ml.js";
import newsRoutes from "./routes/news.js";

const app = express();

app.use(cors());
app.use(express.json({ limit: "20mb" }));
app.use("/api/auth", authRoutes);
app.use("/api", chatRoutes);
app.use("/api", evaluationRoutes);
app.use("/api", imageRoutes);
app.use("/api", inspectionRoutes);
app.use("/api", mlRoutes);
app.use("/api", newsRoutes);

app.listen(4000, () => console.log("API on :4000"));
