import { GeoLocation, AnalysisAssessment } from '../src/types/index.ts';

// Cache to minimize remote latency and honor rate limits
const geocodeCache = new Map<string, { timestamp: number; results: GeoLocation[] }>();
const CACHE_TTL_MS = 1000 * 60 * 30; // 30 minutes

// Comprehensive curated India geographic baseline (States, UTs, Key River Basins & Metros)
// Ensures instant response while live Nominatim lookup queries full localities/villages/districts
const INDIA_GEOGRAPHIC_BASE: Omit<GeoLocation, 'id'>[] = [
  // Major Metros & Specific Test Cities
  {
    name: 'Delhi',
    displayName: 'National Capital Territory of Delhi, India',
    type: 'capital / union territory',
    state: 'Delhi',
    district: 'New Delhi',
    lat: 28.6139,
    lon: 77.2090,
    bbox: [76.84, 28.40, 77.35, 28.88]
  },
  {
    name: 'Mumbai',
    displayName: 'Mumbai, Maharashtra, India',
    type: 'metropolitan city / coastal',
    state: 'Maharashtra',
    district: 'Mumbai Suburban',
    lat: 19.0760,
    lon: 72.8777,
    bbox: [72.77, 18.89, 72.99, 19.27]
  },
  {
    name: 'Guwahati',
    displayName: 'Guwahati, Kamrup Metropolitan, Assam, India',
    type: 'city / river basin',
    state: 'Assam',
    district: 'Kamrup Metropolitan',
    lat: 26.1806,
    lon: 91.7539,
    bbox: [91.59, 26.02, 91.91, 26.34]
  },
  {
    name: 'Chennai',
    displayName: 'Chennai, Tamil Nadu, India',
    type: 'coastal metropolitan city',
    state: 'Tamil Nadu',
    district: 'Chennai',
    lat: 13.0827,
    lon: 80.2707,
    bbox: [80.12, 12.92, 80.34, 13.24]
  },
  {
    name: 'Jaipur',
    displayName: 'Jaipur, Rajasthan, India',
    type: 'state capital / district',
    state: 'Rajasthan',
    district: 'Jaipur',
    lat: 26.9124,
    lon: 75.7873,
    bbox: [75.68, 26.78, 75.92, 27.04]
  },
  {
    name: 'Kolkata',
    displayName: 'Kolkata, West Bengal, India',
    type: 'metropolitan city / delta basin',
    state: 'West Bengal',
    district: 'Kolkata',
    lat: 22.5726,
    lon: 88.3639,
    bbox: [88.24, 22.46, 88.47, 22.65]
  },
  {
    name: 'Bengaluru',
    displayName: 'Bengaluru, Karnataka, India',
    type: 'city / plateau',
    state: 'Karnataka',
    district: 'Bengaluru Urban',
    lat: 12.9716,
    lon: 77.5946,
    bbox: [77.46, 12.83, 77.74, 13.14]
  },
  {
    name: 'Hyderabad',
    displayName: 'Hyderabad, Telangana, India',
    type: 'city / river basin',
    state: 'Telangana',
    district: 'Hyderabad',
    lat: 17.3850,
    lon: 78.4867,
    bbox: [78.33, 17.26, 78.61, 17.52]
  },
  {
    name: 'Patna',
    displayName: 'Patna, Bihar, India',
    type: 'city / ganga river basin',
    state: 'Bihar',
    district: 'Patna',
    lat: 25.5941,
    lon: 85.1376,
    bbox: [85.01, 25.52, 85.26, 25.68]
  },
  {
    name: 'Srinagar',
    displayName: 'Srinagar, Jammu and Kashmir, India',
    type: 'city / jhelum river basin',
    state: 'Jammu and Kashmir',
    district: 'Srinagar',
    lat: 34.0837,
    lon: 74.7973,
    bbox: [74.70, 34.01, 74.92, 34.16]
  },
  {
    name: 'Kochi',
    displayName: 'Kochi, Ernakulam, Kerala, India',
    type: 'coastal city / backwaters',
    state: 'Kerala',
    district: 'Ernakulam',
    lat: 9.9312,
    lon: 76.2673,
    bbox: [76.18, 9.85, 76.36, 10.02]
  },
  {
    name: 'Cuttack',
    displayName: 'Cuttack, Odisha, India',
    type: 'city / mahanadi river delta',
    state: 'Odisha',
    district: 'Cuttack',
    lat: 20.4625,
    lon: 85.8828,
    bbox: [85.78, 20.39, 85.98, 20.54]
  },
  {
    name: 'Varanasi',
    displayName: 'Varanasi, Uttar Pradesh, India',
    type: 'city / ganga river basin',
    state: 'Uttar Pradesh',
    district: 'Varanasi',
    lat: 25.3176,
    lon: 82.9739,
    bbox: [82.88, 25.24, 83.07, 25.39]
  },
  // Indian States & Union Territories
  {
    name: 'Assam',
    displayName: 'Assam State, Brahmaputra Valley, India',
    type: 'state',
    state: 'Assam',
    lat: 26.2006,
    lon: 92.9376,
    bbox: [89.70, 24.14, 96.02, 27.97]
  },
  {
    name: 'Bihar',
    displayName: 'Bihar State, Middle Ganga Plain, India',
    type: 'state',
    state: 'Bihar',
    lat: 25.0961,
    lon: 85.3131,
    bbox: [83.32, 24.28, 88.29, 27.52]
  },
  {
    name: 'Kerala',
    displayName: 'Kerala State, Western Ghats Coast, India',
    type: 'state',
    state: 'Kerala',
    lat: 10.8505,
    lon: 76.2711,
    bbox: [74.86, 8.29, 77.41, 12.79]
  },
  {
    name: 'Odisha',
    displayName: 'Odisha State, Eastern Coast & Mahanadi Basin, India',
    type: 'state',
    state: 'Odisha',
    lat: 20.9517,
    lon: 85.0985,
    bbox: [81.38, 17.81, 87.52, 22.57]
  },
  {
    name: 'West Bengal',
    displayName: 'West Bengal State, Ganges Delta, India',
    type: 'state',
    state: 'West Bengal',
    lat: 22.9868,
    lon: 87.8550,
    bbox: [85.82, 21.52, 89.88, 27.22]
  },
  {
    name: 'Maharashtra',
    displayName: 'Maharashtra State, India',
    type: 'state',
    state: 'Maharashtra',
    lat: 19.7515,
    lon: 75.7139,
    bbox: [72.63, 15.60, 80.89, 22.02]
  },
  {
    name: 'Gujarat',
    displayName: 'Gujarat State, Narmada & Tapi Delta, India',
    type: 'state',
    state: 'Gujarat',
    lat: 22.2587,
    lon: 71.1924,
    bbox: [68.16, 20.12, 74.47, 24.71]
  },
  {
    name: 'Rajasthan',
    displayName: 'Rajasthan State, India',
    type: 'state',
    state: 'Rajasthan',
    lat: 27.0238,
    lon: 74.2179,
    bbox: [69.49, 23.05, 78.28, 30.20]
  },
  {
    name: 'Tamil Nadu',
    displayName: 'Tamil Nadu State, Coromandel Coast, India',
    type: 'state',
    state: 'Tamil Nadu',
    lat: 11.1271,
    lon: 78.6569,
    bbox: [76.23, 8.07, 80.34, 13.56]
  },
  {
    name: 'Uttarakhand',
    displayName: 'Uttarakhand State, Himalayan Watershed, India',
    type: 'state',
    state: 'Uttarakhand',
    lat: 30.0668,
    lon: 79.0193,
    bbox: [77.57, 28.71, 81.04, 31.46]
  },
  {
    name: 'Himachal Pradesh',
    displayName: 'Himachal Pradesh State, Upper Indus / Sutlej Basin, India',
    type: 'state',
    state: 'Himachal Pradesh',
    lat: 31.1048,
    lon: 77.1734,
    bbox: [75.59, 30.38, 79.07, 33.25]
  },
  // Key River Basin Hydrological Features
  {
    name: 'Brahmaputra River Valley',
    displayName: 'Brahmaputra Floodplain Corridor, Assam, India',
    type: 'major river basin',
    state: 'Assam',
    lat: 26.2400,
    lon: 91.8000,
    bbox: [90.50, 25.80, 93.50, 26.90]
  },
  {
    name: 'Ganga Catchment (Varanasi-Patna)',
    displayName: 'Ganga Flood Basin Corridor, Bihar / UP, India',
    type: 'major river basin',
    state: 'Bihar',
    lat: 25.6000,
    lon: 84.5000,
    bbox: [83.00, 25.00, 86.00, 26.00]
  },
  {
    name: 'Mahanadi Delta',
    displayName: 'Mahanadi Coastal River Delta, Odisha, India',
    type: 'delta river basin',
    state: 'Odisha',
    lat: 20.3500,
    lon: 86.2000,
    bbox: [85.50, 19.80, 86.90, 20.80]
  },
  {
    name: 'Godavari Basin (Rajahmundry)',
    displayName: 'Godavari Lower Delta & Barrage Basin, Andhra Pradesh, India',
    type: 'river delta',
    state: 'Andhra Pradesh',
    lat: 16.9891,
    lon: 81.7840,
    bbox: [81.50, 16.60, 82.20, 17.30]
  }
];

