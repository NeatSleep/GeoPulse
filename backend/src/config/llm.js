const config = require("./env.js");
const logger = require("../utils/logger.js");

let client;
let initError = null;

const getClient = () => {
	if (initError) {
		throw initError;
	}

	if (!client) {
		try {
			if (process.env.GROQ_API_KEY) {
				// Using Groq
				try {
					const Groq = require("groq-sdk");
					client = new Groq({
						apiKey: process.env.GROQ_API_KEY,
					});
					logger.info("✓ Groq LLM initialized", "llm.js");
				} catch (e) {
					if (e.code === 'MODULE_NOT_FOUND') {
						logger.warn("⚠️  groq-sdk not installed. Run: npm install groq-sdk", "llm.js");
						initError = new Error("Groq SDK not installed. Run: npm install groq-sdk");
					} else {
						initError = e;
					}
					throw initError;
				}
			} else if (process.env.ANTHROPIC_API_KEY) {
				// Using Anthropic/Claude
				try {
					const Anthropic = require("@anthropic-ai/sdk").default;
					client = new Anthropic({
						apiKey: process.env.ANTHROPIC_API_KEY,
					});
					logger.info("✓ Anthropic Claude LLM initialized", "llm.js");
				} catch (e) {
					if (e.code === 'MODULE_NOT_FOUND') {
						logger.warn("⚠️  @anthropic-ai/sdk not installed. Run: npm install @anthropic-ai/sdk", "llm.js");
						initError = new Error("Anthropic SDK not installed. Run: npm install @anthropic-ai/sdk");
					} else {
						initError = e;
					}
					throw initError;
				}
			} else {
				initError = new Error("No LLM API key configured. Set GROQ_API_KEY or ANTHROPIC_API_KEY in .env");
				throw initError;
			}
		} catch (err) {
			logger.error(`LLM init failed: ${err.message}`, "llm.js");
			throw err;
		}
	}
	return client;
};

exports.queryLLM = async (prompt, options = {}) => {
	try {
		logger.info(`LLM request initiated`, "llm.js");
		const client = getClient();
		const model = config.LLM.MODEL || "gpt-4";
		const temperature = options.temperature ?? 0.7;

		let response;
		if (process.env.GROQ_API_KEY) {
			// Groq API
			response = await client.chat.completions.create({
				model: model,
				messages: [{ role: "user", content: prompt }],
				temperature,
				max_tokens: options.maxTokens || 2048,
			});
			return response.choices[0]?.message?.content || "";
		} else {
			// Anthropic API
			response = await client.messages.create({
				model: model,
				max_tokens: options.maxTokens || 2048,
				messages: [{ role: "user", content: prompt }],
				temperature,
			});
			return response.content[0]?.text || "";
		}
	} catch (err) {
		logger.error(`LLM request failed: ${err.message}`, "llm");
		throw err;
	}
};

exports.queryLLMStructured = async (prompt, schema, options = {}) => {
	try {
		logger.info(`LLM structured request initiated`, "llm.js");
		const client = getClient();
		const model = config.LLM.MODEL || "gpt-4";
		const temperature = options.temperature ?? 0.2;

		// Groq requires the word "json" in the prompt when using response_format
		const enhancedPrompt = prompt.includes("json")
			? prompt
			: `Respond in valid JSON format. ${prompt}`;

		let response;
		if (process.env.GROQ_API_KEY) {
			// Groq with JSON mode
			response = await client.chat.completions.create({
				model: model,
				messages: [{ role: "user", content: enhancedPrompt }],
				temperature,
				max_tokens: options.maxTokens || 2048,
				response_format: { type: "json_object" },
			});
			const content = response.choices[0]?.message?.content || "{}";
			return JSON.parse(content);
		} else {
			// Anthropic with structured output
			response = await client.messages.create({
				model: model,
				max_tokens: options.maxTokens || 2048,
				messages: [{ role: "user", content: enhancedPrompt }],
				temperature,
			});
			const content = response.content[0]?.text || "{}";
			return JSON.parse(content);
		}
	} catch (err) {
		logger.error(`LLM structured request failed: ${err.message}`, "llm");
		throw err;
	}
};
