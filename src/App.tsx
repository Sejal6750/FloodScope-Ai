import React, { useState, useEffect } from 'react';
import { AnalysisAssessment, DataSourceStatus, GeoLocation } from './types/index.ts';
import { Sidebar } from './components/Sidebar.tsx';
import { Header } from './components/Header.tsx';
import { OverviewView } from './components/OverviewView.tsx';
import { NewAnalysisView } from './components/NewAnalysisView.tsx';
import { FloodMapExplorerView } from './components/FloodMapExplorerView.tsx';
import { InfrastructureImpactView } from './components/InfrastructureImpactView.tsx';
import { SettlementAccessibilityView } from './components/SettlementAccessibilityView.tsx';
import { CopilotView } from './components/CopilotView.tsx';
import { SituationReportsView } from './components/SituationReportsView.tsx';
import { DataMethodologyView } from './components/DataMethodologyView.tsx';
import { SettingsView } from './components/SettingsView.tsx';
import { AnalysisHistoryView } from './components/AnalysisHistoryView.tsx';

// Fallback pilot analysis in case server response is delayed
const DEFAULT_ANALYSIS: AnalysisAssessment = {
  id: 'trishuli-pilot-04',
  name: 'Trishuli Basin Event (Aug 2026 - DEMO)',
  aoiName: 'Trishuli Watershed AOI-04',
  bbox: [85.05, 27.85, 85.35, 28.15],
  center: [27.9868, 85.1784],
  areaKm2: 1240,
  eventWindow: {
    start: '2026-08-14',
    end: '2026-08-16',
    label: 'Monsoon Surge Peak'
  },
  baselineDate: '2026-08-04 (S1) + 2026-08-08 (S2)',
  postEventDate: '2026-08-16 02:40 UTC',
  dataMode: 'DEMO_SYNTHETIC',
  processingStatus: 'COMPLETED_UNVALIDATED',
  validationStatus: 'SYNTHETIC_TESTBED',
  metrics: {
    floodExtentKm2: 42.8,
    uncertaintyMarginKm2: 3.2,
    exposedRoadKm: 38.6,
    exposedRoadSegmentsCount: 19,
    infrastructureUnitsCount: 142,
    buildingsCount: 128,
    bridgesCount: 4,
    substationsCount: 1,
    cutOffSettlementsCount: 3,
    isolatedWards: ['Syabrubesi Ward 3 (#W3-SYB)', 'Dhunche South Enclave (#W2-DHC)', 'Mailung Riverfront (#W4-MLG)'],
    compromisedDetoursCount: 5,
    verifiedReachableCount: 16,
    severedEdgesCount: 7,
    isolatedPopulationEst: 1950
  },
  infrastructureAssets: [
    {
      id: 'BR-TR-04',
      type: 'Concrete Truss Bridge',
      name: 'Trishuli Main River Crossing',
      osmRef: 'OSM ID #492810 • Ch. 12+400',
      exposureCategory: 'POTENTIALLY AFFECTED',
      floodOverlap: '94% Deck Overlap',
      sarAnomaly: '-6.4 dB',
      priority: 'High Priority',
      lat: 27.9812,
      lon: 85.1784,
      details: 'Spatial intersection indicates deck inundation proxy. Pier structural integrity requires UAV photogrammetry.'
    },
    {
      id: 'RD-DH-18',
      type: 'Secondary Highway',
      name: 'Trishuli-Dhunche Corridor (Km 18)',
      osmRef: 'OSM ID #812903 • Km 18 Segment',
      exposureCategory: 'HIGH EXPOSURE',
      floodOverlap: '1,420m Submerged',
      sarAnomaly: '-7.1 dB',
      priority: 'High Priority',
      lat: 27.9945,
      lon: 85.1650,
      details: 'Feeder road 04 severely submerged near Betrawati river confluence. Impassable for standard convoys.'
    },
    {
      id: 'HOSP-TRI-01',
      type: 'Regional Hospital',
      name: 'Bidur Emergency Care Center',
      osmRef: 'OSM ID #741209 • Health Campus',
      exposureCategory: 'CLEARED / BUFFER',
      floodOverlap: '0% Structural Overlap (80m Buffer)',
      sarAnomaly: '+0.2 dB',
      priority: 'Cleared / Safe',
      lat: 27.9105,
      lon: 85.1580,
      details: 'Primary structure on high terrace elevation (740m MSL). Ingress road route 02 severed at southern junction.'
    },
    {
      id: 'SUB-BIDUR-01',
      type: '132kV Power Substation',
      name: 'Trishuli Hydro Substation Feed',
      osmRef: 'OSM ID #992014 • Grid Asset',
      exposureCategory: 'MODERATE (PERIMETER)',
      floodOverlap: 'Perimeter Drainage Flooded',
      sarAnomaly: '-3.8 dB',
      priority: 'Medium Priority',
      lat: 27.9250,
      lon: 85.1610,
      details: 'Peripheral yard water detected by SAR backscatter delta. Control switchgear remains dry above 100-year mark.'
    }
  ],
  settlements: [
    {
      id: 'SET-SYA',
      name: 'Syabrubesi Village Hub',
      wardCode: 'WARD-03',
      status: 'POTENTIALLY CUT OFF',
      primaryRoute: 'Highway H04 (Ch. 14+200)',
      estPopAtRisk: 1420,
      detourDetails: 'Bridge #04 crossing inundated; foot trail via southern ridge takes +5.4h.',
      reachable: false,
      coords: [28.16, 85.33]
    },
    {
      id: 'SET-BET',
      name: 'Betrawati Market Town',
      wardCode: 'WARD-05',
      status: 'POTENTIALLY CUT OFF',
      primaryRoute: 'Pasang Lhamu Feeder Rd',
      estPopAtRisk: 860,
      detourDetails: 'Confluence surge severed both northern causeways; relief requires aerial or foot access.',
      reachable: false,
      coords: [27.98, 85.18]
    },
    {
      id: 'SET-DHU',
      name: 'Dhunche Enclave',
      wardCode: 'WARD-02',
      status: 'DETOUR COMPROMISED',
      primaryRoute: 'North Ridge Bypass',
      estPopAtRisk: 530,
      detourDetails: 'Primary highway severed; single unpaved mountain track open with 4WD restriction.',
      reachable: false,
      coords: [28.11, 85.30]
    },
    {
      id: 'SET-BID',
      name: 'Bidur Central Municipality',
      wardCode: 'WARD-01',
      status: 'VERIFIED REACHABLE',
      primaryRoute: 'South Arterial Highway H02',
      estPopAtRisk: 0,
      detourDetails: 'Direct operational connection to district capital and medical hub.',
      reachable: true,
      coords: [27.91, 85.16]
    }
  ],
  provenance: {
    sources: [
      {
        name: 'Sentinel-1 C-SAR GRD (ESA)',
        product: 'Level-1 Ground Range Detected (IW mode)',
        provider: 'Copernicus Data Space Ecosystem (CDSE)',
        acquisitionDate: '2026-08-16 02:40 UTC',
        resolution: '10m pixel spacing (VV+VH)',
        status: 'VERIFIED_CALIBRATED',
        license: 'Copernicus Open Access'
      },
      {
        name: 'Sentinel-2 L2A Optical MSI',
        product: 'Bottom-of-Atmosphere (BOA) Reflectance',
        provider: 'Element 84 Earth Search STAC / ESA',
        acquisitionDate: '2026-08-08 (Cloud-free reference)',
        resolution: '10m (B2, B3, B4, B8)',
        status: 'VERIFIED_CALIBRATED',
        license: 'Copernicus Open Access'
      },
      {
        name: 'Copernicus GLO-30 DEM',
        product: 'Digital Elevation Model 30m',
        provider: 'European Space Agency & DLR',
        acquisitionDate: '2024 Release v2024_1',
        resolution: '30m post spacing',
        status: 'STATIC_REFERENCE',
        license: 'Copernicus WorldDEM'
      },
      {
        name: 'OpenStreetMap Vector Snapshot',
        product: 'Highways, Bridges, and Health Facilities',
        provider: 'Geofabrik Nepal / Planet OSM',
        acquisitionDate: '2026-08-01 Frozen Snapshot',
        resolution: 'Sub-meter vector precision',
        status: 'VERIFIED_BASEMAP',
        license: 'ODbL 1.0'
      }
    ],
    algorithm: 'Dual-Pol SAR Change Detection v2.4 (Otsu Adaptive Bimodal)',
    sarThresholdDb: -14.2,
    slopeExclusionDeg: 25,
    limitations: [
      'Radar shadow in steep narrow mountain gorges',
      'Specular reflection false positives on smooth dry pavement',
      'OSM vector completeness variations in rural wards'
    ],
    evidenceReferences: [
      'ESA-S1-DOC-0042',
      'UN-SPIDER Recommended Practice for Flood Mapping',
      'Copernicus Emergency Management Service (EMS) Guidelines'
    ],
    lastUpdated: '2026-08-16T15:10:00Z',
    sha256Audit: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'
  }
};


