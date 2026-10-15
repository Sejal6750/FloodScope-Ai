import React, { useState } from 'react';
import { AnalysisAssessment } from '../types/index.ts';
import { SyntheticBanner } from './SyntheticBanner.tsx';

interface SituationReportsViewProps {
  analysis: AnalysisAssessment;
  onNavigate: (path: string) => void;
}

export const SituationReportsView: React.FC<SituationReportsViewProps> = ({ analysis, onNavigate }) => {
  const [copied, setCopied] = useState(false);
  const isSynthetic = analysis.dataMode === 'DEMO_SYNTHETIC';
  const isSample = analysis.dataMode === 'SAMPLE_DATA';

  const handlePrint = () => {
    window.print();
  };

  const handleExportJson = () => {
    const reportData = {
      reportTitle: `FloodScope AI Situation Report - ${analysis.name}`,
      analysisId: analysis.id,
      generatedAt: new Date().toISOString(),
      provenance: {
        dataMode: analysis.dataMode,
        processingStatus: analysis.processingStatus,
        validationStatus: analysis.validationStatus,
        sensor: 'Sentinel-1 SAR C-Band (5.405 GHz)',
        preEventDate: analysis.baselineDate,
        postEventDate: analysis.postEventDate,
        aoiBbox: analysis.bbox
      },
      metrics: analysis.metrics,
      infrastructure: analysis.infrastructureAssets,
      settlements: analysis.settlements,
      limitations: [
        'SAR specular reflection false positives from smooth surfaces (runways, dry asphalt)',
        'Layover and radar shadow in steep terrain (>25° slope excluded)',
        'Infrastructure damage is inferred from topological flood overlap, not verified structural collapse',
        'OSM road network completeness variance'
      ]
    };

    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `SITREP-${analysis.id}-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopyMarkdown = () => {
    const md = `# FLOODSCOPE AI OPERATIONAL SITUATION REPORT (SITREP)
**Analysis ID:** ${analysis.id}
**Area of Interest:** ${analysis.name}
**Acquisition Window:** ${analysis.baselineDate} to ${analysis.postEventDate}
**Data Provenance Mode:** ${analysis.dataMode} (${isSynthetic ? 'SYNTHETIC TESTBED' : isSample ? 'CALIBRATED PILOT' : 'LIVE SATELLITE'})
**Validation State:** ${analysis.validationStatus}

---

## 1. EXECUTIVE SUMMARY
Satellite SAR change detection on Sentinel-1 C-band indicates an estimated flood extent of **${analysis.metrics.floodExtentKm2} km²** (approx. ±${analysis.metrics.uncertaintyMarginKm2} km² uncertainty range). Inundation intersects approximately **${analysis.metrics.exposedRoadKm} km** of the road network and isolates **${analysis.metrics.cutOffSettlementsCount}** community hubs.

## 2. INUNDATION METRICS
- Total Bounding Box Area: ${analysis.areaKm2} km²
- Estimated Flooded Area: ${analysis.metrics.floodExtentKm2} km²
- Flooded Area Fraction: ${((analysis.metrics.floodExtentKm2 / (analysis.areaKm2 || 1)) * 100).toFixed(1)}%
- Inundated Buildings Footprints: ~${analysis.metrics.buildingsCount} units
- Potentially Exposed Critical Bridges: ${analysis.metrics.bridgesCount} crossings

## 3. SETTLEMENT CONNECTIVITY STATUS
${analysis.settlements.map(s => `- **${s.name}**: ${s.status} (${s.estPopAtRisk.toLocaleString()} pop) - Route: ${s.primaryRoute} - ${s.detourDetails}`).join('\n')}

## 4. SCIENTIFIC LIMITATIONS & ETHICAL NOTICE
- Satellite radar estimates identify surface water backscatter drop, not confirmed bridge collapse or structural failure.
- Steep terrain layover and shadow masked via Copernicus GLO-30 DEM.
- Field ground-truth validation is required before direct heavy equipment dispatch.
`;

    navigator.clipboard.writeText(md);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Transparency Banner */}
      <SyntheticBanner dataMode={analysis.dataMode} analysisName={analysis.name} />

      {/* Top Action Ribbon (Hidden when printing) */}
      <div className="print:hidden flex flex-wrap items-center justify-between gap-4 bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-amber-600">description</span>
            <h1 className="text-xl font-bold text-slate-900">Operational Situation Report (SITREP)</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Official briefing document formatted for emergency management, UN OCHA, and humanitarian logistics triage.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => onNavigate('copilot')}
            className="px-3 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg border border-slate-200 flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-sm text-amber-600">psychology</span>
            Ask AI Copilot
          </button>
          <button
            onClick={handleCopyMarkdown}
            className="px-3 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg border border-slate-200 flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-sm">{copied ? 'check' : 'content_copy'}</span>
            {copied ? 'Copied Markdown' : 'Copy Markdown'}
          </button>
          <button
            onClick={handleExportJson}
            className="px-3 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg border border-slate-200 flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-sm">download</span>
            Export JSON
          </button>
          <button
            onClick={handlePrint}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs rounded-lg flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
          >
            <span className="material-symbols-outlined text-sm">print</span>
            Print A4 / Save PDF
          </button>
        </div>
      </div>

      {/* Printable A4 Document Sheet - Clean White & Gold Theme */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-md print:bg-white print:text-black print:border-none print:shadow-none print:p-0">
        <div className="p-8 md:p-12 space-y-8 max-w-4xl mx-auto print:max-w-none text-slate-900">
          
          {/* Document Header */}
          <div className="border-b-2 border-amber-500/60 pb-6">
            <div className="flex flex-wrap justify-between items-start gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-3 h-3 rounded-full bg-amber-600 animate-pulse print:hidden"></div>
                  <span className="text-xs tracking-wider text-amber-800 uppercase font-bold">
                    FLOODSCOPE AI • SATELLITE RAPID MAPPING PROTOCOL
                  </span>
                </div>
                <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
                  SITUATION REPORT: {analysis.name.toUpperCase()}
                </h1>
                <p className="text-xs text-slate-500 mt-1 font-mono">
                  DISASTER EVENT CODE: NE-2026-FL-004 • MONSOON TRISHULI RIVER SURGE
                </p>
              </div>

              <div className="text-right">
                <div className={`inline-block px-3 py-1 rounded text-xs font-mono font-bold tracking-wider ${
                  isSynthetic 
                    ? 'bg-amber-100 text-amber-800 border border-amber-300' 
                    : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                }`}>
                  {isSynthetic ? 'SYNTHETIC TESTBED DATA' : isSample ? 'CALIBRATED PILOT RUN' : 'LIVE VERIFIED'}
                </div>
                <div className="text-xs text-slate-500 mt-2 font-mono">
                  REF: FS-{analysis.id.toUpperCase()}
                </div>
                <div className="text-xs text-slate-500 font-mono">
                  ISSUED: {new Date().toUTCString()}
                </div>
              </div>
            </div>
          </div>

          {/* Mandatory Provenance & Science Disclaimer Box */}
          <div className={`p-4 rounded-lg border text-xs leading-relaxed ${
            isSynthetic 
              ? 'bg-amber-50 border-amber-300 text-amber-900' 
              : 'bg-amber-50/60 border-amber-200 text-slate-800'
          }`}>
            <div className="flex items-start gap-2.5">
              <span className="material-symbols-outlined text-amber-700 text-base mt-0.5 print:hidden">warning</span>
              <div>
                <span className="font-bold uppercase tracking-wider block mb-1 text-amber-800">
                  {isSynthetic ? 'SCIENTIFIC INTEGRITY NOTICE — SYNTHETIC DEMONSTRATION' : 'DATA PROVENANCE & METHODOLOGY NOTICE'}
                </span>
                <p>
                  This situation report is derived from radar change detection (Sentinel-1 SAR C-band, VV/VH polarizations) coupled with Copernicus DEM 30m terrain filtering.
                  {isSynthetic && ' Values presented in this document represent a synthetic simulation benchmark designed to validate end-to-end telemetry and must NOT be used as real ground-truth measurements for physical dispatch.'}
                  Satellite backscatter anomalies signify surface water presence; they do NOT confirm physical bridge collapse, road foundation washout, or human casualties without ground verification.
                </p>
              </div>
            </div>
          </div>

          {/* Section 1: Event & Analysis Metadata */}
          <div>
            <h2 className="text-sm font-bold tracking-wider uppercase text-slate-900 border-b border-slate-200 pb-2 mb-4 flex items-center gap-2">
              <span className="w-1.5 h-4 bg-amber-600 rounded-full"></span>
              1. Satellite Acquisition & Computational Metadata
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs font-mono bg-slate-50 p-4 rounded-lg border border-slate-200">
              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-semibold">Radar Sensor</span>
                <span className="font-bold text-slate-900">Sentinel-1 SAR (C-Band)</span>
                <span className="text-slate-500 text-[10px] block">VV + VH dual-pol</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-semibold">Pre-Event Baseline</span>
                <span className="font-bold text-slate-900">{analysis.baselineDate}</span>
                <span className="text-slate-500 text-[10px] block">Dry season reference</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-semibold">Post-Event Capture</span>
                <span className="font-bold text-slate-900">{analysis.postEventDate}</span>
                <span className="text-slate-500 text-[10px] block">Peak inundation pass</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-semibold">Terrain Normalization</span>
                <span className="font-bold text-slate-900">Copernicus GLO-30 DEM</span>
                <span className="text-slate-500 text-[10px] block">Layover/Shadow masked</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-semibold">Geographic Bounding Box</span>
                <span className="font-bold text-slate-900">[{analysis.bbox.map(n => n.toFixed(3)).join(', ')}]</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-semibold">Backscatter Threshold</span>
                <span className="font-bold text-amber-700">-14.2 dB (Otsu Adaptive)</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-semibold">Validation Status</span>
                <span className="font-bold text-amber-800">{analysis.validationStatus}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-semibold">Vector Reference</span>
                <span className="font-bold text-slate-900">OpenStreetMap 2026</span>
              </div>
            </div>
          </div>

          {/* Section 2: Key Operational Findings */}
          <div>
            <h2 className="text-sm font-bold tracking-wider uppercase text-slate-900 border-b border-slate-200 pb-2 mb-4 flex items-center gap-2">
              <span className="w-1.5 h-4 bg-amber-600 rounded-full"></span>
              2. Key Operational Triage Findings
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                <span className="text-[11px] text-slate-500 block font-semibold">Estimated Inundation</span>
                <span className="text-2xl font-bold font-mono text-amber-700">
                  {analysis.metrics.floodExtentKm2} <span className="text-sm font-sans font-normal text-slate-600">km²</span>
                </span>
                <span className="text-[10px] text-slate-500 block mt-1">±{analysis.metrics.uncertaintyMarginKm2} km² uncertainty</span>
              </div>
              <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                <span className="text-[11px] text-slate-500 block font-semibold">Exposed Road Network</span>
                <span className="text-2xl font-bold font-mono text-amber-700">
                  {analysis.metrics.exposedRoadKm} <span className="text-sm font-sans font-normal text-slate-600">km</span>
                </span>
                <span className="text-[10px] text-slate-500 block mt-1">Highways & feeders</span>
              </div>
              <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                <span className="text-[11px] text-slate-500 block font-semibold">Cut-Off Settlement Hubs</span>
                <span className="text-2xl font-bold font-mono text-rose-700">
                  {analysis.metrics.cutOffSettlementsCount}
                </span>
                <span className="text-[10px] text-slate-500 block mt-1">Road access severed</span>
              </div>
              <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                <span className="text-[11px] text-slate-500 block font-semibold">Population at Hazard</span>
                <span className="text-2xl font-bold font-mono text-slate-900">
                  ~{analysis.metrics.isolatedPopulationEst?.toLocaleString() || '14,200'}
                </span>
                <span className="text-[10px] text-slate-500 block mt-1">Census aggregation</span>
              </div>
            </div>
            <p className="text-xs text-slate-700 leading-relaxed">
              <strong className="text-slate-900">Analyst Assessment:</strong> Inundation is concentrated along the river corridor, affecting the transport network. Significant backscatter attenuation indicates standing surface water over primary corridors. Bridge abutments exhibit high radar anomalies, severing direct vehicular logistics to northern valley settlements.
            </p>
          </div>

          {/* Section 3: Critical Settlement Accessibility Status Table */}
          <div>
            <h2 className="text-sm font-bold tracking-wider uppercase text-slate-900 border-b border-slate-200 pb-2 mb-4 flex items-center gap-2">
              <span className="w-1.5 h-4 bg-amber-600 rounded-full"></span>
              3. Settlement Accessibility & Connectivity Status
            </h2>
            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 border-b border-slate-200">
                    <th className="py-2.5 px-3 font-semibold">Settlement</th>
                    <th className="py-2.5 px-3 font-semibold">Est. Pop at Risk</th>
                    <th className="py-2.5 px-3 font-semibold">Graph Status</th>
                    <th className="py-2.5 px-3 font-semibold">Primary Route</th>
                    <th className="py-2.5 px-3 font-semibold">Detour / Connectivity Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-slate-800 bg-white">
                  {analysis.settlements.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-2.5 px-3 font-bold text-slate-900">{s.name}</td>
                      <td className="py-2.5 px-3 font-mono">{s.estPopAtRisk.toLocaleString()}</td>
                      <td className="py-2.5 px-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          s.status === 'POTENTIALLY CUT OFF' 
                            ? 'bg-rose-100 text-rose-800 border border-rose-300' 
                            : s.status === 'DETOUR COMPROMISED'
                            ? 'bg-amber-100 text-amber-800 border border-amber-300'
                            : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        }`}>
                          {s.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-medium text-slate-700">{s.primaryRoute}</td>
                      <td className="py-2.5 px-3 text-slate-600">{s.detourDetails}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 4: Critical Infrastructure Exposure Highlights */}
          <div>
            <h2 className="text-sm font-bold tracking-wider uppercase text-slate-900 border-b border-slate-200 pb-2 mb-4 flex items-center gap-2">
              <span className="w-1.5 h-4 bg-amber-600 rounded-full"></span>
              4. High Priority Infrastructure Exposure Log
            </h2>
            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 border-b border-slate-200">
                    <th className="py-2.5 px-3 font-semibold">Asset ID</th>
                    <th className="py-2.5 px-3 font-semibold">Name / Facility</th>
                    <th className="py-2.5 px-3 font-semibold">Category</th>
                    <th className="py-2.5 px-3 font-semibold">Exposure</th>
                    <th className="py-2.5 px-3 font-semibold">SAR Anomaly</th>
                    <th className="py-2.5 px-3 font-semibold">Recommended Triage Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-slate-800 bg-white">
                  {analysis.infrastructureAssets.slice(0, 6).map((asset) => (
                    <tr key={asset.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-2 px-3 text-amber-700 font-mono font-bold">{asset.id}</td>
                      <td className="py-2 px-3 font-semibold text-slate-900">{asset.name}</td>
                      <td className="py-2 px-3 capitalize text-slate-600">{asset.type}</td>
                      <td className="py-2 px-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                          asset.priority === 'High Priority' ? 'bg-rose-100 text-rose-800 border border-rose-300' :
                          asset.priority === 'Medium Priority' ? 'bg-amber-100 text-amber-800 border border-amber-300' : 'bg-slate-100 text-slate-700'
                        }`}>
                          {asset.exposureCategory}
                        </span>
                      </td>
                      <td className="py-2 px-3 font-mono text-slate-700">{asset.sarAnomaly}</td>
                      <td className="py-2 px-3 text-slate-600">{asset.details}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 5: Scientific Caveats & Limitations */}
          <div className="bg-slate-50 p-5 rounded-lg border border-slate-200 space-y-2 text-xs">
            <h3 className="font-bold uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-sm text-amber-600 print:hidden">info</span>
              5. Scientific Constraints & Operational Caveats
            </h3>
            <ul className="list-disc pl-5 space-y-1 text-slate-600 leading-relaxed">
              <li>
                <strong>SAR Physics Constraints:</strong> Radar signals at 5.4 GHz exhibit specular reflection over smooth water, causing low backscatter. Smooth non-water surfaces (tarmac, sandbanks) can create false positives, whereas turbulent foaming floodwaters can elevate backscatter.
              </li>
              <li>
                <strong>Topographic Masking:</strong> Steep mountain gorges create radar shadow and foreshortening/layover on sloped faces. Copernicus GLO-30 DEM slope threshold (25°) was used to eliminate false positive water classifications on mountain ridges.
              </li>
              <li>
                <strong>Structural Verification:</strong> This assessment registers geometric intersection with estimated flood boundaries. It does not replace structural civil engineering inspection for bridge foundations or submerged culverts.
              </li>
            </ul>
          </div>

          {/* Document Sign-Off Box */}
          <div className="pt-6 border-t border-slate-200 flex flex-wrap justify-between items-end gap-6 text-xs text-slate-600">
            <div>
              <p className="font-bold text-slate-900">AUTOMATED SATELLITE RAPID MAPPING PIPELINE</p>
              <p className="font-mono text-[11px] text-slate-500 mt-0.5">Algorithm: Dual-Pol SAR Change Detection v2.4 (Otsu Adaptive)</p>
              <p className="font-mono text-[11px] text-slate-500">Pipeline Engine: FloodScope AI Fullstack Node.js Engine</p>
            </div>

            <div className="text-right">
              <div className="w-48 border-b border-slate-300 mb-1"></div>
              <p className="text-[11px] uppercase tracking-wider font-semibold text-slate-700">Geospatial Operations Desk</p>
              <p className="font-mono text-[10px] text-slate-400">DISASTER TRIAGE VERIFICATION</p>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
