const logger = require("../../utils/logger");
const { queryLLMWithTools } = require("../../config/llm");
const newsApiFetcher = require("../news/sources/newsapi/fetcher");

// Define available tools for the LLM
const ASSISTANT_TOOLS = [
  {
    type: "function",
    function: {
      name: "fetch_news",
      description: "Fetch latest news articles for a given query from trusted sources",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "The search query for news (geopolitical topics only)"
          },
          limit: {
            type: "number",
            description: "Number of articles to fetch (default: 5, max: 10)"
          }
        },
        required: ["query"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "check_relevance",
      description: "Check if a query is relevant to geopolitical events",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "The query to check for geopolitical relevance"
          }
        },
        required: ["query"]
      }
    }
  }
];

// Tool implementation functions
const toolImplementations = {
  fetch_news: async (params) => {
    try {
      const { query, limit = 5 } = params;
      logger.info(`Fetching news for query: "${query}"`, "assistant.service");
      
      const articles = await newsApiFetcher.fetchNewsWithSearch(query);
      
      if (!articles || articles.length === 0) {
        return {
          success: false,
          message: "No articles found",
          articles: []
        };
      }

      const slicedArticles = articles.slice(0, Math.min(limit, 10));
      
      return {
        success: true,
        count: slicedArticles.length,
        articles: slicedArticles.map((article, idx) => ({
          id: idx,
          title: article.title,
          description: article.description,
          source: article.source?.name || "Unknown",
          url: article.url,
          publishedAt: article.publishedAt,
          image: article.urlToImage
        }))
      };
    } catch (err) {
      logger.error(`fetch_news error: ${err.message}`, "assistant.service");
      return {
        success: false,
        error: err.message
      };
    }
  },

  check_relevance: async (params) => {
    try {
      const { query } = params;
      logger.info(`Checking relevance for: "${query}"`, "assistant.service");

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

      const BLACKLISTED = [
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
      ];

      const lowerQuery = query.toLowerCase();

      // Check blacklist
      for (const topic of BLACKLISTED) {
        if (lowerQuery.includes(topic)) {
          return {
            is_relevant: false,
            reason: `Query contains non-geopolitical topic: "${topic}"`,
            suggestion: "Try searching for conflicts, diplomacy, sanctions, or other geopolitical events"
          };
        }
      }

      // Check allowlist
      for (const type of ALLOWED_TYPES) {
        if (lowerQuery.includes(type)) {
          return {
            is_relevant: true,
            reason: `Query is about ${type}`,
            matched_type: type
          };
        }
      }

      return {
        is_relevant: true,
        reason: "Query appears geopolitically relevant",
        matched_type: null
      };
    } catch (err) {
      logger.error(`check_relevance error: ${err.message}`, "assistant.service");
      return {
        is_relevant: false,
        error: err.message
      };
    }
  }
};

/**
 * Chat with assistant - uses LLM with tool calling
 */
exports.assistantChat = async (userMessage, conversationHistory = []) => {
  try {
    logger.info(`Assistant chat: "${userMessage}"`, "assistant.service");

    // IMPORTANT: First check relevance before anything else
    const relevanceResult = await toolImplementations.check_relevance({ query: userMessage });
    
    if (!relevanceResult.is_relevant) {
      logger.warn(`Query rejected as non-geopolitical: "${userMessage}"`, "assistant.service");
      return {
        success: false,
        message: "❌ This topic is not related to geopolitical events. Please search for:\n\n• Armed conflicts and wars\n• Diplomatic negotiations\n• Sanctions and trade disputes\n• Political elections and government changes\n• Humanitarian crises\n• Terrorism and security threats\n• Cyber attacks\n• Natural disasters\n• Migration and refugee issues\n\n📍 Examples: 'Iran nuclear diplomacy', 'Ukraine war updates', 'Middle East tensions'",
        tool_calls: []
      };
    }

    // Build system prompt for geopolitical assistant
    const systemPrompt = `You are an expert Geopolitical Intelligence Assistant. Your role is to:
1. Answer questions about global conflicts, diplomacy, politics, and international relations
2. Provide insights on current events and geopolitical trends
3. Help users find relevant news articles using the fetch_news tool
4. Always validate that queries are geopolitically relevant

You have access to real-time news data via the fetch_news tool. When a user asks about a geopolitical topic:
- First acknowledge their query
- Use fetch_news to get the latest articles
- Provide a brief analysis with direct links to the articles
- cite sources when relevant

IMPORTANT: Only discuss geopolitical, political, diplomatic, conflict-related, and international affairs topics.
For non-geopolitical topics, politely decline and said this is not relavent to our topic search something related which is geopolitically relevant.`;

    // Build messages for LLM
    const messages = [
      { role: "system", content: systemPrompt },
      ...conversationHistory,
      { role: "user", content: userMessage }
    ];

    // Call LLM with tools
    const response = await queryLLMWithTools(messages, ASSISTANT_TOOLS);

    logger.info(`LLM response received, processing...`, "assistant.service");

    // Process response and handle tool calls
    const toolCalls = response.tool_calls || [];
    const assistantContent = response.content || "";

    let toolResults = [];

    // Execute tools if needed
    if (toolCalls.length > 0) {
      for (const toolCall of toolCalls) {
        const toolName = toolCall.function.name;
        const toolParams = JSON.parse(toolCall.function.arguments);

        logger.info(`Executing tool: ${toolName}`, "assistant.service");

        if (toolImplementations[toolName]) {
          const result = await toolImplementations[toolName](toolParams);
          toolResults.push({
            tool_name: toolName,
            tool_params: toolParams,
            tool_result: result
          });
        }
      }
    }

    return {
      success: true,
      message: assistantContent,
      tool_calls: toolResults,
      stop_reason: response.stop_reason || "end_turn"
    };
  } catch (err) {
    logger.error(`Assistant chat error: ${err.message}`, "assistant.service");
    return {
      success: false,
      error: err.message,
      message: "Sorry, I encountered an error processing your request."
    };
  }
};

exports.ASSISTANT_TOOLS = ASSISTANT_TOOLS;
