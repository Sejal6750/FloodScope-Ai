import { db } from './db.ts';
import { DataSourceStatus } from '../src/types/index.ts';

interface TestResult {
  sourceId: string;
  status: DataSourceStatus['status'];
  statusLabel: string;
  latencyMs: number;
  httpStatus?: number;
  error?: string;
  timestamp: string;
}

export async function testDataSource(sourceId: string): Promise<TestResult> {
  const source = db.getDataSources().find(s => s.id === sourceId);
  const now = new Date().toISOString();

  if (!source) {
    return {
      sourceId,
      status: 'NOT_CONFIGURED',
      statusLabel: 'Not Configured',
      latencyMs: 0,
      error: 'Data source not found in system manifest',
      timestamp: now
    };
  }

  const startTime = Date.now();

  try {
    let testUrl = source.endpointUrl;
    let method = 'GET';

    // Tailored endpoints for lightweight ping/status
    if (sourceId === 'sentinel-1-csar') {
      testUrl = 'https://catalogue.dataspace.copernicus.eu/odata/v1/Products?$top=1';
    } else if (sourceId === 'sentinel-2-msi') {
      testUrl = 'https://earth-search.aws.element84.com/v1';
    } else if (sourceId === 'osm-vector-infrastructure') {
      testUrl = 'https://overpass-api.de/api/status';
    } else if (sourceId === 'copernicus-dem-30m') {
      testUrl = 'https://spacedata.copernicus.eu/';
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);

    const res = await fetch(testUrl, {
      method,
      signal: controller.signal,
      headers: {
        'User-Agent': 'FloodScope-AI-RemoteSensing-Diagnostics/2.4'
      }
    });

    clearTimeout(timeout);
    const latencyMs = Date.now() - startTime;

    if (res.ok || res.status === 401 || res.status === 403 || res.status === 200) {
      // Check if auth is required or open
      let status: DataSourceStatus['status'] = 'CONNECTED_TESTED';
      let statusLabel = 'Connected & Tested';

      if (res.status === 401 || res.status === 403) {
        status = 'CONFIGURED_NOT_TESTED';
        statusLabel = 'Auth Required (Endpoint Reachable)';
      } else {
        status = 'CONNECTED_TESTED';
        statusLabel = 'Connected (Verified HTTP ' + res.status + ')';
      }

      db.updateDataSource(sourceId, {
        status,
        statusLabel,
        latencyMs,
        lastTested: now,
        errorMessage: undefined
      });

      return {
        sourceId,
        status,
        statusLabel,
        latencyMs,
        httpStatus: res.status,
        timestamp: now
      };
    } else {
      const statusLabel = `HTTP ${res.status} Response`;
      db.updateDataSource(sourceId, {
        status: 'RETRIEVAL_FAILED',
        statusLabel,
        latencyMs,
        lastTested: now,
        errorMessage: `Server returned status ${res.status}`
      });

      return {
        sourceId,
        status: 'RETRIEVAL_FAILED',
        statusLabel,
        latencyMs,
        httpStatus: res.status,
        error: `Server responded with HTTP ${res.status}`,
        timestamp: now
      };
    }
  } catch (err: any) {
    const latencyMs = Date.now() - startTime;
    const isTimeout = err.name === 'AbortError';
    const errorMsg = isTimeout ? 'Connection timed out (>6000ms)' : (err.message || 'Network unreachable');

    // If external internet is restricted in sandboxed nodes, accurately report fallback to cached local dataset!
    const status: DataSourceStatus['status'] = source.cachedDatasetAvailable ? 'CACHED_AVAILABLE' : 'RETRIEVAL_FAILED';
    const statusLabel = source.cachedDatasetAvailable ? 'Cached Dataset Available (Offline)' : 'Retrieval Failed';

    db.updateDataSource(sourceId, {
      status,
      statusLabel,
      latencyMs,
      lastTested: now,
      errorMessage: errorMsg
    });

    return {
      sourceId,
      status,
      statusLabel,
      latencyMs,
      error: errorMsg,
      timestamp: now
    };
  }
}

export async function testAllDataSources() {
  const sources = db.getDataSources();
  const results: TestResult[] = [];
  for (const s of sources) {
    const res = await testDataSource(s.id);
    results.push(res);
  }
  return results;
}
