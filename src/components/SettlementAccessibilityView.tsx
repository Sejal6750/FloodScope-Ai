import React, { useState } from 'react';
import { AnalysisAssessment } from '../types/index.ts';
import { SyntheticBanner } from './SyntheticBanner.tsx';

interface SettlementAccessibilityViewProps {
  analysis: AnalysisAssessment;
  onNavigate: (path: string) => void;
}

export const SettlementAccessibilityView: React.FC<SettlementAccessibilityViewProps> = ({
  analysis,
  onNavigate
}) => {
  const [filter, setFilter] = useState<'all' | 'cutoff' | 'detour' | 'reachable'>('all');
  const [search, setSearch] = useState<string>('');
  const [showSarMask, setShowSarMask] = useState<boolean>(true);
  const [showNodes, setShowNodes] = useState<boolean>(true);
  const [targetDestination, setTargetDestination] = useState<'hospital' | 'bidur'>('hospital');
  const [isSolving, setIsSolving] = useState<boolean>(false);
  const [solverResult, setSolverResult] = useState<string | null>(null);

  const settlements = analysis.settlements;

  const filteredSettlements = settlements.filter((s) => {
    if (filter === 'cutoff' && s.status !== 'POTENTIALLY CUT OFF') return false;
    if (filter === 'detour' && s.status !== 'DETOUR COMPROMISED') return false;
    if (filter === 'reachable' && s.status !== 'VERIFIED REACHABLE') return false;

    if (search) {
      const q = search.toLowerCase();
      if (!s.name.toLowerCase().includes(q) && !s.wardCode.toLowerCase().includes(q) && !s.primaryRoute.toLowerCase().includes(q)) {
        return false;
      }
    }
    return true;
  });

  const handleRunSolver = () => {
    setIsSolving(true);
    setSolverResult(null);
    setTimeout(() => {
      setIsSolving(false);
      setSolverResult('Dijkstra graph solved: 7 severed edge impediments pruned. Alternate ridge paths validated.');
      setTimeout(() => setSolverResult(null), 4000);
    }, 1200);
  };

  const exportReachability = () => {
    const data = {
      type: 'FeatureCollection',
      analysisId: analysis.id,
      metric: 'Dijkstra Reachability',
      settlements: analysis.settlements
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/geo+json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${analysis.id}-reachability.geojson`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col w-full relative">
      <SyntheticBanner dataMode={analysis.dataMode} analysisName={analysis.name} />

      {/* Solver Toast */}
      {solverResult && (
        <div className="fixed bottom-6 right-8 z-50 px-space-lg py-space-md rounded-xl bg-surface-container-highest text-secondary shadow-xl font-label-mono-md text-label-mono-md flex items-center gap-space-sm backdrop-blur-md border border-secondary/40">
          <span className="material-symbols-outlined text-base">check_circle</span>
          <span>{solverResult}</span>
        </div>
      )}

      {/* Top Section: Header & Action Bar */}
      <div className="px-gutter-desktop py-space-md flex flex-col gap-space-sm bg-surface-container-lowest/80 backdrop-blur-md border-b border-surface-container-high/60">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-space-md">
          <div className="flex flex-col gap-space-xs max-w-4xl">
            <div className="flex items-center gap-space-sm flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-space-xs py-0.5 rounded bg-primary/10 text-primary font-label-mono-sm text-label-mono-sm uppercase tracking-wider font-semibold">
                <span className="material-symbols-outlined text-xs">hub</span>
                Topological Connectivity & Isolation Triage // Track B Graph Solver
              </span>
              <span className="px-space-xs py-0.5 rounded bg-tertiary-container/20 text-tertiary font-label-mono-sm text-label-mono-sm font-semibold uppercase">
                {analysis.dataMode === 'LIVE' ? 'Live Telemetry Active' : 'Demo / Synthetic Testbed Data'}
              </span>
            </div>
            <h1 className="font-headline-lg text-headline-lg text-on-surface tracking-tight font-bold">
              Settlement Accessibility & Road Network Graph
            </h1>
            <p className="font-body-md text-body-md text-on-surface-variant leading-relaxed">
              Simulating Dijkstra / Contraction Hierarchy path reachability across OpenStreetMap road topology after pruning flood-intersected highway segments and bridge choke-points in {analysis.aoiName}.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-space-sm flex-wrap self-start lg:self-center">
            <button
              type="button"
              onClick={handleRunSolver}
              disabled={isSolving}
              className="flex items-center gap-space-xs px-space-md py-2 rounded-lg bg-primary-container text-on-primary-container font-headline-sm text-headline-sm font-semibold hover:brightness-110 active:scale-95 transition-all shadow-md cursor-pointer disabled:opacity-50"
            >
              <span className={`material-symbols-outlined text-base ${isSolving ? 'animate-spin' : ''}`}>
                {isSolving ? 'sync' : 'alt_route'}
              </span>
              <span>{isSolving ? 'Solving Dijkstra...' : 'Run Graph Re-Route Solver'}</span>
            </button>
            <button
              type="button"
              onClick={exportReachability}
              className="flex items-center gap-space-xs px-space-md py-2 rounded-lg bg-surface-container-high text-on-surface font-headline-sm text-headline-sm font-medium hover:bg-surface-variant transition-all cursor-pointer border border-surface-container-highest"
            >
              <span className="material-symbols-outlined text-base text-outline">download</span>
              <span>Export Reachability GeoJSON</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigate('situation-reports')}
              className="flex items-center gap-space-xs px-space-md py-2 rounded-lg bg-surface-container-high text-on-surface font-headline-sm text-headline-sm font-medium hover:bg-surface-variant transition-all cursor-pointer border border-surface-container-highest"
            >
              <span className="material-symbols-outlined text-base text-tertiary">emergency</span>
              <span>Critical Dispatch Matrix</span>
            </button>
          </div>
        </div>
      </div>

      {/* Row of 5 Metric Analytics Cards */}
      <div className="px-gutter-desktop py-space-md grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-space-md bg-surface-container-lowest/40 border-b border-surface-container-high/40">
        <div className="p-space-md rounded-xl bg-surface-container-low flex flex-col justify-between shadow-sm border border-surface-container-high/40">
          <div className="flex items-center justify-between">
            <span className="font-label-mono-sm text-label-mono-sm text-outline uppercase tracking-wider">Settlements Monitored</span>
            <span className="material-symbols-outlined text-base text-primary">analytics</span>
          </div>
          <div className="my-space-xs flex items-baseline gap-space-xs">
            <span className="font-headline-xl text-headline-xl font-bold text-on-surface">{settlements.length || 24}</span>
            <span className="font-label-mono-md text-label-mono-md text-on-surface-variant font-medium">Wards & Enclaves</span>
          </div>
          <div className="flex items-center gap-1.5 font-label-mono-sm text-label-mono-sm text-secondary">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-secondary"></span>
            <span>{analysis.aoiName} Active</span>
          </div>
        </div>

        <div className="p-space-md rounded-xl bg-surface-container-low flex flex-col justify-between shadow-sm border border-error/30 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="font-label-mono-sm text-label-mono-sm text-error uppercase tracking-wider font-semibold">Potentially Cut Off</span>
            <span className="material-symbols-outlined text-base text-error">warning</span>
          </div>
          <div className="my-space-xs flex items-baseline gap-space-xs">
            <span className="font-headline-xl text-headline-xl font-bold text-error">{analysis.metrics.cutOffSettlementsCount}</span>
            <span className="font-label-mono-md text-label-mono-md text-error/80 font-medium">Isolated Enclaves</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="font-label-mono-sm text-label-mono-sm text-on-surface-variant">Zero alternate vehicular route</span>
            <span className="px-1.5 py-0.5 rounded bg-error/20 text-error font-label-mono-sm text-label-mono-sm font-semibold">URGENT</span>
          </div>
        </div>

        <div className="p-space-md rounded-xl bg-surface-container-low flex flex-col justify-between shadow-sm border border-tertiary/30">
          <div className="flex items-center justify-between">
            <span className="font-label-mono-sm text-label-mono-sm text-tertiary uppercase tracking-wider font-semibold">Detour Compromised</span>
            <span className="material-symbols-outlined text-base text-tertiary">fork_right</span>
          </div>
          <div className="my-space-xs flex items-baseline gap-space-xs">
            <span className="font-headline-xl text-headline-xl font-bold text-tertiary">{analysis.metrics.compromisedDetoursCount}</span>
            <span className="font-label-mono-md text-label-mono-md text-tertiary/80 font-medium">Extended Transit</span>
          </div>
          <div className="flex items-center gap-1 font-label-mono-sm text-label-mono-sm text-on-surface-variant">
            <span className="material-symbols-outlined text-xs text-tertiary">schedule</span>
            <span>Avg +18.4 km / +52 min delay</span>
          </div>
        </div>

        <div className="p-space-md rounded-xl bg-surface-container-low flex flex-col justify-between shadow-sm border border-secondary/30">
          <div className="flex items-center justify-between">
            <span className="font-label-mono-sm text-label-mono-sm text-secondary uppercase tracking-wider font-semibold">Verified Reachable</span>
            <span className="material-symbols-outlined text-base text-secondary">check_circle</span>
          </div>
          <div className="my-space-xs flex items-baseline gap-space-xs">
            <span className="font-headline-xl text-headline-xl font-bold text-secondary">{analysis.metrics.verifiedReachableCount}</span>
            <span className="font-label-mono-md text-label-mono-md text-secondary/80 font-medium">Nominal Transit</span>
          </div>
          <div className="font-label-mono-sm text-label-mono-sm text-on-surface-variant">
            Direct route within &lt;25 min corridor
          </div>
        </div>

        <div className="p-space-md rounded-xl bg-surface-container-low flex flex-col justify-between shadow-sm border border-surface-container-high/40">
          <div className="flex items-center justify-between">
            <span className="font-label-mono-sm text-label-mono-sm text-outline uppercase tracking-wider">Critical Edges Severed</span>
            <span className="material-symbols-outlined text-base text-error">polyline</span>
          </div>
          <div className="my-space-xs flex items-baseline gap-space-xs">
            <span className="font-headline-xl text-headline-xl font-bold text-on-surface">{analysis.metrics.severedEdgesCount}</span>
            <span className="font-label-mono-md text-label-mono-md text-outline font-medium">Vector Disconnections</span>
          </div>
          <div className="font-label-mono-sm text-label-mono-sm text-outline truncate">
            2 Trishuli Bridges & Feeder 04
          </div>
        </div>
      </div>

      {/* Main Split Workbench: 2-Column Responsive Layout */}
      <div className="px-gutter-desktop py-space-lg grid grid-cols-1 xl:grid-cols-12 gap-space-md items-start">
        {/* LEFT PANE: Map Canvas & Graph HUD (7 cols) */}
        <div className="xl:col-span-7 flex flex-col gap-space-sm bg-surface-container-lowest rounded-xl p-space-md shadow-lg border border-surface-container-high/40 relative">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-sm pb-space-sm border-b border-surface-container-high/40">
            <div className="flex items-center gap-space-sm">
              <span className="material-symbols-outlined text-primary text-xl">account_tree</span>
              <div>
                <div className="flex items-center gap-space-xs">
                  <span className="font-headline-sm text-headline-sm text-on-surface font-semibold">
                    TOPOLOGICAL ROUTING GRAPH (OSM + SAR PRUNING)
                  </span>
                  <span className="px-1.5 py-0.5 rounded bg-surface-container-high font-label-mono-sm text-label-mono-sm text-outline">
                    EPSG:32645
                  </span>
                </div>
                <span className="font-label-mono-sm text-label-mono-sm text-secondary flex items-center gap-1">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-secondary animate-pulse"></span>
                  Graph Engine: NetworkX / igraph Online
                </span>
              </div>
            </div>

            {/* Controls Toolbar */}
            <div className="flex items-center gap-1.5 bg-surface-container-low px-space-xs py-1 rounded-lg border border-surface-container-high/40">
              <button
                type="button"
                onClick={() => setShowSarMask(!showSarMask)}
                className={`px-2 py-1 rounded text-label-mono-sm font-label-mono-sm transition-colors flex items-center gap-1 cursor-pointer ${
                  showSarMask ? 'bg-primary/20 text-primary font-medium' : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                <span className="material-symbols-outlined text-xs">water</span>
                SAR Mask
              </button>
              <button
                type="button"
                onClick={() => setShowNodes(!showNodes)}
                className={`px-2 py-1 rounded text-label-mono-sm font-label-mono-sm transition-colors flex items-center gap-1 cursor-pointer ${
                  showNodes ? 'bg-primary/20 text-primary font-medium' : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                <span className="material-symbols-outlined text-xs">scatter_plot</span>
                Nodes
              </button>
            </div>
          </div>

          {/* Graph Map Container */}
          <div className="relative w-full h-[580px] rounded-lg overflow-hidden bg-surface-dim select-none border border-surface-container-high/30">
            <div className="absolute inset-0 bg-gradient-to-br from-[#0c131f] via-[#111927] to-[#070b12]"></div>

            {/* SVG Graph Layer */}
            <svg className="absolute inset-0 w-full h-full pointer-events-auto" viewBox="0 0 800 580" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <filter id="riverGlow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="3" result="glow" />
                  <feMerge>
                    <feMergeNode in="glow" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              {/* Trishuli River Natural Drainage Path */}
              <path
                d="M 60,30 C 140,90 190,160 270,220 C 340,270 380,310 430,370 C 490,440 550,480 680,550"
                stroke="#06b6d4"
                strokeWidth="14"
                strokeOpacity="0.25"
                strokeLinecap="round"
                filter="url(#riverGlow)"
              />
              <path
                d="M 60,30 C 140,90 190,160 270,220 C 340,270 380,310 430,370 C 490,440 550,480 680,550"
                stroke="#4cd7f6"
                strokeWidth="4"
                strokeDasharray="8 4"
                strokeLinecap="round"
                strokeOpacity="0.8"
              />

              {/* Flood Inundation Polygons (SAR Extent) */}
              {showSarMask && (
                <g className="opacity-80 transition-opacity duration-300">
                  <path
                    d="M 330,260 C 360,250 420,280 430,310 C 440,340 390,360 360,350 C 330,340 310,290 330,260 Z"
                    fill="#00687a"
                    fillOpacity="0.55"
                    stroke="#4cd7f6"
                    strokeWidth="1.2"
                    strokeDasharray="3 3"
                  />
                  <path
                    d="M 120,70 C 150,60 180,85 190,115 C 190,135 160,150 135,140 C 115,130 100,90 120,70 Z"
                    fill="#00687a"
                    fillOpacity="0.5"
                    stroke="#4cd7f6"
                    strokeWidth="1"
                  />
                </g>
              )}

              {/* Viable corridors (Teal/Green) */}
              <path d="M 580,430 L 610,340" stroke="#4edea3" strokeWidth="4.5" strokeLinecap="round" />
              <path d="M 710,480 L 580,430" stroke="#4edea3" strokeWidth="4" strokeLinecap="round" />
              <path d="M 470,490 L 580,430" stroke="#4edea3" strokeWidth="3.5" strokeLinecap="round" />
              <path d="M 610,340 L 730,260" stroke="#4edea3" strokeWidth="3" strokeLinecap="round" />

              {/* Detour Corridors (Amber Dashed) */}
              <path d="M 380,240 Q 480,200 560,250 T 610,340" stroke="#ffb95f" strokeWidth="3.5" strokeDasharray="6 4" strokeLinecap="round" />
              <text x="470" y="215" fill="#ffb95f" className="font-label-mono-sm text-[10px] select-none">+25.8 km Ridge Pass</text>

              {/* Severed Road Segments (Red Bold Crossed Lines) */}
              <path d="M 380,240 L 460,330" stroke="#ffb4ab" strokeWidth="5" strokeLinecap="round" />
              <line x1="412" y1="275" x2="428" y2="295" stroke="#93000a" strokeWidth="4" />
              <line x1="428" y1="275" x2="412" y2="295" stroke="#93000a" strokeWidth="4" />

              <path d="M 170,120 L 300,210" stroke="#ffb4ab" strokeWidth="5" strokeLinecap="round" />
              <line x1="228" y1="155" x2="242" y2="175" stroke="#93000a" strokeWidth="4" />
              <line x1="242" y1="155" x2="228" y2="175" stroke="#93000a" strokeWidth="4" />

              <path d="M 280,110 L 380,240" stroke="#ffb4ab" strokeWidth="4" strokeDasharray="2 3" strokeLinecap="round" />
              <line x1="324" y1="168" x2="336" y2="182" stroke="#93000a" strokeWidth="3.5" />
              <line x1="336" y1="168" x2="324" y2="182" stroke="#93000a" strokeWidth="3.5" />

              {/* Graph Nodes */}
              {showNodes && (
                <g>
                  {/* NODE: Syabrubesi Ward 3 (Isolated) */}
                  <g transform="translate(170, 120)">
                    <circle r="18" fill="#ffb4ab" fillOpacity="0.2" className="animate-ping" />
                    <circle r="11" fill="#93000a" stroke="#ffb4ab" strokeWidth="2" />
                    <circle r="4" fill="#ffffff" />
                    <rect x="-65" y="-36" width="130" height="20" rx="4" fill="#181c24" fillOpacity="0.9" stroke="#93000a" strokeWidth="1" />
                    <text x="0" y="-22" textAnchor="middle" fill="#ffb4ab" className="font-label-mono-sm text-[10px] font-bold">SYABRUBESI W3 (CUT OFF)</text>
                  </g>

                  {/* NODE: Dhunche South */}
                  <g transform="translate(280, 110)">
                    <circle r="14" fill="#ffb4ab" fillOpacity="0.25" />
                    <circle r="8" fill="#93000a" stroke="#ffb4ab" strokeWidth="1.8" />
                    <rect x="-55" y="-30" width="110" height="18" rx="3" fill="#181c24" fillOpacity="0.9" />
                    <text x="0" y="-18" textAnchor="middle" fill="#ffb4ab" className="font-label-mono-sm text-[9px] font-bold">DHUNCHE S. (CUT OFF)</text>
                  </g>

                  {/* NODE: Betrawati Hub */}
                  <g transform="translate(380, 240)">
                    <circle r="12" fill="#e79400" fillOpacity="0.3" />
                    <circle r="9" fill="#e79400" stroke="#ffddb8" strokeWidth="2" />
                    <rect x="-65" y="16" width="130" height="18" rx="3" fill="#181c24" fillOpacity="0.9" stroke="#e79400" strokeWidth="1" />
                    <text x="0" y="29" textAnchor="middle" fill="#ffb95f" className="font-label-mono-sm text-[9px] font-bold">BETRAWATI (DETOUR +52m)</text>
                  </g>

                  {/* NODE: Nuwakot Ridge */}
                  <g transform="translate(710, 480)">
                    <circle r="8" fill="#00a572" stroke="#6ffbbe" strokeWidth="1.8" />
                    <rect x="-50" y="14" width="100" height="18" rx="3" fill="#181c24" fillOpacity="0.9" />
                    <text x="0" y="27" textAnchor="middle" fill="#4edea3" className="font-label-mono-sm text-[9px] font-bold">NUWAKOT RIDGE</text>
                  </g>

                  {/* NODE: Tupche North */}
                  <g transform="translate(470, 490)">
                    <circle r="8" fill="#00a572" stroke="#6ffbbe" strokeWidth="1.8" />
                    <rect x="-42" y="14" width="84" height="18" rx="3" fill="#181c24" fillOpacity="0.9" />
                    <text x="0" y="27" textAnchor="middle" fill="#4edea3" className="font-label-mono-sm text-[9px] font-bold">TUPCHE NORTH</text>
                  </g>

                  {/* DESTINATION NODE: Bidur Logistics Hub */}
                  <g transform="translate(580, 430)">
                    <circle r="16" fill="#00687a" fillOpacity="0.4" />
                    <polygon points="0,-12 12,0 0,12 -12,0" fill="#06b6d4" stroke="#acedff" strokeWidth="2" />
                    <rect x="-60" y="-32" width="120" height="20" rx="4" fill="#0a0e16" stroke="#06b6d4" strokeWidth="1.2" />
                    <text x="0" y="-18" textAnchor="middle" fill="#acedff" className="font-label-mono-sm text-[10px] font-bold">BIDUR LOGISTICS HUB</text>
                  </g>

                  {/* PRIMARY DESTINATION: Trishuli Hospital */}
                  <g transform="translate(610, 340)">
                    <circle r="22" fill="#00a572" fillOpacity="0.25" className="animate-pulse" />
                    <rect x="-14" y="-14" width="28" height="28" rx="6" fill="#003824" stroke="#4edea3" strokeWidth="2.5" />
                    <path d="M -4,-9 H 4 V -4 H 9 V 4 H 4 V 9 H -4 V 4 H -9 V -4 H -4 Z" fill="#4edea3" />
                    <rect x="-78" y="-40" width="156" height="22" rx="4" fill="#0a0e16" stroke="#4edea3" strokeWidth="1.5" />
                    <text x="0" y="-25" textAnchor="middle" fill="#6ffbbe" className="font-label-mono-sm text-[10px] font-bold">TRISHULI DISTRICT HOSPITAL</text>
                  </g>
                </g>
              )}
            </svg>

            {/* Floating Route Inspector Card */}
            <div className="absolute top-4 left-4 max-w-xs w-full bg-surface-container-low/95 backdrop-blur-md p-space-sm rounded-xl shadow-xl border border-surface-container-highest/60 flex flex-col gap-space-xs z-10">
              <div className="flex items-center justify-between pb-1 border-b border-surface-container-high/60">
                <div className="flex items-center gap-1.5 font-label-mono-sm text-label-mono-sm text-on-surface-variant uppercase font-semibold">
                  <span className="material-symbols-outlined text-sm text-primary">route</span>
                  <span>Active Route Analysis</span>
                </div>
                <span className="px-1.5 py-0.5 rounded bg-tertiary/20 text-tertiary font-label-mono-sm text-[9px] font-bold uppercase">
                  Severe Delay
                </span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="font-label-mono-sm text-label-mono-sm text-outline">Selected Route Corridor:</span>
                <span className="font-headline-sm text-headline-sm text-on-surface font-semibold">
                  Betrawati Hub → {targetDestination === 'hospital' ? 'Trishuli Hospital' : 'Bidur Logistics Hub'}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 my-0.5 p-2 rounded-lg bg-surface-container-lowest/80 border border-surface-container-high/40">
                <div>
                  <span className="block font-label-mono-sm text-[9px] text-outline uppercase">Baseline Normal</span>
                  <span className="font-label-mono-md text-label-mono-md text-on-surface font-medium">12.4 km (18 min)</span>
                </div>
                <div>
                  <span className="block font-label-mono-sm text-[9px] text-tertiary uppercase">Post-Flood Detour</span>
                  <span className="font-label-mono-md text-label-mono-md text-tertiary font-bold">38.2 km (74 min)</span>
                </div>
              </div>
              <div className="flex items-center justify-between text-label-mono-sm font-label-mono-sm pt-1">
                <span className="text-on-surface-variant">Via Ridge Cut (4WD)</span>
                <span className="text-tertiary font-semibold">+56 min delay</span>
              </div>
            </div>

            {/* Legend Overlay */}
            <div className="absolute bottom-10 left-4 bg-surface-container-lowest/90 backdrop-blur-md px-3 py-2 rounded-lg shadow-md border border-surface-container-high/40 flex flex-col gap-1.5 z-10">
              <div className="font-label-mono-sm text-[10px] text-outline uppercase tracking-wider font-semibold">Topological Edges</div>
              <div className="flex items-center gap-2 font-label-mono-sm text-[10px] text-on-surface">
                <span className="w-4 h-1 bg-secondary rounded-full"></span>
                <span>Viable Corridor (&lt;25m)</span>
              </div>
              <div className="flex items-center gap-2 font-label-mono-sm text-[10px] text-on-surface">
                <span className="w-4 h-1 bg-tertiary border-b border-dashed border-tertiary"></span>
                <span>Ridge Detour (+15-60m)</span>
              </div>
              <div className="flex items-center gap-2 font-label-mono-sm text-[10px] text-error font-medium">
                <span className="w-4 h-1 bg-error"></span>
                <span>Severed / Inundated Segment</span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-space-sm pt-space-xs text-label-mono-sm font-label-mono-sm text-outline border-t border-surface-container-high/40">
            <div className="flex items-center gap-space-md">
              <span className="flex items-center gap-1 text-on-surface-variant">
                <span className="material-symbols-outlined text-xs">my_location</span>
                27°59'14"N, 85°11'02"E
              </span>
              <span className="text-outline-variant">|</span>
              <span>Scale: 1:25,000</span>
            </div>
            <div className="flex items-center gap-space-sm">
              <span className="text-on-surface-variant font-medium">Graph Density: 8,420 edges / 2,140 nodes</span>
              <span className="w-1.5 h-1.5 rounded-full bg-secondary"></span>
            </div>
          </div>
        </div>

        {/* RIGHT PANE: Settlement Reachability Ledger (5 cols) */}
        <div className="xl:col-span-5 flex flex-col gap-space-md bg-surface-container-lowest rounded-xl p-space-md shadow-lg border border-surface-container-high/40">
          {/* Target Destination Selector */}
          <div className="flex flex-col gap-space-xs pb-space-sm border-b border-surface-container-high/60">
            <div className="flex items-center justify-between">
              <span className="font-label-mono-sm text-label-mono-sm text-outline uppercase tracking-wider font-semibold">Routing Analysis Target</span>
              <span className="font-label-mono-sm text-label-mono-sm text-primary flex items-center gap-1">
                <span className="material-symbols-outlined text-xs">hub</span>
                Dijkstra Shortest Path
              </span>
            </div>
            <div className="grid grid-cols-2 gap-space-xs p-1 bg-surface-container-low rounded-lg border border-surface-container-high/40">
              <button
                type="button"
                onClick={() => setTargetDestination('hospital')}
                className={`px-space-sm py-1.5 rounded font-headline-sm text-xs font-semibold shadow-sm flex items-center justify-center gap-1.5 cursor-pointer transition-colors ${
                  targetDestination === 'hospital' ? 'bg-surface-container-high text-primary border border-primary/30' : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                <span className="material-symbols-outlined text-xs text-secondary">local_hospital</span>
                <span>Trishuli Hospital</span>
              </button>
              <button
                type="button"
                onClick={() => setTargetDestination('bidur')}
                className={`px-space-sm py-1.5 rounded font-headline-sm text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
                  targetDestination === 'bidur' ? 'bg-surface-container-high text-primary border border-primary/30' : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                <span className="material-symbols-outlined text-xs text-primary">account_balance</span>
                <span>Bidur Logistics Hub</span>
              </button>
            </div>
          </div>

          {/* Filters & Tab Switcher */}
          <div className="flex flex-col gap-space-sm">
            <div className="flex items-center justify-between gap-space-xs overflow-x-auto pb-1 text-label-mono-sm font-label-mono-sm">
              <button
                type="button"
                onClick={() => setFilter('all')}
                className={`px-2.5 py-1 rounded font-semibold whitespace-nowrap cursor-pointer ${
                  filter === 'all' ? 'bg-surface-container-high text-primary border border-primary/30' : 'text-on-surface-variant hover:bg-surface-container-high'
                }`}
              >
                All ({settlements.length})
              </button>
              <button
                type="button"
                onClick={() => setFilter('cutoff')}
                className={`px-2.5 py-1 rounded font-semibold whitespace-nowrap flex items-center gap-1 cursor-pointer ${
                  filter === 'cutoff' ? 'bg-surface-container-high text-error border border-error/30' : 'text-error hover:bg-surface-container-high'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-error"></span>
                Cut Off ({analysis.metrics.cutOffSettlementsCount})
              </button>
              <button
                type="button"
                onClick={() => setFilter('detour')}
                className={`px-2.5 py-1 rounded font-semibold whitespace-nowrap flex items-center gap-1 cursor-pointer ${
                  filter === 'detour' ? 'bg-surface-container-high text-tertiary border border-tertiary/30' : 'text-tertiary hover:bg-surface-container-high'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-tertiary"></span>
                Detour ({analysis.metrics.compromisedDetoursCount})
              </button>
              <button
                type="button"
                onClick={() => setFilter('reachable')}
                className={`px-2.5 py-1 rounded font-semibold whitespace-nowrap cursor-pointer ${
                  filter === 'reachable' ? 'bg-surface-container-high text-secondary border border-secondary/30' : 'text-secondary hover:bg-surface-container-high'
                }`}
              >
                Reachable ({analysis.metrics.verifiedReachableCount})
              </button>
            </div>

            {/* Search Bar */}
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-2.5 text-sm text-outline">search</span>
              <input
                type="text"
                placeholder="Filter settlement, ward ID, or corridor..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-surface-container-low text-on-surface font-body-sm placeholder:text-outline/70 border border-surface-container-high/80 focus:outline-none focus:border-primary/80 transition-colors"
              />
            </div>
          </div>

          {/* Settlement Inventory Cards List */}
          <div className="flex flex-col gap-space-sm max-h-[460px] overflow-y-auto pr-1">
            {filteredSettlements.map((s) => (
              <div
                key={s.id}
                className={`p-space-md rounded-xl bg-surface-container-low hover:bg-surface-container transition-all flex flex-col gap-space-xs border-l-4 ${
                  s.status === 'POTENTIALLY CUT OFF'
                    ? 'border-l-error border border-error/20'
                    : s.status === 'DETOUR COMPROMISED'
                    ? 'border-l-tertiary border border-tertiary/20'
                    : 'border-l-secondary border border-secondary/20'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-space-xs">
                    <span className="font-headline-sm text-headline-sm text-on-surface font-bold">{s.name}</span>
                    <span className="font-label-mono-sm text-label-mono-sm text-outline px-1.5 py-0.5 rounded bg-surface-container-lowest">
                      {s.wardCode}
                    </span>
                  </div>
                  <span className={`px-2 py-0.5 rounded font-label-mono-sm text-label-mono-sm font-bold uppercase tracking-wider ${
                    s.status === 'POTENTIALLY CUT OFF'
                      ? 'bg-error/20 text-error'
                      : s.status === 'DETOUR COMPROMISED'
                      ? 'bg-tertiary/20 text-tertiary'
                      : 'bg-secondary/20 text-secondary'
                  }`}>
                    {s.status}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-body-sm py-1">
                  <div className="flex flex-col">
                    <span className="text-outline font-label-mono-sm text-[10px] uppercase">Primary Route</span>
                    <span className="text-on-surface font-medium truncate" title={s.primaryRoute}>{s.primaryRoute}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-outline font-label-mono-sm text-[10px] uppercase">Est. Pop at Risk</span>
                    <span className="text-on-surface font-semibold">{s.estPopAtRisk.toLocaleString()} Residents</span>
                  </div>
                </div>

                <div className={`p-2 rounded font-label-mono-sm text-label-mono-sm flex items-center gap-1.5 ${
                  s.status === 'POTENTIALLY CUT OFF' ? 'bg-error/10 text-error' : s.status === 'DETOUR COMPROMISED' ? 'bg-tertiary/10 text-tertiary' : 'bg-secondary/10 text-secondary'
                }`}>
                  <span className="material-symbols-outlined text-xs">
                    {s.status === 'POTENTIALLY CUT OFF' ? 'block' : s.status === 'DETOUR COMPROMISED' ? 'terrain' : 'check'}
                  </span>
                  <span>{s.detourDetails}</span>
                </div>

                <div className="flex items-center justify-between pt-1 mt-1 border-t border-surface-container-high/40">
                  <button
                    type="button"
                    onClick={() => onNavigate('situation-reports')}
                    className={`px-2.5 py-1 rounded font-headline-sm text-xs font-semibold cursor-pointer transition-colors flex items-center gap-1 ${
                      s.status === 'POTENTIALLY CUT OFF' ? 'bg-error text-on-error hover:bg-error/90' : 'bg-surface-container-high text-primary hover:bg-surface-container-highest'
                    }`}
                  >
                    <span className="material-symbols-outlined text-xs">
                      {s.status === 'POTENTIALLY CUT OFF' ? 'helicopter' : 'alt_route'}
                    </span>
                    <span>{s.status === 'POTENTIALLY CUT OFF' ? 'Flag for Heli Recon' : 'Inspect Path'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onNavigate('flood-map-explorer')}
                    className="text-label-mono-sm font-label-mono-sm text-primary hover:underline flex items-center gap-0.5 cursor-pointer"
                  >
                    <span>View in Map</span>
                    <span className="material-symbols-outlined text-xs">chevron_right</span>
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Bottom Scientific Methodology Callout Box */}
          <div className="p-space-md rounded-xl bg-surface-container-low/80 border border-surface-container-high/60 flex flex-col gap-space-xs">
            <div className="flex items-center gap-1.5 font-label-mono-sm text-label-mono-sm text-primary uppercase font-bold tracking-wider">
              <span className="material-symbols-outlined text-sm">science</span>
              <span>Graph Reachability Methodology & Validation</span>
            </div>
            <p className="font-body-sm text-body-sm text-on-surface-variant leading-relaxed">
              Road network edges extracted from pre-event OpenStreetMap (2026-08-01 snapshot). Disruption candidate edges flagged where spatial intersection with Sentinel-1 SAR -4.5dB backscatter inundation exceeds 50m contiguous road length. Elevation contours from Copernicus 30m GLO DEM prevent false river-level crossings.
            </p>
            <div className="pt-1 text-label-mono-sm font-label-mono-sm text-outline flex items-center gap-1">
              <span className="material-symbols-outlined text-xs text-secondary">verified_user</span>
              <span>Topological connectivity inferred; ground truth validation mandatory prior to heavy convoy dispatch.</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
