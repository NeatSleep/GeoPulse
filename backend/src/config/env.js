require("dotenv").config();

const requiredEnv = [
	"PORT",
	"NEWS_API_KEY",
	"OPENAI_API_KEY",
	"OPENAI_BASE_URL",
	"OPENAI_MODEL",
];

requiredEnv.forEach((key) => {
	if (!process.env[key]) {
		console.error(`❌ Missing required env variable: ${key}`);
		process.exit(1);
	}
});

module.exports = {
	PORT: process.env.PORT,
	NEWS_API_KEY: process.env.NEWS_API_KEY,

	LLM: {
		URL: process.env.OPENAI_BASE_URL,
		MODEL: process.env.OPENAI_MODEL,
		TIMEOUT: process.env.LLM_TIMEOUT || 30000,
	},

	CACHE: {
		MAX_EVENTS: parseInt(process.env.MAX_EVENTS) || 100,
	},
};
