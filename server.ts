import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { db } from './server/db.ts';
import { testDataSource, testAllDataSources } from './server/dataSources.ts';
import { executeAnalysisPipeline, validateAnalysisPayload } from './server/pipeline.ts';
import { askSituationCopilot } from './server/geminiCopilot.ts';
import { searchIndiaLocations, getTopIndiaSuggestions } from './server/geocoding.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const isProduction = process.env.NODE_ENV === 'production';
const PORT = process.env.PORT || 3000;

const app = express();
app.use(express.json());

// API Endpoints

// 1. Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'FloodScope AI Fullstack Engine',
    geminiConfigured: !!(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY'),
    analysesCount: db.getAnalyses().length,
    activeRunId: 'TRISHULI-202608-RUN09'
  });
});

// India Geocoding & Location Search Endpoint
app.get('/api/geocode', async (req, res) => {
  try {
    const query = typeof req.query.q === 'string' ? req.query.q : '';
    const analyses = db.getAnalyses();
    const results = await searchIndiaLocations(query, analyses);
    res.json(results);
  } catch (err: any) {
    console.error('Geocoding route error:', err);
    res.status(500).json({ error: err.message || 'Geocoding failed', results: [] });
  }
});

// 2. Data sources status & diagnostic testing
app.get('/api/datasources/status', (req, res) => {
  res.json(db.getDataSources());
});

app.post('/api/datasources/test', async (req, res) => {
  const { sourceId } = req.body;
  if (sourceId) {
    const result = await testDataSource(sourceId);
    res.json(result);
  } else {
    const results = await testAllDataSources();
    res.json(results);
  }
});

// 3. Analyses CRUD & Validation
app.get('/api/analyses', (req, res) => {
  res.json(db.getAnalyses());
});

app.get('/api/analyses/:id', (req, res) => {
  const analysis = db.getAnalysisById(req.params.id);
  if (!analysis) {
    res.status(404).json({ error: 'Analysis not found' });
  } else {
    res.json(analysis);
  }
});

// Standalone Server-Side Validation Route for Bounding Box and Date Ranges
app.post('/api/analyses/validate', (req, res) => {
  try {
    const payload = req.body;
    const validation = validateAnalysisPayload(payload);
    res.json({
      valid: validation.valid,
      errors: validation.errors
    });
  } catch (err: any) {
    res.status(500).json({ valid: false, errors: [err.message || 'Validation service error'] });
  }
});

app.post('/api/analyses', async (req, res) => {
  try {
    const payload = req.body;
    const validation = validateAnalysisPayload(payload);
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        message: 'Analysis parameters failed server-side validation.',
        errors: validation.errors,
        logs: [`[SERVER-VALIDATION-FAILED] ${validation.errors.join(' | ')}`]
      });
    }

    const result = await executeAnalysisPipeline(payload);
    if (!result.success) {
      res.status(400).json(result);
    } else {
      res.status(201).json(result);
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Pipeline execution failed' });
  }
});

// 4. AI Situation Copilot Endpoint
app.post('/api/copilot/chat', async (req, res) => {
  try {
    const { query, analysisId, language } = req.body;
    const analysis = db.getAnalysisById(analysisId || 'trishuli-pilot-04') || db.getAnalyses()[0];

    if (!analysis) {
      return res.status(404).json({ error: 'No active analysis found' });
    }

    const response = await askSituationCopilot({
      query,
      analysis,
      language: language || 'en'
    });

    res.json(response);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Copilot synthesis error' });
  }
});

// 5. System Execution Logs
app.get('/api/logs', (req, res) => {
  res.json(db.getLogs());
});

// 6. Data Exports (GeoJSON & CSV)
app.get('/api/export/:id/geojson', (req, res) => {
  const analysis = db.getAnalysisById(req.params.id);
  if (!analysis) {
    return res.status(404).json({ error: 'Analysis not found' });
  }

  const [minLon, minLat, maxLon, maxLat] = analysis.bbox;
  const geojson = {
    type: 'FeatureCollection',
    metadata: {
      analysisId: analysis.id,
      name: analysis.name,
      dataMode: analysis.dataMode,
      floodExtentKm2: analysis.metrics.floodExtentKm2,
      generatedAt: new Date().toISOString(),
      disclaimer: analysis.dataMode === 'DEMO_SYNTHETIC' 
        ? 'SYNTHETIC DEMONSTRATION DATA — NOT FOR REAL-WORLD EMERGENCY DISPATCH' 
        : 'SATELLITE DERIVED INFERENCE'
    },
    features: [
      {
        type: 'Feature',
        properties: { name: 'Study Area Bounding Box', stroke: '#06b6d4', 'stroke-width': 2 },
        geometry: {
          type: 'Polygon',
          coordinates: [[
            [minLon, minLat],
            [maxLon, minLat],
            [maxLon, maxLat],
            [minLon, maxLat],
            [minLon, minLat]
          ]]
        }
      },
      ...analysis.infrastructureAssets.map(a => ({
        type: 'Feature',
        properties: {
          id: a.id,
          name: a.name,
          type: a.type,
          exposure: a.exposureCategory,
          priority: a.priority,
          sarAnomaly: a.sarAnomaly
        },
        geometry: {
          type: 'Point',
          coordinates: [a.lon, a.lat]
        }
      }))
    ]
  };

  res.setHeader('Content-Type', 'application/geo+json');
  res.setHeader('Content-Disposition', `attachment; filename="${analysis.id}.geojson"`);
  res.json(geojson);
});

app.get('/api/export/:id/csv', (req, res) => {
  const analysis = db.getAnalysisById(req.params.id);
  if (!analysis) {
    return res.status(404).json({ error: 'Analysis not found' });
  }

  let csv = 'Asset ID,Type,Name,OSM Reference,Exposure Category,Flood Overlap,SAR Anomaly,Priority,Latitude,Longitude\n';
  for (const a of analysis.infrastructureAssets) {
    csv += `"${a.id}","${a.type}","${a.name}","${a.osmRef}","${a.exposureCategory}","${a.floodOverlap}","${a.sarAnomaly}","${a.priority}",${a.lat},${a.lon}\n`;
  }

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="${analysis.id}-assets.csv"`);
  res.send(csv);
});

// Vite Middleware Mounting (Fullstack dev server pattern)
async function startServer() {
  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`[FloodScope AI] Server active on http://0.0.0.0:${PORT}`);
  });
}

startServer();
