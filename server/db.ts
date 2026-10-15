import fs from 'fs';
import path from 'path';
import { AnalysisAssessment, DataSourceStatus } from '../src/types/index.ts';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'database.json');

export interface DatabaseSchema {
  analyses: AnalysisAssessment[];
  dataSources: DataSourceStatus[];
  logs: Array<{
    id: string;
    runId: string;
    timestamp: string;
    level: 'INFO' | 'WARN' | 'ERROR' | 'SUCCESS';
    message: string;
  }>;
}

const INITIAL_DATA_SOURCES: DataSourceStatus[] = [
  {
    id: 'sentinel-1-csar',
    name: 'Sentinel-1 C-SAR GRD (ESA)',
    provider: 'Copernicus Data Space Ecosystem (CDSE)',
    category: 'radar',
    status: 'CACHED_AVAILABLE',
    statusLabel: 'Cached Dataset Available',
    endpointUrl: 'https://catalogue.dataspace.copernicus.eu/odata/v1/Products',
    latencyMs: 142,
    cachedDatasetAvailable: true,
    requiredCredentials: ['COPERNICUS_CDSE_CLIENT_ID', 'COPERNICUS_CDSE_CLIENT_SECRET'],
    publiclyAvailable: true,
    description: 'All-weather active microwave Synthetic Aperture Radar. Orbit track 121 descending geometry.'
  },
  {
    id: 'sentinel-2-msi',
    name: 'Sentinel-2 L2A Optical MSI',
    provider: 'Element 84 Earth Search STAC / ESA',
    category: 'optical',
    status: 'CACHED_AVAILABLE',
    statusLabel: 'Cached Dataset Available',
    endpointUrl: 'https://earth-search.aws.element84.com/v1',
    latencyMs: 96,
    cachedDatasetAvailable: true,
    requiredCredentials: ['AWS_ACCESS_KEY_ID (Optional for commercial tier)'],
    publiclyAvailable: true,
    description: 'Level-2A Bottom-of-Atmosphere multispectral surface reflectance with SCL scene classification cloud mask.'
  },
  {
    id: 'copernicus-dem-30m',
    name: 'Copernicus GLO-30 DEM',
    provider: 'European Space Agency & DLR',
    category: 'elevation',
    status: 'CACHED_AVAILABLE',
    statusLabel: 'Cached Dataset Available',
    endpointUrl: 'https://spacedata.copernicus.eu/collections/copernicus-digital-elevation-model',
    latencyMs: 38,
    cachedDatasetAvailable: true,
    requiredCredentials: [],
    publiclyAvailable: true,
    description: 'Global 30-meter synthetic elevation grid for slope filtering and hydrological drainage flow accumulation.'
  },
  {
    id: 'osm-vector-infrastructure',
    name: 'OpenStreetMap Vector Snapshot',
    provider: 'Geofabrik Nepal / Planet OSM',
    category: 'vector',
    status: 'CACHED_AVAILABLE',
    statusLabel: 'Cached Dataset Available',
    endpointUrl: 'https://overpass-api.de/api/interpreter',
    latencyMs: 210,
    cachedDatasetAvailable: true,
    requiredCredentials: [],
    publiclyAvailable: true,
    description: 'Frozen pre-disaster transport network (2026-08-01 freeze) containing 142k nodes and 312k highway edges.'
  }
];

