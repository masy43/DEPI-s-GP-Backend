import express from "express";
import cors from "cors";
import helmet from "helmet";
import prisma from "./config/prisma";
import authRoutes from "./routes/authRoutes";
import productRoutes from "./routes/productRoutes";
import cartRoutes from "./routes/cartRoutes";
import orderRoutes from "./routes/orderRoutes";
import profileRoutes from "./routes/profileRoutes";
import surveyRoutes from "./routes/surveyRoutes";
import recommendationRoutes from "./routes/recommendationRoutes";
import adminRoutes from "./routes/adminRoutes";

const app = express();

app.use(cors());
app.use(helmet());
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/survey", surveyRoutes);
app.use("/api/recommendations", recommendationRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api", productRoutes);
app.use("/api", orderRoutes);

app.get("/api/health", async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({
      status: "OK",
      db: "connected",
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.log("[health] db check failed:", err);
    res.status(500).json({
      status: "ERROR",
      db: "disconnected",
      timestamp: new Date().toISOString(),
    });
  }
});

export default app;
