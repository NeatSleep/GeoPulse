const express = require("express");
const router = express.Router();
const logger = require("../utils/logger");

/**
 * POST /api/translate
 *
 * Body: { texts: string[], to: string, from?: string }
 *
 * Proxies the Microsoft Translator API (RapidAPI) so the API key
 * stays server-side. Batches texts using the "|" separator and
 * the /largetranslate endpoint.
 *
 * Returns: { success: true, translations: string[] }
 */
router.post("/translate", async (req, res) => {
	const { texts, to, from = "en" } = req.body;

	// ── Validation ──────────────────────────────────────────
	if (!texts || !Array.isArray(texts) || texts.length === 0) {
		return res.status(400).json({
			success: false,
			error: "texts must be a non-empty array of strings",
		});
	}
	if (!to || typeof to !== "string") {
		return res.status(400).json({
			success: false,
			error: "to (target language code) is required",
		});
	}

	const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;
	const MS_TRANSLATOR_HOST = "microsoft-translator-text-api3.p.rapidapi.com";

	if (!RAPIDAPI_KEY) {
		logger.error("RAPIDAPI_KEY not configured", "translate");
		return res.status(500).json({
			success: false,
			error: "Translation service not configured",
		});
	}

	try {
		logger.info(
			`Translating ${texts.length} text(s) → ${to}`,
			"translate",
		);

		// Microsoft Translator: join texts with " | " separator
		// The API splits on " | " and returns results in the same order
		const joined = texts.join(" | ");

		const url = new URL(
			`https://${MS_TRANSLATOR_HOST}/largetranslate`,
		);
		url.searchParams.set("to", to);
		url.searchParams.set("from", from);

		const response = await fetch(url.toString(), {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"x-rapidapi-host": MS_TRANSLATOR_HOST,
				"x-rapidapi-key": RAPIDAPI_KEY,
			},
			body: JSON.stringify({
				sep: "|",
				text: joined,
			}),
		});

		if (!response.ok) {
			const errorText = await response.text();
			logger.error(
				`Microsoft Translator error ${response.status}: ${errorText}`,
				"translate",
			);
			return res.status(502).json({
				success: false,
				error: "Translation API returned an error",
			});
		}

		const data = await response.json();

		// Microsoft largetranslate returns:
		// { translation: "translated text | another | ..." }
		// or may be a plain string
		let translatedText = "";
		if (typeof data?.translation === "string") {
			translatedText = data.translation;
		} else if (typeof data === "string") {
			translatedText = data;
		} else if (Array.isArray(data) && data[0]?.translations?.[0]?.text) {
			// Standard MS Translator array format fallback
			translatedText = data.map((d) => d.translations[0].text).join(" | ");
		} else {
			// Last-resort: stringify and return originals
			logger.warn(
				`Unexpected MS Translator response shape: ${JSON.stringify(data)}`,
				"translate",
			);
			return res.json({ success: true, translations: texts });
		}

		// Split back on the separator (trim each segment)
		const segments = translatedText
			.split("|")
			.map((s) => s.trim());

		// Pad to match input length if the API collapsed duplicates
		while (segments.length < texts.length) {
			segments.push(texts[segments.length]);
		}
		// Trim to input length in case extra splits occurred
		const translations = segments.slice(0, texts.length);

		logger.info(
			`Translation complete (${translations.length} segments)`,
			"translate",
		);

		res.json({ success: true, translations });
	} catch (err) {
		logger.error(`Translation failed: ${err.message}`, "translate");
		res.status(500).json({
			success: false,
			error: "Translation failed",
			details:
				process.env.NODE_ENV === "development" ? err.message : undefined,
		});
	}
});

module.exports = router;
