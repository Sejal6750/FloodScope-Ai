import React, { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import { AnalysisAssessment, DataSourceStatus, GeoLocation } from '../types/index.ts';
import { SyntheticBanner } from './SyntheticBanner.tsx';

interface OverviewViewProps {
  analysis: AnalysisAssessment;
  analyses: AnalysisAssessment[];
  dataSources: DataSourceStatus[];
  selectedLocation?: GeoLocation | null;
  onNavigate: (path: string) => void;
  onSelectAnalysis: (id: string) => void;
}

export const OverviewView: React.FC<OverviewViewProps> = ({
  analysis,
  analyses,
  dataSources,
  selectedLocation,
  onNavigate,
  onSelectAnalysis
}) => {
  const [activeLayer, setActiveLayer] = useState<'sar' | 'rgb' | 'osm'>('sar');
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  const m = analysis.metrics;

  // Initialize mini overview satellite Leaflet map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const centerLat = analysis.center ? analysis.center[0] : 27.98;
      const centerLon = analysis.center ? analysis.center[1] : 85.18;

      const map = L.map(mapContainerRef.current, {
        center: [centerLat, centerLon],
        zoom: 11,
        zoomControl: true,
        attributionControl: true
      });

      // Esri World Imagery
      L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and GIS User Community',
        maxZoom: 18
      }).addTo(map);

      // AOI bounding box
      const [minLon, minLat, maxLon, maxLat] = analysis.bbox;
      L.rectangle([[minLat, minLon], [maxLat, maxLon]], {
        color: '#d97706',
        weight: 2,
        fillColor: '#f59e0b',
        fillOpacity: 0.12,
        dashArray: '5, 5'
      }).addTo(map);

      // Inundation polygon proxy
      L.polygon([
        [minLat + 0.05, minLon + 0.09],
        [minLat + 0.12, minLon + 0.13],
        [minLat + 0.19, minLon + 0.17],
        [minLat + 0.25, minLon + 0.22],
        [minLat + 0.23, minLon + 0.24],
        [minLat + 0.17, minLon + 0.19],
        [minLat + 0.10, minLon + 0.15],
        [minLat + 0.04, minLon + 0.11]
      ], {
        color: '#0284c7',
        weight: 2,
        fillColor: '#38bdf8',
        fillOpacity: 0.55
      }).bindTooltip(`Estimated Inundation: ${m.floodExtentKm2} km²`, { className: 'text-xs font-semibold' }).addTo(map);

      // POI Pins
      analysis.infrastructureAssets.slice(0, 3).forEach((asset) => {
        const marker = L.circleMarker([asset.lat, asset.lon], {
          radius: 6,
          color: '#d97706',
          fillColor: '#f59e0b',
          fillOpacity: 0.9,
          weight: 2
        }).addTo(map);
        marker.bindTooltip(`${asset.name} (${asset.exposureCategory})`, { className: 'text-xs font-semibold' });
      });

      mapInstanceRef.current = map;
    }

    const timer = setTimeout(() => {
      mapInstanceRef.current?.invalidateSize();
    }, 150);

    return () => clearTimeout(timer);
  }, [analysis, m.floodExtentKm2]);

  // Update overview map bounds when selectedLocation or analysis changes
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    if (selectedLocation) {
      const [minLon, minLat, maxLon, maxLat] = selectedLocation.bbox;
      try {
        mapInstanceRef.current.fitBounds([[minLat, minLon], [maxLat, maxLon]], { padding: [20, 20], maxZoom: 12 });
      } catch {
        mapInstanceRef.current.setView([selectedLocation.lat, selectedLocation.lon], 11);
      }
    } else if (analysis.bbox) {
      const [minLon, minLat, maxLon, maxLat] = analysis.bbox;
      try {
        mapInstanceRef.current.fitBounds([[minLat, minLon], [maxLat, maxLon]], { padding: [20, 20] });
      } catch {
        // ignore
      }
    }
  }, [selectedLocation, analysis.id]);

  return (
    <div className="flex flex-col w-full space-y-6">
      {/* Synthetic Demo Transparency Badge */}
      <SyntheticBanner dataMode={analysis.dataMode} analysisName={analysis.name} />

      {/* Selected Location Notice Bar if Unanalyzed AOI */}
      {selectedLocation && !selectedLocation.hasAnalysis && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3.5 rounded-xl bg-amber-50 border border-amber-300 text-amber-950 text-xs">
          <div className="flex items-center gap-2.5">
            <span className="material-symbols-outlined text-amber-700 text-lg">explore</span>
            <div>
              <span className="font-bold">Active Geographic Location: {selectedLocation.name}</span>
              <span className="text-slate-600 ml-1">
                ({selectedLocation.district ? `${selectedLocation.district}, ` : ''}{selectedLocation.state || 'India'} • {selectedLocation.lat.toFixed(4)}°N, {selectedLocation.lon.toFixed(4)}°E)
              </span>
              <div className="text-[11px] text-amber-800 mt-0.5">
                No processed flood analysis currently saved for this area. Currently displaying closest active operational workspace.
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('new-analysis')}
            className="px-3.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer shrink-0"
          >
            Run Flood Analysis for {selectedLocation.name}
          </button>
        </div>
      )}

      <div className="flex flex-col gap-6 max-w-[1720px] mx-auto w-full">
        {/* Top Action & Title Header */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 text-[10px] tracking-wider uppercase font-bold border border-amber-200">
                MISSION DISPATCH
              </span>
              <span className="text-slate-300">•</span>
              <span className="text-[10px] text-slate-500 tracking-wider uppercase font-semibold">
                GEOSPATIAL SITREP v2.4
              </span>
            </div>
            <div className="text-2xl font-extrabold text-slate-900 tracking-tight">
              Flood Intelligence Overview
            </div>
            <p className="text-xs text-slate-500 max-w-3xl">
              Multimodal satellite observations and pre-event OpenStreetMap spatial fusion for rapid disaster impact triage.
            </p>
          </div>

          {/* Action Button Group */}
          <div className="flex items-center gap-2 self-start lg:self-auto">
            <button
              type="button"
              onClick={() => onNavigate('flood-map-explorer')}
              className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-semibold shadow-xs cursor-pointer transition-colors"
            >
              <span className="material-symbols-outlined text-base text-amber-600">layers</span>
              <span>Explore Map Workspace</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigate('new-analysis')}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-sm cursor-pointer transition-colors"
            >
              <span className="material-symbols-outlined text-base font-bold">add</span>
              <span>New Flood Analysis</span>
            </button>
          </div>
        </div>

        {/* Active Analysis Summary Card */}
        <div className="relative overflow-hidden rounded-xl bg-white shadow-sm border border-slate-200">
          <div className="h-1.5 w-full bg-gradient-to-r from-amber-500 via-amber-400 to-emerald-500"></div>
          <div className="p-6 flex flex-col gap-4">
            {/* Top Status & Verification Badge */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-500 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-600"></span>
                </span>
                <span className="text-sm font-bold text-slate-900">
                  Active Dataset: {analysis.name}
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-amber-50 text-amber-800 font-semibold uppercase border border-amber-200">
                  SAR-OPTI-FUSION
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold">
                  <span className="material-symbols-outlined text-sm leading-none">verified</span>
                  <span>{analysis.processingStatus === 'COMPLETED_VALIDATED' ? 'Outputs Validated' : 'Algorithmic Ingest Ready'}</span>
                </div>
              </div>
            </div>

            {/* Metadata Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 pt-1">
              <div className="flex flex-col gap-0.5 p-3 rounded-lg bg-slate-50 border border-slate-200">
                <span className="text-[10px] text-slate-400 font-bold uppercase">Area of Interest</span>
                <span className="text-xs text-slate-800 font-bold truncate">{analysis.aoiName}</span>
                <span className="text-[10px] text-slate-500">{analysis.areaKm2.toLocaleString()} km² coverage</span>
              </div>
              <div className="flex flex-col gap-0.5 p-3 rounded-lg bg-slate-50 border border-slate-200">
                <span className="text-[10px] text-slate-400 font-bold uppercase">Event Window</span>
                <span className="text-xs text-slate-800 font-bold">{analysis.eventWindow.start} → {analysis.eventWindow.end}</span>
                <span className="text-[10px] text-amber-700 font-semibold">{analysis.eventWindow.label || 'Peak Surge Window'}</span>
              </div>
              <div className="flex flex-col gap-0.5 p-3 rounded-lg bg-slate-50 border border-slate-200">
                <span className="text-[10px] text-slate-400 font-bold uppercase">Pre-Event Baseline</span>
                <span className="text-xs text-slate-800 font-bold truncate">{analysis.baselineDate}</span>
                <span className="text-[10px] text-slate-500">Dry Season Reference</span>
              </div>
              <div className="flex flex-col gap-0.5 p-3 rounded-lg bg-slate-50 border border-slate-200">
                <span className="text-[10px] text-slate-400 font-bold uppercase">Post-Event Observation</span>
                <span className="text-xs text-slate-800 font-bold truncate">{analysis.postEventDate}</span>
                <span className="text-[10px] text-emerald-700 font-semibold">Sentinel-1 Orbit 121</span>
              </div>
              <div className="flex flex-col gap-0.5 p-3 rounded-lg bg-slate-50 border border-slate-200">
                <span className="text-[10px] text-slate-400 font-bold uppercase">Computational Pipeline</span>
                <span className="text-xs text-slate-800 font-bold truncate">Dual-Pol SAR + DEM Mask</span>
                <span className="text-[10px] text-amber-700 font-semibold">Inference Latency: 42s</span>
              </div>
              <div className="flex flex-col justify-between p-3 rounded-lg bg-slate-50 border border-slate-200">
                <span className="text-[10px] text-slate-400 font-bold uppercase">Integrity Status</span>
                <div className="flex items-center gap-1 text-amber-800 text-xs font-bold">
                  <span className="material-symbols-outlined text-sm text-amber-700">science</span>
                  <span className="truncate">{analysis.dataMode === 'DEMO_SYNTHETIC' ? 'Synthetic Testbed' : 'Calibrated Sample'}</span>
                </div>
                <span className="text-[10px] text-slate-400 truncate">Multimodal Hackathon 2026</span>
              </div>
            </div>

            {/* Testbed Notice Bar */}
            <div className="flex flex-wrap items-center justify-between px-3.5 py-2 rounded-lg bg-amber-50 border border-amber-200 gap-2">
              <div className="flex items-center gap-2 text-amber-900 text-xs">
                <span className="material-symbols-outlined text-sm text-amber-700">info</span>
                <span>
                  {analysis.dataMode === 'DEMO_SYNTHETIC'
                    ? 'Synthetic Testbed Data for Multimodal AI Hackathon 2026 Evaluation. Transparent pipeline validation.'
                    : 'Calibrated regional observations for disaster triage analysis.'}
                </span>
              </div>
              <div className="text-amber-800 text-[11px] font-semibold flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-600 animate-pulse"></span>
                <span>Esri World Imagery: Connected</span>
              </div>
            </div>
          </div>
        </div>

        {/* Top Analytical Metric KPI Cards (4 Cards) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* KPI 1 */}
          <div className="rounded-xl bg-white p-5 flex flex-col justify-between gap-3 shadow-sm border border-slate-200 hover:border-amber-300 transition-all">
            <div className="flex items-start justify-between">
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Estimated Flood Extent</span>
                <span className="text-3xl font-extrabold text-amber-700 font-mono tracking-tight">
                  {m.floodExtentKm2} <span className="text-sm font-sans font-normal text-slate-600">km²</span>
                </span>
              </div>
              <div className="p-2.5 rounded-lg bg-amber-50 text-amber-700 border border-amber-200">
                <span className="material-symbols-outlined text-xl">flood</span>
              </div>
            </div>
            <div className="flex flex-col gap-1 pt-1 border-t border-slate-100">
              <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono">
                <span>SAR Δσ° &lt; {analysis.provenance.sarThresholdDb}dB</span>
                <span className="text-emerald-700 font-semibold">±{m.uncertaintyMarginKm2} km² margin</span>
              </div>
              <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-amber-500 rounded-full" style={{ width: '68%' }}></div>
              </div>
            </div>
          </div>

          {/* KPI 2 */}
          <div className="rounded-xl bg-white p-5 flex flex-col justify-between gap-3 shadow-sm border border-slate-200 hover:border-amber-300 transition-all">
            <div className="flex items-start justify-between">
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Potentially Exposed Roads</span>
                <span className="text-3xl font-extrabold text-amber-700 font-mono tracking-tight">
                  {m.exposedRoadKm} <span className="text-sm font-sans font-normal text-slate-600">km</span>
                </span>
              </div>
              <div className="p-2.5 rounded-lg bg-amber-50 text-amber-700 border border-amber-200">
                <span className="material-symbols-outlined text-xl">traffic</span>
              </div>
            </div>
            <div className="flex flex-col gap-1 pt-1 border-t border-slate-100">
              <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono">
                <span>{m.exposedRoadSegmentsCount} intersecting segments</span>
                <span className="text-amber-800 font-semibold">H04 Highway Cut</span>
              </div>
              <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-amber-600 rounded-full" style={{ width: '45%' }}></div>
              </div>
            </div>
          </div>

          {/* KPI 3 */}
          <div className="rounded-xl bg-white p-5 flex flex-col justify-between gap-3 shadow-sm border border-slate-200 hover:border-rose-300 transition-all">
            <div className="flex items-start justify-between">
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Infrastructure In Hazard</span>
                <span className="text-3xl font-extrabold text-rose-700 font-mono tracking-tight">
                  {m.infrastructureUnitsCount} <span className="text-sm font-sans font-normal text-slate-600">Units</span>
                </span>
              </div>
              <div className="p-2.5 rounded-lg bg-rose-50 text-rose-700 border border-rose-200">
                <span className="material-symbols-outlined text-xl">domain_disabled</span>
              </div>
            </div>
            <div className="flex flex-col gap-1 pt-1 border-t border-slate-100">
              <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono">
                <span>{m.buildingsCount} buildings, {m.bridgesCount} bridges</span>
                <span className="text-rose-700 font-bold">{m.substationsCount} Substation</span>
              </div>
              <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-rose-500 rounded-full" style={{ width: '82%' }}></div>
              </div>
            </div>
          </div>

          {/* KPI 4 */}
          <div className="rounded-xl bg-white p-5 flex flex-col justify-between gap-3 shadow-sm border border-slate-200 hover:border-amber-300 transition-all">
            <div className="flex items-start justify-between">
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Cut-Off Settlements</span>
                <span className="text-3xl font-extrabold text-rose-700 font-mono tracking-tight">
                  {m.cutOffSettlementsCount} <span className="text-sm font-sans font-normal text-slate-600">Wards</span>
                </span>
              </div>
              <div className="p-2.5 rounded-lg bg-rose-50 text-rose-700 border border-rose-200">
                <span className="material-symbols-outlined text-xl">alt_route</span>
              </div>
            </div>
            <div className="flex flex-col gap-1 pt-1 border-t border-slate-100">
              <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono">
                <span>Dijkstra Graph Severed</span>
                <span className="text-slate-700 font-semibold">Trishuli Hospital Route</span>
              </div>
              <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-rose-600 rounded-full" style={{ width: '40%' }}></div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Dashboard Grid (8 cols / 4 cols) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column (8 cols): Interactive Geospatial Preview & Recent Analyses */}
          <div className="lg:col-span-8 flex flex-col gap-6 min-w-0">
            {/* Interactive Geospatial Preview Card with Real Satellite Map */}
            <div className="rounded-xl bg-white overflow-hidden shadow-sm flex flex-col border border-slate-200">
              {/* Card Header HUD */}
              <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-amber-600 text-base">satellite_alt</span>
                  <span className="text-xs font-bold text-slate-900">Geospatial Inundation Matrix</span>
                  <span className="px-2 py-0.5 rounded bg-white text-slate-500 border border-slate-200 text-[10px] font-mono">
                    Esri World Imagery
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onNavigate('flood-map-explorer')}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 text-xs font-semibold transition-colors cursor-pointer"
                  >
                    <span>Open Full Map Explorer</span>
                    <span className="material-symbols-outlined text-xs">arrow_forward</span>
                  </button>
                </div>
              </div>

              {/* Map Viewport Area */}
              <div className="relative w-full h-[400px] bg-slate-100">
                <div ref={mapContainerRef} className="w-full h-full z-0" />

                {/* Floating Legend Palette */}
                <div className="absolute bottom-3 left-3 p-2.5 rounded-lg bg-white/95 backdrop-blur-md shadow-md flex flex-col gap-1 border border-slate-200 z-10 text-[10px]">
                  <span className="text-slate-400 uppercase font-bold">Classification Legend</span>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1">
                      <span className="h-2.5 w-2.5 rounded bg-sky-400 border border-sky-600"></span>
                      <span className="text-slate-800 font-semibold">SAR Flood Extent</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="h-2.5 w-2.5 rounded bg-amber-500 border border-amber-700"></span>
                      <span className="text-slate-800 font-semibold">Critical Asset</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Telemetry Ticker below map */}
              <div className="px-4 py-2.5 bg-slate-50 flex items-center justify-between text-[11px] font-mono text-slate-600 border-t border-slate-200">
                <div className="flex items-center gap-3">
                  <span>
                    Hydro Basin: <strong className="text-slate-800">Trishuli Gorge Catchment</strong>
                  </span>
                  <span className="hidden md:inline">
                    Flow Status: <strong className="text-amber-700">+1.8m Crest (Monsoon Surge)</strong>
                  </span>
                </div>
                <div className="flex items-center gap-1 text-amber-700 font-semibold">
                  <span className="material-symbols-outlined text-xs">schedule</span>
                  <span>Sentinel-1 Pass Synchronized</span>
                </div>
              </div>
            </div>

            {/* Recent Analyses Table Card */}
            <div className="rounded-xl bg-white shadow-sm flex flex-col overflow-hidden border border-slate-200">
              <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-amber-600 text-base">table_chart</span>
                  <span className="text-xs font-bold text-slate-900">Recent Satellite Disaster Assessments</span>
                </div>
                <span className="text-[10px] text-slate-500 font-mono">
                  {analyses.length} Catalogued Missions
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-slate-100 text-slate-600 uppercase text-[10px] tracking-wider border-b border-slate-200 font-semibold">
                      <th className="px-4 py-2.5">AOI Name</th>
                      <th className="px-4 py-2.5">Event Date</th>
                      <th className="px-4 py-2.5">Platform</th>
                      <th className="px-4 py-2.5 text-right">Detected Flood</th>
                      <th className="px-4 py-2.5">Status</th>
                      <th className="px-4 py-2.5 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-800">
                    {analyses.map((a) => {
                      const isActive = a.id === analysis.id;
                      return (
                        <tr key={a.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <span className={`h-2 w-2 rounded-full ${isActive ? 'bg-amber-600' : 'bg-slate-300'}`}></span>
                              <div>
                                <span className="font-bold text-slate-900 block">{a.name}</span>
                                <span className="text-[10px] text-slate-400">{a.aoiName}</span>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 font-mono text-[11px] text-slate-600">
                            {a.eventWindow.end}
                          </td>
                          <td className="px-4 py-3">
                            <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-semibold">
                              {a.provenance?.sources?.[0]?.name?.split(' ')[0] || 'Sentinel-1'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right font-mono font-bold text-amber-700">
                            {a.metrics.floodExtentKm2} km²
                          </td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              isActive ? 'bg-amber-100 text-amber-800 border border-amber-300' : 'bg-slate-100 text-slate-600'
                            }`}>
                              {isActive ? 'Active Mission' : 'Archived'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              type="button"
                              onClick={() => onSelectAnalysis(a.id)}
                              className="px-2.5 py-1 rounded bg-slate-100 hover:bg-amber-600 hover:text-white text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
                            >
                              {isActive ? 'Active' : 'Load'}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Right Column (4 cols): Pipeline Health & Alert Feed */}
          <div className="lg:col-span-4 flex flex-col gap-6">
            {/* Multi-Source Pipeline Health Panel */}
            <div className="rounded-xl bg-white shadow-sm flex flex-col overflow-hidden border border-slate-200">
              <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-amber-600 text-base">hub</span>
                  <span className="text-xs font-bold text-slate-900">Pipeline & Sensor Readiness</span>
                </div>
                <button
                  type="button"
                  onClick={() => onNavigate('settings')}
                  className="text-[10px] text-amber-700 font-bold hover:underline"
                >
                  Diagnostics →
                </button>
              </div>
              <div className="p-4 flex flex-col gap-3">
                {dataSources.map((source) => (
                  <div key={source.id} className="p-3 rounded-lg bg-slate-50 border border-slate-200 flex flex-col gap-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900">{source.name}</span>
                      <span className={`text-[10px] px-1.5 py-0.2 rounded font-bold ${
                        source.status.includes('CONNECTED') || source.status.includes('CACHED')
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          : 'bg-amber-100 text-amber-800 border border-amber-300'
                      }`}>
                        {source.statusLabel}
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-500 leading-tight">
                      {source.description}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Actionable Incident Alert Feed */}
            <div className="rounded-xl bg-white shadow-sm flex flex-col overflow-hidden border border-slate-200">
              <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-rose-600 text-base">notification_important</span>
                  <span className="text-xs font-bold text-slate-900">Tactical SitRep Alerts</span>
                </div>
                <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-800 text-[10px] font-bold border border-rose-300">
                  3 CRITICAL
                </span>
              </div>
              <div className="p-4 flex flex-col gap-3">
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-rose-100 text-rose-800 font-bold">
                      ROADWAY SEVERED
                    </span>
                    <span className="text-[10px] text-slate-400">14m ago</span>
                  </div>
                  <p className="text-xs font-semibold text-slate-800">
                    Trishuli-Dhunche Highway (Feeder 04) submerged at Km 18 near Betrawati confluence.
                  </p>
                  <button
                    type="button"
                    onClick={() => onNavigate('infrastructure-impact')}
                    className="text-amber-700 text-xs font-semibold hover:underline flex items-center gap-0.5 pt-1 cursor-pointer"
                  >
                    Inspect Asset <span className="material-symbols-outlined text-xs">arrow_forward</span>
                  </button>
                </div>

                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 font-bold">
                      ISOLATED SETTLEMENT
                    </span>
                    <span className="text-[10px] text-slate-400">48m ago</span>
                  </div>
                  <p className="text-xs font-semibold text-slate-800">
                    Syabrubesi Ward 3 isolated: bridge deck compromised, secondary trail impassable.
                  </p>
                  <button
                    type="button"
                    onClick={() => onNavigate('settlement-accessibility')}
                    className="text-amber-700 text-xs font-semibold hover:underline flex items-center gap-0.5 pt-1 cursor-pointer"
                  >
                    Route Assist <span className="material-symbols-outlined text-xs">arrow_forward</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
