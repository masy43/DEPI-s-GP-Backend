// Express 5 natively propagates async errors to error handlers — no extra package needed.
import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import { rateLimit } from "express-rate-limit";
import prisma from "./config/prisma";
import authRoutes from "./routes/authRoutes";
import productRoutes from "./routes/productRoutes";
import cartRoutes from "./routes/cartRoutes";
import orderRoutes from "./routes/orderRoutes";
import profileRoutes from "./routes/profileRoutes";
import surveyRoutes from "./routes/surveyRoutes";
import recommendationRoutes from "./routes/recommendationRoutes";
import adminRoutes from "./routes/adminRoutes";
import reviewRoutes from "./routes/reviewRoutes";
import shippingRoutes from "./routes/shippingRoutes";
import dashboardRoutes from "./routes/dashboardRoutes";
import addressRoutes from "./routes/addressRoutes";
import webhookRoutes from "./routes/webhookRoutes";

const app = express();
app.set("trust proxy", 1); // Trust the reverse proxy to get correct Client IP

// ── IMPORTANT: Webhook route must be registered BEFORE express.json() ─────────
// Stripe signature verification requires the raw, unparsed request body.
app.use("/api/webhooks", webhookRoutes);

// ── Global middleware ──────────────────────────────────────────────────────────
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",").map((o) => o.trim())
  : "*";

app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(helmet());
app.use(express.json());

// Rate limit sensitive auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many attempts. Please try again in 15 minutes." },
});

app.use("/api/auth", authLimiter, authRoutes);
app.use("/api/admin/login", authLimiter);

app.use("/api/cart", cartRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/survey", surveyRoutes);
app.use("/api/recommendations", recommendationRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/addresses", addressRoutes);
app.use("/api", productRoutes);
app.use("/api", orderRoutes);
app.use("/api", reviewRoutes);
app.use("/api", shippingRoutes);

app.get("/api/health", async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({
      status: "OK",
      db: "connected",
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error("[health] db check failed:", err);
    res.status(500).json({
      status: "ERROR",
      db: "disconnected",
      timestamp: new Date().toISOString(),
    });
  }
});

// Express 5 catches async errors natively — this handles anything that slips through
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error("[global error handler]", err.message);
  res.status(500).json({ error: err.message || "Internal server error" });
});

export default app;
