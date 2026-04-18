const express = require("express");
const logger = require("../utils/logger");
const { searchNews } = require("../modules/search/search.service");

const router = express.Router();

/**
 * POST /api/search
 * Search for news relevant to geopolitical events
 */
router.post("/", async (req, res) => {
	try {
		const { query } = req.body;

		if (!query || query.trim().length === 0) {
			return res.status(400).json({
				success: false,
				message: "Search query is required",
			});
		}

		logger.info(`Search endpoint called with query: "${query}"`, "search.routes");

		const results = await searchNews(query);

		return res.status(results.success ? 200 : 400).json(results);
	} catch (err) {
		logger.error(`Search route error: ${err.message}`, "search.routes");
		return res.status(500).json({
			success: false,
			message: "Search failed",
			error: err.message,
		});
	}
});

module.exports = router;
