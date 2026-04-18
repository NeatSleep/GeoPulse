import React, { useEffect, useState, useCallback, useMemo, lazy, Suspense } from 'react';
import { fetchGeopoliticsData } from '../services/api';
import { searchNews } from '../services/search';
import MapView from '../components/MapView';
import GlobalCounters from '../components/GlobalCounters';
import CategoryFilters from '../components/CategoryFilters';
import SearchBar from '../components/SearchBar';
import IntelPanel from '../components/IntelPanel';
import EventFeed from '../components/EventFeed';
import TimelineSlider from '../components/TimelineSlider';
import CountryIntelPanel from '../components/CountryIntelPanel';
import LocationNewsModal from '../components/LocationNewsModal';
import ChatBot from '../components/ChatBot';
import NewEventToast from '../components/NewEventToast';
import EventGraph from '../components/EventGraph';
import SimulationPanel from '../components/SimulationPanel';
import FinanceCorrelation from '../components/FinanceCorrelation';
import SearchRejectionModal from '../components/SearchRejectionModal';
import IntelAssistant from '../components/IntelAssistant';
import useWebSocket from '../hooks/useWebSocket';
import { Map, Globe as GlobeIcon, GitBranch, Zap, Clock } from 'lucide-react';

const GlobeView = lazy(() => import('../components/GlobeView'));

