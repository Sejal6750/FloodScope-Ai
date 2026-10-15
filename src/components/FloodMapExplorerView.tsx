import React, { useState, useRef, useEffect } from 'react';
import L from 'leaflet';
import { AnalysisAssessment, InfrastructureAsset, GeoLocation } from '../types/index.ts';
import { SyntheticBanner } from './SyntheticBanner.tsx';

interface FloodMapExplorerViewProps {
  analysis: AnalysisAssessment;
  selectedLocation?: GeoLocation | null;
  onNavigate: (path: string) => void;
}

export const FloodMapExplorerView: React.FC<FloodMapExplorerViewProps> = ({
  analysis,
  selectedLocation,
  onNavigate
}) => {
  // State for wiper split
  const [splitPercent, setSplitPercent] = useState<number>(50);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [inspectMode, setInspectMode] = useState<'swipe' | 'side-by-side' | 'single'>('swipe');
  const [basemap, setBasemap] = useState<'satellite' | 'osm'>('satellite');
  const [dimensionMode, setDimensionMode] = useState<'2d' | '3d'>('2d');

  // Layer toggles
  const [layerFlood, setLayerFlood] = useState<boolean>(true);
  const [floodOpacity, setFloodOpacity] = useState<number>(75);
  const [layerDebris, setLayerDebris] = useState<boolean>(true);
  const [debrisOpacity, setDebrisOpacity] = useState<number>(60);
  const [layerRoads, setLayerRoads] = useState<boolean>(true);
  const [layerInfra, setLayerInfra] = useState<boolean>(true);
  const [layerSlope, setLayerSlope] = useState<boolean>(false);
  const [layerCloudMask, setLayerCloudMask] = useState<boolean>(false);

  // Panel toggles
  const [leftPanelOpen, setLeftPanelOpen] = useState<boolean>(true);
  const [rightPanelOpen, setRightPanelOpen] = useState<boolean>(true);
  const [selectedFeature, setSelectedFeature] = useState<InfrastructureAsset>(
    analysis.infrastructureAssets[0] || {
      id: 'BR-TR-04',
      type: 'Concrete Truss (Span 142m)',
      name: 'Trishuli Khola Bridge #04',
      osmRef: 'OSM ID #492810',
      exposureCategory: 'POTENTIALLY AFFECTED',
      floodOverlap: '94% Deck Overlap',
      sarAnomaly: '-6.4 dB',
      priority: 'High Priority',
      lat: 27.9812,
      lon: 85.1784,
      details: 'Bridge Span Overlap Detected (Deck submerged proxy)'
    }
  );

  const [flaggedVerified, setFlaggedVerified] = useState<boolean>(false);
  const [exportDropdownOpen, setExportDropdownOpen] = useState<boolean>(false);

  // Dynamic coordinates on mousemove
  const [hudCoords, setHudCoords] = useState<{ lat: string; lon: string }>({
    lat: "27°58'42\"N",
    lon: "85°10'15\"E"
  });

  const isLocationUnanalyzed = Boolean(
    selectedLocation &&
    !selectedLocation.hasAnalysis &&
    selectedLocation.analysisId !== analysis.id &&
    !analysis.name.toLowerCase().includes(selectedLocation.name.toLowerCase())
  );

  const mapViewportRef = useRef<HTMLDivElement>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const baseTileLayerRef = useRef<L.TileLayer | null>(null);
  const floodGeoLayerRef = useRef<L.LayerGroup | null>(null);
  const aoiRectRef = useRef<L.Rectangle | null>(null);
  const markersGroupRef = useRef<L.LayerGroup | null>(null);

  // Initialize and maintain the real Leaflet Satellite Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const centerLat = analysis.center ? analysis.center[0] : 27.98;
      const centerLon = analysis.center ? analysis.center[1] : 85.18;

      const map = L.map(mapContainerRef.current, {
        center: [centerLat, centerLon],
        zoom: 12,
        zoomControl: false, // Custom controls in toolbar
        attributionControl: true
      });

      map.on('mousemove', (e) => {
        setHudCoords({
          lat: `${e.latlng.lat.toFixed(4)}°N`,
          lon: `${e.latlng.lng.toFixed(4)}°E`
        });
      });

      mapInstanceRef.current = map;
      floodGeoLayerRef.current = L.layerGroup().addTo(map);
      markersGroupRef.current = L.layerGroup().addTo(map);
    }

    const map = mapInstanceRef.current;

    // Manage Basemap Tile Layer
    if (baseTileLayerRef.current) {
      map.removeLayer(baseTileLayerRef.current);
    }

    if (basemap === 'satellite') {
      baseTileLayerRef.current = L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        {
          attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and GIS User Community',
          maxZoom: 18
        }
      ).addTo(map);
    } else {
      baseTileLayerRef.current = L.tileLayer(
        'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
          maxZoom: 19
        }
      ).addTo(map);
    }

    const isLocationUnanalyzed = Boolean(
      selectedLocation &&
      !selectedLocation.hasAnalysis &&
      selectedLocation.analysisId !== analysis.id &&
      !analysis.name.toLowerCase().includes(selectedLocation.name.toLowerCase())
    );

    // Render AOI Bounding Box
    if (aoiRectRef.current) {
      map.removeLayer(aoiRectRef.current);
    }

    const [minLon, minLat, maxLon, maxLat] = selectedLocation ? selectedLocation.bbox : analysis.bbox;
    const aoiBounds: L.LatLngBoundsExpression = [[minLat, minLon], [maxLat, maxLon]];
    aoiRectRef.current = L.rectangle(aoiBounds, {
      color: '#d97706',
      weight: 2,
      fillColor: '#f59e0b',
      fillOpacity: 0.08,
      dashArray: '5, 5'
    }).addTo(map);

    // Update Flood Inundation & Debris Layers
    if (floodGeoLayerRef.current) {
      floodGeoLayerRef.current.clearLayers();

      // Only show inundation if looking at an analyzed assessment (do not fabricate results for newly selected unanalyzed regions)
      if (layerFlood && !isLocationUnanalyzed) {
        // Approximate real flood corridor along the river within AOI
        const floodPolygons: [number, number][][] = [
          [
            [minLat + 0.04, minLon + 0.08],
            [minLat + 0.09, minLon + 0.12],
            [minLat + 0.16, minLon + 0.15],
            [minLat + 0.22, minLon + 0.19],
            [minLat + 0.28, minLon + 0.24],
            [minLat + 0.27, minLon + 0.26],
            [minLat + 0.21, minLon + 0.21],
            [minLat + 0.14, minLon + 0.17],
            [minLat + 0.08, minLon + 0.14],
            [minLat + 0.03, minLon + 0.10]
          ],
          [
            [minLat + 0.11, minLon + 0.13],
            [minLat + 0.15, minLon + 0.14],
            [minLat + 0.14, minLon + 0.17],
            [minLat + 0.10, minLon + 0.16]
          ]
        ];

        floodPolygons.forEach((polyCoords) => {
          L.polygon(polyCoords, {
            color: '#0284c7',
            weight: 2,
            fillColor: '#0ea5e9',
            fillOpacity: (floodOpacity / 100) * 0.7,
            dashArray: '2, 2'
          }).bindTooltip(`Inundated Extent: ${analysis.metrics.floodExtentKm2} km² (SAR Δσ°)`, {
            className: 'font-semibold text-xs text-sky-900 bg-white border border-sky-300'
          }).addTo(floodGeoLayerRef.current!);
        });
      }

      if (layerDebris && !isLocationUnanalyzed) {
        const debrisCoords: [number, number][][] = [
          [
            [minLat + 0.18, minLon + 0.17],
            [minLat + 0.21, minLon + 0.18],
            [minLat + 0.20, minLon + 0.21],
            [minLat + 0.17, minLon + 0.19]
          ]
        ];

        debrisCoords.forEach((coords) => {
          L.polygon(coords, {
            color: '#b45309',
            weight: 1.5,
            fillColor: '#d97706',
            fillOpacity: (debrisOpacity / 100) * 0.6
          }).bindTooltip('Silt & Debris Runoff', {
            className: 'text-xs font-semibold text-amber-900 bg-white border border-amber-300'
          }).addTo(floodGeoLayerRef.current!);
        });
      }

      if (layerRoads && !isLocationUnanalyzed) {
        // Exposed road segment
        const roadPoints: [number, number][] = [
          [minLat + 0.06, minLon + 0.09],
          [minLat + 0.12, minLon + 0.13],
          [minLat + 0.18, minLon + 0.16],
          [minLat + 0.24, minLon + 0.21]
        ];

        L.polyline(roadPoints, {
          color: '#dc2626',
          weight: 4,
          dashArray: '8, 6',
          opacity: 0.9
        }).bindTooltip(`Severed Highway: ${analysis.metrics.exposedRoadKm} km submerged`, {
          className: 'text-xs font-bold text-rose-800 bg-white border border-rose-300'
        }).addTo(floodGeoLayerRef.current!);
      }
    }

    // Update Interactive Markers for Infrastructure Assets & Settlements
    if (markersGroupRef.current) {
      markersGroupRef.current.clearLayers();

      if (isLocationUnanalyzed && selectedLocation) {
        // Draw selected location marker
        const locIconHtml = `
          <div style="background-color: #fef3c7; border: 2px solid #d97706; color: #92400e; border-radius: 9999px; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.15); font-weight: bold; cursor: pointer;">
            <span class="material-symbols-outlined" style="font-size: 18px; color: #d97706;">location_on</span>
          </div>
        `;
        const locMarker = L.marker([selectedLocation.lat, selectedLocation.lon], {
          icon: L.divIcon({ html: locIconHtml, className: 'loc-pin', iconSize: [32, 32], iconAnchor: [16, 16] })
        }).addTo(markersGroupRef.current!);
        locMarker.bindTooltip(`<strong>${selectedLocation.name}</strong><br/>${selectedLocation.displayName}`, {
          permanent: true,
          direction: 'top',
          offset: [0, -16],
          className: 'text-xs font-semibold'
        });
      } else if (layerInfra) {
        analysis.infrastructureAssets.forEach((asset) => {
          const isCritical = asset.priority === 'High Priority';
          const iconHtml = `
            <div style="background-color: ${isCritical ? '#fee2e2' : '#fef3c7'}; border: 2px solid ${isCritical ? '#dc2626' : '#d97706'}; color: ${isCritical ? '#991b1b' : '#92400e'}; border-radius: 9999px; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); cursor: pointer;">
              <span class="material-symbols-outlined" style="font-size: 16px;">${isCritical ? 'warning' : 'corporate_fare'}</span>
            </div>
          `;

          const divIcon = L.divIcon({
            html: iconHtml,
            className: 'custom-poi-marker',
            iconSize: [28, 28],
            iconAnchor: [14, 14]
          });

          const marker = L.marker([asset.lat, asset.lon], { icon: divIcon });
          marker.on('click', () => {
            setSelectedFeature(asset);
            setRightPanelOpen(true);
          });
          marker.bindTooltip(`<strong>${asset.name}</strong><br/>${asset.exposureCategory}`, {
            direction: 'top',
            offset: [0, -14],
            className: 'text-xs font-semibold'
          });
          marker.addTo(markersGroupRef.current!);
        });

        // Add Settlement Markers
        analysis.settlements.forEach((s) => {
          const isCutOff = s.status === 'POTENTIALLY CUT OFF';
          const iconHtml = `
            <div style="background-color: ${isCutOff ? '#fee2e2' : '#ecfdf5'}; border: 2px solid ${isCutOff ? '#dc2626' : '#059669'}; color: ${isCutOff ? '#991b1b' : '#065f46'}; border-radius: 8px; padding: 2px 6px; font-size: 11px; font-weight: 700; box-shadow: 0 2px 4px rgba(0,0,0,0.1); white-space: nowrap; cursor: pointer; display: flex; align-items: center; gap: 4px;">
              <span class="material-symbols-outlined" style="font-size: 13px;">${isCutOff ? 'crisis_alert' : 'home_work'}</span>
              <span>${s.name}</span>
            </div>
          `;

          const divIcon = L.divIcon({
            html: iconHtml,
            className: 'settlement-marker',
            iconAnchor: [30, 12]
          });

          const marker = L.marker([s.coords[0], s.coords[1]], { icon: divIcon });
          marker.bindTooltip(`Settlement: ${s.name} (${s.status})<br/>Route: ${s.primaryRoute}`, {
            direction: 'top',
            offset: [0, -12],
            className: 'text-xs font-semibold'
          });
          marker.addTo(markersGroupRef.current!);
        });
      }
    }

    const resizeTimer = setTimeout(() => {
      map.invalidateSize();
    }, 150);

    return () => clearTimeout(resizeTimer);
  }, [analysis, selectedLocation, basemap, layerFlood, floodOpacity, layerDebris, debrisOpacity, layerRoads, layerInfra, leftPanelOpen, rightPanelOpen]);

  // Fit AOI bounds when analysis ID or selectedLocation changes
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    if (selectedLocation) {
      const [minLon, minLat, maxLon, maxLat] = selectedLocation.bbox;
      try {
        mapInstanceRef.current.fitBounds([[minLat, minLon], [maxLat, maxLon]], {
          padding: [35, 35],
          maxZoom: 12
        });
      } catch {
        mapInstanceRef.current.setView([selectedLocation.lat, selectedLocation.lon], 11);
      }
    } else if (analysis.bbox) {
      const [minLon, minLat, maxLon, maxLat] = analysis.bbox;
      try {
        mapInstanceRef.current.fitBounds([[minLat, minLon], [maxLat, maxLon]], { padding: [30, 30] });
      } catch {
        // ignore
      }
    }
  }, [selectedLocation, analysis.id]);

  const handleZoomIn = () => {
    mapInstanceRef.current?.zoomIn();
  };

  const handleZoomOut = () => {
    mapInstanceRef.current?.zoomOut();
  };

  const handleFitAOI = () => {
    if (mapInstanceRef.current) {
      const [minLon, minLat, maxLon, maxLat] = selectedLocation ? selectedLocation.bbox : analysis.bbox;
      mapInstanceRef.current.fitBounds([[minLat, minLon], [maxLat, maxLon]], { padding: [30, 30] });
    }
  };

  const exportGeoJson = () => {
    const data = {
      type: 'FeatureCollection',
      analysisId: analysis.id,
      timestamp: new Date().toISOString(),
      feature: selectedFeature
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/geo+json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedFeature.id || 'feature'}.geojson`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col w-full relative space-y-4">
      <SyntheticBanner dataMode={analysis.dataMode} analysisName={analysis.name} />

      {/* Main Map Workspace Layout */}
      <div className="relative w-full h-[calc(100vh-10rem)] min-h-[580px] rounded-xl overflow-hidden shadow-sm border border-slate-200 bg-white">
        
        {/* TOP COMMAND TOOLBAR */}
        <div className="absolute top-0 left-0 right-0 z-30 h-14 bg-white/95 backdrop-blur-md px-4 border-b border-slate-200 flex items-center justify-between gap-4">
          
          {/* Left Cartographic Tools */}
          <div className="flex items-center gap-2">
            <div className="flex items-center bg-slate-50 rounded-lg p-0.5 border border-slate-200">
              <button 
                type="button"
                onClick={handleZoomIn}
                className="w-8 h-8 flex items-center justify-center rounded hover:bg-white text-slate-700 hover:text-amber-700 transition-colors cursor-pointer"
                title="Zoom In (+)"
              >
                <span className="material-symbols-outlined text-base">add</span>
              </button>
              <button 
                type="button"
                onClick={handleZoomOut}
                className="w-8 h-8 flex items-center justify-center rounded hover:bg-white text-slate-700 hover:text-amber-700 transition-colors cursor-pointer"
                title="Zoom Out (-)"
              >
                <span className="material-symbols-outlined text-base">remove</span>
              </button>
              <div className="w-px h-4 bg-slate-200 mx-1"></div>
              <button 
                type="button"
                onClick={handleFitAOI}
                className="px-2.5 h-8 flex items-center gap-1.5 rounded hover:bg-white text-amber-700 text-xs font-semibold cursor-pointer"
                title="Fit to AOI"
              >
                <span className="material-symbols-outlined text-sm">filter_center_focus</span>
                <span>Fit AOI</span>
              </button>
            </div>

            {/* 2D / 3D DEM Terrain Toggle */}
            <div className="hidden sm:flex items-center bg-slate-50 rounded-lg p-0.5 border border-slate-200">
              <button 
                type="button"
                onClick={() => setDimensionMode('2d')}
                className={`px-3 h-8 rounded text-xs font-semibold transition-colors cursor-pointer ${
                  dimensionMode === '2d' ? 'bg-amber-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                2D Planar
              </button>
              <button 
                type="button"
                onClick={() => setDimensionMode('3d')}
                className={`px-3 h-8 rounded text-xs font-semibold transition-colors cursor-pointer ${
                  dimensionMode === '3d' ? 'bg-amber-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                3D Topo Mesh
              </button>
            </div>
          </div>

          {/* Center Comparison Mode Controls */}
          <div className="flex items-center bg-slate-50 rounded-lg p-1 border border-slate-200">
            <span className="text-[11px] text-slate-500 px-2 font-semibold uppercase tracking-wider hidden lg:inline">
              Compare Mode:
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setInspectMode('swipe')}
                className={`px-3 py-1 rounded text-xs font-semibold transition-colors cursor-pointer ${
                  inspectMode === 'swipe' ? 'bg-amber-100 text-amber-900 shadow-sm border border-amber-300' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Split Wipe
              </button>
              <button
                type="button"
                onClick={() => setInspectMode('single')}
                className={`px-3 py-1 rounded text-xs font-semibold transition-colors cursor-pointer ${
                  inspectMode === 'single' ? 'bg-amber-100 text-amber-900 shadow-sm border border-amber-300' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Full Satellite View
              </button>
            </div>
          </div>

          {/* Right Imagery Basemap Selector */}
          <div className="flex items-center gap-2">
            <div className="flex items-center bg-slate-50 rounded-lg p-0.5 border border-slate-200 text-xs">
              <button
                type="button"
                onClick={() => setBasemap('satellite')}
                className={`px-2.5 py-1 rounded font-semibold transition-colors ${
                  basemap === 'satellite' ? 'bg-amber-600 text-white' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Esri Satellite
              </button>
              <button
                type="button"
                onClick={() => setBasemap('osm')}
                className={`px-2.5 py-1 rounded font-semibold transition-colors ${
                  basemap === 'osm' ? 'bg-amber-600 text-white' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                OpenStreetMap
              </button>
            </div>

            <button
              type="button"
              onClick={() => onNavigate('situation-reports')}
              className="px-3 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-sm">print</span>
              <span>Report</span>
            </button>
          </div>
        </div>

        {/* MAP VIEWPORT CONTAINER */}
        <div 
          ref={mapViewportRef}
          className="absolute inset-0 pt-14 w-full h-full select-none"
        >
          {/* Leaflet Map Div */}
          <div ref={mapContainerRef} className="w-full h-full z-0" />

          {/* Floating Unanalyzed Location AOI Notification Banner */}
          {isLocationUnanalyzed && selectedLocation && (
            <div className="absolute top-18 left-1/2 -translate-x-1/2 z-30 max-w-xl w-[92%] sm:w-auto bg-white/95 backdrop-blur-md px-4 py-2.5 rounded-xl shadow-lg border border-amber-300 text-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 pointer-events-auto">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-amber-700 text-base">explore</span>
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900">
                    {selectedLocation.name} Study Area ({selectedLocation.lat.toFixed(4)}°N, {selectedLocation.lon.toFixed(4)}°E)
                  </div>
                  <div className="text-[11px] text-slate-500">
                    {selectedLocation.district ? `${selectedLocation.district}, ` : ''}{selectedLocation.state || 'India'} • Ready for Sentinel-1 & DEM Analysis
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('new-analysis')}
                className="px-3.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
              >
                <span className="material-symbols-outlined text-sm font-bold">add</span>
                <span>Run Flood Analysis</span>
              </button>
            </div>
          )}

          {/* Scale Bar & Coordinates HUD */}
          <div className="absolute bottom-4 left-4 z-20 flex flex-col gap-1 pointer-events-none">
            <div className="flex items-center gap-3 px-3 py-1.5 rounded-lg bg-white/95 backdrop-blur-md shadow-md text-xs font-mono text-slate-700 border border-slate-200">
              <div className="flex items-center gap-1 text-amber-700 font-semibold">
                <span className="material-symbols-outlined text-sm">my_location</span>
                <span>{hudCoords.lat}, {hudCoords.lon}</span>
              </div>
              <span className="text-slate-300">|</span>
              <span>Sensor: <strong>Sentinel-1 C-SAR</strong></span>
              <span className="text-slate-300">|</span>
              <span className="text-emerald-700 font-semibold">WGS 84 / UTM 45N</span>
            </div>
          </div>
        </div>

        {/* FLOATING COLLAPSIBLE LEFT LAYER CONTROL PANEL */}
        <aside 
          className={`absolute top-18 left-4 z-20 w-72 bg-white/95 backdrop-blur-md rounded-xl shadow-lg overflow-hidden border border-slate-200 transition-all duration-300 ${
            leftPanelOpen ? 'max-h-[calc(100vh-16rem)]' : 'max-h-11'
          }`}
        >
          <div className="flex items-center justify-between p-3 bg-slate-50 border-b border-slate-200">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
              <span className="material-symbols-outlined text-base text-amber-600">layers</span>
              <span>Active Layer Controls</span>
            </div>
            <button 
              type="button"
              onClick={() => setLeftPanelOpen(!leftPanelOpen)}
              className="text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-base">
                {leftPanelOpen ? 'expand_less' : 'expand_more'}
              </span>
            </button>
          </div>

          {leftPanelOpen && (
            <div className="p-3.5 flex flex-col gap-3.5 overflow-y-auto max-h-[calc(100vh-20rem)] text-xs">
              {/* Layer 1: Inundation */}
              <div className="flex flex-col gap-1.5 p-2 rounded-lg bg-slate-50 border border-slate-200">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer font-semibold text-slate-800">
                    <input 
                      type="checkbox"
                      checked={layerFlood}
                      onChange={(e) => setLayerFlood(e.target.checked)}
                      className="accent-amber-600 rounded"
                    />
                    <span>Flood Inundation Polygon</span>
                  </label>
                  <span className="text-[10px] text-amber-700 bg-amber-100 px-1.5 py-0.2 rounded font-bold">
                    {analysis.metrics.floodExtentKm2} km²
                  </span>
                </div>
                {layerFlood && (
                  <div className="flex items-center gap-2 pt-1">
                    <span className="text-[10px] text-slate-400">Opacity:</span>
                    <input 
                      type="range"
                      min="10"
                      max="100"
                      value={floodOpacity}
                      onChange={(e) => setFloodOpacity(parseInt(e.target.value))}
                      className="w-full accent-amber-600 h-1"
                    />
                    <span className="text-[10px] font-mono text-slate-600">{floodOpacity}%</span>
                  </div>
                )}
              </div>

              {/* Layer 2: Debris & Runoff */}
              <div className="flex flex-col gap-1.5 p-2 rounded-lg bg-slate-50 border border-slate-200">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer font-semibold text-slate-800">
                    <input 
                      type="checkbox"
                      checked={layerDebris}
                      onChange={(e) => setLayerDebris(e.target.checked)}
                      className="accent-amber-600 rounded"
                    />
                    <span>Turbid Runoff Zone</span>
                  </label>
                  <span className="text-[10px] text-amber-700 font-bold">Slope &lt; 25°</span>
                </div>
                {layerDebris && (
                  <div className="flex items-center gap-2 pt-1">
                    <span className="text-[10px] text-slate-400">Opacity:</span>
                    <input 
                      type="range"
                      min="10"
                      max="100"
                      value={debrisOpacity}
                      onChange={(e) => setDebrisOpacity(parseInt(e.target.value))}
                      className="w-full accent-amber-600 h-1"
                    />
                    <span className="text-[10px] font-mono text-slate-600">{debrisOpacity}%</span>
                  </div>
                )}
              </div>

              {/* Layer 3: Severed Roads */}
              <div className="p-2 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer font-semibold text-slate-800">
                  <input 
                    type="checkbox"
                    checked={layerRoads}
                    onChange={(e) => setLayerRoads(e.target.checked)}
                    className="accent-amber-600 rounded"
                  />
                  <span>Severed Road Segments</span>
                </label>
                <span className="text-[10px] text-rose-700 bg-rose-100 px-1.5 py-0.2 rounded font-bold">
                  {analysis.metrics.exposedRoadKm} km
                </span>
              </div>

              {/* Layer 4: Critical POI Markers */}
              <div className="p-2 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer font-semibold text-slate-800">
                  <input 
                    type="checkbox"
                    checked={layerInfra}
                    onChange={(e) => setLayerInfra(e.target.checked)}
                    className="accent-amber-600 rounded"
                  />
                  <span>Critical Infrastructure POIs</span>
                </label>
                <span className="text-[10px] text-slate-600 bg-slate-200 px-1.5 py-0.2 rounded font-bold">
                  {analysis.infrastructureAssets.length} Assets
                </span>
              </div>
            </div>
          )}
        </aside>

        {/* FLOATING COLLAPSIBLE RIGHT FEATURE INSPECTOR PANEL */}
        {rightPanelOpen && selectedFeature && (
          <aside className="absolute top-18 right-4 z-20 w-80 bg-white/95 backdrop-blur-md rounded-xl shadow-lg overflow-hidden border border-slate-200 flex flex-col">
            <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-base text-amber-600">triage</span>
                <span className="text-xs font-bold text-slate-800">Feature Triage Inspector</span>
              </div>
              <button 
                type="button"
                onClick={() => setRightPanelOpen(false)}
                className="text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-base">close</span>
              </button>
            </div>

            <div className="p-4 flex flex-col gap-3 text-xs overflow-y-auto max-h-[calc(100vh-18rem)]">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-mono text-slate-400">{selectedFeature.id}</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    selectedFeature.priority === 'High Priority' ? 'bg-rose-100 text-rose-800 border border-rose-300' : 'bg-amber-100 text-amber-800 border border-amber-300'
                  }`}>
                    {selectedFeature.priority}
                  </span>
                </div>
                <h3 className="text-sm font-bold text-slate-900">{selectedFeature.name}</h3>
                <span className="text-[11px] text-slate-500">{selectedFeature.type}</span>
              </div>

              <div className="p-3 rounded-lg bg-amber-50/60 border border-amber-200 text-amber-900 text-[11px] leading-relaxed">
                <strong className="block text-amber-800 mb-0.5">Physical Inundation Proxy:</strong>
                {selectedFeature.details}
              </div>

              {/* Metrics Table */}
              <div className="bg-slate-50 rounded-lg border border-slate-200 divide-y divide-slate-200 font-mono text-[11px]">
                <div className="flex justify-between p-2">
                  <span className="text-slate-500">Coordinates:</span>
                  <span className="text-slate-800">{selectedFeature.lat}°N, {selectedFeature.lon}°E</span>
                </div>
                <div className="flex justify-between p-2">
                  <span className="text-slate-500">SAR Anomaly:</span>
                  <span className="text-rose-700 font-bold">{selectedFeature.sarAnomaly}</span>
                </div>
                <div className="flex justify-between p-2">
                  <span className="text-slate-500">Surface Overlap:</span>
                  <span className="text-slate-800">{selectedFeature.floodOverlap}</span>
                </div>
                <div className="flex justify-between p-2">
                  <span className="text-slate-500">OSM Way Ref:</span>
                  <span className="text-slate-800">{selectedFeature.osmRef}</span>
                </div>
              </div>

              {/* Actions */}
              <div className="pt-2 flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => setFlaggedVerified(!flaggedVerified)}
                  className={`w-full py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                    flaggedVerified
                      ? 'bg-emerald-600 text-white'
                      : 'bg-amber-600 hover:bg-amber-700 text-white shadow-sm'
                  }`}
                >
                  <span className="material-symbols-outlined text-sm">
                    {flaggedVerified ? 'check_circle' : 'flag'}
                  </span>
                  <span>{flaggedVerified ? 'Dispatched for UAV Recon' : 'Flag for Field Inspection'}</span>
                </button>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => onNavigate('settlement-accessibility')}
                    className="py-1.5 px-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium text-center transition-colors"
                  >
                    View Graph
                  </button>
                  <button
                    type="button"
                    onClick={exportGeoJson}
                    className="py-1.5 px-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium text-center transition-colors"
                  >
                    Export GeoJSON
                  </button>
                </div>
              </div>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
};