const INITIAL_ANALYSES: AnalysisAssessment[] = [
  {
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
        id: 'BG-SY-08',
        type: 'Municipal Storage',
        name: 'Syabrubesi Logistics Shed',
        osmRef: 'OSM ID #992144 • Zone C',
        exposureCategory: 'MODERATE (PERIMETER)',
        floodOverlap: '28% Footprint',
        sarAnomaly: '-3.8 dB',
        priority: 'Medium Priority',
        lat: 28.0210,
        lon: 85.1420,
        details: 'Perimeter floodwaters have reached storage compound wall. Water level rising +0.4m/hr.'
      },
      {
        id: 'HP-TR-01',
        type: 'District Hospital',
        name: 'Trishuli District Hospital Complex',
        osmRef: 'OSM ID #104928 • Upper Ridge',
        exposureCategory: 'CLEARED / BUFFER',
        floodOverlap: '0% Overlap',
        sarAnomaly: '-0.2 dB (Normal)',
        priority: 'Cleared / Safe',
        lat: 27.9720,
        lon: 85.2010,
        details: 'Main surgical and trauma facility operational with +18.4m elevation buffer above flood crest.'
      },
      {
        id: 'BR-TR-01',
        type: 'Suspension Bridge',
        name: 'Upper Syabrubesi Pedestrian Span',
        osmRef: 'OSM ID #391024',
        exposureCategory: 'POTENTIALLY AFFECTED',
        floodOverlap: '82% Overlap',
        sarAnomaly: '-5.1 dB',
        priority: 'High Priority',
        lat: 28.0280,
        lon: 85.1380,
        details: 'Pedestrian cable anchor submerged; pedestrian crossing prohibited.'
      },
      {
        id: 'UT-NW-02',
        type: 'Power Substation',
        name: 'Betrawati 132kV Transmission Station',
        osmRef: 'OSM ID #772819',
        exposureCategory: 'HIGH EXPOSURE',
        floodOverlap: '42m from flood contour',
        sarAnomaly: '-4.6 dB',
        priority: 'High Priority',
        lat: 27.9890,
        lon: 85.1720,
        details: 'Transformer yard boundary at high risk. Recommend grid isolation.'
      }
    ],
    settlements: [
      {
        id: 'W3-SYB',
        name: 'Syabrubesi Ward 3',
        wardCode: '#W3-SYB',
        status: 'POTENTIALLY CUT OFF',
        primaryRoute: 'Severed at Betrawati Bridge #04',
        estPopAtRisk: 420,
        detourDetails: 'NO FEASIBLE DETOUR (Chokepoint flooded >50m contiguous)',
        reachable: false,
        coords: [28.0215, 27.9812] // lat, lon
      },
      {
        id: 'W2-DHC',
        name: 'Dhunche South Enclave',
        wardCode: '#W2-DHC',
        status: 'POTENTIALLY CUT OFF',
        primaryRoute: 'Mudslide / Saturated Cut Km 22',
        estPopAtRisk: 680,
        detourDetails: 'Impasse on steep mountain pass; ambulance access impossible',
        reachable: false,
        coords: [28.0050, 85.1580]
      },
      {
        id: 'W5-BTW',
        name: 'Betrawati Valley Sector',
        wardCode: '#W5-BTW',
        status: 'DETOUR COMPROMISED',
        primaryRoute: 'Highway 04 Severed (+25.8 km diversion)',
        estPopAtRisk: 1150,
        detourDetails: 'Ridge Pass (4WD Unpaved) 18 min → 74 min (+56 min delay)',
        reachable: true,
        coords: [27.9890, 85.1740]
      },
      {
        id: 'W1-NWK',
        name: 'Nuwakot Historic Ridge',
        wardCode: '#W1-NWK',
        status: 'VERIFIED REACHABLE',
        primaryRoute: 'Feeder 01 Ridge Corridor Intact',
        estPopAtRisk: 2400,
        detourDetails: 'Transit time 14 min (Nominal direct access to Trishuli Hospital)',
        reachable: true,
        coords: [27.9650, 85.2150]
      },
      {
        id: 'W6-TPC',
        name: 'Tupche North Settlement',
        wardCode: '#W6-TPC',
        status: 'VERIFIED REACHABLE',
        primaryRoute: 'Secondary Valley Link 08 Open',
        estPopAtRisk: 980,
        detourDetails: 'Nominal travel time 22 min to Bidur Relief Depot',
        reachable: true,
        coords: [27.9710, 85.1850]
      }
    ],
    provenance: {
      sources: [
        {
          name: 'Sentinel-1 C-SAR GRD',
          product: 'IW_GRDH_1SDV',
          provider: 'ESA Copernicus Open Access',
          acquisitionDate: '2026-08-16 02:40 UTC',
          resolution: '10m',
          status: 'Calibrated',
          license: 'Copernicus Open Access'
        },
        {
          name: 'Sentinel-2 L2A MSI',
          product: 'S2B_MSIL2A',
          provider: 'ESA Copernicus Hub',
          acquisitionDate: '2026-08-08 04:55 UTC',
          resolution: '10m / 20m',
          status: 'Cloud-Masked (SCL)',
          license: 'CC-BY 4.0'
        },
        {
          name: 'Copernicus DEM (GLO-30)',
          product: 'GLO-30-DTM',
          provider: 'DLR / ESA',
          acquisitionDate: '2024 Static Grid',
          resolution: '30m',
          status: 'Hydro-Enforced',
          license: 'Public Domain'
        },
        {
          name: 'OpenStreetMap Vector Snapshot',
          product: 'Nepal Highways & Buildings',
          provider: 'OSM Contributors',
          acquisitionDate: '2026-08-01 Frozen Baseline',
          resolution: 'Vector',
          status: 'Topology Verified',
          license: 'ODbL 1.0'
        }
      ],
      algorithm: 'Dual-Pol SAR Change Detection (Otsu Adaptive) + HAND Terrain Hydrology Mask',
      sarThresholdDb: -4.5,
      slopeExclusionDeg: 5.0,
      limitations: [
        'SYNTHETIC TESTBED DEMO DATA: Numbers are illustrative and not verified ground-truth physical casualties or structural collapse.',
        'Radar shadow and layover in steep Himalayan canyons may obscure narrow tributary riverbeds.',
        'Spatial intersection of flood polygons with OSM ways indicates potential surface inundation, not verified bridge pier failure.',
        'Requires field UAV photogrammetry or civil engineering reconnaissance prior to tactical asset reallocation.'
      ],
      evidenceReferences: [
        'Sentinel-1 IW GRDH Descending Track 121 (2026-08-16)',
        'Copernicus GLO-30 D8 Hydrologic Flow Matrix',
        'OSM Highway Graph #812903 and Bridge Centroids #492810'
      ],
      lastUpdated: '2026-08-16T14:38:22Z',
      sha256Audit: '9e2a84f37b120c8e43ff98124bce63aa01289dfb8c2e718a38114f09c7b019da'
    }
  },
  {
    id: 'koshi-sector-2',
    name: 'Koshi River Sector 2 (Archived Sample)',
    aoiName: 'Eastern Lowlands (AOI-02)',
    bbox: [86.95, 26.45, 87.35, 26.85],
    center: [26.65, 87.15],
    areaKm2: 3450,
    eventWindow: {
      start: '2026-07-27',
      end: '2026-07-29',
      label: 'Monsoon Embankment Overflow'
    },
    baselineDate: '2026-07-15',
    postEventDate: '2026-07-29 01:15 UTC',
    dataMode: 'SAMPLE_DATA',
    processingStatus: 'COMPLETED_UNVALIDATED',
    validationStatus: 'UNVALIDATED',
    metrics: {
      floodExtentKm2: 118.4,
      uncertaintyMarginKm2: 8.5,
      exposedRoadKm: 94.2,
      exposedRoadSegmentsCount: 38,
      infrastructureUnitsCount: 412,
      buildingsCount: 395,
      bridgesCount: 14,
      substationsCount: 3,
      cutOffSettlementsCount: 7,
      isolatedWards: ['Koshi Barrage North', 'Barahachhetra Ward 2', 'Prakashpur Sector B'],
      compromisedDetoursCount: 12,
      verifiedReachableCount: 42,
      severedEdgesCount: 19,
      isolatedPopulationEst: 8400
    },
    infrastructureAssets: [],
    settlements: [],
    provenance: {
      sources: [
        {
          name: 'Sentinel-1 C-SAR GRD',
          product: 'IW_GRDH_1SDV',
          provider: 'ESA Copernicus Open Access',
          acquisitionDate: '2026-07-29 01:15 UTC',
          resolution: '10m',
          status: 'Archived',
          license: 'Copernicus Open Access'
        }
      ],
      algorithm: 'Sentinel-1 SAR Thresholding Baseline',
      sarThresholdDb: -4.0,
      slopeExclusionDeg: 2.0,
      limitations: [
        'Sample dataset preserved for comparative baseline verification in flat alluvial floodplain terrain.',
        'Ground truth reference labels incomplete; precision/recall scores cannot be verified.'
      ],
      evidenceReferences: ['ESA Sentinel-1 Track 048 (2026-07-29)'],
      lastUpdated: '2026-07-29T18:00:00Z'
    }
  },
  {
    id: 'karnali-preview-07',
    name: 'Karnali Basin Preview (Calibrated Sample)',
    aoiName: 'Western Catchment (AOI-07)',
    bbox: [81.15, 28.75, 81.65, 29.25],
    center: [29.00, 81.40],
    areaKm2: 890,
    eventWindow: {
      start: '2026-06-10',
      end: '2026-06-12',
      label: 'Early Snowmelt Surge'
    },
    baselineDate: '2026-05-28',
    postEventDate: '2026-06-12 03:00 UTC',
    dataMode: 'SAMPLE_DATA',
    processingStatus: 'COMPLETED_UNVALIDATED',
    validationStatus: 'UNVALIDATED',
    metrics: {
      floodExtentKm2: 19.1,
      uncertaintyMarginKm2: 1.8,
      exposedRoadKm: 14.3,
      exposedRoadSegmentsCount: 6,
      infrastructureUnitsCount: 48,
      buildingsCount: 44,
      bridgesCount: 3,
      substationsCount: 1,
      cutOffSettlementsCount: 1,
      isolatedWards: ['Chisapani Gorge Link'],
      compromisedDetoursCount: 2,
      verifiedReachableCount: 18,
      severedEdgesCount: 2,
      isolatedPopulationEst: 350
    },
    infrastructureAssets: [],
    settlements: [],
    provenance: {
      sources: [
        {
          name: 'Copernicus DEM (GLO-30)',
          product: 'GLO-30-DTM',
          provider: 'DLR / ESA',
          acquisitionDate: '2024 Static',
          resolution: '30m',
          status: 'Calibrated',
          license: 'Public Domain'
        }
      ],
      algorithm: 'Hydrological Slope and Catchment Simulation',
      sarThresholdDb: -4.8,
      slopeExclusionDeg: 6.0,
      limitations: ['Calibrated sample data for mountainous riverbed testing.'],
      evidenceReferences: ['Copernicus GLO-30 Western Nepal Catchment'],
      lastUpdated: '2026-06-12T12:00:00Z'
    }
  }
];

