import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, MapPin, AlertCircle, ExternalLink } from 'lucide-react';
import { CATEGORY_COLORS } from '../services/api';
import TranslateButton from './TranslateButton';

export default function LocationNewsModal({ isOpen, onClose, country, events }) {
  // Per-event translated fields: { [eventId]: { title?, description? } }
  const [translatedMap, setTranslatedMap] = useState({});

  const handleTranslated = useCallback((eventId, translated) => {
    setTranslatedMap((prev) => ({ ...prev, [eventId]: translated }));
  }, []);

  const handleShowOriginal = useCallback((eventId) => {
    setTranslatedMap((prev) => {
      const next = { ...prev };
      delete next[eventId];
      return next;
    });
  }, []);

  if (!country) return null;

  const countryName = typeof country === 'string' ? country : country?.name;
  const countryEvents = events.filter(e => e.country === countryName);
  const hasNews = countryEvents.length > 0;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            data-testid="location-news-backdrop"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed inset-x-4 top-1/2 -translate-y-1/2 max-w-2xl mx-auto z-50 glass-panel rounded-xl overflow-hidden max-h-[80vh] flex flex-col"
            data-testid="location-news-modal"
          >
            {/* Header */}
            <div className="p-6 border-b border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-white/5">
                  <MapPin className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white" data-testid="modal-country-name">
                    {typeof country === 'object' && country?.displayName ? country.displayName : countryName}
                  </h2>
                  <p className="text-sm text-gray-400">
                    {hasNews ? `${countryEvents.length} ${countryEvents.length === 1 ? 'event' : 'events'} found` : 'No news found'}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="glass-light p-2 rounded-lg hover:bg-white/10 transition-colors"
                data-testid="modal-close-btn"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Events List or Empty State */}
            <div className="overflow-y-auto flex-1 p-6" data-testid="events-list">
              {hasNews ? (
                <div className="space-y-4">
                  {countryEvents.map((event) => {
                    const categoryColor = CATEGORY_COLORS[event.category] || '#3B82F6';
                    const eventDate = new Date(event.published_at || event.timestamp);
                    const isRecent = (Date.now() - eventDate) / (1000 * 60 * 60) < 24;

                    return (
                      <motion.div
                        key={event.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="glass-light p-4 rounded-lg border border-white/5 hover:border-white/10 transition-all group cursor-pointer"
                        data-testid={`event-card-${event.id}`}
                      >
                        {/* Category & Severity */}
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex gap-2 items-center flex-wrap">
                            <span
                              className="text-xs px-2.5 py-1 rounded-sm font-mono uppercase tracking-wider"
                              style={{
                                backgroundColor: `${categoryColor}20`,
                                color: categoryColor,
                                border: `1px solid ${categoryColor}40`,
                              }}
                            >
                              {event.category}
                            </span>
                            {isRecent && (
                              <span className="text-xs px-2 py-1 rounded-sm font-mono uppercase tracking-wider bg-red-500/20 text-red-400 border border-red-500/40">
                                🔴 Live
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1 text-xs text-gray-400">
                            <AlertCircle className="w-3 h-3" />
                            <span>Level {event.severity || event.intensity || 3}/5</span>
                          </div>
                        </div>

                        {/* Title */}
                        <h3 className="font-semibold text-white mb-2 group-hover:text-blue-300 transition-colors line-clamp-2">
                          {translatedMap[event.id]?.title || event.title}
                        </h3>

                        {/* Description */}
                        {event.description && (
                          <p className="text-sm text-gray-300 mb-3 line-clamp-2">
                            {translatedMap[event.id]?.description || event.description}
                          </p>
                        )}

                        {/* Translate Button */}
                        <div className="mb-3">
                          <TranslateButton
                            compact
                            texts={{ title: event.title, description: event.description }}
                            onTranslated={(t) => handleTranslated(event.id, t)}
                            onShowOriginal={() => handleShowOriginal(event.id)}
                          />
                        </div>

                        {/* Meta */}
                        <div className="flex items-center justify-between text-xs text-gray-400 mb-3">
                          <span className="font-mono">
                            {eventDate.toLocaleDateString()} {eventDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          {event.confidence && (
                            <span className="px-2 py-1 bg-white/5 rounded-sm">
                              Confidence: {(event.confidence * 100).toFixed(0)}%
                            </span>
                          )}
                        </div>

                        {/* Sources */}
                        {event.sources && event.sources.length > 0 && (
                          <div className="flex items-center gap-2 flex-wrap">
                            {event.sources.slice(0, 2).map((source, idx) => (
                              <a
                                key={idx}
                                href={source.url || '#'}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 px-2 py-1 rounded-sm bg-blue-500/10 hover:bg-blue-500/20 transition-colors"
                              >
                                <ExternalLink className="w-2.5 h-2.5" />
                                {source.name || 'View'}
                              </a>
                            ))}
                            {event.sources.length > 2 && (
                              <span className="text-xs text-gray-400">+{event.sources.length - 2} more</span>
                            )}
                          </div>
                        )}
                      </motion.div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-64 text-center">
                  <div className="mb-4 p-4 rounded-lg bg-white/5">
                    <AlertCircle className="w-12 h-12 text-gray-500 mx-auto" />
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">No News Available</h3>
                  <p className="text-gray-400 max-w-sm">
                    There are currently no geopolitical events or news reports for {country}. Check back later for updates.
                  </p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-white/5 bg-white/[0.02] flex items-center justify-end gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-white transition-colors text-sm font-medium"
              >
                Close
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
