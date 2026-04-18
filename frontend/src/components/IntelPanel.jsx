import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ExternalLink, MapPin, Calendar, Shield, AlertTriangle } from 'lucide-react';
import { CATEGORY_COLORS } from '../services/api';

export default function IntelPanel({ event, isOpen, onClose }) {
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
            className="fixed inset-0 bg-black/50 z-40 md:hidden"
            data-testid="intel-panel-backdrop"
          />
          
          {/* Panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed right-0 top-0 h-full w-full md:w-[480px] z-50 glass-panel overflow-y-auto"
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
                    {event.title}
                  </h2>
                </div>
                <button
                  onClick={onClose}
                  className="glass-light p-2 rounded-md hover:bg-[var(--bg-elevated)] transition-colors"
                  data-testid="intel-panel-close-btn"
                >
                  <X className="w-5 h-5" />
                </button>
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
                  {event.description}
                </p>
              </div>
              <div className="space-y-2">
                <h3 className="text-xs uppercase tracking-widest font-mono text-[var(--text-secondary)]">Content</h3>
                <p className="text-sm leading-relaxed text-[var(--text-secondary)] break-words whitespace-pre-wrap" data-testid="event-content">
                  {event.content}
                </p>
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