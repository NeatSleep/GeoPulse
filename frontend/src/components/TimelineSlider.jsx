import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Clock, RotateCcw } from 'lucide-react';

export default function TimelineSlider({ events, onTimelineChange, activeDate }) {
  const [hoveredDate, setHoveredDate] = useState(null);

  // Get unique dates from events
  const dateRange = useMemo(() => {
    if (!events || !Array.isArray(events) || events.length === 0) {
      console.warn('[TimelineSlider] No events provided:', events);
      return { dates: [], min: null, max: null };
    }
    
    const dates = new Set();
    events.forEach(e => {
      try {
        // Try multiple date field names
        const dateStr = e.published_at || e.date || e.timestamp || new Date().toISOString();
        const d = new Date(dateStr);

        // Check if date is valid
        if (!isNaN(d.getTime())) {
          dates.add(d.toISOString().split('T')[0]);
        }
      } catch (err) {
        console.warn('[TimelineSlider] Error parsing date:', err);
      }
    });
    
    const sortedDates = Array.from(dates).sort();
    console.log('[TimelineSlider] Extracted', sortedDates.length, 'unique dates from', events.length, 'events');
    if (sortedDates.length > 0) {
      console.log('[TimelineSlider] Date range:', sortedDates[0], 'to', sortedDates[sortedDates.length - 1]);
    }

    return {
      dates: sortedDates,
      min: sortedDates[0],
      max: sortedDates[sortedDates.length - 1]
    };
  }, [events]);

  const handleSliderChange = (e) => {
    const idx = parseInt(e.target.value);
    if (idx >= 0 && idx < dateRange.dates.length) {
      const date = dateRange.dates[idx];
      onTimelineChange(date);
      setHoveredDate(date);
    }
  };

  const handleReset = () => {
    onTimelineChange(null);
    setHoveredDate(null);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  const currentIdx = activeDate ? dateRange.dates.indexOf(activeDate) : dateRange.dates.length - 1;

  if (dateRange.dates.length === 0) {
    return (
      <div className="w-full max-w-[600px] mx-auto px-6 py-4">
        <p className="text-[12px] font-mono text-[var(--text-secondary)] text-center">
          No events available to display timeline
        </p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full px-6 py-6"
      data-testid="timeline-slider"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Clock className="w-3 h-3 text-[var(--text-secondary)]" />
          <span className="text-[10px] uppercase tracking-[0.2em] font-mono text-[var(--text-secondary)]">
            Timeline
          </span>
        </div>
        <div className="flex items-center gap-3">
          {activeDate && (
            <button
              onClick={handleReset}
              className="flex items-center gap-1 text-[10px] font-mono text-[var(--cat-political)] hover:text-white transition-colors"
              data-testid="timeline-reset-btn"
            >
              <RotateCcw className="w-3 h-3" />
              Reset
            </button>
          )}
          <span className="text-sm font-mono font-medium text-white" data-testid="timeline-active-date">
            {formatDate(hoveredDate || activeDate || dateRange.max)}
          </span>
        </div>
      </div>
      
      {/* Slider or Message */}
      <div className="relative py-4">
        {dateRange.dates.length === 1 ? (
          <div className="text-center py-6 px-4 rounded-lg bg-white/5 border border-white/10">
            <p className="text-[12px] font-mono text-[var(--text-muted)] mb-2">All events are from:</p>
            <p className="text-[14px] font-mono font-bold text-white mb-3">{formatDate(dateRange.dates[0])}</p>
            <p className="text-[10px] font-mono text-[var(--text-secondary)]">
              ({dateRange.dates.length === 1 ? dateRange.dates.length + ' unique date available' : dateRange.dates.length + ' unique dates available'})
            </p>
          </div>
        ) : (
          <>
            <input
              type="range"
              min={0}
              max={dateRange.dates.length - 1}
              value={currentIdx >= 0 ? currentIdx : dateRange.dates.length - 1}
              onChange={handleSliderChange}
                className="timeline-range w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[var(--cat-policy)]"
                data-testid="timeline-range-input"
                style={{
                  background: `linear-gradient(to right, var(--cat-policy) 0%, var(--cat-policy) ${dateRange.dates.length > 1 ? (currentIdx / (dateRange.dates.length - 1)) * 100 : 100}%, rgba(255,255,255,0.1) ${dateRange.dates.length > 1 ? (currentIdx / (dateRange.dates.length - 1)) * 100 : 100}%, rgba(255,255,255,0.1) 100%)`
                }}
              />
              <div className="flex justify-between mt-3">
                <span className="text-[10px] font-mono text-[var(--text-muted)]">{formatDate(dateRange.min)}</span>
                <span className="text-[10px] font-mono text-[var(--text-muted)]">{formatDate(dateRange.max)}</span>
              </div>
          </>
        )}
      </div>
    </motion.div>
  );
}
