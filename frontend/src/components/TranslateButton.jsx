import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Globe, Undo2, ChevronDown, Loader2 } from 'lucide-react';
import {
  translateTexts,
  getPreferredLang,
  setPreferredLang,
  SUPPORTED_LANGUAGES,
} from '../services/translateService';

/**
 * TranslateButton — X/Twitter-style "Translate post" link.
 *
 * Props:
 *  - texts: { title?: string, description?: string }
 *  - onTranslated: (translated: { title?: string, description?: string }) => void
 *  - onShowOriginal: () => void
 *  - compact: boolean — smaller variant for feeds (default false)
 */
export default function TranslateButton({
  texts,
  onTranslated,
  onShowOriginal,
  compact = false,
}) {
  const [isTranslated, setIsTranslated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const [selectedLang, setSelectedLang] = useState(getPreferredLang);
  const [error, setError] = useState(null);
  const dropdownRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setLangOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Reset state when the source texts change (new event selected)
  useEffect(() => {
    setIsTranslated(false);
    setError(null);
  }, [texts?.title, texts?.description]);

  const langMeta =
    SUPPORTED_LANGUAGES.find((l) => l.code === selectedLang) ||
    SUPPORTED_LANGUAGES[0];

  const handleTranslate = useCallback(async () => {
    if (loading) return;

    const toTranslate = [];
    const keys = [];
    if (texts?.title) {
      toTranslate.push(texts.title);
      keys.push('title');
    }
    if (texts?.description) {
      toTranslate.push(texts.description);
      keys.push('description');
    }
    if (toTranslate.length === 0) return;

    setLoading(true);
    setError(null);

    try {
      const results = await translateTexts(toTranslate, selectedLang);
      const mapped = {};
      keys.forEach((key, i) => {
        mapped[key] = results[i] || toTranslate[i];
      });
      onTranslated(mapped);
      setIsTranslated(true);
    } catch (err) {
      console.error('Translation failed:', err);
      setError('Translation failed');
    } finally {
      setLoading(false);
    }
  }, [texts, selectedLang, loading, onTranslated]);

  const handleShowOriginal = useCallback(() => {
    setIsTranslated(false);
    onShowOriginal();
  }, [onShowOriginal]);

  const handleLangChange = useCallback(
    (code) => {
      setSelectedLang(code);
      setPreferredLang(code);
      setLangOpen(false);
      // If already translated, reset so user clicks translate again with new lang
      if (isTranslated) {
        setIsTranslated(false);
        onShowOriginal();
      }
    },
    [isTranslated, onShowOriginal],
  );

  const buttonBaseClass = compact
    ? 'flex items-center gap-1 text-[10px]'
    : 'flex items-center gap-1.5 text-xs';

  return (
    <div
      className="relative inline-flex items-center gap-1"
      ref={dropdownRef}
      onClick={(e) => e.stopPropagation()}
    >
      <AnimatePresence mode="wait">
        {isTranslated ? (
          /* ── Show Original ─────────────────────────── */
          <motion.button
            key="show-original"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            onClick={handleShowOriginal}
            className={`${buttonBaseClass} text-blue-400 hover:text-blue-300 transition-colors cursor-pointer`}
            data-testid="show-original-btn"
          >
            <Undo2 className={compact ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
            <span>Show original</span>
          </motion.button>
        ) : (
          /* ── Translate ─────────────────────────────── */
          <motion.button
            key="translate"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            onClick={handleTranslate}
            disabled={loading}
            className={`${buttonBaseClass} text-gray-400 hover:text-blue-400 transition-colors cursor-pointer disabled:opacity-50`}
            data-testid="translate-btn"
          >
            {loading ? (
              <Loader2
                className={`${compact ? 'w-3 h-3' : 'w-3.5 h-3.5'} animate-spin`}
              />
            ) : (
              <Globe className={compact ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
            )}
            <span>{loading ? 'Translating…' : 'Translate'}</span>
          </motion.button>
        )}
      </AnimatePresence>

      {/* ── Language Picker Toggle ─────────────────── */}
      {!isTranslated && (
        <button
          onClick={() => setLangOpen(!langOpen)}
          className={`${buttonBaseClass} text-gray-500 hover:text-gray-300 transition-colors px-1.5 py-0.5 rounded-md hover:bg-white/5 cursor-pointer`}
          data-testid="lang-picker-btn"
        >
          <span>{langMeta.flag}</span>
          <span className="uppercase font-mono">{selectedLang}</span>
          <ChevronDown
            className={`${compact ? 'w-2.5 h-2.5' : 'w-3 h-3'} transition-transform ${langOpen ? 'rotate-180' : ''}`}
          />
        </button>
      )}

      {/* ── Language Dropdown ─────────────────────── */}
      <AnimatePresence>
        {langOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute bottom-full left-0 mb-2 w-52 max-h-64 overflow-y-auto rounded-xl border border-white/10 bg-[#12131A]/95 backdrop-blur-xl shadow-2xl z-50"
            data-testid="lang-dropdown"
          >
            <div className="py-1">
              {SUPPORTED_LANGUAGES.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => handleLangChange(lang.code)}
                  className={`w-full text-left px-3 py-2 text-xs flex items-center gap-2.5 transition-colors cursor-pointer ${
                    lang.code === selectedLang
                      ? 'bg-blue-500/20 text-blue-300'
                      : 'text-gray-300 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <span className="text-sm">{lang.flag}</span>
                  <span className="flex-1">{lang.label}</span>
                  <span className="font-mono text-[10px] text-gray-500 uppercase">
                    {lang.code}
                  </span>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Error ─────────────────────────────────── */}
      {error && (
        <span className="text-[10px] text-red-400 ml-1">{error}</span>
      )}
    </div>
  );
}