export default function Dashboard() {
  const [markers, setMarkers] = useState([]);
  const [events, setEvents] = useState([]);
  const [stats, setStats] = useState({
    total_events: 0, active_countries: 0, by_category: {}, recent_count: 0
  });
  const [activeCategory, setActiveCategory] = useState('all');
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [isSearchLoading, setIsSearchLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [timelineDate, setTimelineDate] = useState(null);
  const [viewMode, setViewMode] = useState('2d');
  const [selectedCountry, setSelectedCountry] = useState(null);
  const [isCountryPanelOpen, setIsCountryPanelOpen] = useState(false);
  const [newEventToast, setNewEventToast] = useState(null);
  const [isGraphOpen, setIsGraphOpen] = useState(false);
  const [isSimulationOpen, setIsSimulationOpen] = useState(false);
  const [selectedCountryForNews, setSelectedCountryForNews] = useState(null);
  const [isLocationNewsModalOpen, setIsLocationNewsModalOpen] = useState(false);
  const [isTimelineOpen, setIsTimelineOpen] = useState(false);
  const [rejectionModal, setRejectionModal] = useState({ isOpen: false, query: '', reason: '', recommendation: '' });
  const [isAssistantOpen, setIsAssistantOpen] = useState(false);

  // WebSocket
  const handleNewEvent = useCallback((eventData) => {
    if (eventData) {
      setNewEventToast(eventData);
      setMarkers(prev => {
        if (prev.some(m => m.id === eventData.id)) return prev;
        return [eventData, ...prev];
      });
    }
  }, []);

  const handleStatsUpdate = useCallback((statsData) => {
    if (statsData?.total_events) {
      setStats(prev => ({ ...prev, total_events: statsData.total_events }));
    }
  }, []);

  const { isConnected } = useWebSocket({ onNewEvent: handleNewEvent, onStatsUpdate: handleStatsUpdate });

  // Data fetching
  const fetchData = useCallback(async () => {
    try {
      const data = await fetchGeopoliticsData();
      setMarkers(data.markers);
      setEvents(data.events);
      setStats(data.stats);
    } catch (e) { console.error('Fetch error:', e); }
  }, []);

  useEffect(() => {
    const init = async () => {
      try { await fetchData(); }
      catch (e) { console.error('Init error:', e); }
      setLoading(false);
    };
    init();
    const interval = setInterval(() => { fetchData(); }, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // Filtering
  const filteredMarkers = useMemo(() => {
    let result = markers;
    if (activeCategory !== 'all') result = result.filter(e => e.category === activeCategory);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(e => e.title.toLowerCase().includes(q) || e.country.toLowerCase().includes(q));
    }
    if (timelineDate) {
      const td = new Date(timelineDate);
      result = result.filter(e => new Date(e.published_at).toDateString() === td.toDateString());
    }
    return result;
  }, [markers, activeCategory, searchQuery, timelineDate]);

  const filteredEvents = useMemo(() => {
    let result = events;
    if (activeCategory !== 'all') result = result.filter(e => e.category === activeCategory);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(e => e.title.toLowerCase().includes(q) || e.description.toLowerCase().includes(q) || e.country.toLowerCase().includes(q));
    }
    if (timelineDate) {
      const td = new Date(timelineDate);
      result = result.filter(e => new Date(e.published_at).toDateString() === td.toDateString());
    }
    return result;
  }, [events, activeCategory, searchQuery, timelineDate]);

  // Handlers
  const handleEventClick = useCallback((event) => {
    setIsCountryPanelOpen(false);
    setSelectedEvent(event);
    setIsPanelOpen(true);
  }, []);

  const handleCountryClick = useCallback((countryData) => {
    setIsPanelOpen(false);
    setSelectedCountry(typeof countryData === 'string' ? { name: countryData, lat: null, lng: null } : countryData);
    setIsCountryPanelOpen(true);
  }, []);

  const handleGlobeCountryClick = useCallback((countryData) => {
    setSelectedCountryForNews(typeof countryData === 'string' ? { name: countryData, lat: null, lng: null } : countryData);
    setIsLocationNewsModalOpen(true);
  }, []);

  const handleSearchResults = useCallback((results) => {
    if (!results) return;
    
    // Check if search was rejected
    if (!results.success) {
      setRejectionModal({
        isOpen: true,
        query: results.query || '',
        reason: results.reason || results.message || 'This search is not applicable to our database.',
        recommendation: results.recommendation || 'Try searching for geopolitical conflicts, diplomacy, sanctions, or other topics related to global affairs.'
      });
      return;
    }
    
    // Search was successful, display results
    setSearchResults(results);
    setIsPanelOpen(true);
  }, []);

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-[var(--bg-base)]" data-testid="loading-screen">
        <div className="text-center space-y-4">
          <div className="relative w-16 h-16 mx-auto">
            <div className="absolute inset-0 border-4 border-[var(--cat-political)] border-t-transparent rounded-full animate-spin"></div>
            <div className="absolute inset-2 border-4 border-[var(--cat-war)] border-b-transparent rounded-full animate-spin" style={{ animationDirection: 'reverse', animationDuration: '0.8s' }}></div>
          </div>
          <p className="text-[var(--text-secondary)] font-mono text-sm tracking-widest uppercase">Initializing Global Tracker AI</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-screen w-screen overflow-hidden" data-testid="dashboard">
      {/* Map / Globe Layer (Background) */}
      <div className="absolute inset-0 z-0">
        {viewMode === '2d' ? (
          <MapView events={filteredMarkers} onEventClick={handleEventClick} onCountryClick={handleCountryClick} selectedEvent={selectedEvent} />
        ) : (
          <Suspense fallback={<div className="absolute inset-0 bg-[var(--bg-base)]" />}>
            <GlobeView events={filteredMarkers} onEventClick={handleEventClick} onCountryClick={handleGlobeCountryClick} selectedEvent={selectedEvent} />
          </Suspense>
        )}
      </div>

      {/* UI Overlay Layer */}
      <div className="absolute inset-0 z-20 pointer-events-none" />

      {/* Top: Global Counters */}
      <div className="fixed top-4 left-4 z-40 pointer-events-auto">
        <GlobalCounters stats={stats} isConnected={isConnected} />
      </div>

      {/* Left: Category Filters */}
      <div className="fixed left-4 top-24 z-40 pointer-events-auto">
        <CategoryFilters activeCategory={activeCategory} onCategoryChange={setActiveCategory} stats={stats} />
      </div>

      {/* Right Column Controls: Search & Toggles */}
      <div className="fixed top-4 right-4 z-40 flex flex-col items-end gap-4 pointer-events-auto" data-testid="controls-column">
        {/* View Toggle */}
        <div className="flex gap-2 glass-panel rounded-lg p-2 shadow-lg border border-white/10" data-testid="view-toggle" title="Toggle between 2D Map and 3D Globe">
          <button
            onClick={() => setViewMode('2d')}
            className={`px-4 py-2 rounded-md transition-all font-medium flex items-center gap-2 ${viewMode === '2d' ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/50' : 'text-white/60 hover:text-white/90 bg-white/5'}`}
            data-testid="view-2d-btn"
            title="2D Map View"
          >
            <Map className="w-5 h-5" />
            <span className="hidden sm:inline text-xs">2D</span>
          </button>
          <button
            onClick={() => setViewMode('3d')}
            className={`px-4 py-2 rounded-md transition-all font-medium flex items-center gap-2 ${viewMode === '3d' ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/50' : 'text-white/60 hover:text-white/90 bg-white/5'}`}
            data-testid="view-3d-btn"
            title="3D Globe View"
          >
            <GlobeIcon className="w-5 h-5" />
            <span className="hidden sm:inline text-xs">3D</span>
          </button>
        </div>

        {/* Search */}
        <SearchBar onSearch={setSearchQuery} onSearchResults={handleSearchResults} />
      </div>

      {/* Right: Finance Correlation */}
      <div className="fixed top-32 right-4 z-40 pointer-events-auto">
        <FinanceCorrelation />
      </div>

      {/* Bottom Left: Event Feed */}
      <div className="fixed bottom-24 left-6 z-40 pointer-events-auto">
        <EventFeed events={filteredEvents} onEventClick={handleEventClick} onCountryClick={handleCountryClick} />
      </div>

      {/* Modals - Individually wrapped to only block clicks when open */}
      {isPanelOpen && (
        <div className="fixed inset-0 z-[100] pointer-events-auto">
          <IntelPanel event={selectedEvent} isOpen={isPanelOpen} onClose={() => setIsPanelOpen(false)} />
      {/* Regular Event Panel OR Search Results */}
      {(isPanelOpen || searchResults?.success) && (
        <div className="fixed inset-0 z-50 pointer-events-auto">
          <IntelPanel 
            event={selectedEvent} 
            isOpen={isPanelOpen || searchResults?.success} 
            onClose={() => {
              setIsPanelOpen(false);
              setSearchResults(null);
            }}
            searchResults={searchResults}
            onOpenAssistant={() => setIsAssistantOpen(true)}
          />
        </div>
      )}
      {isCountryPanelOpen && (
        <div className="fixed inset-0 z-50 pointer-events-auto">
          <CountryIntelPanel country={selectedCountry} isOpen={isCountryPanelOpen} onClose={() => setIsCountryPanelOpen(false)} allEvents={events} />
        </div>
      )}
      {isLocationNewsModalOpen && (
        <div className="fixed inset-0 z-50 pointer-events-auto">
          <LocationNewsModal country={selectedCountryForNews} isOpen={isLocationNewsModalOpen} onClose={() => setIsLocationNewsModalOpen(false)} events={events} />
        </div>
      )}
      {isGraphOpen && (
        <div className="fixed inset-0 z-50 pointer-events-auto">
          <EventGraph isOpen={isGraphOpen} onClose={() => setIsGraphOpen(false)} allEvents={events} onNodeClick={handleEventClick} />
        </div>
      )}
      {isSimulationOpen && (
        <div className="fixed inset-0 z-50 pointer-events-auto">
          <SimulationPanel isOpen={isSimulationOpen} onClose={() => setIsSimulationOpen(false)} />
        </div>
      )}

      {/* Search Rejection Modal */}
      <SearchRejectionModal
        isOpen={rejectionModal.isOpen}
        onClose={() => setRejectionModal({ ...rejectionModal, isOpen: false })}
        query={rejectionModal.query}
        reason={rejectionModal.reason}
        recommendation={rejectionModal.recommendation}
      />

      {/* Timeline Modal */}
      {isTimelineOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end justify-center pointer-events-auto" onClick={() => setIsTimelineOpen(false)}>
          <div className="w-full max-w-2xl bg-[var(--bg-base)] border-t border-white/10 rounded-t-2xl p-6 pb-8 pointer-events-auto" onClick={(e) => e.stopPropagation()}>
            <div className="text-center mb-4">
              <h2 className="text-[14px] uppercase tracking-[0.15em] font-mono text-[var(--text-secondary)] mb-1">Filter by Date</h2>
              <p className="text-[12px] font-mono text-[var(--text-muted)]">Select a date to view events from that day</p>
            </div>
            <TimelineSlider events={events} onTimelineChange={(date) => { setTimelineDate(date); setIsTimelineOpen(false); }} activeDate={timelineDate} />
            <div className="text-center mt-6">
              <button
                onClick={() => setIsTimelineOpen(false)}
                className="text-[10px] font-mono text-[var(--text-secondary)] hover:text-white transition-colors px-4 py-2 rounded hover:bg-white/5"
              >
                ✕ Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Event Toast */}
      {newEventToast && (
        <NewEventToast event={newEventToast} onDismiss={() => setNewEventToast(null)} onClick={handleEventClick} />
      )}

      {/* AI Chatbot */}
      <ChatBot />

      {/* Intel Assistant */}
      <IntelAssistant isOpen={isAssistantOpen} onClose={() => setIsAssistantOpen(false)} />

      {/* Status Indicator */}
      <div className="fixed bottom-6 right-4 z-40 flex gap-2 pointer-events-auto" data-testid="control-bar">
        {/* Graph Button */}
        <button
          onClick={() => setIsGraphOpen(true)}
          className="glass-panel rounded-md px-3 py-2 flex items-center gap-1.5 hover:bg-[var(--bg-elevated)] transition-colors"
          data-testid="graph-btn"
          title="Event Graph Analysis"
        >
          <GitBranch className="w-4 h-4 text-[var(--cat-political)]" />
          <span className="text-[10px] font-mono text-[var(--text-secondary)] hidden lg:block">Graph</span>
        </button>

        {/* Simulation Button */}
        <button
          onClick={() => setIsSimulationOpen(true)}
          className="glass-panel rounded-md px-3 py-2 flex items-center gap-1.5 hover:bg-[var(--bg-elevated)] transition-colors"
          data-testid="simulation-btn"
          title="Simulate Scenario"
        >
          <Zap className="w-4 h-4 text-[var(--cat-economic)]" />
          <span className="text-[10px] font-mono text-[var(--text-secondary)] hidden lg:block">Simulate</span>
        </button>

        {/* Timeline Button */}
        <button
          onClick={() => setIsTimelineOpen(true)}
          className="glass-panel rounded-md px-3 py-2 flex items-center gap-1.5 hover:bg-[var(--bg-elevated)] transition-colors"
          data-testid="timeline-btn"
          title="View Timeline"
        >
          <Clock className="w-4 h-4 text-[var(--cat-policy)]" />
          <span className="text-[10px] font-mono text-[var(--text-secondary)] hidden lg:block">Timeline</span>
        </button>

        {/* Status Separator */}
        <div className="w-px bg-white/10" />

        {/* Status Indicator */}
        <div className="glass-panel rounded-md px-4 py-2 flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-[var(--cat-policy)] animate-pulse-glow' : 'bg-[var(--cat-war)]'}`} />
          <span className="text-xs font-mono text-[var(--text-secondary)]">
            {filteredMarkers.length} events {isConnected ? '(Live)' : '(Offline)'}
          </span>
        </div>
      </div>
    </div>
  );
}
