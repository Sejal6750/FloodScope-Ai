export type DataMode = 'DEMO_SYNTHETIC' | 'SAMPLE_DATA' | 'LIVE';

export type ProcessingStatus = 
  | 'DEMO_SYNTHETIC'
  | 'SAMPLE_DATA'
  | 'CONNECTING'
  | 'INGESTION_FAILED'
  | 'PROCESSING'
  | 'COMPLETED_UNVALIDATED'
  | 'COMPLETED_VALIDATED';

export type DataSourceConnectionState =
  | 'NOT_CONFIGURED'
  | 'CONFIGURED_NOT_TESTED'
  | 'CONNECTING'
  | 'CONNECTED_TESTED'
  | 'DATA_RETRIEVED'
  | 'RETRIEVAL_FAILED'
  | 'CACHED_AVAILABLE';

export interface DataSourceStatus {
  id: string;
  name: string;
  provider: string;
  category: 'radar' | 'optical' | 'elevation' | 'vector';
  status: DataSourceConnectionState;
  statusLabel: string;
  endpointUrl: string;
  latencyMs?: number;
  lastTested?: string;
  errorMessage?: string;
  cachedDatasetAvailable: boolean;
  requiredCredentials: string[];
  publiclyAvailable: boolean;
  description: string;
}

export interface InfrastructureAsset {
  id: string;
  type: string;
  name: string;
  osmRef: string;
  exposureCategory: 'POTENTIALLY AFFECTED' | 'HIGH EXPOSURE' | 'MODERATE (PERIMETER)' | 'CLEARED / BUFFER';
  floodOverlap: string;
  sarAnomaly: string;
  priority: 'High Priority' | 'Medium Priority' | 'Cleared / Safe';
  lat: number;
  lon: number;
  details: string;
}

export interface SettlementItem {
  id: string;
  name: string;
  wardCode: string;
  status: 'POTENTIALLY CUT OFF' | 'DETOUR COMPROMISED' | 'VERIFIED REACHABLE';
  primaryRoute: string;
  estPopAtRisk: number;
  detourDetails: string;
  reachable: boolean;
  coords: [number, number]; // [lat, lon]
}

export interface ProvenanceRecord {
  sources: Array<{
    name: string;
    product: string;
    provider: string;
    acquisitionDate: string;
    resolution: string;
    status: string;
    license: string;
  }>;
  algorithm: string;
  sarThresholdDb: number;
  slopeExclusionDeg: number;
  limitations: string[];
  evidenceReferences: string[];
  lastUpdated: string;
  sha256Audit?: string;
}

export interface AnalysisAssessment {
  id: string;
  name: string;
  aoiName: string;
  bbox: [number, number, number, number]; // [minLon, minLat, maxLon, maxLat]
  center: [number, number]; // [lat, lon]
  areaKm2: number;
  eventWindow: {
    start: string;
    end: string;
    label?: string;
  };
  baselineDate: string;
  postEventDate: string;
  dataMode: DataMode;
  processingStatus: ProcessingStatus;
  validationStatus: 'SYNTHETIC_TESTBED' | 'UNVALIDATED' | 'VALIDATED';
  metrics: {
    floodExtentKm2: number;
    uncertaintyMarginKm2: number;
    exposedRoadKm: number;
    exposedRoadSegmentsCount: number;
    infrastructureUnitsCount: number;
    buildingsCount: number;
    bridgesCount: number;
    substationsCount: number;
    cutOffSettlementsCount: number;
    isolatedWards: string[];
    compromisedDetoursCount: number;
    verifiedReachableCount: number;
    severedEdgesCount: number;
    isolatedPopulationEst: number;
  };
  infrastructureAssets: InfrastructureAsset[];
  settlements: SettlementItem[];
  provenance: ProvenanceRecord;
}

export interface CopilotMessage {
  id: string;
  role: 'user' | 'assistant';
  timestamp: string;
  text: string;
  nepaliText?: string;
  groundedFacts?: {
    floodExtent?: string;
    exposedRoads?: string;
    cutOffWards?: string[];
    chokePoints?: string[];
  };
  citations?: string[];
  corroborationPct?: number;
  isSyntheticDemo: boolean;
  error?: string;
}

export interface CreateAnalysisPayload {
  studyAreaName: string;
  bbox: [number, number, number, number];
  startDate: string;
  endDate: string;
  sources: {
    sentinel1: boolean;
    sentinel2: boolean;
    copernicusDem: boolean;
    osmInfrastructure: boolean;
  };
  algorithm: string;
  sarThresholdDb: number;
  slopeExclusionDeg: number;
}

export interface LogEntry {
  id: string;
  timestamp: string;
  level: 'INFO' | 'WARN' | 'ERROR';
  stage: string;
  message: string;
}

export interface GeoLocation {
  id: string;
  name: string;
  displayName: string;
  type: string;
  state?: string;
  district?: string;
  lat: number;
  lon: number;
  bbox: [number, number, number, number]; // [minLon, minLat, maxLon, maxLat]
  hasAnalysis?: boolean;
  analysisId?: string;
  source?: string;
}
