import React, { useState } from 'react';
import { AnalysisAssessment, DataMode } from '../types/index.ts';
import { SyntheticBanner } from './SyntheticBanner.tsx';

interface AnalysisHistoryViewProps {
  analyses: AnalysisAssessment[];
  activeAnalysis: AnalysisAssessment;
  onSelectAnalysis: (analysis: AnalysisAssessment) => void;
  onNavigate: (path: string) => void;
}

export const AnalysisHistoryView: React.FC<AnalysisHistoryViewProps> = ({
  analyses,
  activeAnalysis,
  onSelectAnalysis,
  onNavigate
}) => {
  const [filterMode, setFilterMode] = useState<DataMode | 'ALL'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  const filteredAnalyses = analyses.filter((a) => {
    const matchesMode = filterMode === 'ALL' || a.dataMode === filterMode;
    const matchesSearch = !searchTerm || a.name.toLowerCase().includes(searchTerm.toLowerCase()) || a.id.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesMode && matchesSearch;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Banner */}
      <SyntheticBanner dataMode={activeAnalysis.dataMode} analysisName={activeAnalysis.name} />

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-surface-container border border-surface-variant/40 rounded-xl p-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-2xl">history</span>
            <h1 className="text-xl font-bold text-slate-100">Satellite Analysis Registry & Runs</h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Audit history of all executed SAR change detection jobs, benchmark pilots, and synthetic testbeds.
          </p>
        </div>

        <button
          onClick={() => onNavigate('new-analysis')}
          className="px-4 py-2 bg-primary hover:bg-primary/90 text-surface font-semibold text-xs rounded-lg flex items-center gap-1.5 shadow-md shadow-primary/20 transition-all"
        >
          <span className="material-symbols-outlined text-sm">add_circle</span>
          Launch New Pipeline Run
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-surface-container/60 p-4 rounded-xl border border-surface-variant/40">
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 font-mono">Filter by Provenance:</span>
          <div className="flex bg-surface-container-high rounded p-0.5 border border-surface-variant/40 text-xs font-mono">
            {(['ALL', 'LIVE', 'SAMPLE_DATA', 'DEMO_SYNTHETIC'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setFilterMode(mode)}
                className={`px-3 py-1 rounded transition-colors ${
                  filterMode === mode ? 'bg-primary text-surface font-bold' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {mode === 'DEMO_SYNTHETIC' ? 'Synthetic' : mode === 'SAMPLE_DATA' ? 'Calibrated Sample' : mode === 'LIVE' ? 'Live Sat' : 'All Runs'}
              </button>
            ))}
          </div>
        </div>

        <div className="relative">
          <span className="material-symbols-outlined absolute left-2.5 top-2 text-slate-500 text-sm">search</span>
          <input
            type="text"
            placeholder="Search run ID or region..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8 pr-3 py-1.5 bg-surface-container-high border border-surface-variant/60 rounded text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-primary font-mono w-64"
          />
        </div>
      </div>

      {/* Analysis Runs Cards / Table */}
      <div className="grid grid-cols-1 gap-4">
        {filteredAnalyses.map((item) => {
          const isActive = item.id === activeAnalysis.id;
          const isSynthetic = item.dataMode === 'DEMO_SYNTHETIC';
          const isSample = item.dataMode === 'SAMPLE_DATA';

          return (
            <div
              key={item.id}
              className={`p-5 rounded-xl border transition-all ${
                isActive
                  ? 'bg-surface-container border-primary shadow-lg shadow-primary/5'
                  : 'bg-surface-container/70 border-surface-variant/40 hover:border-slate-600'
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <h3 className="font-bold text-slate-100 text-base">{item.name}</h3>
                    {isActive && (
                      <span className="px-2 py-0.5 bg-primary/20 text-primary border border-primary/40 rounded text-[10px] font-mono font-bold">
                        ACTIVE IN DASHBOARD
                      </span>
                    )}
                    <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                      isSynthetic
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        : isSample
                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                        : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    }`}>
                      {item.dataMode}
                    </span>
                    <span className="px-2 py-0.5 bg-surface-container-high text-slate-400 rounded text-[10px] font-mono">
                      {item.validationStatus}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-slate-400 mt-1">
                    <span>ID: <strong className="text-slate-300">{item.id}</strong></span>
                    <span>•</span>
                    <span>Radar Baseline: <strong className="text-slate-300">{item.baselineDate} → {item.postEventDate}</strong></span>
                    <span>•</span>
                    <span>Sensor: <strong className="text-slate-300">{item.provenance?.sources?.[0]?.name || 'Sentinel-1 C-SAR'}</strong></span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <a
                    href={`/api/export/${item.id}/geojson`}
                    download
                    className="px-3 py-1.5 bg-surface-variant hover:bg-slate-700 text-slate-300 text-xs font-mono rounded border border-slate-700 flex items-center gap-1 transition-colors"
                  >
                    <span className="material-symbols-outlined text-xs">download</span>
                    GeoJSON
                  </a>
                  <a
                    href={`/api/export/${item.id}/csv`}
                    download
                    className="px-3 py-1.5 bg-surface-variant hover:bg-slate-700 text-slate-300 text-xs font-mono rounded border border-slate-700 flex items-center gap-1 transition-colors"
                  >
                    <span className="material-symbols-outlined text-xs">table_chart</span>
                    CSV
                  </a>
                  {!isActive ? (
                    <button
                      onClick={() => {
                        onSelectAnalysis(item);
                        onNavigate('overview');
                      }}
                      className="px-4 py-1.5 bg-primary hover:bg-primary/90 text-surface text-xs font-bold rounded flex items-center gap-1.5 transition-all"
                    >
                      <span className="material-symbols-outlined text-xs">play_arrow</span>
                      Load Active
                    </button>
                  ) : (
                    <button
                      onClick={() => onNavigate('overview')}
                      className="px-4 py-1.5 bg-slate-700 hover:bg-slate-600 text-white text-xs font-medium rounded flex items-center gap-1.5 transition-all"
                    >
                      <span className="material-symbols-outlined text-xs">visibility</span>
                      View Overview
                    </button>
                  )}
                </div>
              </div>

              {/* Metrics Row */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 pt-4 border-t border-surface-variant/30 text-xs font-mono">
                <div className="bg-surface-container-high/40 p-2.5 rounded">
                  <span className="text-slate-500 text-[10px] block">ESTIMATED EXTENT</span>
                  <span className="text-cyan-400 font-bold text-sm">{item.metrics.floodExtentKm2} km²</span>
                  <span className="text-[10px] text-slate-500 block">±{item.metrics.uncertaintyMarginKm2} km²</span>
                </div>
                <div className="bg-surface-container-high/40 p-2.5 rounded">
                  <span className="text-slate-500 text-[10px] block">EXPOSED ROADS</span>
                  <span className="text-amber-400 font-bold text-sm">{item.metrics.exposedRoadKm} km</span>
                  <span className="text-[10px] text-slate-500 block">Highway & feeders</span>
                </div>
                <div className="bg-surface-container-high/40 p-2.5 rounded">
                  <span className="text-slate-500 text-[10px] block">CUT-OFF SETTLEMENTS</span>
                  <span className="text-rose-400 font-bold text-sm">{item.metrics.cutOffSettlementsCount} hubs</span>
                  <span className="text-[10px] text-slate-500 block">Dijkstra graph severed</span>
                </div>
                <div className="bg-surface-container-high/40 p-2.5 rounded">
                  <span className="text-slate-500 text-[10px] block">TOTAL AOI FOOTPRINT</span>
                  <span className="text-slate-300 font-bold text-sm">{item.areaKm2} km²</span>
                  <span className="text-[10px] text-slate-500 block">Bounding box</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
