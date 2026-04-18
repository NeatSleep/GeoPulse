import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, AlertTriangle } from 'lucide-react';

export default function SearchRejectionModal({ isOpen, onClose, query, reason, recommendation }) {
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
            className="fixed inset-0 bg-black/60 z-[70] backdrop-blur-sm"
            data-testid="rejection-modal-backdrop"
          />

          {/* Modal */}
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[70] w-full max-w-md mx-4"
            onClick={(e) => e.stopPropagation()}
            data-testid="search-rejection-modal"
          >
            <div className="glass-panel rounded-xl p-6 space-y-4 border border-red-500/30 bg-red-500/5">
              {/* Header */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 flex-1">
                  <div className="p-2 bg-red-500/20 rounded-lg mt-1">
                    <AlertTriangle className="w-5 h-5 text-red-400" />
                  </div>
                  <div className="flex-1">
                    <h2 className="text-lg font-bold text-[var(--text-primary)]">Search Not Applicable</h2>
                    <p className="text-xs text-[var(--text-secondary)] mt-1">
                      {query && `Query: "${query}"`}
                    </p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="p-1.5 hover:bg-white/10 rounded-lg transition-colors flex-shrink-0"
                  data-testid="rejection-modal-close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Reason Section */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide">
                  Reason
                </label>
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                  <p className="text-sm text-red-300 leading-relaxed">
                    {reason}
                  </p>
                </div>
              </div>

              {/* Recommendation Section */}
              {recommendation && (
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide">
                    What You Can Search For
                  </label>
                  <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                    <p className="text-sm text-blue-300 leading-relaxed">
                      {recommendation}
                    </p>
                  </div>
                </div>
              )}

              {/* Close Button */}
              <button
                onClick={onClose}
                className="w-full py-2 px-4 bg-white/10 hover:bg-white/20 text-white rounded-lg font-medium transition-colors text-sm mt-6"
              >
                Got It
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
