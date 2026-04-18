const logger = require("../../utils/logger");
const { queryLLM } = require("../../config/llm");
const newsApiFetcher = require("../news/sources/newsapi/fetcher");

const ALLOWED_TYPES = [
  "politics",
  "conflict",
  "diplomacy",
  "sanctions & trade",
  "economic",
  "humanitarian",
  "armed conflict",
  "hostage",
  "terrorism",
  "cyber",
  "natural disaster",
  "migration",
    "cryptocurrency",
  "crypto news",
  "stock market tips",
  "crypto giveaway",
  "nft",
  "bitcoin",
  "ethereum",
  "stock price",
  "stock market",
  "trading",
  "forex",
  "financial tips",
  // Armed conflict
	"airstrike",
	"attack",
	"battle",
	"conflict",
	"military",
	"war",
	"clash",
	"bombing",
	"shelling",
	"invasion",
	"siege",
	"insurgency",
	"assassination",
	"ambush",
	"hostage",

	// Geopolitics & diplomacy
	"sanction",
	"diplomacy",
	"negotiation",
	"threat",
	"operation",
	"tension",
	"summit",
	"treaty",
	"alliance",
	"embargo",
	"blockade",
	"espionage",

	// Political events
	"coup",
	"election",
	"protest",
	"uprising",
	"riot",
	"crackdown",
	"referendum",
	"regime change",
	"rebellion",
	"strike",

	// Humanitarian
	"crisis",
	"humanitarian",
	"refugee",
	"displacement",
	"famine",
	"evacuation",
	"mass-death",

	// Cyber & intelligence
	"cyberattack",
	"hacking",
	"surveillance",

	// Trade & economic
	"tradewar",
	"tariff",
	"armsdeal",
	"economy",
	"business",

	// Health, Environment & Politics
	"pandemic",
	"disaster",
	"environment",
	"politics",
];

const AUTHENTIC_SOURCES = new Set([
  "reuters",
  "bbc",
  "associated press",
  "bloomberg",
  "ap news",
  "npr",
  "france 24",
  "dw",
  "al jazeera",
  "cnn",
  "nyt",
  "new york times",
  "washington post",
  "guardian",
  "ft",
  "financial times",
  "economist",
  "time",
  "newsweek",
  "politico",
  "axios",
  "vice news",
  "bbc news world",
]);

const BLACKLISTED_TOPICS = new Set([
  "celebrity",
  "entertainment",
  "sports",
  "weather",
  "technology gadgets",
  "lifestyle",
  "health tips",
  "diet",
  "fitness",
  "viral",
  "memes",
  "tiktok",
  "instagram",
  "gaming",
  "esports",
  "investment advice",
  "weather forecast",
  "celebrity gossip",
  "fashion",
  "beauty",
  "cooking",
  "recipe",
  "fashion week",
]);

const calculateAuthenticityScore = (source) => {
  if (!source) return 0.3;

  const normalizedSource = source.toLowerCase();
  
  // Check if source is in authentic list
  if (AUTHENTIC_SOURCES.has(normalizedSource)) return 0.95;
  
  // Check partial matches
  for (const authentic of AUTHENTIC_SOURCES) {
    if (normalizedSource.includes(authentic)) return 0.85;
  }

  // Generic major news sources
  if (normalizedSource.includes("news") || normalizedSource.includes("times")) return 0.7;
  if (normalizedSource.includes("report")) return 0.65;
  
  // Default for unknown sources
  return 0.5;
};

