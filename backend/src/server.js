const app = require("./app");
const logger = require("./utils/logger");

const cron = require("node-cron");
const { runNewsPipeline } = require("./jobs/news.job");

const PORT = process.env.PORT || 5000;

// ---------- START SERVER WITH INITIALIZATION ----------
(async () => {
	try {
		// Run pipeline FIRST (blocking)
		logger.info("Initial pipeline run...", "server");
		await runNewsPipeline();
		logger.info("Initial pipeline completed. Cache populated.", "server");

		// THEN start server
		const server = app.listen(PORT, () => {
			logger.info(`Server running on port ${PORT}`, "server");
		});

		// THEN schedule cron job
		cron.schedule("0 */5 * * *", async () => {
			logger.info("Cron triggered", "cron");
			await runNewsPipeline();
		});

		// ---------- ERROR HANDLING ----------
		process.on("unhandledRejection", (err) => {
			logger.error(`Unhandled Rejection: ${err.message}`, "server");
			server.close(() => process.exit(1));
		});

		process.on("uncaughtException", (err) => {
			logger.error(`Uncaught Exception: ${err.message}`, "server");
			process.exit(1);
		});

		// ---------- GRACEFUL SHUTDOWN ----------
		process.on("SIGINT", () => {
			logger.warn("SIGINT received. Shutting down...", "server");
			server.close(() => {
				logger.info("Server closed", "server");
				process.exit(0);
			});
		});

		process.on("SIGTERM", () => {
			logger.warn("SIGTERM received. Shutting down...", "server");
			server.close(() => {
				logger.info("Server closed", "server");
				process.exit(0);
			});
		});
	} catch (err) {
		logger.error(`Startup error: ${err.message}`, "server");
		process.exit(1);
	}
})();