class Database {
  private data: DatabaseSchema;

  constructor() {
    this.data = this.load();
  }

  private load(): DatabaseSchema {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        if (parsed && Array.isArray(parsed.analyses)) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('[DB] Failed reading db.json, falling back to initial data:', e);
    }

    const defaultData: DatabaseSchema = {
      analyses: INITIAL_ANALYSES,
      dataSources: INITIAL_DATA_SOURCES,
      logs: [
        {
          id: 'log-1',
          runId: 'TRISHULI-202608-RUN09',
          timestamp: '2026-08-16 14:34:11 UTC',
          level: 'INFO',
          message: 'Loaded pre-event Sentinel-1 IW GRDH orbit #121 baseline (2026-08-04) from Copernicus cache.'
        },
        {
          id: 'log-2',
          runId: 'TRISHULI-202608-RUN09',
          timestamp: '2026-08-16 14:34:42 UTC',
          level: 'INFO',
          message: 'Lee Sigma 7x7 speckle filter applied. Radiometric gamma0 terrain flattening complete (GLO-30 reference).'
        },
        {
          id: 'log-3',
          runId: 'TRISHULI-202608-RUN09',
          timestamp: '2026-08-16 14:35:19 UTC',
          level: 'INFO',
          message: 'Multi-temporal delta computed: 42.8 km² inundated surface identified in Trishuli river valley bottom.'
        },
        {
          id: 'log-4',
          runId: 'TRISHULI-202608-RUN09',
          timestamp: '2026-08-16 14:36:02 UTC',
          level: 'INFO',
          message: 'Hydro-enforced DEM slope threshold > 5.0° pruned 1.4 km² false radar shadow returns on valley escarpments.'
        },
        {
          id: 'log-5',
          runId: 'TRISHULI-202608-RUN09',
          timestamp: '2026-08-16 14:36:40 UTC',
          level: 'WARN',
          message: 'Optical Sentinel-2 cloud occlusion at 28.4% over northern Trishuli gorge. Fusing SAR-only polygon for Ward 3.'
        },
        {
          id: 'log-6',
          runId: 'TRISHULI-202608-RUN09',
          timestamp: '2026-08-16 14:37:12 UTC',
          level: 'INFO',
          message: 'OSM graph parsed: 8,420 edges, 19 severed corridors, 3 isolated enclave wards identified in Bidur/Galchhi segment.'
        },
        {
          id: 'log-7',
          runId: 'TRISHULI-202608-RUN09',
          timestamp: '2026-08-16 14:38:22 UTC',
          level: 'SUCCESS',
          message: 'Pipeline execution finished in 258.4s. SHA-256 manifest: 9e2a84f3c5b9671d43a1... Artifacts sealed.'
        }
      ]
    };
    this.saveData(defaultData);
    return defaultData;
  }

  private saveData(data: DatabaseSchema): void {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
    } catch (e) {
      console.error('[DB] Failed saving db.json:', e);
    }
  }

  public getAnalyses(): AnalysisAssessment[] {
    return this.data.analyses;
  }

  public getAnalysisById(id: string): AnalysisAssessment | undefined {
    return this.data.analyses.find(a => a.id === id);
  }

  public addAnalysis(analysis: AnalysisAssessment): AnalysisAssessment {
    this.data.analyses.unshift(analysis);
    this.saveData(this.data);
    return analysis;
  }

  public updateAnalysis(id: string, updates: Partial<AnalysisAssessment>): AnalysisAssessment | undefined {
    const idx = this.data.analyses.findIndex(a => a.id === id);
    if (idx !== -1) {
      this.data.analyses[idx] = { ...this.data.analyses[idx], ...updates };
      this.saveData(this.data);
      return this.data.analyses[idx];
    }
    return undefined;
  }

  public getDataSources(): DataSourceStatus[] {
    return this.data.dataSources;
  }

  public updateDataSource(id: string, updates: Partial<DataSourceStatus>): DataSourceStatus | undefined {
    const idx = this.data.dataSources.findIndex(ds => ds.id === id);
    if (idx !== -1) {
      this.data.dataSources[idx] = { ...this.data.dataSources[idx], ...updates };
      this.saveData(this.data);
      return this.data.dataSources[idx];
    }
    return undefined;
  }

  public getLogs(): DatabaseSchema['logs'] {
    return this.data.logs;
  }

  public addLog(entry: { runId: string; level: 'INFO' | 'WARN' | 'ERROR' | 'SUCCESS'; message: string }) {
    const logItem = {
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19) + ' UTC',
      ...entry
    };
    this.data.logs.push(logItem);
    this.saveData(this.data);
    return logItem;
  }
}

export const db = new Database();
