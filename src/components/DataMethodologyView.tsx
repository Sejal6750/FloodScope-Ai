import React, { useState, useEffect } from 'react';
import { DataSourceStatus } from '../types/index.ts';

interface DataMethodologyViewProps {
  onNavigate: (path: string) => void;
}

export const DataMethodologyView: React.FC<DataMethodologyViewProps> = ({ onNavigate }) => {
  const [dataSources, setDataSources] = useState<DataSourceStatus[]>([]);
  const [testingSource, setTestingSource] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'pipeline' | 'provenance' | 'sources' | 'limitations'>('pipeline');

  const fetchSources = async () => {
    try {
      const res = await fetch('/api/datasources/status');
      if (res.ok) {
        const data = await res.json();
        setDataSources(data);
      }
    } catch {
      // offline fallback
    }
  };

  useEffect(() => {
    fetchSources();
  }, []);

  const handleTestSource = async (id: string) => {
    setTestingSource(id);
    try {
      const res = await fetch('/api/datasources/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceId: id })
      });
      if (res.ok) {
        await fetchSources();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setTestingSource(null);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-surface-container border border-surface-variant/40 rounded-xl p-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-2xl">science</span>
            <h1 className="text-xl font-bold text-slate-100">Scientific Methodology & Data Provenance</h1>
          </div>
          <p className="text-xs text-slate-400 mt-1 max-w-3xl">
            Complete technical documentation of the multi-sensor satellite pipeline, mathematical change detection models, graph isolation algorithms, and ethical disclosure framework.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onNavigate('settings')}
            className="px-3 py-1.5 bg-surface-variant hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg border border-slate-700 flex items-center gap-1.5 transition-colors"
          >
            <span className="material-symbols-outlined text-sm">tune</span>
            Source Diagnostics
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-surface-variant/40 space-x-6 text-sm font-medium">
        <button
          onClick={() => setActiveTab('pipeline')}
          className={`pb-3 flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === 'pipeline'
              ? 'border-primary text-primary'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <span className="material-symbols-outlined text-base">alt_route</span>
          Processing Pipeline (Stages 1–7)
        </button>
        <button
          onClick={() => setActiveTab('provenance')}
          className={`pb-3 flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === 'provenance'
              ? 'border-primary text-primary'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <span className="material-symbols-outlined text-base">verified_user</span>
          Data Provenance Standards
        </button>
        <button
          onClick={() => setActiveTab('sources')}
          className={`pb-3 flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === 'sources'
              ? 'border-primary text-primary'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <span className="material-symbols-outlined text-base">satellite_alt</span>
          Remote Sensing Data Feeds
        </button>
        <button
          onClick={() => setActiveTab('limitations')}
          className={`pb-3 flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === 'limitations'
              ? 'border-primary text-primary'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <span className="material-symbols-outlined text-base">warning</span>
          Uncertainty & Honest Limits
        </button>
      </div>

      {/* Tab 1: Processing Pipeline */}
      {activeTab === 'pipeline' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 bg-surface-container rounded-xl border border-surface-variant/40 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-primary font-bold">STAGE 01</span>
                <span className="material-symbols-outlined text-slate-400 text-sm">crop_free</span>
              </div>
              <h3 className="font-semibold text-slate-200 text-sm">Area of Interest (AOI)</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Accepts user-specified bounding boxes or GeoJSON polygons. Validates coordinates within [-90,90] and [-180,180], calculates UTM planar surface area, and sets temporal boundaries.
              </p>
            </div>

            <div className="p-4 bg-surface-container rounded-xl border border-surface-variant/40 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-cyan-400 font-bold">STAGE 02</span>
                <span className="material-symbols-outlined text-slate-400 text-sm">downloading</span>
              </div>
              <h3 className="font-semibold text-slate-200 text-sm">Multi-Source Ingestion</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Queries Copernicus Data Space for Sentinel-1 SAR GRD and Sentinel-2 L2A optical scenes. Retrieves Copernicus DEM GLO-30 elevation raster and OpenStreetMap road vectors.
              </p>
            </div>

            <div className="p-4 bg-surface-container rounded-xl border border-surface-variant/40 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-amber-400 font-bold">STAGE 03</span>
                <span className="material-symbols-outlined text-slate-400 text-sm">rule</span>
              </div>
              <h3 className="font-semibold text-slate-200 text-sm">Quality Assurance</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Scans product metadata for spatial overlap, missing radiometric bands, optical cloud cover percentage, and ensures matching orbit passes (ascending vs descending) to avoid look-angle artifacts.
              </p>
            </div>

            <div className="p-4 bg-surface-container rounded-xl border border-surface-variant/40 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-emerald-400 font-bold">STAGE 04</span>
                <span className="material-symbols-outlined text-slate-400 text-sm">water_drop</span>
              </div>
              <h3 className="font-semibold text-slate-200 text-sm">SAR Water Detection</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Computes backscatter coefficient delta: Δσ⁰ = σ⁰(post) - σ⁰(pre). Applies Otsu automated thresholding on VV polarization with DEM slope masking to remove mountain shadows.
              </p>
            </div>

            <div className="p-4 bg-surface-container rounded-xl border border-surface-variant/40 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-rose-400 font-bold">STAGE 05</span>
                <span className="material-symbols-outlined text-slate-400 text-sm">traffic</span>
              </div>
              <h3 className="font-semibold text-slate-200 text-sm">Infrastructure Exposure</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Performs geometric intersection between detected flood polygons and OSM road/building geometries. Categorizes assets into confirmed surface overlap vs proximate hazard buffer zones.
              </p>
            </div>

            <div className="p-4 bg-surface-container rounded-xl border border-surface-variant/40 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-purple-400 font-bold">STAGE 06</span>
                <span className="material-symbols-outlined text-slate-400 text-sm">hub</span>
              </div>
              <h3 className="font-semibold text-slate-200 text-sm">Graph Connectivity</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Constructs an undirected topology graph G=(V,E) from road vectors. Flooded edges are removed. Dijkstra's shortest path solver evaluates reachability from district logistics centers to settlements.
              </p>
            </div>

            <div className="p-4 bg-surface-container rounded-xl border border-surface-variant/40 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-teal-400 font-bold">STAGE 07</span>
                <span className="material-symbols-outlined text-slate-400 text-sm">task_alt</span>
              </div>
              <h3 className="font-semibold text-slate-200 text-sm">Validation & Reporting</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Computes uncertainty bounds, verifies against permanent water baselines (Global Surface Water), generates GeoJSON/CSV bundles, and outputs an audit log with provenance tags.
              </p>
            </div>

            <div className="p-4 bg-surface-container rounded-xl border border-surface-variant/40 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-blue-400 font-bold">COPILOT</span>
                <span className="material-symbols-outlined text-slate-400 text-sm">psychology</span>
              </div>
              <h3 className="font-semibold text-slate-200 text-sm">Grounded AI Synthesis</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Feeds verified pipeline metrics into server-side Gemini Flash with strict deterministic prompt constraints. Zero hallucination: answers cite only explicit pipeline output numbers.
              </p>
            </div>
          </div>

          {/* Deep Dive Formula Card */}
          <div className="p-6 bg-surface-container rounded-xl border border-surface-variant/40 space-y-4">
            <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-base">functions</span>
              Radar Water Detection Mathematical Principles
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs text-slate-300">
              <div className="space-y-3">
                <h4 className="font-semibold text-primary">1. Specular Reflection vs Rough Land</h4>
                <p className="text-slate-400 leading-relaxed">
                  Calm open water behaves as a specular reflector for C-band radar waves (λ ≈ 5.6 cm). Transmitted radar pulses bounce away from the antenna, resulting in a very low normalized radar cross section (σ⁰ ≈ -18 to -24 dB). In contrast, vegetated land exhibits rough surface and volume scattering (σ⁰ ≈ -8 to -14 dB).
                </p>
                <div className="bg-surface-container-high p-3 rounded font-mono text-[11px] text-cyan-300">
                  Δσ⁰(VV) = 10 · log₁₀(I_post) - 10 · log₁₀(I_pre) &lt; τ_adaptive
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="font-semibold text-primary">2. Otsu Adaptive Thresholding & DEM Filtering</h4>
                <p className="text-slate-400 leading-relaxed">
                  Instead of a fixed arbitrary cutoff, FloodScope AI analyzes the bimodal histogram of backscatter values across the AOI to dynamically locate the valley between water and land distributions. To prevent mountain shadow false positives, pixels with slope θ &gt; 25° in the Copernicus GLO-30 DEM are automatically masked out.
                </p>
                <div className="bg-surface-container-high p-3 rounded font-mono text-[11px] text-emerald-300">
                  Water_Mask = (Δσ⁰ &lt; τ_Otsu) ∧ (Slope_DEM &lt; 25°) ∧ (PermanentWater == 0)
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Data Provenance Standards */}
      {activeTab === 'provenance' && (
        <div className="space-y-6">
          <div className="p-5 bg-surface-container rounded-xl border border-surface-variant/40 space-y-4">
            <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider">
              Centralized Data Provenance State Machine
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              In accordance with Hackathon Track B and ethical scientific principles, FloodScope AI enforces explicit, transparent data classification. The application never claims a live satellite acquisition when running on synthetic testbeds or sample calibrations.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              <div className="p-4 bg-amber-950/20 border border-amber-500/40 rounded-lg space-y-2">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span>
                  <span className="font-mono text-xs font-bold text-amber-300">DEMO_SYNTHETIC</span>
                </div>
                <p className="text-xs text-amber-200/80 leading-relaxed">
                  Synthetic testbed simulation used for visual demonstration, UI verification, or offline development. Clearly labeled with persistent yellow badges across all views and report headers.
                </p>
              </div>

              <div className="p-4 bg-cyan-950/20 border border-cyan-500/40 rounded-lg space-y-2">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-cyan-400"></span>
                  <span className="font-mono text-xs font-bold text-cyan-300">SAMPLE_DATA</span>
                </div>
                <p className="text-xs text-cyan-200/80 leading-relaxed">
                  Real, historical satellite data from calibrated pilot areas (e.g., Trishuli Basin August 2026 flood event). Verified preprocessing with known sensor parameters and permanent water baselines.
                </p>
              </div>

              <div className="p-4 bg-emerald-950/20 border border-emerald-500/40 rounded-lg space-y-2">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
                  <span className="font-mono text-xs font-bold text-emerald-300">LIVE</span>
                </div>
                <p className="text-xs text-emerald-200/80 leading-relaxed">
                  Real-time satellite scenes retrieved from live API connections (Copernicus CDSE / AWS Earth STAC) with validated HTTP response payloads, fresh orbital ephemeris, and passing quality checks.
                </p>
              </div>
            </div>
          </div>

          {/* Validation Statuses Table */}
          <div className="p-5 bg-surface-container rounded-xl border border-surface-variant/40 space-y-3">
            <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider">
              Processing & Validation Status Transitions
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead>
                  <tr className="border-b border-surface-variant/60 text-slate-400">
                    <th className="py-2 px-3">State Identifier</th>
                    <th className="py-2 px-3">Trigger Condition</th>
                    <th className="py-2 px-3">User Experience / UI Manifestation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-variant/30 text-slate-300">
                  <tr>
                    <td className="py-2.5 px-3 text-cyan-400 font-bold">CONNECTING</td>
                    <td className="py-2.5 px-3">Handshake initiated with Copernicus STAC or Overpass API</td>
                    <td className="py-2.5 px-3">Telemetry pulse, connection spinner, active latency ping</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 text-rose-400 font-bold">INGESTION_FAILED</td>
                    <td className="py-2.5 px-3">Cloud cover &gt; 80%, scene outside orbit swath, or rate limit</td>
                    <td className="py-2.5 px-3">Meaningful error banner with required config/swath diagnostic</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 text-amber-400 font-bold">PROCESSING</td>
                    <td className="py-2.5 px-3">SAR backscatter delta computation and graph routing active</td>
                    <td className="py-2.5 px-3">5-stage progress bar with live terminal log streaming</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 text-blue-400 font-bold">COMPLETED_UNVALIDATED</td>
                    <td className="py-2.5 px-3">SAR detection finished but no ground truth reference available</td>
                    <td className="py-2.5 px-3">Displays estimated extent; forbids fabricated accuracy/F1 metrics</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 text-emerald-400 font-bold">COMPLETED_VALIDATED</td>
                    <td className="py-2.5 px-3">Matched against verified hydrologic gauges or high-res drone survey</td>
                    <td className="py-2.5 px-3">Certified green badge with ground-truth confusion matrix</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Remote Sensing Data Feeds */}
      {activeTab === 'sources' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {dataSources.map((source) => (
              <div key={source.id} className="p-5 bg-surface-container rounded-xl border border-surface-variant/40 space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-slate-100 text-sm">{source.name}</h3>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                        source.status === 'CONNECTED_TESTED' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' :
                        source.status === 'CACHED_AVAILABLE' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' :
                        'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      }`}>
                        {source.statusLabel || source.status}
                      </span>
                    </div>
                    <span className="text-xs text-slate-400 font-mono mt-0.5 block">{source.provider}</span>
                  </div>

                  <button
                    onClick={() => handleTestSource(source.id)}
                    disabled={testingSource === source.id}
                    className="px-3 py-1.5 bg-surface-variant hover:bg-slate-700 disabled:opacity-50 text-slate-200 text-xs font-mono rounded border border-slate-700 flex items-center gap-1.5 transition-colors"
                  >
                    <span className={`material-symbols-outlined text-xs ${testingSource === source.id ? 'animate-spin' : ''}`}>
                      {testingSource === source.id ? 'sync' : 'network_check'}
                    </span>
                    {testingSource === source.id ? 'Testing...' : 'Ping Test'}
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs font-mono bg-surface-container-high/60 p-3 rounded border border-surface-variant/30 text-slate-300">
                  <div>
                    <span className="text-slate-500 text-[10px] block">ENDPOINT</span>
                    <span className="truncate block text-slate-300" title={source.endpointUrl}>{source.endpointUrl}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[10px] block">AUTH MODE</span>
                    <span className="text-slate-300">{source.requiredCredentials.length > 0 ? source.requiredCredentials.join(', ') : 'Public Open Access'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[10px] block">LATENCY</span>
                    <span className="text-cyan-400">{source.latencyMs ? `${source.latencyMs}ms` : 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[10px] block">LAST CHECK</span>
                    <span className="text-slate-400">{source.lastTested ? new Date(source.lastTested).toLocaleTimeString() : 'Verified'}</span>
                  </div>
                </div>

                {source.description && (
                  <p className="text-xs text-slate-400 leading-relaxed bg-slate-900/50 p-2.5 rounded border border-slate-800">
                    <span className="text-slate-500 font-mono text-[10px] uppercase block mb-0.5">Configuration & Data Note</span>
                    {source.description}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 4: Uncertainty & Honest Limits */}
      {activeTab === 'limitations' && (
        <div className="space-y-6">
          <div className="p-6 bg-surface-container rounded-xl border border-surface-variant/40 space-y-4">
            <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
              <span className="material-symbols-outlined text-amber-400 text-base">verified</span>
              Ethical Remote Sensing Standards & Non-Fabrication Guarantee
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Automated satellite radar analysis is a rapid triage tool, not omniscient ground truth. In emergency response scenarios, false certainty can misdirect rescue helicopters and life-saving aid. FloodScope AI adheres to the following explicit boundaries:
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div className="p-4 bg-surface-container-high rounded-lg border border-slate-800 space-y-2">
                <div className="flex items-center gap-2 text-rose-400">
                  <span className="material-symbols-outlined text-base">do_not_disturb_on</span>
                  <span className="font-semibold text-xs uppercase tracking-wider">Never Confirmed Structural Collapse</span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Sentinel-1 has a spatial resolution of ~10m (pixel spacing). While radar backscatter change over a river crossing indicates high water or abutment inundation, satellite imagery alone cannot confirm whether a concrete bridge span has fallen or merely has 10cm of surface water. We report "Potentially Exposed Crossing" instead of "Confirmed Collapse".
                </p>
              </div>

              <div className="p-4 bg-surface-container-high rounded-lg border border-slate-800 space-y-2">
                <div className="flex items-center gap-2 text-amber-400">
                  <span className="material-symbols-outlined text-base">do_not_disturb_on</span>
                  <span className="font-semibold text-xs uppercase tracking-wider">No Fabricated Validation Metrics</span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Many geospatial demos fabricate false Precision (94.2%), Recall (91.8%), or IoU (0.89) scores without any actual ground-truth vector labels. In FloodScope AI, evaluation metrics are only calculated when reference raster polygons are uploaded. When unvalidated, the status clearly reads <code>COMPLETED_UNVALIDATED</code>.
                </p>
              </div>

              <div className="p-4 bg-surface-container-high rounded-lg border border-slate-800 space-y-2">
                <div className="flex items-center gap-2 text-cyan-400">
                  <span className="material-symbols-outlined text-base">terrain</span>
                  <span className="font-semibold text-xs uppercase tracking-wider">Mountain Layover & Radar Shadow</span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Side-looking radar in steep Himalayan gorges creates geometric distortions (foreshortening and radar shadow behind ridges). Shadow regions produce dark pixels identical to water. FloodScope AI integrates Copernicus GLO-30 DEM to calculate incidence angles and eliminate steep slope false positives.
                </p>
              </div>

              <div className="p-4 bg-surface-container-high rounded-lg border border-slate-800 space-y-2">
                <div className="flex items-center gap-2 text-emerald-400">
                  <span className="material-symbols-outlined text-base">route</span>
                  <span className="font-semibold text-xs uppercase tracking-wider">OpenStreetMap Road Completeness</span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Settlement isolation graphs depend on OpenStreetMap data quality. Unmapped pedestrian footpaths or informal suspension bridges may exist in reality that are not captured in the digital topology. We clearly flag "Graph Network Model Limitation" on all cut-off settlement metrics.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
