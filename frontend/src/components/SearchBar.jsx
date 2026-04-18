import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Search, X } from 'lucide-react';
import { searchNews } from '../services/search';

export default function SearchBar({ onSearch, onSearchResults }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const debounceTimer = useRef(null);

  const handleSearch = async (e) => {
    if (e) e.preventDefault();
    
    // If query is just a simple filter (short), just filter locally
    if (query.length < 15) {
      onSearch(query);
      return;
    }

    // If query is longer, it's likely a search query - search for news
    setIsSearching(true);
    try {
      const results = await searchNews(query);
      if (onSearchResults) {
        // Add query to results for modal display
        onSearchResults({ ...results, query });
      }
      // Still update filter for local matches
      onSearch(query);
    } finally {
      setIsSearching(false);
    }
  };

  const handleInputChange = (e) => {
    const value = e.target.value;
    setQuery(value);

    // Clear previous debounce
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    // Short queries: filter locally immediately
    if (value.length < 15) {
      onSearch(value);
    } else {
      // Longer queries: debounce and search
      debounceTimer.current = setTimeout(() => {
        handleSearch();
      }, 1000);
    }
  };

  const handleClear = () => {
    setQuery('');
    onSearch('');
    if (onSearchResults) {
      onSearchResults(null);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      setIsExpanded(false);
      handleClear();
    } else if (e.key === 'Enter') {
      handleSearch(e);
    }
  };

  return (
    <div data-testid="search-bar">
      {!isExpanded ? (
        <button
          onClick={() => setIsExpanded(true)}
          className="glass-panel rounded-md p-2.5 hover:bg-[var(--bg-elevated)] transition-colors"
          data-testid="search-toggle-btn"
          title="Search for news or filter events"
        >
          <Search className="w-4 h-4" />
        </button>
      ) : (
        <motion.form
          initial={{ width: 40 }}
          animate={{ width: 280 }}
          onSubmit={handleSearch}
          className="glass-panel rounded-md px-3 py-2 flex items-center gap-2"
        >
          <Search className="w-3.5 h-3.5 text-[var(--text-secondary)] flex-shrink-0" />
          <input
            type="text"
            value={query}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="Find news or filter events..."
            className="flex-1 bg-transparent border-none outline-none text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] min-w-0"
            autoFocus
            data-testid="search-input"
          />
          {isSearching && (
            <div className="w-3.5 h-3.5 rounded-full border-2 border-[var(--cat-policy)] border-t-transparent animate-spin" />
          )}
          {query && !isSearching && (
            <button type="button" onClick={handleClear} className="p-0.5 hover:bg-[var(--bg-elevated)] rounded" data-testid="search-clear-btn">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </motion.form>
      )}
    </div>
  );
}
