const axios = require("axios");
const config = require("../../../../config/env.js");
const logger = require("../../../../utils/logger.js");

const NEWS_URL = "https://newsapi.org/v2/everything";

/**
 * Format date as YYYY-MM-DD for NewsAPI
 */
const formatDate = (date) => {
	return date.toISOString().split('T')[0];
};

/**
 * Get date range for fetching news from multiple dates
 * Returns array of date ranges for the past 3-4 days
 */
const getDateRanges = () => {
	const ranges = [];
	const today = new Date();

	// Fetch news from last 4 days, 2 days per query for faster LLM processing
	for (let i = 0; i < 6; i++) {
		const endDate = new Date(today);
		endDate.setDate(endDate.getDate() - i);

		const startDate = new Date(endDate);
		startDate.setDate(startDate.getDate() - 1);

		ranges.push({
			from: formatDate(startDate),
			to: formatDate(endDate)
		});
	}

	return ranges;
};

exports.fetchFromNewsAPI = async () => {
	try {
		logger.info("Fetching from NewsAPI with multi-date strategy...", "newsapi.fetcher");

		const dateRanges = getDateRanges();
		let allArticles = [];

		// Fetch news from each date range
		for (const range of dateRanges) {
			try {
				logger.info(`Fetching news from ${range.from} to ${range.to}`, "newsapi.fetcher");

				const res = await axios.get(NEWS_URL, {
					params: {
						q: "world OR global OR policy OR legislation OR reform OR breaking OR crisis OR diplomacy OR economy OR politics OR humanitarian OR military OR war OR attack OR assassination OR bombing OR invasion OR insurgency OR sanction OR negotiation OR summit OR alliance OR blockade OR coup OR election OR protest OR riot OR regime-change OR refugee OR cyberattack OR tradewar OR armsdeal OR business OR pandemic OR disaster OR environment",
						from: range.from,
						to: range.to,
						language: "en",
						sortBy: "publishedAt",
						pageSize: 30,  // Reduced to stay within rate limits
						apiKey: config.NEWS_API_KEY,
					},
					timeout: 10000
				});

				const articles = res.data.articles || [];
				logger.info(
					`NewsAPI returned ${articles.length} articles for ${range.from} to ${range.to}`,
					"newsapi.fetcher",
				);

				allArticles.push(...articles);

				// Add small delay between requests to avoid rate limiting
				await new Promise(resolve => setTimeout(resolve, 500));

			} catch (err) {
				logger.warn(`Failed to fetch for date range ${range.from} to ${range.to}: ${err.message}`, "newsapi.fetcher");
				continue; // Continue with next date range
			}
		}

		logger.info(
			`NewsAPI total returned ${allArticles.length} articles from ${dateRanges.length} date ranges`,
			"newsapi.fetcher",
		);

		return allArticles;
	} catch (err) {
		logger.error(`NewsAPI fetch failed: ${err.message}`, "newsapi.fetcher");

		return []; // fail gracefully
	}
};

/**
 * Search NewsAPI for specific query
 */
exports.fetchNewsWithSearch = async (searchQuery) => {
	try {
		logger.info(`Searching NewsAPI for: "${searchQuery}"`, "newsapi.fetcher");

		const res = await axios.get(NEWS_URL, {
			params: {
				q: searchQuery,
				language: "en",
				sortBy: "relevancy",
				pageSize: 20,
				apiKey: config.NEWS_API_KEY,
			},
			timeout: 10000
		});

		const articles = res.data.articles || [];
		logger.info(
			`NewsAPI search returned ${articles.length} articles for "${searchQuery}"`,
			"newsapi.fetcher",
		);

		return articles;
	} catch (err) {
		logger.error(`NewsAPI search failed: ${err.message}`, "newsapi.fetcher");
		return [];
	}
};
