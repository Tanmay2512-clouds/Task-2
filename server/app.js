const express = require("express");
const cookieParser = require("cookie-parser");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const connectDatabase = require("./db");
const authRoutes = require("./routes/auth");
const petsRoutes = require("./routes/pets");
const careRoutes = require("./routes/care");
const aiRoutes = require("./routes/ai");
const { requireAuth } = require("./middleware/auth");

const app = express();
app.set("trust proxy", 1);
app.use(helmet());
app.use(express.json({ limit: "25kb" }));
app.use(cookieParser());

app.get("/api/health", (_req, res) => res.json({ status: "ok" }));
app.use("/api", async (_req, _res, next) => {
  try {
    await connectDatabase();
    next();
  } catch (error) { next(error); }
});

app.use("/api/auth", rateLimit({ windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: true, legacyHeaders: false }));
app.use("/api/auth", authRoutes);
app.use("/api/ai", requireAuth, rateLimit({ windowMs: 60 * 1000, limit: 12, standardHeaders: true, legacyHeaders: false }), aiRoutes);
app.use("/api/pets", requireAuth, petsRoutes);
app.use("/api", requireAuth, careRoutes);

app.use((req, res) => res.status(404).json({ error: `No route for ${req.method} ${req.path}.` }));
app.use((error, _req, res, _next) => {
  const status = Number.isInteger(error.status) ? error.status : (error.name === "ValidationError" || error.name === "CastError" ? 400 : 500);
  if (status >= 500) console.error(error);
  res.status(status).json({
    error: status === 500 ? "Something went wrong. Please try again." : error.message
  });
});

module.exports = app;
