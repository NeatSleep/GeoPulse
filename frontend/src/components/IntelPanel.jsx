import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ExternalLink, MapPin, Calendar, Shield, AlertTriangle, CheckCircle, AlertCircle, Zap } from 'lucide-react';
import { CATEGORY_COLORS } from '../services/api';
import { getAuthenticityLabel, getAuthenticityBadgeColor } from '../services/search';
import TranslateButton from './TranslateButton';

export default function IntelPanel({ event, isOpen, onClose, searchResults, onOpenAssistant }) {
  // ── Translation state (declared above any early returns) ──
  const [translatedFields, setTranslatedFields] = useState(null);

  const handleTranslated = useCallback((translated) => {
    setTranslatedFields(translated);
  }, []);

  const handleShowOriginal = useCallback(() => {
    setTranslatedFields(null);
  }, []);

  // Handle search results display
  if (searchResults && searchResults.success && searchResults.results && searchResults.results.length > 0) {
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
              className="fixed inset-0 bg-black/50 z-[60]"
              data-testid="intel-panel-backdrop"
            />

            {/* Search Results Panel */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="fixed right-0 top-0 h-full w-full md:w-[480px] z-[60] glass-panel overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
              data-testid="intel-panel"
            >
              <div className="p-6 space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-bold text-[var(--text-primary)]">Search Results</h2>
                    <p className="text-xs text-[var(--text-secondary)] mt-1">
                      {searchResults.query && `Query: "${searchResults.query}"`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {onOpenAssistant && (
                      <button
                        onClick={onOpenAssistant}
                        className="p-2 hover:bg-[var(--bg-elevated)] rounded-lg transition-colors"
                        title="Ask AI Assistant"
                      >
                        <Zap className="w-5 h-5 text-yellow-400" />
                      </button>
                    )}
                    <button
                      onClick={onClose}
                      className="p-2 hover:bg-[var(--bg-elevated)] rounded-lg transition-colors"
                      data-testid="intel-panel-close"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* Relevance Message */}
                {!searchResults.success && (
                  <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
                    <p className="text-sm text-red-400">{searchResults.message}</p>
                  </div>
                )}

                {/* Results List */}
                <div className="space-y-4">
                  {searchResults.results.map((article, idx) => (
                    <motion.div
                      key={article.id || idx}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.1 }}
                      className="p-4 border border-white/10 rounded-lg hover:border-white/20 transition-colors"
                    >
                      {/* Title */}
                      <h3 className="font-semibold text-[var(--text-primary)] mb-2 line-clamp-2 text-sm">
                        {article.title}
                      </h3>

                      {/* Authenticity Badge */}
                      <div className="flex items-center gap-2 mb-3">
                        {article.authenticity_score >= 0.65 ? (
                          <CheckCircle className="w-4 h-4 text-green-400" />
                        ) : (
                          <AlertCircle className="w-4 h-4 text-yellow-400" />
                        )}
                        <span className={`text-xs font-mono px-2 py-1 rounded ${article.authenticity_score >= 0.85 ? 'bg-green-500/20 text-green-300' :
                          article.authenticity_score >= 0.65 ? 'bg-yellow-500/20 text-yellow-300' :
                            'bg-red-500/20 text-red-300'
                          }`}>
                          {getAuthenticityLabel(article.authenticity_score)} ({(article.authenticity_score * 100).toFixed(0)}%)
                        </span>
                      </div>

                      {/* Description */}
                      <p className="text-xs text-[var(--text-secondary)] line-clamp-2 mb-3">
                        {article.description}
                      </p>

                      {/* Meta */}
                      <div className="flex items-center gap-3 text-xs text-[var(--text-muted)] mb-3 flex-wrap">
                        <span className="flex items-center gap-1">
                          <Shield className="w-3 h-3" /> {article.source}
                        </span>
                        {article.publishedAt && (
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" /> {new Date(article.publishedAt).toLocaleDateString()}
                          </span>
                        )}
                      </div>

                      {/* Read More Button */}
                      {article.url && (
                        <a
                          href={article.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 text-xs text-blue-400 hover:text-blue-300 transition-colors"
                        >
                          Read Full Article <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    );
  }

  // Fallback to regular event display
  if (!event) return null;

  const categoryColor = CATEGORY_COLORS[event.category] || '#3B82F6';

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
            className="fixed inset-0 bg-black/50 z-[60]"
            data-testid="intel-panel-backdrop"
          />

          {/* Panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed right-0 top-0 h-full w-full md:w-[480px] z-[60] glass-panel overflow-y-auto"
            onClick={(event) => event.stopPropagation()}
            data-testid="intel-panel"
          >
            <div className="p-6 space-y-6">
              {/* Header */}
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-3">
                    <span
                      className="text-[10px] uppercase tracking-[0.2em] font-mono px-2 py-1 rounded-sm"
                      style={{
                        backgroundColor: `${categoryColor}20`,
                        color: categoryColor,
                        border: `1px solid ${categoryColor}40`
                      }}
                      data-testid="event-category-badge"
                    >
                      {event.category}
                    </span>
                    <span
                      className="text-[10px] uppercase tracking-[0.2em] font-mono px-2 py-1 rounded-sm"
                      style={{
                        backgroundColor: 'rgba(255,255,255,0.05)',
                        color: 'var(--text-muted)',
                      }}
                    >
                      {event.type}
                    </span>
                    <span className="text-[10px] uppercase tracking-[0.2em] font-mono text-[var(--text-muted)]">
                      Severity: {event.severity}/5
                    </span>
                  </div>
                  <h2 className="text-2xl font-bold tracking-tight" data-testid="event-title">
                    {translatedFields?.title || event.title}
                  </h2>
                </div>
                <div className="flex items-center gap-2">
                  {onOpenAssistant && (
                    <button
                      onClick={onOpenAssistant}
                      className="glass-light p-2 rounded-md hover:bg-[var(--bg-elevated)] transition-colors"
                      title="Ask AI Assistant about this event"
                    >
                      <Zap className="w-5 h-5 text-yellow-400" />
                    </button>
                  )}
                  <button
                    onClick={onClose}
                    className="glass-light p-2 rounded-md hover:bg-[var(--bg-elevated)] transition-colors"
                    data-testid="intel-panel-close-btn"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Metadata */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-[var(--text-secondary)] text-xs">
                    <MapPin className="w-3 h-3" />
                    <span>Location</span>
                  </div>
                  <p className="text-sm font-medium" data-testid="event-location">{event.country}</p>
                  {event.coords && (
                    <p className="text-[10px] font-mono text-[var(--text-muted)]">
                      {event.coords[0].toFixed(1)}°, {event.coords[1].toFixed(1)}°
                    </p>
                  )}
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-[var(--text-secondary)] text-xs">
                    <Calendar className="w-3 h-3" />
                    <span>Published</span>
                  </div>
                  <p className="text-sm font-medium font-mono" data-testid="event-date">
                    {new Date(event.timestamp).toLocaleDateString()}
                  </p>
                  <p className="text-[10px] font-mono text-[var(--text-muted)]">
                    {new Date(event.timestamp).toLocaleTimeString()}
                  </p>
                </div>
              </div>

              {/* Confidence & Score */}
              <div className="grid grid-cols-2 gap-4">
                <div className="glass-light rounded-lg p-3 space-y-1">
                  <div className="flex items-center gap-2 text-[var(--text-secondary)] text-xs">
                    <Shield className="w-3 h-3" />
                    <span>Confidence</span>
                  </div>
                  <p className="text-lg font-mono font-bold" style={{ color: event.confidence >= 0.8 ? '#22C55E' : '#F59E0B' }}>
                    {Math.round((event.confidence || 0) * 100)}%
                  </p>
                </div>
                <div className="glass-light rounded-lg p-3 space-y-1">
                  <div className="flex items-center gap-2 text-[var(--text-secondary)] text-xs">
                    <AlertTriangle className="w-3 h-3" />
                    <span>Relevance Score</span>
                  </div>
                  <p className="text-lg font-mono font-bold" style={{ color: categoryColor }}>
                    {event.score?.toFixed(2) || '—'}
                  </p>
                </div>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <h3 className="text-xs uppercase tracking-widest font-mono text-[var(--text-secondary)]">Description</h3>
                <p className="text-sm leading-relaxed text-[var(--text-secondary)] break-words whitespace-pre-wrap" data-testid="event-description">
                  {translatedFields?.description || event.description}
                </p>
              </div>

              {/* Translate Button */}
              <div className="pt-1">
                <TranslateButton
                  texts={{ title: event.title, description: event.description }}
                  onTranslated={handleTranslated}
                  onShowOriginal={handleShowOriginal}
                />
              </div>

              {/* Sources */}
              {event.sources && event.sources.length > 0 && (
                <div className="pt-4 border-t border-[var(--border-default)] space-y-3">
                  <h3 className="text-xs uppercase tracking-widest font-mono text-[var(--text-secondary)]">Sources</h3>
                  {event.sources.map((src, idx) => (
                    <a
                      key={idx}
                      href={src.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm text-[var(--cat-political)] hover:underline"
                      data-testid={`event-source-link-${idx}`}
                    >
                      <ExternalLink className="w-3.5 h-3.5 flex-shrink-0" />
                      <span className="truncate">{src.name}</span>
                    </a>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}