export default function App() {
  const [currentPath, setCurrentPath] = useState<string>('overview');
  const [analyses, setAnalyses] = useState<AnalysisAssessment[]>([DEFAULT_ANALYSIS]);
  const [activeAnalysis, setActiveAnalysis] = useState<AnalysisAssessment>(DEFAULT_ANALYSIS);
  const [selectedLocation, setSelectedLocation] = useState<GeoLocation | null>(null);
  const [dataSources, setDataSources] = useState<DataSourceStatus[]>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Fetch analyses and datasources on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [analysesRes, srcRes] = await Promise.all([
          fetch('/api/analyses'),
          fetch('/api/datasources/status')
        ]);

        if (analysesRes.ok) {
          const list: AnalysisAssessment[] = await analysesRes.json();
          if (list && list.length > 0) {
            setAnalyses(list);
            setActiveAnalysis(list[0]);
          }
        }

        if (srcRes.ok) {
          const sources: DataSourceStatus[] = await srcRes.json();
          setDataSources(sources);
        }
      } catch (err) {
        console.warn('Initial server fetch used fallback data', err);
      }
    };

    fetchData();
  }, []);

  const handleSelectAnalysis = (idOrAnalysis: string | AnalysisAssessment) => {
    // When selecting a saved assessment, clear custom unanalyzed location
    setSelectedLocation(null);
    if (typeof idOrAnalysis === 'string') {
      const found = analyses.find((a) => a.id === idOrAnalysis);
      if (found) {
        setActiveAnalysis(found);
        showToast(`Switched active analysis to "${found.name}"`);
      }
    } else {
      setActiveAnalysis(idOrAnalysis);
      showToast(`Switched active analysis to "${idOrAnalysis.name}"`);
    }
  };

  const handleSelectLocation = (loc: GeoLocation) => {
    setSelectedLocation(loc);

    // If an existing assessment corresponds to this location, activate it
    if (loc.analysisId) {
      const match = analyses.find(a => a.id === loc.analysisId);
      if (match) {
        setActiveAnalysis(match);
        showToast(`Located "${loc.name}" — Linked to assessment "${match.name}"`);
        return;
      }
    }

    const matchByNameOrCoord = analyses.find(a =>
      a.name.toLowerCase().includes(loc.name.toLowerCase()) ||
      a.aoiName.toLowerCase().includes(loc.name.toLowerCase()) ||
      (loc.lat >= a.bbox[1] && loc.lat <= a.bbox[3] && loc.lon >= a.bbox[0] && loc.lon <= a.bbox[2])
    );

    if (matchByNameOrCoord) {
      setActiveAnalysis(matchByNameOrCoord);
      showToast(`Selected "${loc.name}" — Linked to assessment "${matchByNameOrCoord.name}"`);
    } else {
      showToast(`Selected "${loc.name}" (${loc.lat.toFixed(2)}°N, ${loc.lon.toFixed(2)}°E) — New study area`);
    }
  };

  const handleAnalysisCreated = (newAnalysis: AnalysisAssessment) => {
    setAnalyses((prev) => [newAnalysis, ...prev]);
    setActiveAnalysis(newAnalysis);
    setSelectedLocation(null);
    setCurrentPath('overview');
    showToast(`Analysis "${newAnalysis.name}" completed successfully!`);
  };

  // Normalize path routing
  const renderCurrentView = () => {
    switch (currentPath) {
      case 'overview':
        return (
          <OverviewView
            analysis={activeAnalysis}
            analyses={analyses}
            dataSources={dataSources}
            selectedLocation={selectedLocation}
            onNavigate={setCurrentPath}
            onSelectAnalysis={(id) => handleSelectAnalysis(id)}
          />
        );

      case 'new-analysis':
        return (
          <NewAnalysisView
            selectedLocation={selectedLocation}
            onAnalysisCreated={handleAnalysisCreated}
            onNavigate={setCurrentPath}
          />
        );

      case 'flood-map-explorer':
      case 'flood-map':
        return (
          <FloodMapExplorerView
            analysis={activeAnalysis}
            selectedLocation={selectedLocation}
            onNavigate={setCurrentPath}
          />
        );

      case 'infrastructure-impact':
      case 'infrastructure':
        return (
          <InfrastructureImpactView
            analysis={activeAnalysis}
            onNavigate={setCurrentPath}
          />
        );

      case 'settlement-accessibility':
      case 'settlement':
        return (
          <SettlementAccessibilityView
            analysis={activeAnalysis}
            onNavigate={setCurrentPath}
          />
        );

      case 'ai-situation-copilot':
      case 'copilot':
        return (
          <CopilotView
            analysis={activeAnalysis}
            onNavigate={setCurrentPath}
          />
        );

      case 'situation-reports':
      case 'reports':
        return (
          <SituationReportsView
            analysis={activeAnalysis}
            onNavigate={setCurrentPath}
          />
        );

      case 'data-and-methodology':
      case 'methodology':
        return (
          <DataMethodologyView
            onNavigate={setCurrentPath}
          />
        );

      case 'history':
      case 'registry':
        return (
          <AnalysisHistoryView
            analyses={analyses}
            activeAnalysis={activeAnalysis}
            onSelectAnalysis={handleSelectAnalysis}
            onNavigate={setCurrentPath}
          />
        );

      case 'settings':
        return (
          <SettingsView
            onNavigate={setCurrentPath}
          />
        );

      default:
        return (
          <OverviewView
            analysis={activeAnalysis}
            analyses={analyses}
            dataSources={dataSources}
            onNavigate={setCurrentPath}
            onSelectAnalysis={(id) => handleSelectAnalysis(id)}
          />
        );
    }
  };

  return (
    <div className="min-h-screen bg-surface-dim text-on-surface flex flex-col font-sans selection:bg-primary/20 selection:text-primary">
      {/* Toast Notification Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-surface-container-high border border-primary/40 text-primary font-mono text-xs px-4 py-2.5 rounded-lg shadow-xl flex items-center gap-2 animate-bounce print:hidden">
          <span className="material-symbols-outlined text-sm">notifications_active</span>
          {toastMessage}
        </div>
      )}

      {/* Fixed Sidebar */}
      <div className="print:hidden">
        <Sidebar
          currentPath={currentPath}
          onNavigate={setCurrentPath}
          dataMode={activeAnalysis.dataMode}
        />
      </div>

      {/* Top Application Header */}
      <div className="print:hidden">
        <Header
          currentPath={currentPath}
          activeAnalysis={activeAnalysis}
          analyses={analyses}
          selectedLocation={selectedLocation}
          onSelectAnalysis={(id) => handleSelectAnalysis(id)}
          onSelectLocation={handleSelectLocation}
          onNavigate={setCurrentPath}
        />
      </div>

      {/* Main Viewport Content Area */}
      <main className="ml-0 md:ml-[260px] pt-14 min-h-screen p-4 md:p-6 print:ml-0 print:pt-0 print:p-0 transition-all duration-200">
        {renderCurrentView()}
      </main>
    </div>
  );
}
