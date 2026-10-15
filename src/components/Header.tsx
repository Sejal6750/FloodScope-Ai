import React, { useState, useEffect, useRef } from 'react';
import { AnalysisAssessment, GeoLocation } from '../types/index.ts';

interface HeaderProps {
  currentPath: string;
  activeAnalysis: AnalysisAssessment;
  analyses: AnalysisAssessment[];
  selectedLocation: GeoLocation | null;
  onSelectAnalysis: (id: string) => void;
  onSelectLocation: (location: GeoLocation) => void;
  onNavigate: (path: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentPath,
  activeAnalysis,
  analyses,
  selectedLocation,
  onSelectAnalysis,
  onSelectLocation,
  onNavigate
}) => {
  const [utcTime, setUtcTime] = useState<string>('');
  const [dropdownOpen, setDropdownOpen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchResults, setSearchResults] = useState<GeoLocation[]>([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'locations' | 'assessments'>('locations');
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const hours = String(now.getUTCHours()).padStart(2, '0');
      const minutes = String(now.getUTCMinutes()).padStart(2, '0');
      const seconds = String(now.getUTCSeconds()).padStart(2, '0');
      setUtcTime(`UTC ${hours}:${minutes}:${seconds}`);
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    if (dropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [dropdownOpen]);

  // Fetch initial top locations or search results on query change
  useEffect(() => {
    if (!dropdownOpen) return;

    let isMounted = true;
    setIsSearching(true);

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/geocode?q=${encodeURIComponent(searchQuery)}`);
        if (res.ok && isMounted) {
          const data: GeoLocation[] = await res.json();
          setSearchResults(data);
        }
      } catch (err) {
        console.warn('Geocoding search error:', err);
      } finally {
        if (isMounted) setIsSearching(false);
      }
    }, searchQuery ? 250 : 0);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [searchQuery, dropdownOpen]);

  const pathTitles: Record<string, string> = {
    overview: 'Overview',
    'new-analysis': 'New Analysis',
    'flood-map-explorer': 'Explorer',
    'flood-map': 'Explorer',
    'infrastructure-impact': 'Infrastructure',
    'infrastructure': 'Infrastructure',
    'settlement-accessibility': 'Accessibility',
    'settlement': 'Accessibility',
    'ai-situation-copilot': 'Copilot',
    'copilot': 'Copilot',
    'situation-reports': 'Reports',
    'reports': 'Reports',
    'data-and-methodology': 'Methodology',
    'methodology': 'Methodology',
    settings: 'Settings',
    history: 'Registry'
  };

  const isDemo = activeAnalysis.dataMode === 'DEMO_SYNTHETIC';

  return (
    <header className="fixed top-0 left-[260px] right-0 h-14 bg-white/95 backdrop-blur-md z-40 flex items-center justify-between px-4 shadow-xs border-b border-slate-200">
      {/* Left Breadcrumb & Analysis Selector */}
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex items-center gap-1.5 text-xs text-slate-500 shrink-0 font-medium">
          <span 
            onClick={() => onNavigate('overview')}
            className="hover:text-slate-900 transition-colors cursor-pointer"
          >
            FloodScope AI
          </span>
          <span className="text-slate-300">/</span>
          <span 
            onClick={() => onNavigate('flood-map-explorer')}
            className="hover:text-slate-900 transition-colors cursor-pointer truncate max-w-[140px] sm:max-w-none"
          >
            {selectedLocation ? selectedLocation.name : activeAnalysis.aoiName}
          </span>
          <span className="text-slate-300">/</span>
          <span className="text-amber-800 font-bold">{pathTitles[currentPath] || 'Workspace'}</span>
        </div>

        {/* Dropdown Selector */}
        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200 text-slate-800 text-xs cursor-pointer hover:bg-slate-100 transition-colors max-w-[240px] sm:max-w-[320px] font-semibold"
            title="Click to search India locations or select assessment"
          >
            <span className="material-symbols-outlined text-sm text-amber-700 shrink-0">location_on</span>
            <span className="truncate">
              {selectedLocation ? selectedLocation.name : activeAnalysis.name}
            </span>
            <span className="material-symbols-outlined text-sm text-slate-400 shrink-0">arrow_drop_down</span>
          </button>

          {dropdownOpen && (
            <div className="absolute top-full left-0 mt-1.5 w-84 sm:w-96 bg-white rounded-xl shadow-xl p-2 z-50 border border-slate-200 flex flex-col gap-2">
              {/* Tabs: Location Search vs Saved Assessments */}
              <div className="flex items-center gap-1 p-0.5 bg-slate-100 rounded-lg">
                <button
                  type="button"
                  onClick={() => setActiveTab('locations')}
                  className={`flex-1 py-1 text-[11px] font-bold rounded-md transition-all cursor-pointer flex items-center justify-center gap-1 ${
                    activeTab === 'locations'
                      ? 'bg-white text-amber-900 shadow-xs border border-amber-200/60'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <span className="material-symbols-outlined text-xs text-amber-700">travel_explore</span>
                  <span>India Locations</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('assessments')}
                  className={`flex-1 py-1 text-[11px] font-bold rounded-md transition-all cursor-pointer flex items-center justify-center gap-1 ${
                    activeTab === 'assessments'
                      ? 'bg-white text-amber-900 shadow-xs border border-amber-200/60'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <span className="material-symbols-outlined text-xs text-amber-700">folder_open</span>
                  <span>Assessments ({analyses.length})</span>
                </button>
              </div>

              {activeTab === 'locations' ? (
                <>
                  {/* Location Search Input */}
                  <div className="relative flex items-center">
                    <span className="material-symbols-outlined absolute left-2.5 text-slate-400 text-sm">search</span>
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search city, district, state or coords..."
                      className="w-full pl-8 pr-7 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:border-amber-500 focus:bg-white transition-all font-medium"
                      autoFocus
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => setSearchQuery('')}
                        className="absolute right-2 text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-xs">close</span>
                      </button>
                    )}
                  </div>

                  {/* Search Results / Suggestion List */}
                  <div className="max-h-60 overflow-y-auto flex flex-col gap-1 pr-0.5">
                    {isSearching ? (
                      <div className="py-6 flex flex-col items-center justify-center gap-2 text-slate-400">
                        <span className="material-symbols-outlined animate-spin text-base text-amber-600">progress_activity</span>
                        <span className="text-[11px]">Searching India geographic index...</span>
                      </div>
                    ) : searchResults.length > 0 ? (
                      searchResults.map((loc) => {
                        const isSelected = selectedLocation?.id === loc.id;
                        return (
                          <button
                            key={loc.id}
                            type="button"
                            onClick={() => {
                              onSelectLocation(loc);
                              setDropdownOpen(false);
                            }}
                            className={`flex flex-col text-left p-2 rounded-lg transition-colors cursor-pointer border ${
                              isSelected
                                ? 'bg-amber-50 text-amber-900 border-amber-400 font-semibold'
                                : 'hover:bg-amber-50/50 text-slate-700 border-transparent hover:border-slate-100'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-1">
                              <div className="flex items-center gap-1.5 min-w-0">
                                <span className="material-symbols-outlined text-xs text-amber-600 shrink-0">location_on</span>
                                <span className="text-xs font-bold text-slate-900 truncate">{loc.name}</span>
                              </div>
                              <div className="flex items-center gap-1 shrink-0">
                                {loc.hasAnalysis ? (
                                  <span className="text-[9px] px-1.5 py-0.2 rounded font-bold uppercase bg-emerald-100 text-emerald-800 border border-emerald-300">
                                    ANALYSIS READY
                                  </span>
                                ) : (
                                  <span className="text-[9px] px-1.5 py-0.2 rounded font-medium text-slate-500 bg-slate-100">
                                    NEW AOI
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center justify-between text-[10px] text-slate-500 mt-1 pl-4.5">
                              <span className="truncate max-w-[210px]">
                                {loc.district ? `${loc.district}, ` : ''}{loc.state || 'India'}
                              </span>
                              <span className="font-mono text-[9px] text-slate-400 shrink-0">
                                {loc.lat.toFixed(2)}°N, {loc.lon.toFixed(2)}°E
                              </span>
                            </div>
                          </button>
                        );
                      })
                    ) : (
                      <div className="py-6 text-center text-xs text-slate-400">
                        No locations found matching &quot;{searchQuery}&quot;.
                        <div className="text-[10px] text-slate-400 mt-1">Try city name, district, or &quot;lat, lon&quot; coords</div>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                /* Saved Assessments Tab */
                <div className="max-h-60 overflow-y-auto flex flex-col gap-1 pr-0.5">
                  <div className="px-1 text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                    Historical & Demo Assessments
                  </div>
                  {analyses.map((a) => (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => {
                        onSelectAnalysis(a.id);
                        setDropdownOpen(false);
                      }}
                      className={`flex flex-col text-left p-2 rounded-lg transition-colors cursor-pointer border ${
                        a.id === activeAnalysis.id && !selectedLocation
                          ? 'bg-amber-50 text-amber-900 border-l-2 border-amber-600' 
                          : 'hover:bg-slate-50 text-slate-700 border-transparent'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold truncate">{a.name}</span>
                        <span className={`text-[9px] px-1.5 py-0.2 rounded font-bold uppercase ${
                          a.dataMode === 'LIVE' ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-amber-100 text-amber-800 border border-amber-300'
                        }`}>
                          {a.dataMode === 'LIVE' ? 'LIVE' : 'DEMO'}
                        </span>
                      </div>
                      <span className="text-slate-500 text-[10px] mt-0.5">
                        {a.metrics.floodExtentKm2} km² • {a.metrics.exposedRoadKm} km road cut
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {/* Bottom Quick Action: Create New Analysis Job */}
              <div className="pt-1.5 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setDropdownOpen(false);
                    onNavigate('new-analysis');
                  }}
                  className="w-full flex items-center justify-center gap-1.5 p-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold text-xs transition-colors cursor-pointer border border-amber-200"
                >
                  <span className="material-symbols-outlined text-sm font-bold">add</span>
                  <span>
                    {selectedLocation ? `Create New Analysis for ${selectedLocation.name}` : 'Create New Analysis Job'}
                  </span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Sensor Mode Tag */}
        <div className="hidden xl:flex items-center gap-1 px-2 py-0.5 rounded bg-slate-100 text-slate-600 text-xs shrink-0 font-medium">
          <span className="material-symbols-outlined text-xs text-amber-700">radar</span>
          <span>SAR IW GRDH</span>
        </div>
      </div>

      {/* Center Demo Header Disclaimer Banner */}
      <div className="hidden 2xl:flex items-center px-3 py-1 rounded bg-amber-50 border border-amber-200 text-amber-800 text-[11px] font-medium mx-2">
        <span className="truncate max-w-[460px]">
          {isDemo 
            ? 'DEMO MODE — Sample Observations & Synthetic Inferences for UI/UX Evaluation — Not for Live Emergency Dispatch'
            : 'LIVE MONITORING — Verified Geospatial Satellite Feed & OSM Topology Ingestion Active'}
        </span>
      </div>

      {/* Right Telemetry Clocks & Actions */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="flex items-center gap-1 text-xs text-slate-600 font-mono">
          <span className="material-symbols-outlined text-sm text-slate-400">schedule</span>
          <span>{utcTime || 'UTC 14:38:22'}</span>
        </div>

        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 animate-pulse"></span>
          <span>SAR Pipeline: Ready</span>
        </div>

        <div 
          onClick={() => onNavigate('settings')}
          className="relative flex items-center justify-center p-1.5 rounded hover:bg-slate-100 text-slate-600 hover:text-slate-900 cursor-pointer transition-colors"
          title="System Notifications"
        >
          <span className="material-symbols-outlined text-lg">notifications</span>
          <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-amber-500 ring-2 ring-white"></span>
        </div>

        <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-xs ring-1 ring-amber-300">
          OP
        </div>
      </div>
    </header>
  );
};
