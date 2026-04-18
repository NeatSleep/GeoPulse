const logger = require("../../utils/logger");
const { queryLLM } = require("../../config/llm");

// ---------- EXPANDED EVENT TYPES ----------
const ALLOWED_TYPES = [
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

// ---------- MAJOR EVENT DETECTOR ----------
const isMajorEvent = (title = "") => {
	const keywords = [
		// Conflict & geopolitics
		"war", "blockade", "nuclear", "sanction", "military", "attack", 
		"strike", "ceasefire", "troops", "missile", "invasion", "crisis", 
		"coup", "bomb", "killed", "dead", "explosion", "shoot", "terror",
		"rebellion",
		
		// Major globally impactful terms
		"economy", "market", "breaking", "emergency", "disaster", "earthquake", 
		"pandemic", "election", "scandal", "breakthrough", "historic", "global",
		"mass-death", "policy", "legislation", "reform", "law", "government"
	];

	const lower = title.toLowerCase();
	return keywords.some((k) => lower.includes(k));
};

// ---------- PROMPT ----------
const buildPrompt = (articles) => {
	const formatted = articles
		.map((a, i) => {
			return `ARTICLE ${i}:
TITLE: ${a.title}
DESCRIPTION: ${a.description}`;
		})
		.join("\n\n");

	return `You are a global intelligence and major world news classifier. Your job is to categorize important geopolitical news with SPECIFIC event types.

Categories and SPECIFIC event types (always use one of these):
- ARMED CONFLICT: war, attack, airstrike, battle, conflict, military, bombing, shelling, invasion, siege, insurgency, ambush, hostage, clash, rebellion
- TERRORISM & SECURITY: assassination, espionage, cyberattack, hacking, surveillance, operation, terror
- POLITICS: policy, legislation, reform, law, election, coup, protest, uprising, riot, crackdown, referendum, regime change, strike, government, politics
- DIPLOMACY: diplomacy, negotiation, summit, treaty, alliance, tension, threat, crisis
- SANCTIONS & TRADE: sanction, embargo, blockade, tariff, tradewar, armsdeal
- HUMANITARIAN: humanitarian, refugee, displacement, famine, evacuation, disaster, pandemic, environment, mass-death
- ECONOMIC: economy, business, trade, economic

Be HIGHLY INCLUSIVE of any major news involving the world and people.

Return EXACTLY ${articles.length} JSON objects in an array (same order as input).

Each object:
{
  "relevant": true/false,
  "event_type": "string (MUST be from the list above - e.g. war, attack, diplomacy, sanction, economy, etc.)",
  "country": "string (The physical country WHERE the event took place, or Global)",
  "coordinates": "[latitude, longitude] array of numbers (The exact geographical [lat, lng] coordinates. Extremely important! Use city center if exact location unknown. Use null only if purely digital/global)",
  "severity": 1-5,
  "confidence": 0.0-1.0
}

Rules:
- Return ONLY the JSON array, no explanation
- Do not skip any article
- Do not reorder articles  
- CRITICAL: event_type MUST be one of the specific types listed above
- If it is pure consumer tech, gossip, or literal sports scores → { "relevant": false }
- Default to "relevant": true for almost any real news article. Be highly permissive.

Articles:
${formatted}`;
};

// ---------- JSON EXTRACTION ----------
const extractJSON = (text) => {
	try {
		const match = text.match(/\[[\s\S]*\]/);
		if (!match) return null;
		return JSON.parse(match[0]);
	} catch {
		return null;
	}
};

const normalizeEventType = (type) =>
	type.toLowerCase().replace(/[\s_-]+/g, "");

const cleanCountry = (country) => {
	if (!country) return "Global";

	const cleaned = country.split(/[;,]/)[0].trim();
	return cleaned || "Global";
};

// ---------- MAIN ----------
exports.llmFilter = async (articles = []) => {
	logger.info("Running LLM filter...", "news.llmFilter");

	const BATCH_SIZE = 5;
	const results = [];

	for (let i = 0; i < articles.length; i += BATCH_SIZE) {
		const batch = articles.slice(i, i + BATCH_SIZE);

		try {
			const prompt = buildPrompt(batch);

			let raw = await queryLLM(prompt);
			let parsed = extractJSON(raw);

			if (!parsed) {
				raw = await queryLLM(prompt);
				parsed = extractJSON(raw);
			}

			if (!parsed || !Array.isArray(parsed)) {
				throw new Error("Invalid LLM response");
			}

			batch.forEach((original, idx) => {
				const item = parsed[idx];

				if (!item || !item.relevant || !item.event_type) {
					return;
				}

				// Lower threshold: only skip non-major events with very low confidence
				if (!isMajorEvent(original.title) && item.confidence < 0.35) {
					return;
				}

				const type = normalizeEventType(item.event_type);

				// Accept the event even if type isn't in our list — use LLM's type as-is
				const finalType = ALLOWED_TYPES.includes(type) ? type : type;

				results.push({
					event_type: finalType,
					country: cleanCountry(item.country),
					coordinates: Array.isArray(item.coordinates) && item.coordinates.length === 2 && typeof item.coordinates[0] === "number" ? item.coordinates : null,
					severity: Math.min(Math.max(item.severity || 2, 1), 5),
					confidence: Math.min(
						Math.max(item.confidence || 0.6, 0),
						1,
					),

					title: original.title,
					description: original.description,
					content: original.content || "",
					source: original.source,
					url: original.url,
					timestamp: new Date(original.publishedAt).toISOString(),
				});
			});
		} catch (err) {
			logger.error("LLM batch failed", "news.llmFilter");
		}
	}

	logger.info(
		`LLM processed ${articles.length} → ${results.length}`,
		"news.llmFilter",
	);

	return results;
};
