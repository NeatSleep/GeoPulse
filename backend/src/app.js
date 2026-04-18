const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");

const logger = require("./utils/logger");

// Routes
const newsRoutes = require("./routes/news.routes");
const searchRoutes = require("./routes/search.routes");
const translateRoutes = require("./routes/translate.routes");

const app = express();

// ---------- MIDDLEWARE ----------
app.use(cors());
app.use(helmet());
app.use(express.json());

// HTTP request logging → pipe into your logger
app.use(
  morgan("dev", {
    stream: {
      write: (message) => {
        logger.info(message.trim(), "http");
      }
    }
  })
);

// ---------- ROUTES ----------

// Health Check
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    message: "Server is running",
    timestamp: new Date().toISOString()
  });
});

// Main API
app.use("/api", newsRoutes);
app.use("/api/search", searchRoutes);
app.use("/api", translateRoutes);

// Root route
app.get("/", (req, res) => {
  res.send("Geopolitical Intelligence Backend Running 🚀");
});

// ---------- 404 HANDLER ----------
app.use((req, res) => {
  logger.warn(`Route not found: ${req.originalUrl}`, "app");

  res.status(404).json({
    success: false,
    error: "Route not found"
  });
});

// ---------- GLOBAL ERROR HANDLER ----------
app.use((err, req, res, next) => {
  logger.error(`Unhandled error: ${err.message}`, "app");

  res.status(500).json({
    success: false,
    error: "Internal Server Error"
  });
});

module.exports = app;