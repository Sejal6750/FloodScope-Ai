import React, { useState } from 'react';
import { AnalysisAssessment, InfrastructureAsset } from '../types/index.ts';
import { SyntheticBanner } from './SyntheticBanner.tsx';

interface InfrastructureImpactViewProps {
  analysis: AnalysisAssessment;
  onNavigate: (path: string) => void;
}

export const InfrastructureImpactView: React.FC<InfrastructureImpactViewProps> = ({
  analysis,
  onNavigate
}) => {
  const [selectedAsset, setSelectedAsset] = useState<InfrastructureAsset | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [droneDispatched, setDroneDispatched] = useState<boolean>(false);

  const assets = analysis.infrastructureAssets;

  const filteredAssets = assets.filter((asset) => {
    // Category tabs
    if (filterCategory === 'roads' && !asset.type.toLowerCase().includes('highway') && !asset.type.toLowerCase().includes('road')) return false;
    if (filterCategory === 'bridges' && !asset.type.toLowerCase().includes('bridge')) return false;
    if (filterCategory === 'buildings' && !asset.type.toLowerCase().includes('storage') && !asset.type.toLowerCase().includes('shed') && !asset.type.toLowerCase().includes('hospital')) return false;
    if (filterCategory === 'utilities' && !asset.type.toLowerCase().includes('substation') && !asset.type.toLowerCase().includes('transmission')) return false;

    // Search query
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const match = asset.id.toLowerCase().includes(q) ||
        asset.name.toLowerCase().includes(q) ||
        asset.type.toLowerCase().includes(q) ||
        asset.osmRef.toLowerCase().includes(q);
      if (!match) return false;
    }

    // Status filter
    if (statusFilter !== 'all') {
      if (statusFilter === 'potentially-affected' && asset.exposureCategory !== 'POTENTIALLY AFFECTED') return false;
      if (statusFilter === 'high-exposure' && asset.exposureCategory !== 'HIGH EXPOSURE') return false;
      if (statusFilter === 'moderate' && asset.exposureCategory !== 'MODERATE (PERIMETER)') return false;
      if (statusFilter === 'cleared' && asset.exposureCategory !== 'CLEARED / BUFFER') return false;
    }

    // Priority filter
    if (priorityFilter !== 'all') {
      if (priorityFilter === 'high' && asset.priority !== 'High Priority') return false;
      if (priorityFilter === 'medium' && asset.priority !== 'Medium Priority') return false;
      if (priorityFilter === 'cleared' && asset.priority !== 'Cleared / Safe') return false;
    }

    return true;
  });

  return (
    <div className="flex flex-col w-full relative">
      <SyntheticBanner dataMode={analysis.dataMode} analysisName={analysis.name} />

      <div className="px-space-lg py-space-md flex flex-col gap-space-lg">
        {/* Workspace Header & Action Rail */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-space-md">
          <div className="flex flex-col gap-space-xs max-w-3xl">
            <div className="flex items-center gap-space-xs font-label-mono-sm text-label-mono-sm text-primary uppercase tracking-wider">
              <span className="inline-block w-2 h-2 rounded-full bg-primary animate-pulse"></span>
              Geospatial Damage Mitigation // Track B Protocol
            </div>
            <h1 className="font-headline-lg text-headline-lg text-on-surface font-semibold tracking-tight">
              Infrastructure Impact Assessment
            </h1>
            <p className="font-body-md text-body-md text-on-surface-variant">
              Cross-referencing spatial flood extent against pre-event OpenStreetMap roads, bridges, and municipal assets across {analysis.aoiName}.
            </p>
          </div>

          {/* Action Suite */}
          <div className="flex flex-wrap items-center gap-space-sm self-start lg:self-center">
            <a
              href={`/api/export/${analysis.id}/csv`}
              download
              className="flex items-center gap-space-xs px-space-md py-space-sm rounded bg-surface-container-high hover:bg-surface-variant text-on-surface font-label-mono-md text-label-mono-md transition-all shadow-sm border border-surface-container-highest cursor-pointer"
            >
              <span className="material-symbols-outlined text-sm text-primary">table_view</span>
              <span>Export CSV Table</span>
            </a>
            <a
              href={`/api/export/${analysis.id}/geojson`}
              download
              className="flex items-center gap-space-xs px-space-md py-space-sm rounded bg-surface-container-high hover:bg-surface-variant text-on-surface font-label-mono-md text-label-mono-md transition-all shadow-sm border border-surface-container-highest cursor-pointer"
            >
              <span className="material-symbols-outlined text-sm text-secondary">polyline</span>
              <span>Export GeoJSON Layer</span>
            </a>
            <button
              type="button"
              onClick={() => onNavigate('situation-reports')}
              className="flex items-center gap-space-xs px-space-md py-space-sm rounded bg-primary text-on-primary font-label-mono-md text-label-mono-md font-semibold transition-all shadow-md hover:bg-surface-tint cursor-pointer"
            >
              <span className="material-symbols-outlined text-sm">assignment_turned_in</span>
              <span>Batch Inspection Report</span>
            </button>
          </div>
        </div>

        {/* Scientific Cartographic Notice */}
        <div className="rounded-xl bg-tertiary-container/15 p-space-md flex items-start gap-space-md shadow-sm border border-tertiary/20">
          <div className="p-1.5 rounded bg-tertiary-container/30 text-tertiary mt-0.5 shrink-0">
            <span className="material-symbols-outlined text-base">science</span>
          </div>
          <div className="flex flex-col gap-0.5 min-w-0">
            <span className="font-label-mono-md text-label-mono-md font-semibold uppercase tracking-wider text-tertiary">
              Scientific Verification Notice
            </span>
            <p className="font-body-sm text-body-sm text-on-surface-variant">
              Spatial overlap indicates potential flood exposure / inundation inferred via multi-temporal Sentinel-1 C-band SAR σ° difference masking. Structural integrity, deck scour, or functional destruction cannot be confirmed without ground-truth UAV photogrammetry or geotechnical engineering validation.
            </p>
          </div>
        </div>

        {/* Top Impact Metrics Summary (4 Bento Cards) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-space-md">
          <div className="relative overflow-hidden rounded-xl bg-surface-container-low p-space-lg flex flex-col justify-between shadow-sm border border-surface-container-high/40">
            <div className="flex flex-col gap-1">
              <span className="font-label-mono-sm text-label-mono-sm text-outline uppercase tracking-wider">Monitored In-AOI Footprints</span>
              <div className="flex items-baseline gap-space-xs">
                <span className="font-headline-xl text-headline-xl text-on-surface font-bold">1,840</span>
                <span className="font-label-mono-sm text-label-mono-sm text-primary font-medium">OSM Vector Feats</span>
              </div>
            </div>
            <div className="mt-space-md flex items-center justify-between text-on-surface-variant font-label-mono-sm text-label-mono-sm pt-space-xs">
              <span>Active Basemap: ODbL 2026</span>
              <span className="text-secondary flex items-center gap-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-secondary"></span> 100% Synced
              </span>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-xl bg-surface-container-low p-space-lg flex flex-col justify-between shadow-sm border border-surface-container-high/40">
            <div className="flex flex-col gap-1">
              <span className="font-label-mono-sm text-label-mono-sm text-outline uppercase tracking-wider">Potentially Affected Roads</span>
              <div className="flex items-baseline gap-space-xs">
                <span className="font-headline-xl text-headline-xl text-error font-bold">{analysis.metrics.exposedRoadKm}</span>
                <span className="font-label-mono-md text-label-mono-md text-error font-semibold">km</span>
              </div>
            </div>
            <div className="mt-space-md flex items-center justify-between text-on-surface-variant font-label-mono-sm text-label-mono-sm pt-space-xs">
              <span className="text-error font-medium">{analysis.metrics.exposedRoadSegmentsCount} Corridors &gt;15% Inundated</span>
              <span className="text-on-surface">Highway-04 Cut</span>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-xl bg-surface-container-low p-space-lg flex flex-col justify-between shadow-sm border border-surface-container-high/40">
            <div className="flex flex-col gap-1">
              <span className="font-label-mono-sm text-label-mono-sm text-outline uppercase tracking-wider">River Crossings At Risk</span>
              <div className="flex items-baseline gap-space-xs">
                <span className="font-headline-xl text-headline-xl text-tertiary font-bold">{analysis.metrics.bridgesCount}</span>
                <span className="font-label-mono-sm text-label-mono-sm text-tertiary font-medium">Vehicular Bridges</span>
              </div>
            </div>
            <div className="mt-space-md flex items-center justify-between text-on-surface-variant font-label-mono-sm text-label-mono-sm pt-space-xs">
              <span className="text-error font-medium">1 High Criticality</span>
              <span className="text-tertiary font-medium">3 Moderate Scour</span>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-xl bg-surface-container-low p-space-lg flex flex-col justify-between shadow-sm border border-surface-container-high/40">
            <div className="flex flex-col gap-1">
              <span className="font-label-mono-sm text-label-mono-sm text-outline uppercase tracking-wider">Critical Utilities Exposed</span>
              <div className="flex items-baseline gap-space-xs">
                <span className="font-headline-xl text-headline-xl text-primary font-bold">{analysis.metrics.substationsCount + 1}</span>
                <span className="font-label-mono-sm text-label-mono-sm text-on-surface font-medium">Municipal Hubs</span>
              </div>
            </div>
            <div className="mt-space-md flex items-center justify-between text-on-surface-variant font-label-mono-sm text-label-mono-sm pt-space-xs">
              <span className="truncate">1 Substation Perimeter</span>
              <span className="truncate text-secondary">1 Depot Cut Off</span>
            </div>
          </div>
        </div>

        {/* Dual Pane Layout (5 cols Map + 7 cols Table) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-md items-start">
          {/* LEFT PANE: Map Viewport (5 Cols) */}
          <div className="lg:col-span-5 flex flex-col rounded-xl bg-surface-container-low overflow-hidden shadow-md border border-surface-container-high/40">
            <div className="p-space-sm bg-surface-container-high/80 backdrop-blur flex items-center justify-between">
              <div className="flex items-center gap-space-xs">
                <span className="material-symbols-outlined text-primary text-base">radar</span>
                <span className="font-label-mono-sm text-label-mono-sm font-semibold uppercase text-on-surface tracking-wider">
                  Spatial Layer Inspector
                </span>
              </div>
              <div className="flex items-center gap-1 font-label-mono-sm text-label-mono-sm">
                <span className="px-1.5 py-0.5 rounded bg-surface-container text-on-surface-variant">SAR σ°: VH/VV</span>
                <span className="px-1.5 py-0.5 rounded bg-primary/20 text-primary font-semibold">10m Res</span>
              </div>
            </div>

            <div className="relative w-full h-[520px] bg-surface-container-lowest overflow-hidden flex items-center justify-center select-none">
              <div className="absolute inset-0 bg-gradient-to-br from-[#0c131f] via-[#111927] to-[#070b12]"></div>

              {/* Tactical Grid & Vector Overlays */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <pattern id="tactical-grid-infra" width="40" height="40" patternUnits="userSpaceOnUse">
                    <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#263445" strokeWidth="0.5" />
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#tactical-grid-infra)" />

                {/* Flood Water Polygons */}
                <path
                  d="M -20 180 C 80 160, 140 220, 220 200 C 310 180, 360 260, 480 230 C 540 210, 600 280, 700 290 L 700 380 C 580 370, 490 320, 390 340 C 290 360, 190 280, 90 320 L -20 330 Z"
                  fill="#06b6d4"
                  fillOpacity="0.45"
                  stroke="#4cd7f6"
                  strokeWidth="1.5"
                />

                {/* Road Line Vectors */}
                <path
                  d="M 40 40 L 140 130 L 220 200 L 320 270 L 460 380 L 520 460"
                  fill="none"
                  stroke="#dfe2ee"
                  strokeDasharray="4 2"
                  strokeOpacity="0.8"
                  strokeWidth="3"
                />
                {/* Submerged Road */}
                <path
                  d="M 205 185 L 220 200 L 320 270 L 375 310"
                  fill="none"
                  stroke="#ffb4ab"
                  strokeOpacity="0.95"
                  strokeWidth="4"
                />

                {/* Bridge Marker (BR-TR-04) */}
                <g transform="translate(220, 200)">
                  <circle r="14" fill="#ffb4ab" fillOpacity="0.2" className="animate-ping" />
                  <rect x="-8" y="-8" width="16" height="16" rx="2" fill="#93000a" stroke="#ffb4ab" strokeWidth="1.5" />
                  <line x1="-5" y1="-5" x2="5" y2="5" stroke="#ffffff" strokeWidth="1.5" />
                </g>

                {/* Substation Marker */}
                <g transform="translate(380, 240)">
                  <circle r="8" fill="#e79400" fillOpacity="0.4" />
                  <circle r="4" fill="#ffb95f" />
                </g>

                {/* Safe Hospital Marker */}
                <g transform="translate(130, 90)">
                  <circle r="6" fill="#00a572" fillOpacity="0.5" />
                  <rect x="-3" y="-3" width="6" height="6" fill="#4edea3" />
                </g>
              </svg>

              {/* HUD Chips */}
              <div className="absolute top-space-sm left-space-sm flex flex-col gap-1.5 pointer-events-auto">
                <div className="px-space-sm py-1 rounded bg-surface-container-lowest/90 backdrop-blur font-label-mono-sm text-label-mono-sm text-on-surface flex items-center gap-space-xs shadow border border-error/30">
                  <span className="w-2 h-2 rounded-full bg-error animate-pulse"></span>
                  <span className="font-medium text-error">FLOOD EXTENT ACTIVE ({analysis.metrics.floodExtentKm2} km²)</span>
                </div>
                <div className="px-space-sm py-1 rounded bg-surface-container-lowest/90 backdrop-blur font-label-mono-sm text-label-mono-sm text-on-surface-variant flex items-center gap-space-xs shadow border border-surface-container-high">
                  <span className="material-symbols-outlined text-xs text-outline">explore</span>
                  <span>27°58'12"N, 85°10'44"E • 582m ASL</span>
                </div>
              </div>

              {/* Bottom Target Card */}
              {assets[0] && (
                <div className="absolute bottom-space-sm left-space-sm right-space-sm p-space-sm rounded-lg bg-surface-container-lowest/95 backdrop-blur flex items-center justify-between gap-space-sm shadow-xl border border-surface-container-high/60">
                  <div className="flex items-center gap-space-sm min-w-0">
                    <div className="w-8 h-8 rounded bg-error-container/40 flex items-center justify-center text-error shrink-0">
                      <span className="material-symbols-outlined text-lg">warning</span>
                    </div>
                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-space-xs">
                        <span className="font-label-mono-md text-label-mono-md font-bold text-on-surface">{assets[0].id}</span>
                        <span className="px-1 py-0.2 rounded bg-error-container text-on-error-container font-label-mono-sm text-label-mono-sm">
                          {assets[0].floodOverlap}
                        </span>
                      </div>
                      <span className="font-body-sm text-body-sm text-on-surface-variant truncate">{assets[0].name}</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedAsset(assets[0])}
                    className="px-space-sm py-1 rounded bg-primary text-on-primary font-label-mono-sm text-label-mono-sm font-semibold whitespace-nowrap hover:bg-surface-tint cursor-pointer"
                  >
                    Inspect Asset
                  </button>
                </div>
              )}
            </div>

            <div className="p-space-sm bg-surface-container flex flex-wrap items-center justify-between gap-space-xs font-label-mono-sm text-label-mono-sm text-outline border-t border-surface-container-high/40">
              <div className="flex items-center gap-space-md">
                <span className="flex items-center gap-1"><span className="w-2.5 h-2 rounded bg-primary-container"></span> SAR Water Mask</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-1 rounded bg-error"></span> Compromised Road</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-error"></span> Critical Bridge</span>
              </div>
              <span>Scale 1:25,000</span>
            </div>
          </div>

          {/* RIGHT PANE: Asset Filter & High-Precision Data Table (7 Cols) */}
          <div className="lg:col-span-7 flex flex-col rounded-xl bg-surface-container-low shadow-md overflow-hidden border border-surface-container-high/40">
            {/* Filter Tabs */}
            <div className="p-space-sm bg-surface-container flex flex-wrap items-center gap-space-xs overflow-x-auto border-b border-surface-container-high/40">
              {[
                { id: 'all', label: `All Assets (${assets.length})` },
                { id: 'roads', label: 'Road Segments' },
                { id: 'bridges', label: 'Bridges & Crossings' },
                { id: 'buildings', label: 'Buildings & Shelters' },
                { id: 'utilities', label: 'Utilities' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setFilterCategory(tab.id)}
                  className={`px-space-md py-1.5 rounded-lg font-label-mono-sm text-label-mono-sm font-semibold transition-colors cursor-pointer ${
                    filterCategory === tab.id
                      ? 'bg-surface-container-high text-primary shadow-sm border border-primary/30'
                      : 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Search & Selectors Bar */}
            <div className="p-space-md bg-surface-container-low flex flex-col md:flex-row items-center justify-between gap-space-sm border-b border-surface-container-high/40">
              <div className="relative w-full md:w-64">
                <span className="material-symbols-outlined absolute left-2.5 top-2 text-outline text-lg">search</span>
                <input
                  type="text"
                  placeholder="Search Asset ID, location, OSM..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 rounded bg-surface-container-lowest text-on-surface placeholder:text-outline font-label-mono-sm text-label-mono-sm focus:outline-none focus:ring-1 focus:ring-primary border border-surface-container-high"
                />
              </div>

              <div className="flex items-center gap-space-sm w-full md:w-auto justify-end">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-space-sm py-1.5 rounded bg-surface-container text-on-surface font-label-mono-sm text-label-mono-sm focus:outline-none border border-surface-container-high cursor-pointer"
                >
                  <option value="all">Exposure: All Levels</option>
                  <option value="potentially-affected">Potentially Affected</option>
                  <option value="high-exposure">High Exposure</option>
                  <option value="moderate">Moderate Exposure</option>
                  <option value="cleared">Cleared / Safe</option>
                </select>

                <select
                  value={priorityFilter}
                  onChange={(e) => setPriorityFilter(e.target.value)}
                  className="px-space-sm py-1.5 rounded bg-surface-container text-on-surface font-label-mono-sm text-label-mono-sm focus:outline-none border border-surface-container-high cursor-pointer"
                >
                  <option value="all">Priority: All</option>
                  <option value="high">High Priority</option>
                  <option value="medium">Medium Priority</option>
                  <option value="cleared">Cleared</option>
                </select>
              </div>
            </div>

            {/* Data Table */}
            <div className="overflow-x-auto w-full">
              <table className="w-full text-left font-body-sm text-body-sm">
                <thead className="bg-surface-container-high/60 font-label-mono-sm text-label-mono-sm uppercase text-outline">
                  <tr>
                    <th className="py-space-sm px-space-md font-semibold">Asset ID / Type</th>
                    <th className="py-space-sm px-space-md font-semibold">Location & OSM Ref</th>
                    <th className="py-space-sm px-space-md font-semibold">Exposure Category</th>
                    <th className="py-space-sm px-space-md font-semibold">Flood Overlap</th>
                    <th className="py-space-sm px-space-md font-semibold">SAR Anomaly</th>
                    <th className="py-space-sm px-space-md font-semibold">Priority</th>
                    <th className="py-space-sm px-space-md text-right font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-container-high/30 text-on-surface">
                  {filteredAssets.map((asset) => (
                    <tr
                      key={asset.id}
                      onClick={() => setSelectedAsset(asset)}
                      className="hover:bg-surface-container-high/40 transition-colors cursor-pointer group"
                    >
                      <td className="py-space-md px-space-md">
                        <div className="flex flex-col">
                          <span className="font-label-mono-md text-label-mono-md font-bold text-primary">{asset.id}</span>
                          <span className="font-body-sm text-body-sm text-outline">{asset.type}</span>
                        </div>
                      </td>
                      <td className="py-space-md px-space-md">
                        <div className="flex flex-col">
                          <span className="font-body-md text-body-md font-medium text-on-surface">{asset.name}</span>
                          <span className="font-label-mono-sm text-label-mono-sm text-outline">{asset.osmRef}</span>
                        </div>
                      </td>
                      <td className="py-space-md px-space-md">
                        <span className={`inline-flex items-center gap-1 px-space-xs py-0.5 rounded font-label-mono-sm text-label-mono-sm font-semibold uppercase ${
                          asset.exposureCategory === 'POTENTIALLY AFFECTED' || asset.exposureCategory === 'HIGH EXPOSURE'
                            ? 'bg-error-container/30 text-error'
                            : asset.exposureCategory === 'MODERATE (PERIMETER)'
                            ? 'bg-tertiary-container/30 text-tertiary'
                            : 'bg-secondary-container/20 text-secondary'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            asset.exposureCategory.includes('AFFECTED') || asset.exposureCategory.includes('HIGH') ? 'bg-error' : asset.exposureCategory.includes('MODERATE') ? 'bg-tertiary' : 'bg-secondary'
                          }`}></span>
                          {asset.exposureCategory}
                        </span>
                      </td>
                      <td className="py-space-md px-space-md font-label-mono-md text-label-mono-md font-semibold text-error">
                        {asset.floodOverlap}
                      </td>
                      <td className="py-space-md px-space-md font-label-mono-md text-label-mono-md text-on-surface-variant">
                        {asset.sarAnomaly}
                      </td>
                      <td className="py-space-md px-space-md">
                        <span className={`px-space-xs py-0.5 rounded font-label-mono-sm text-label-mono-sm font-bold uppercase ${
                          asset.priority === 'High Priority' ? 'bg-error-container text-on-error-container' : asset.priority === 'Medium Priority' ? 'bg-tertiary-container/40 text-tertiary' : 'bg-secondary-container/20 text-secondary'
                        }`}>
                          {asset.priority}
                        </span>
                      </td>
                      <td className="py-space-md px-space-md text-right">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedAsset(asset);
                          }}
                          className="p-1 rounded hover:bg-surface-container text-primary cursor-pointer"
                          title="Inspect Detail"
                        >
                          <span className="material-symbols-outlined text-base">visibility</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Table Footer */}
            <div className="p-space-md bg-surface-container flex flex-col sm:flex-row items-center justify-between gap-space-sm font-label-mono-sm text-label-mono-sm text-on-surface-variant border-t border-surface-container-high/40">
              <div className="flex items-center gap-space-sm">
                <span>Showing <strong className="text-on-surface">{filteredAssets.length}</strong> flagged assets</span>
                <span className="text-outline-variant">•</span>
                <span className="text-outline">Algorithm: Otsu Adaptive Threshold + SRTM Hydro-Conditioning</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* DETAIL INSPECTION DRAWER */}
      {selectedAsset && (
        <div className="fixed inset-y-0 right-0 w-full sm:w-[480px] bg-surface-container-low shadow-2xl z-50 flex flex-col overflow-y-auto border-l border-surface-container-high">
          {/* Drawer Top Header */}
          <div className="p-space-lg bg-surface-container-high flex items-center justify-between border-b border-surface-container-highest">
            <div className="flex flex-col">
              <span className="font-label-mono-sm text-label-mono-sm text-primary uppercase tracking-wider font-semibold">Geospatial Vector Telemetry</span>
              <h3 className="font-headline-md text-headline-md text-on-surface font-bold">{selectedAsset.id}</h3>
            </div>
            <button
              type="button"
              onClick={() => setSelectedAsset(null)}
              className="p-1.5 rounded-lg bg-surface-container hover:bg-surface-variant text-on-surface transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-xl">close</span>
            </button>
          </div>

          {/* Drawer Body */}
          <div className="p-space-lg flex flex-col gap-space-lg flex-1">
            <div className="p-space-md rounded-xl bg-surface-container-lowest flex flex-col gap-space-xs shadow-sm border border-surface-container-high/40">
              <div className="flex items-center justify-between">
                <span className="font-label-mono-sm text-label-mono-sm text-outline uppercase">Computed Exposure</span>
                <span className="px-space-xs py-0.5 rounded bg-error-container text-on-error-container font-label-mono-sm text-label-mono-sm font-bold uppercase">
                  {selectedAsset.priority}
                </span>
              </div>
              <span className="font-headline-sm text-headline-sm text-error font-semibold">{selectedAsset.exposureCategory}</span>
              <span className="font-body-sm text-body-sm text-on-surface-variant">{selectedAsset.details}</span>
            </div>

            <div className="flex flex-col gap-space-xs">
              <span className="font-label-mono-sm text-label-mono-sm text-outline uppercase tracking-wider font-medium">OSM Attribute Baseline</span>
              <div className="grid grid-cols-2 gap-space-sm bg-surface-container p-space-md rounded-xl border border-surface-container-high/40">
                <div className="flex flex-col">
                  <span className="font-label-mono-sm text-label-mono-sm text-outline">Designation</span>
                  <span className="font-body-md text-body-md text-on-surface font-medium truncate">{selectedAsset.name}</span>
                </div>
                <div className="flex flex-col">
                  <span className="font-label-mono-sm text-label-mono-sm text-outline">Type</span>
                  <span className="font-body-md text-body-md text-on-surface font-medium truncate">{selectedAsset.type}</span>
                </div>
                <div className="flex flex-col">
                  <span className="font-label-mono-sm text-label-mono-sm text-outline">Source ID</span>
                  <span className="font-label-mono-sm text-label-mono-sm text-primary">{selectedAsset.osmRef}</span>
                </div>
                <div className="flex flex-col">
                  <span className="font-label-mono-sm text-label-mono-sm text-outline">Backscatter Delta</span>
                  <span className="font-label-mono-sm text-label-mono-sm text-error font-semibold">{selectedAsset.sarAnomaly}</span>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-space-xs">
              <span className="font-label-mono-sm text-label-mono-sm text-outline uppercase tracking-wider font-medium">Sensor Validation Stream</span>
              <div className="p-space-md rounded-xl bg-surface-container-high/40 flex flex-col gap-space-sm border border-surface-container-high/60">
                <div className="flex items-center justify-between font-label-mono-sm text-label-mono-sm">
                  <span className="text-on-surface-variant">Acquisition Platform:</span>
                  <span className="text-on-surface">Sentinel-1A IW GRD</span>
                </div>
                <div className="flex items-center justify-between font-label-mono-sm text-label-mono-sm">
                  <span className="text-on-surface-variant">Polarization:</span>
                  <span className="text-on-surface">Dual-pol (VV + VH)</span>
                </div>
                <div className="flex items-center justify-between font-label-mono-sm text-label-mono-sm">
                  <span className="text-on-surface-variant">Hydro-Conditioning:</span>
                  <span className="text-secondary">FABDEM Terrain Filtered (Slope &lt; 5°)</span>
                </div>
              </div>
            </div>

            <div className="mt-auto pt-space-md flex flex-col gap-space-sm">
              <button
                type="button"
                onClick={() => setDroneDispatched(!droneDispatched)}
                className={`w-full py-space-sm rounded font-label-mono-md text-label-mono-md font-semibold shadow cursor-pointer transition-colors ${
                  droneDispatched ? 'bg-secondary text-on-secondary' : 'bg-primary text-on-primary hover:bg-surface-tint'
                }`}
              >
                {droneDispatched ? 'Drone Reconnaissance Queued ✓' : 'Dispatch Field Inspection Drone'}
              </button>
              <button
                type="button"
                onClick={() => setSelectedAsset(null)}
                className="w-full py-space-sm rounded bg-surface-container hover:bg-surface-container-high text-on-surface font-label-mono-md text-label-mono-md cursor-pointer border border-surface-container-high/40"
              >
                Dismiss Drawer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
