/**
 * translateService.js
 *
 * Thin client that calls the GeoPulse backend /api/translate proxy,
 * which in turn calls the Microsoft Translator API via RapidAPI.
 *
 * Preferred language is persisted in localStorage so it survives
 * page refreshes — just like X / Twitter's "Translate tweet" UX.
 */

const BASE_URL = "http://localhost:5000/api";
const PREF_LANG_KEY = "geopulse_preferred_lang";

// ── Supported languages ──────────────────────────────────────────────────────
// Microsoft Translator language codes: https://learn.microsoft.com/en-us/azure/cognitive-services/translator/language-support
export const SUPPORTED_LANGUAGES = [
  { code: "es", label: "Spanish",    flag: "🇪🇸" },
  { code: "fr", label: "French",     flag: "🇫🇷" },
  { code: "de", label: "German",     flag: "🇩🇪" },
  { code: "zh", label: "Chinese",    flag: "🇨🇳" },
  { code: "ar", label: "Arabic",     flag: "🇸🇦" },
  { code: "ru", label: "Russian",    flag: "🇷🇺" },
  { code: "ja", label: "Japanese",   flag: "🇯🇵" },
  { code: "pt", label: "Portuguese", flag: "🇵🇹" },
  { code: "hi", label: "Hindi",      flag: "🇮🇳" },
  { code: "ko", label: "Korean",     flag: "🇰🇷" },
  { code: "it", label: "Italian",    flag: "🇮🇹" },
  { code: "tr", label: "Turkish",    flag: "🇹🇷" },
  { code: "uk", label: "Ukrainian",  flag: "🇺🇦" },
  { code: "fa", label: "Persian",    flag: "🇮🇷" },
  { code: "id", label: "Indonesian", flag: "🇮🇩" },
  { code: "nl", label: "Dutch",      flag: "🇳🇱" },
  { code: "pl", label: "Polish",     flag: "🇵🇱" },
  { code: "sv", label: "Swedish",    flag: "🇸🇪" },
  { code: "vi", label: "Vietnamese", flag: "🇻🇳" },
  { code: "th", label: "Thai",       flag: "🇹🇭" },
];

// ── Preferred language helpers ───────────────────────────────────────────────
export function getPreferredLang() {
  try {
    return localStorage.getItem(PREF_LANG_KEY) || "es";
  } catch {
    return "es";
  }
}

export function setPreferredLang(code) {
  try {
    localStorage.setItem(PREF_LANG_KEY, code);
  } catch {
    // ignore (private browsing, storage full, etc.)
  }
}

// ── Core translate function ──────────────────────────────────────────────────
/**
 * Translate an array of strings to the target language.
 *
 * @param {string[]} texts   - Array of source strings
 * @param {string}   to      - Target language code (e.g. "es")
 * @param {string}   [from]  - Source language code (default "en")
 * @returns {Promise<string[]>} - Translated strings in same order
 */
export async function translateTexts(texts, to, from = "en") {
  if (!texts || texts.length === 0) return [];

  const response = await fetch(`${BASE_URL}/translate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ texts, to, from }),
  });

  if (!response.ok) {
    let message = `Translation request failed (${response.status})`;
    try {
      const err = await response.json();
      if (err.error) message = err.error;
    } catch { /* ignore */ }
    throw new Error(message);
  }

  const data = await response.json();

  if (!data.success || !Array.isArray(data.translations)) {
    throw new Error(data.error || "Unexpected translation response");
  }

  return data.translations;
}