const checkRelevance = async (query, articles) => {
  try {
    logger.info("Checking search relevance with LLM...", "search.service");

    const lowerQuery = query.toLowerCase();

    // First: Quick blacklist check - reject immediately if blacklisted topic detected
    for (const blacklistedTopic of BLACKLISTED_TOPICS) {
      if (lowerQuery.includes(blacklistedTopic)) {
        logger.warn(`Query contains blacklisted topic "${blacklistedTopic}": ${query}`, "search.service");
        return {
          is_relevant: false,
          reason: `Query contains blacklisted topic: "${blacklistedTopic}"`,
          matched_type: null,
        };
      }
    }

    // Second: Quick allowlist check - approve immediately if allowed type detected
    for (const allowedType of ALLOWED_TYPES) {
      if (lowerQuery.includes(allowedType)) {
        logger.info(`Query matches allowed type "${allowedType}": ${query}`, "search.service");
        return {
          is_relevant: true,
          reason: `Query is about ${allowedType}`,
          matched_type: allowedType,
        };
      }
    }

    // Third: LLM verification for ambiguous queries
    const prompt = `
You are a geopolitical intelligence analyst. Check if this search query is relevant to geopolitical events.

Query: "${query}"

Allowed geopolitical event types:
${ALLOWED_TYPES.join(", ")}

Return YES or NO and state which allowed type it matches, if any.
Format: YES - [type] or NO - [reason]
`;

    const response = await queryLLM(prompt);
    
    if (response.toUpperCase().includes("YES")) {
      const typeMatch = ALLOWED_TYPES.find(type => response.toLowerCase().includes(type.toLowerCase()));
      return {
        is_relevant: true,
        reason: "Verified by LLM",
        matched_type: typeMatch || null,
      };
    }

    // Default fallback: reject if no clear match
    return {
      is_relevant: false,
      reason: "Query does not match any geopolitical event types",
      matched_type: null,
    };
  } catch (err) {
    logger.error(`Relevance check failed: ${err.message}`, "search.service");
    return { is_relevant: false, reason: "Error checking relevance", matched_type: null };
  }
};

exports.searchNews = async (query) => {
  try {
    logger.info(`Searching news for query: "${query}"`, "search.service");

    // Check relevance first
    const relevanceCheck = await checkRelevance(query, []);
    logger.info(`Relevance check result: is_relevant=${relevanceCheck.is_relevant}, reason=${relevanceCheck.reason}`, "search.service");
    
    if (!relevanceCheck.is_relevant) {
      logger.warn(`Search query rejected: ${query}`, "search.service");
      return {
        success: false,
        query: query,
        message: relevanceCheck.reason || "Not relevant to our perspective",
        recommendation: "Try searching for geopolitical conflicts, diplomacy, sanctions, economic news, or humanitarian issues",
        results: [],
      };
    }

    logger.info(`Query "${query}" passed relevance. Fetching articles from NewsAPI...`, "search.service");

    // Fetch news with search query
    const articles = await newsApiFetcher.fetchNewsWithSearch(query);
    logger.info(`NewsAPI returned ${articles?.length || 0} articles for "${query}"`, "search.service");
    
    if (!articles || articles.length === 0) {
      logger.warn(`No articles found from NewsAPI for query: "${query}"`, "search.service");
      return {
        success: false,
        query: query,
        message: "No articles found for this search",
        results: [],
      };
    }

    // Transform results with authenticity scores
    const results = articles.map((article, idx) => {
      const source = article.source?.name || "Unknown";
      const authenticityScore = calculateAuthenticityScore(source);

      return {
        id: `search_${Date.now()}_${idx}`,
        title: article.title,
        description: article.description,
        content: article.content,
        source: source,
        url: article.url,
        image: article.urlToImage,
        publishedAt: article.publishedAt,
        authenticity_score: Number(authenticityScore.toFixed(2)),
        matched_type: relevanceCheck.matched_type || "Other",
        relevance_reason: relevanceCheck.reason,
      };
    });

    logger.info(`Search returned ${results.length} articles`, "search.service");

    return {
      success: true,
      message: `Found ${results.length} relevant articles`,
      query: query,
      matched_type: relevanceCheck.matched_type,
      results: results.slice(0, 10), // Limit to 10 results
    };
  } catch (err) {
    logger.error(`Search service error for query "${query}": ${err.message}`, "search.service");
    return {
      success: false,
      query: query,
      message: "Search failed",
      error: err.message,
      results: [],
    };
  }
};