export async function searchIndiaLocations(
  query: string,
  existingAnalyses: AnalysisAssessment[] = []
): Promise<GeoLocation[]> {
  const cleanQuery = (query || '').trim();
  if (!cleanQuery) {
    // Return key starter India locations and any linked to existing analyses
    return getTopIndiaSuggestions(existingAnalyses);
  }

  // 1. Check coordinates input: e.g. "28.6139, 77.2090" or "28.6139 N, 77.2090 E"
  const coordsMatch = parseCoordinates(cleanQuery);
  if (coordsMatch) {
    const { lat, lon } = coordsMatch;
    const padding = 0.12; // ~13km radius AOI box
    const coordLocation: GeoLocation = {
      id: `coord-${lat.toFixed(4)}-${lon.toFixed(4)}`,
      name: `${lat.toFixed(4)}°N, ${lon.toFixed(4)}°E`,
      displayName: `Custom Coordinates (${lat.toFixed(4)}°N, ${lon.toFixed(4)}°E) — India Bounding AOI`,
      type: 'coordinates',
      lat,
      lon,
      bbox: [
        Math.max(-180, lon - padding),
        Math.max(-90, lat - padding),
        Math.min(180, lon + padding),
        Math.min(90, lat + padding)
      ],
      source: 'Direct Coordinate Specification'
    };
    attachAnalysisStatus([coordLocation], existingAnalyses);
    return [coordLocation];
  }

  // Check in-memory cache
  const cacheKey = cleanQuery.toLowerCase();
  const cached = geocodeCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    attachAnalysisStatus(cached.results, existingAnalyses);
    return cached.results;
  }

  // 2. Search local curated India baseline first for fast matching
  const lowerQuery = cleanQuery.toLowerCase();
  const baselineMatches: GeoLocation[] = INDIA_GEOGRAPHIC_BASE.filter(item => {
    return (
      item.name.toLowerCase().includes(lowerQuery) ||
      item.displayName.toLowerCase().includes(lowerQuery) ||
      (item.state && item.state.toLowerCase().includes(lowerQuery)) ||
      (item.district && item.district.toLowerCase().includes(lowerQuery))
    );
  }).map((item, idx) => ({
    ...item,
    id: `base-${idx}-${item.name.toLowerCase().replace(/\s+/g, '-')}`,
    source: 'Curated India Administrative Registry'
  }));

  // 3. Query OpenStreetMap Nominatim for real live geocoding coverage across all Indian localities, towns, villages, and features
  let nominatimResults: GeoLocation[] = [];
  try {
    const encoded = encodeURIComponent(cleanQuery);
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encoded}&countrycodes=in&addressdetails=1&limit=8`;
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'FloodScopeAI-India-Disaster-Geocoding/1.0 (disaster-response@floodscope.org)',
        'Accept': 'application/json'
      },
      signal: AbortSignal.timeout(4500)
    });

    if (response.ok) {
      const data = await response.json();
      if (Array.isArray(data)) {
        nominatimResults = data.map((item: any) => {
          const rawLat = parseFloat(item.lat);
          const rawLon = parseFloat(item.lon);
          const addr = item.address || {};
          const state = addr.state || '';
          const district = addr.state_district || addr.county || addr.district || '';
          const cityOrTown = addr.city || addr.town || addr.village || addr.suburb || item.name;

          // Parse bounding box [minLat, maxLat, minLon, maxLon] -> [minLon, minLat, maxLon, maxLat]
          let minLon = parseFloat(item.boundingbox?.[2] ?? rawLon - 0.1);
          let minLat = parseFloat(item.boundingbox?.[0] ?? rawLat - 0.1);
          let maxLon = parseFloat(item.boundingbox?.[3] ?? rawLon + 0.1);
          let maxLat = parseFloat(item.boundingbox?.[1] ?? rawLat + 0.1);

          // Ensure minimum bounding area if single point node was returned
          if (maxLon - minLon < 0.04) {
            minLon = rawLon - 0.08;
            maxLon = rawLon + 0.08;
          }
          if (maxLat - minLat < 0.04) {
            minLat = rawLat - 0.08;
            maxLat = rawLat + 0.08;
          }

          return {
            id: `osm-${item.osm_type || 'p'}-${item.osm_id || Math.random().toString(36).substring(2, 7)}`,
            name: item.name || cityOrTown,
            displayName: item.display_name,
            type: item.type || item.addresstype || 'geographic location',
            state: state || undefined,
            district: district || undefined,
            lat: rawLat,
            lon: rawLon,
            bbox: [
              Math.round(minLon * 10000) / 10000,
              Math.round(minLat * 10000) / 10000,
              Math.round(maxLon * 10000) / 10000,
              Math.round(maxLat * 10000) / 10000
            ],
            source: 'OpenStreetMap Live Geocoder'
          } as GeoLocation;
        });
      }
    }
  } catch (err) {
    console.warn(`[GEOCODE] Nominatim query failed or timed out for "${cleanQuery}":`, err);
  }

  // Combine and deduplicate results
  const combined: GeoLocation[] = [];
  const seenKeys = new Set<string>();

  // Prioritize exact or strong matches
  const allCandidates = [...nominatimResults, ...baselineMatches];
  for (const item of allCandidates) {
    const key = `${item.name.toLowerCase()}-${item.lat.toFixed(2)}-${item.lon.toFixed(2)}`;
    if (!seenKeys.has(key)) {
      seenKeys.add(key);
      combined.push(item);
    }
  }

  // If both failed to find anything, return empty
  attachAnalysisStatus(combined, existingAnalyses);

  // Save to cache
  geocodeCache.set(cacheKey, { timestamp: Date.now(), results: combined });

  return combined;
}

export function getTopIndiaSuggestions(existingAnalyses: AnalysisAssessment[] = []): GeoLocation[] {
  const topList: GeoLocation[] = INDIA_GEOGRAPHIC_BASE.slice(0, 8).map((item, idx) => ({
    ...item,
    id: `base-${idx}-${item.name.toLowerCase().replace(/\s+/g, '-')}`,
    source: 'Default Geographic Quick-Access'
  }));

  attachAnalysisStatus(topList, existingAnalyses);
  return topList;
}

function attachAnalysisStatus(locations: GeoLocation[], existingAnalyses: AnalysisAssessment[]): void {
  for (const loc of locations) {
    // Check if an existing analysis matches this location by name or coordinates within bounding box
    const match = existingAnalyses.find(a => {
      // 1. Direct name match
      if (a.name.toLowerCase().includes(loc.name.toLowerCase()) || 
          loc.name.toLowerCase().includes(a.name.toLowerCase()) ||
          a.aoiName.toLowerCase().includes(loc.name.toLowerCase())) {
        return true;
      }
      // 2. Spatial match: location center inside analysis bbox
      const [minLon, minLat, maxLon, maxLat] = a.bbox;
      if (loc.lat >= minLat && loc.lat <= maxLat && loc.lon >= minLon && loc.lon <= maxLon) {
        return true;
      }
      return false;
    });

    if (match) {
      loc.hasAnalysis = true;
      loc.analysisId = match.id;
    } else {
      loc.hasAnalysis = false;
    }
  }
}

function parseCoordinates(str: string): { lat: number; lon: number } | null {
  // Regex handles formats like:
  // "28.6139, 77.2090"
  // "28.6139N, 77.2090E"
  // "28.6139 N, 77.2090 E"
  // "28.6139 77.2090"
  const clean = str.replace(/[°]/g, '').trim();
  const match = clean.match(/^([+-]?\d+(?:\.\d+)?)\s*([NSEW])?[\s,;]+\s*([+-]?\d+(?:\.\d+)?)\s*([NSEW])?$/i);
  if (!match) return null;

  let val1 = parseFloat(match[1]);
  const dir1 = (match[2] || '').toUpperCase();
  let val2 = parseFloat(match[3]);
  const dir2 = (match[4] || '').toUpperCase();

  let lat: number;
  let lon: number;

  if (dir1 === 'N' || dir1 === 'S' || dir2 === 'E' || dir2 === 'W') {
    lat = dir1 === 'S' ? -Math.abs(val1) : Math.abs(val1);
    lon = dir2 === 'W' ? -Math.abs(val2) : Math.abs(val2);
  } else if (dir1 === 'E' || dir1 === 'W' || dir2 === 'N' || dir2 === 'S') {
    lon = dir1 === 'W' ? -Math.abs(val1) : Math.abs(val1);
    lat = dir2 === 'S' ? -Math.abs(val2) : Math.abs(val2);
  } else {
    // Assume lat, lon order
    lat = val1;
    lon = val2;
  }

  if (isNaN(lat) || isNaN(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
    return null;
  }

  return { lat, lon };
}
