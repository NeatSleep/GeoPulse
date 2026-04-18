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
			const OpenAI = require("openai").default || require("openai");

			const apiKey = process.env.OPENAI_API_KEY ||
				process.env.OPENROUTER_API_KEY ||
				process.env.GROQ_API_KEY;

			const baseURL = process.env.OPENAI_BASE_URL ||
				"https://api.openai.com/v1";

			if (!apiKey) {
				initError = new Error(
					"No LLM API key configured. Set OPENAI_API_KEY, OPENROUTER_API_KEY, or GROQ_API_KEY in .env"
				);
				throw initError;
			}

			client = new OpenAI({
				apiKey: apiKey,
				baseURL: baseURL,
				defaultHeaders: {
					'HTTP-Referer': 'https://geopolitical-dashboard.local',
					'X-OpenRouter-Title': 'World Monitor - Geopolitical Intelligence',
				},
			});

			logger.info(`✓ LLM initialized (${baseURL})`, "llm.js");
		} catch (err) {
			if (err.code === 'MODULE_NOT_FOUND') {
				logger.warn("⚠️  openai SDK not installed. Run: npm install openai", "llm.js");
				initError = new Error("OpenAI SDK not installed. Run: npm install openai");
			} else {
				initError = err;
			}
			logger.error(`LLM init failed: ${initError.message}`, "llm.js");
			throw initError;
		}
	}
	return client;
};

exports.queryLLM = async (prompt, options = {}) => {
	try {
		logger.info(`LLM request initiated`, "llm.js");
		const client = getClient();
		const model = process.env.OPENAI_MODEL || config.LLM.MODEL || "gpt-4";
		const temperature = options.temperature ?? 0.7;

		console.log("LLM Request Params:", {
			model,
			baseURL: process.env.OPENAI_BASE_URL,
			temperature,
			promptLength: prompt.length,
		});

		const response = await client.chat.completions.create({
			model: model,
			messages: [{ role: "user", content: prompt }],
			temperature,
			max_tokens: options.maxTokens || 2048,
		});

		const content = response.choices[0]?.message?.content || "";
		logger.info(`LLM response received (${content.length} chars)`, "llm.js");
		console.log("Response snippet:", content.substring(0, 200));
		return content;
	} catch (err) {
		logger.error(`LLM request failed: ${err.message}`, "llm");
		console.error("LLM Error Details:", {
			message: err.message,
			status: err.status,
			error: err.error,
		});
		throw err;
	}
};

exports.queryLLMStructured = async (prompt, schema, options = {}) => {
	try {
		logger.info(`LLM structured request initiated`, "llm.js");
		const client = getClient();
		const model = process.env.OPENAI_MODEL || config.LLM.MODEL || "gpt-4";
		const temperature = options.temperature ?? 0.2;

		// Ensure prompt mentions JSON for LLM clarity
		const enhancedPrompt = prompt.includes("json")
			? prompt
			: `Respond in valid JSON format. ${prompt}`;

		try {
			// Try with JSON mode first (only supported by some models)
			const response = await client.chat.completions.create({
				model: model,
				messages: [{ role: "user", content: enhancedPrompt }],
				temperature,
				max_tokens: options.maxTokens || 2048,
				response_format: { type: "json_object" },
			});

			console.log("Raw LLM Response:", {
				choices: response.choices?.length,
				content: response.choices?.[0]?.message?.content?.substring(0, 100),
			});

			const content = response.choices[0]?.message?.content || "{}";
			try {
				return JSON.parse(content);
			} catch (parseErr) {
				logger.warn(`Failed to parse JSON response: ${parseErr.message}`, "llm");
				return JSON.parse(content.match(/\{[\s\S]*\}/)?.[0] || "{}");
			}
		} catch (jsonModeError) {
			// If JSON mode not supported, retry without it
			if (jsonModeError.message?.includes("does not support") || jsonModeError.status === 400) {
				logger.warn("JSON mode not supported by model, retrying without it", "llm");

				const response = await client.chat.completions.create({
					model: model,
					messages: [{ role: "user", content: enhancedPrompt }],
					temperature,
					max_tokens: options.maxTokens || 2048,
					// No response_format specified
				});

				const content = response.choices[0]?.message?.content || "{}";
				try {
					return JSON.parse(content);
				} catch (parseErr) {
					logger.warn(`Failed to parse JSON response without JSON mode: ${parseErr.message}`, "llm");
					return JSON.parse(content.match(/\{[\s\S]*\}/)?.[0] || "{}");
				}
			} else {
				throw jsonModeError;
			}
		}
	} catch (err) {
		logger.error(`LLM structured request failed: ${err.message}`, "llm");
		console.error("LLM Error Details:", {
			message: err.message,
			status: err.status,
			error: err.error,
		});
		throw err;
	}
};
