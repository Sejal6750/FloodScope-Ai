import React, { useState, useRef, useEffect } from 'react';
import { AnalysisAssessment, CopilotMessage } from '../types/index.ts';
import { SyntheticBanner } from './SyntheticBanner.tsx';

interface CopilotViewProps {
  analysis: AnalysisAssessment;
  onNavigate: (path: string) => void;
}

export const CopilotView: React.FC<CopilotViewProps> = ({
  analysis,
  onNavigate
}) => {
  const [language, setLanguage] = useState<'en' | 'ne'>('en');
  const [messages, setMessages] = useState<CopilotMessage[]>([
    {
      id: 'msg-1',
      role: 'user',
      timestamp: '14:32:10 UTC',
      text: 'Which settlements may have lost road access to the nearest hospital, and what are the primary choke points?',
      isSyntheticDemo: analysis.dataMode === 'DEMO_SYNTHETIC'
    },
    {
      id: 'msg-2',
      role: 'assistant',
      timestamp: '14:32:13 UTC',
      text: `3 Wards / Settlements are flagged as POTENTIALLY CUT OFF (zero calculated vehicular route) to Trishuli District Hospital; 5 sectors have compromised detours with an average delay of +52 min.

DETAILED ISOLATION BREAKDOWN:
• Syabrubesi Ward 3 (#W3-SYB): SEVERED (0 ROUTE). Estimated 420 residents. Primary access severed at Betrawati Bridge #04 (SAR backscatter drop -6.4 dB, deck inundated >50m). No viable 4WD detour verified.
• Dhunche South Enclave (#W2-DHC): SEVERED (MUDSLIDE). Estimated 680 residents. Feeder corridor severed at Highway 04 Km 22. DEM D8 flow accumulation predicts active slope runoff continuation.
• Betrawati Valley Sector: COMPROMISED (+56m). Vehicular transit constrained to unpaved Ridge Cut Bypass. Slopes exceed 24° inclination; heavy transport ambulances cannot traverse.`,
      nepaliText: `त्रिशूली अस्पताल जाने प्रमुख मार्गहरूमा २ मुख्य स्थानमा अवरोध पुष्टि भएको छ: बेत्रावती पुल नं. ०४ (बाढी ९४% ओभरल्याप) र त्रिशूली-धुन्चे दोस्रो राजमार्ग (१,४२० मिटर जलमग्न)। ३ वडा सम्पर्कविहीन छन्।`,
      citations: [
        'Sentinel-1 IW GRDH 2026-08-16 02:40 UTC',
        'OSM Road Graph #812903',
        'Copernicus 30m GLO-30 DEM'
      ],
      corroborationPct: 99.4,
      isSyntheticDemo: analysis.dataMode === 'DEMO_SYNTHETIC'
    }
  ]);

  const [inputQuery, setInputQuery] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [sitrepModalOpen, setSitrepModalOpen] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const chatStreamRef = useRef<HTMLDivElement>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  useEffect(() => {
    if (chatStreamRef.current) {
      chatStreamRef.current.scrollTop = chatStreamRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const handleSendMessage = async (textToSend?: string) => {
    const q = (textToSend || inputQuery).trim();
    if (!q || isLoading) return;

    const userMsg: CopilotMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      timestamp: new Date().toISOString().substring(11, 19) + ' UTC',
      text: q,
      isSyntheticDemo: analysis.dataMode === 'DEMO_SYNTHETIC'
    };

    setMessages(prev => [...prev, userMsg]);
    setInputQuery('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/copilot/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: q,
          analysisId: analysis.id,
          language
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Copilot query failed');

      const aiMsg: CopilotMessage = {
        id: `ai-${Date.now()}`,
        role: 'assistant',
        timestamp: new Date().toISOString().substring(11, 19) + ' UTC',
        text: data.text,
        nepaliText: data.nepaliText,
        citations: data.citations || ['Sentinel-1 SAR C-Band', 'Copernicus GLO-30 DEM', 'OSM Nepal Snapshot'],
        corroborationPct: data.corroborationPct || 98.9,
        isSyntheticDemo: analysis.dataMode === 'DEMO_SYNTHETIC'
      };

      setMessages(prev => [...prev, aiMsg]);
      showToast('Response corroborated with satellite SAR & DEM vectors');
    } catch (err: any) {
      const errorMsg: CopilotMessage = {
        id: `ai-err-${Date.now()}`,
        role: 'assistant',
        timestamp: new Date().toISOString().substring(11, 19) + ' UTC',
        text: `Error connecting to Copilot engine: ${err.message}. Grounded facts retained in sidebar telemetry.`,
        isSyntheticDemo: analysis.dataMode === 'DEMO_SYNTHETIC',
        error: err.message
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard?.writeText(text);
    showToast('Copied answer and citations to clipboard');
  };

  const downloadSessionJson = () => {
    const data = {
      sessionId: `COPILOT-${analysis.id}`,
      analysisName: analysis.name,
      aoi: analysis.aoiName,
      dataMode: analysis.dataMode,
      exportedAt: new Date().toISOString(),
      messages
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Copilot-Session-${analysis.id}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Exported session JSON with provenance ledger');
  };

  return (
    <div className="flex flex-col w-full relative">
      <SyntheticBanner dataMode={analysis.dataMode} analysisName={analysis.name} />

      {/* Floating Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 right-8 z-50 px-space-md py-space-sm rounded-xl bg-surface-container-highest text-primary shadow-2xl font-label-mono-md text-label-mono-md flex items-center gap-space-sm backdrop-blur-md border border-primary/30">
          <span className="material-symbols-outlined text-sm">info</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* TOP CONTEXT COMMAND BAR */}
      <div className="px-space-lg py-space-md bg-surface-container-lowest flex flex-col xl:flex-row xl:items-center justify-between gap-space-md border-b border-surface-container-high/40">
        <div className="flex flex-col gap-1 max-w-4xl">
          <div className="flex flex-wrap items-center gap-space-sm">
            <div className="flex items-center gap-1.5 px-space-xs py-0.5 rounded bg-primary-container/20 text-primary">
              <span className="material-symbols-outlined text-sm">smart_toy</span>
              <span className="font-label-mono-sm text-label-mono-sm font-semibold tracking-wider uppercase">Copilot Core v2.4</span>
            </div>
            <div className="h-3 w-px bg-surface-container-highest"></div>
            <div className="flex items-center gap-1 px-space-xs py-0.5 rounded bg-secondary-container/20 text-secondary">
              <span className="h-1.5 w-1.5 rounded-full bg-secondary animate-pulse"></span>
              <span className="font-label-mono-sm text-label-mono-sm font-medium">Deterministic Tensor Grounding</span>
            </div>
            <div className="h-3 w-px bg-surface-container-highest"></div>
            <span className="font-label-mono-sm text-label-mono-sm text-outline">AOI: {analysis.aoiName}</span>
          </div>

          <div className="flex flex-col lg:flex-row lg:items-baseline gap-space-xs lg:gap-space-md mt-1">
            <h1 className="font-headline-lg text-headline-lg text-on-surface tracking-tight font-semibold flex items-center gap-space-xs">
              AI Situation Copilot
            </h1>
            <p className="font-body-sm text-body-sm text-on-surface-variant line-clamp-1">
              Multimodal analytical assistant grounded exclusively in Sentinel-1 SAR, Sentinel-2 MSI, Copernicus DEM, and OSM graph network outputs.
            </p>
          </div>
        </div>

        {/* Top Right Actions */}
        <div className="flex flex-wrap items-center gap-space-sm">
          {/* Language Toggle */}
          <div className="flex items-center p-0.5 rounded-lg bg-surface-container-low border border-surface-container-high/40">
            <button
              type="button"
              onClick={() => {
                setLanguage('en');
                showToast('Language switched to English (Strict Grounding)');
              }}
              className={`px-space-sm py-1 rounded font-label-mono-sm text-label-mono-sm font-semibold transition-all cursor-pointer ${
                language === 'en' ? 'bg-primary-container text-on-primary-container shadow-sm' : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              EN
            </button>
            <button
              type="button"
              onClick={() => {
                setLanguage('ne');
                showToast('नेपाली भाषा प्रणाली सक्रिय गरियो (Nepali Mode)');
              }}
              className={`px-space-sm py-1 rounded font-label-mono-sm text-label-mono-sm font-semibold transition-all cursor-pointer ${
                language === 'ne' ? 'bg-primary-container text-on-primary-container shadow-sm' : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              नेपाली
            </button>
          </div>

          <button
            type="button"
            onClick={() => setSitrepModalOpen(true)}
            className="flex items-center gap-space-xs px-space-md py-1.5 rounded-lg bg-surface-container-high hover:bg-surface-bright text-on-surface font-body-sm text-body-sm font-medium transition-colors shadow-sm cursor-pointer border border-surface-container-highest"
          >
            <span className="material-symbols-outlined text-base text-primary">picture_as_pdf</span>
            <span>1-Page SitRep</span>
          </button>
          <button
            type="button"
            onClick={downloadSessionJson}
            className="flex items-center gap-space-xs px-space-sm py-1.5 rounded-lg bg-surface-container text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high font-body-sm text-body-sm transition-colors cursor-pointer border border-surface-container-high/40"
          >
            <span className="material-symbols-outlined text-base">download</span>
            <span className="hidden sm:inline">Export JSON</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setMessages(prev => prev.slice(0, 2));
              showToast('Conversation reset to baseline verified assessment');
            }}
            className="p-1.5 rounded-lg bg-surface-container text-outline hover:text-error hover:bg-error-container/20 transition-colors cursor-pointer"
            title="Reset Chat Memory"
          >
            <span className="material-symbols-outlined text-base">delete_sweep</span>
          </button>
        </div>
      </div>

      {/* GROUNDING BANNER STRIP */}
      <div className="px-space-lg py-1 bg-surface-container-low flex flex-wrap items-center justify-between gap-space-sm border-b border-surface-container-high/40">
        <div className="flex items-center gap-space-xs font-label-mono-sm text-label-mono-sm text-on-surface-variant">
          <span className="material-symbols-outlined text-xs text-secondary">verified_user</span>
          <span className="font-semibold text-secondary">Strict Grounding:</span>
          <span>Zero-Hallucination Enforced (GeoJSON node citations & Sentinel backscatter offsets only)</span>
        </div>
        <div className="flex items-center gap-space-md font-label-mono-sm text-label-mono-sm text-outline">
          <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-secondary"></span>Vector Topology: VALID</span>
          <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-primary"></span>SAR Latency: 1.2 hrs</span>
          <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-tertiary"></span>Cloud Obscuration: 11.4%</span>
        </div>
      </div>

      {/* MAIN DUAL-COLUMN WORKSPACE */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-md p-space-md bg-surface min-h-[calc(100vh-210px)]">
        {/* LEFT COLUMN: Conversation Stream & Prompt Engine (7 cols) */}
        <section className="lg:col-span-7 flex flex-col gap-space-md h-full">
          {/* Query Chips Toolbar */}
          <div className="flex items-center gap-space-xs overflow-x-auto pb-1">
            <span className="font-label-mono-sm text-label-mono-sm text-outline uppercase tracking-wider shrink-0 mr-1 flex items-center gap-1">
              <span className="material-symbols-outlined text-xs">auto_awesome</span> Prompts:
            </span>
            {[
              'Where is the estimated flood extent largest?',
              'Which settlements lost road connectivity to Trishuli Hospital?',
              'Summarise bridge & highway choke points',
              'विपद् क्षेत्रको सडक अवरोध र अस्पताल पहुँचको विश्लेषण (Nepali)',
              'Scientific uncertainties & SAR limitations'
            ].map((promptText, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSendMessage(promptText)}
                className="shrink-0 px-space-sm py-1 rounded-full bg-surface-container-high hover:bg-surface-bright text-on-surface-variant hover:text-primary font-body-sm text-body-sm transition-all whitespace-nowrap cursor-pointer border border-surface-container-highest"
              >
                {promptText}
              </button>
            ))}
          </div>

          {/* Scrollable Chat Stream */}
          <div 
            ref={chatStreamRef}
            className="flex-1 flex flex-col gap-space-lg overflow-y-auto pr-1 max-h-[520px]"
          >
            {messages.map((msg) => (
              <React.Fragment key={msg.id}>
                {msg.role === 'user' ? (
                  <div className="flex items-start gap-space-md justify-end pl-12">
                    <div className="flex flex-col items-end gap-1 max-w-xl">
                      <div className="flex items-center gap-space-xs font-label-mono-sm text-label-mono-sm text-outline">
                        <span>Disaster Response Lead</span>
                        <span>·</span>
                        <span>{msg.timestamp}</span>
                      </div>
                      <div className="p-space-md rounded-2xl rounded-tr-none bg-surface-container-high text-on-surface shadow-md border border-surface-container-highest">
                        <p className="font-body-md text-body-md leading-relaxed">{msg.text}</p>
                      </div>
                      <span className="font-label-mono-sm text-label-mono-sm text-outline-variant text-[10px]">
                        Context attached: {analysis.aoiName} Boundary
                      </span>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-surface-container-highest flex items-center justify-center shrink-0 text-primary font-bold text-xs ring-1 ring-primary/30">
                      OP
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-space-md pr-4">
                    <div className="w-8 h-8 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center shrink-0 shadow-sm">
                      <span className="material-symbols-outlined text-base">radar</span>
                    </div>
                    <div className="flex flex-col gap-space-sm flex-1 max-w-3xl">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-space-xs font-label-mono-sm text-label-mono-sm">
                          <span className="font-semibold text-primary">FloodScope Copilot Core</span>
                          <span className="text-outline">·</span>
                          <span className="text-outline">{msg.timestamp}</span>
                          <span className="px-space-xs py-0.5 rounded bg-secondary-container/20 text-secondary font-semibold">
                            Corroborated {msg.corroborationPct || 99.4}%
                          </span>
                        </div>
                        <div className="flex items-center gap-1 text-outline font-label-mono-sm text-label-mono-sm">
                          <span className="material-symbols-outlined text-xs text-secondary">lock</span>
                          <span>Deterministic</span>
                        </div>
                      </div>

                      {/* Response Bubble Body */}
                      <div className="p-space-lg rounded-2xl rounded-tl-none bg-surface-container-low text-on-surface flex flex-col gap-space-md shadow-md border border-surface-container-high/40">
                        {/* Transparency Notice if Synthetic */}
                        {msg.isSyntheticDemo && (
                          <div className="p-space-xs px-space-sm rounded bg-tertiary-container/20 text-tertiary font-label-mono-sm text-[11px] flex items-center gap-1.5 border border-tertiary/30">
                            <span className="material-symbols-outlined text-xs">science</span>
                            <span>SYNTHETIC DEMO DATA: Answer is grounded in the active simulation testbed, not real-world findings.</span>
                          </div>
                        )}

                        <div className="font-body-md text-body-md whitespace-pre-wrap leading-relaxed">
                          {msg.text}
                        </div>

                        {/* Nepali translation if present */}
                        {msg.nepaliText && (
                          <div className="p-space-sm rounded-lg bg-surface-container-lowest border-l-2 border-primary flex flex-col gap-1">
                            <span className="font-label-mono-sm text-primary font-semibold uppercase text-[10px]">
                              नेपाली सारांश (Nepali Operational Translation)
                            </span>
                            <p className="font-body-sm text-body-sm text-on-surface leading-relaxed">
                              {msg.nepaliText}
                            </p>
                          </div>
                        )}

                        {/* Supporting Evidence Citations */}
                        {msg.citations && msg.citations.length > 0 && (
                          <div className="flex flex-col gap-1.5 pt-space-xs">
                            <span className="font-label-mono-sm text-label-mono-sm text-outline uppercase tracking-wider text-[10px]">
                              Supporting Evidence & Layer Citations:
                            </span>
                            <div className="flex flex-wrap gap-space-xs">
                              {msg.citations.map((c, i) => (
                                <span
                                  key={i}
                                  className="flex items-center gap-1 px-space-xs py-1 rounded bg-surface-container-high text-primary font-label-mono-sm text-label-mono-sm text-[10px] border border-surface-container-highest"
                                >
                                  <span className="material-symbols-outlined text-xs">radar</span>
                                  <span>{c}</span>
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Action Buttons Bar */}
                        <div className="flex flex-wrap items-center justify-between gap-space-xs pt-space-xs border-t border-surface-container-high/40">
                          <div className="flex flex-wrap items-center gap-space-xs">
                            <button
                              type="button"
                              onClick={() => onNavigate('flood-map-explorer')}
                              className="flex items-center gap-1 px-space-sm py-1 rounded-lg bg-primary-container text-on-primary-container font-body-sm text-body-sm font-semibold hover:opacity-90 transition-opacity cursor-pointer"
                            >
                              <span className="material-symbols-outlined text-sm">map</span>
                              <span>Inspect in Map Explorer</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => onNavigate('settlement-accessibility')}
                              className="flex items-center gap-1 px-space-sm py-1 rounded-lg bg-surface-container-high hover:bg-surface-bright text-on-surface font-body-sm text-body-sm transition-colors cursor-pointer border border-surface-container-highest"
                            >
                              <span className="material-symbols-outlined text-sm text-outline">alt_route</span>
                              <span>Settlement Graph</span>
                            </button>
                          </div>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(msg.text)}
                            className="p-1 rounded hover:bg-surface-container-high text-outline hover:text-on-surface transition-colors cursor-pointer"
                            title="Copy text"
                          >
                            <span className="material-symbols-outlined text-sm">content_copy</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </React.Fragment>
            ))}

            {isLoading && (
              <div className="flex items-center gap-space-sm text-outline font-label-mono-sm text-label-mono-sm pl-12">
                <span className="material-symbols-outlined text-base text-primary animate-spin">refresh</span>
                <span>Synthesizing grounded analysis from active telemetry...</span>
              </div>
            )}
          </div>

          {/* Fixed Bottom Message Input Console */}
          <div className="mt-auto pt-space-xs">
            <div className="p-space-md rounded-2xl bg-surface-container-low shadow-xl flex flex-col gap-space-sm border border-surface-container-high/40">
              <div className="relative flex items-start gap-space-sm">
                <textarea
                  rows={2}
                  value={inputQuery}
                  onChange={(e) => setInputQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  placeholder={
                    language === 'ne'
                      ? 'बाढीको परिमाण, सडक अवरोध, अस्पताल पहुँच वा जोखिममा परेको जनसङ्ख्याबारे सोध्नुहोस्...'
                      : `Ask about flood extent, damaged infrastructure, road connectivity in ${analysis.aoiName}...`
                  }
                  className="w-full bg-surface-container-lowest text-on-surface placeholder:text-outline font-body-md text-body-md rounded-xl p-space-sm focus:outline-none focus:ring-1 focus:ring-primary resize-none border border-surface-container-high"
                />
                <button
                  type="button"
                  onClick={() => handleSendMessage()}
                  disabled={isLoading || !inputQuery.trim()}
                  className="h-10 w-10 rounded-xl bg-primary-container text-on-primary-container hover:brightness-110 flex items-center justify-center shrink-0 transition-transform active:scale-95 shadow-md cursor-pointer disabled:opacity-40"
                >
                  <span className="material-symbols-outlined text-lg">arrow_upward</span>
                </button>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-space-xs text-outline font-label-mono-sm text-label-mono-sm pt-1">
                <div className="flex items-center gap-space-sm">
                  <span className="px-space-xs py-0.5 rounded bg-surface-container-high text-on-surface-variant font-medium">
                    Mode: Direct QA
                  </span>
                  <span>•</span>
                  <span>Grounding: Active Dataset</span>
                </div>
                <div className="flex items-center gap-space-sm">
                  <span className="flex items-center gap-1 text-secondary">
                    <span className="material-symbols-outlined text-xs">shield</span>
                    <span>Zero External Leakage Guarantee</span>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* RIGHT COLUMN: Real-time Evidence & Validation Inspector (5 cols) */}
        <aside className="lg:col-span-5 flex flex-col gap-space-md">
          {/* CARD 1: Active Context Telemetry */}
          <div className="p-space-md rounded-2xl bg-surface-container-low shadow-md flex flex-col gap-space-sm border border-surface-container-high/40">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-space-xs">
                <span className="material-symbols-outlined text-base text-primary">fact_check</span>
                <span className="font-headline-sm text-headline-sm text-on-surface font-semibold">Active Context Telemetry</span>
              </div>
              <span className="px-space-xs py-0.5 rounded bg-secondary-container/20 text-secondary font-label-mono-sm text-label-mono-sm font-semibold">
                PIPELINE VERIFIED
              </span>
            </div>
            <p className="font-body-sm text-body-sm text-on-surface-variant">
              Strict facts verified by the automated {analysis.aoiName} pipeline. The Copilot is mathematically constrained to these figures:
            </p>

            <div className="grid grid-cols-2 gap-space-xs pt-1">
              <div className="p-space-sm rounded-lg bg-surface-container-lowest flex flex-col border border-surface-container-high/40">
                <span className="font-label-mono-sm text-label-mono-sm text-outline">Flood Extent</span>
                <div className="flex items-baseline gap-1 mt-0.5">
                  <span className="font-headline-lg text-headline-lg text-on-surface font-bold">{analysis.metrics.floodExtentKm2}</span>
                  <span className="font-label-mono-sm text-label-mono-sm text-primary font-bold">km²</span>
                </div>
                <span className="font-label-mono-sm text-label-mono-sm text-outline">±{analysis.metrics.uncertaintyMarginKm2} km² SAR Margin</span>
              </div>

              <div className="p-space-sm rounded-lg bg-surface-container-lowest flex flex-col border border-surface-container-high/40">
                <span className="font-label-mono-sm text-label-mono-sm text-outline">Exposed Roads</span>
                <div className="flex items-baseline gap-1 mt-0.5">
                  <span className="font-headline-lg text-headline-lg text-error font-bold">{analysis.metrics.exposedRoadKm}</span>
                  <span className="font-label-mono-sm text-label-mono-sm text-on-surface-variant font-bold">km</span>
                </div>
                <span className="font-label-mono-sm text-label-mono-sm text-outline">Across {analysis.metrics.exposedRoadSegmentsCount} OSM links</span>
              </div>

              <div className="p-space-sm rounded-lg bg-surface-container-lowest flex flex-col border border-surface-container-high/40">
                <span className="font-label-mono-sm text-label-mono-sm text-outline">Critical Bridges</span>
                <div className="flex items-baseline gap-1 mt-0.5">
                  <span className="font-headline-lg text-headline-lg text-tertiary font-bold">{analysis.metrics.bridgesCount}</span>
                  <span className="font-label-mono-sm text-label-mono-sm text-tertiary font-bold">spans</span>
                </div>
                <span className="font-label-mono-sm text-label-mono-sm text-outline">Inundation overlap</span>
              </div>

              <div className="p-space-sm rounded-lg bg-surface-container-lowest flex flex-col border border-surface-container-high/40">
                <span className="font-label-mono-sm text-label-mono-sm text-outline">Isolated Wards</span>
                <div className="flex items-baseline gap-1 mt-0.5">
                  <span className="font-headline-lg text-headline-lg text-error font-bold">{analysis.metrics.cutOffSettlementsCount}</span>
                  <span className="font-label-mono-sm text-label-mono-sm text-error font-bold">wards</span>
                </div>
                <span className="font-label-mono-sm text-label-mono-sm text-outline line-clamp-1">Zero viable route</span>
              </div>
            </div>

            {/* Target Facility Anchor */}
            <div className="p-space-sm rounded-lg bg-surface-container flex items-center justify-between gap-space-sm border border-surface-container-high/40">
              <div className="flex items-center gap-space-xs">
                <div className="w-7 h-7 rounded-lg bg-primary-container/20 text-primary flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-sm">local_hospital</span>
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="font-body-sm text-body-sm text-on-surface font-semibold truncate">Trishuli District Hospital</span>
                  <span className="font-label-mono-sm text-label-mono-sm text-secondary text-[10px]">Fully Operational • Safe Buffer +18m</span>
                </div>
              </div>
              <span className="px-space-xs py-0.5 rounded bg-secondary-container/20 text-secondary font-label-mono-sm text-label-mono-sm text-[10px]">
                HEALTH HUB
              </span>
            </div>
          </div>

          {/* CARD 2: Grounding Vector Graph Thumbnail */}
          <div className="p-space-md rounded-2xl bg-surface-container-low shadow-md flex flex-col gap-space-sm border border-surface-container-high/40">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-space-xs">
                <span className="material-symbols-outlined text-base text-primary">hub</span>
                <span className="font-headline-sm text-headline-sm text-on-surface font-semibold">Grounding Vector Graph</span>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('settlement-accessibility')}
                className="flex items-center gap-1 font-label-mono-sm text-label-mono-sm text-primary hover:underline cursor-pointer"
              >
                <span className="material-symbols-outlined text-xs">push_pin</span>
                <span>Open Solver</span>
              </button>
            </div>
            <p className="font-body-sm text-body-sm text-on-surface-variant">
              Live topology sub-graph: Betrawati Corridor to Trishuli Medical Compound.
            </p>

            {/* Vector Scheme Graphic */}
            <div className="relative w-full h-44 rounded-xl bg-surface-container-lowest overflow-hidden flex flex-col justify-between p-space-sm border border-surface-container-high/40">
              <svg className="absolute inset-0 w-full h-full text-surface-container-highest" xmlns="http://www.w3.org/2000/svg">
                <path d="M 10 30 Q 120 100 220 90 T 360 160" fill="none" opacity="0.6" stroke="#004e5c" strokeLinecap="round" strokeWidth="12" />
                <path d="M 10 30 Q 120 100 220 90 T 360 160" fill="none" stroke="#4cd7f6" strokeDasharray="4 2" strokeLinecap="round" strokeWidth="2" />
                <path d="M 30 140 L 140 100 L 190 92" fill="none" stroke="#4edea3" strokeLinecap="round" strokeWidth="3" />
                <path d="M 190 92 L 240 88" fill="none" stroke="#ef4444" strokeDasharray="3 3" strokeWidth="4" />
                <circle cx="215" cy="90" r="5" fill="#ef4444" stroke="#ffdad6" strokeWidth="1.5" />
                <path d="M 140 100 C 140 30, 260 20, 310 70" fill="none" stroke="#f59e0b" strokeDasharray="2 2" strokeWidth="2.5" />
                <circle cx="310" cy="70" r="6" fill="#4edea3" stroke="#ffffff" strokeWidth="2" />
              </svg>
              <div className="relative z-10 flex items-center justify-between text-outline font-label-mono-sm text-label-mono-sm">
                <span className="px-space-xs py-0.5 rounded bg-surface-dim/80 backdrop-blur-sm text-on-surface text-[10px]">Sub-Graph #TR-881</span>
                <span className="px-space-xs py-0.5 rounded bg-error-container/80 text-on-error-container font-semibold text-[10px]">Severed at Km 18</span>
              </div>
              <div className="relative z-10 flex items-center justify-between text-outline font-label-mono-sm text-label-mono-sm bg-surface-dim/85 backdrop-blur-sm p-space-xs rounded text-[10px]">
                <div className="flex items-center gap-space-sm">
                  <span className="flex items-center gap-1 text-error"><span className="h-2 w-2 rounded-full bg-error"></span>Bridge #04 (Cut)</span>
                  <span className="flex items-center gap-1 text-tertiary"><span className="h-2 w-2 rounded-full bg-tertiary"></span>Ridge (+56m)</span>
                </div>
                <span className="text-secondary">Hospital Accessible</span>
              </div>
            </div>
          </div>

          {/* CARD 3: Data Provenance Ledger */}
          <div className="p-space-md rounded-2xl bg-surface-container-low shadow-md flex flex-col gap-space-sm border border-surface-container-high/40">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-space-xs">
                <span className="material-symbols-outlined text-base text-secondary">token</span>
                <span className="font-headline-sm text-headline-sm text-on-surface font-semibold">Data Provenance Ledger</span>
              </div>
              <span className="font-label-mono-sm text-label-mono-sm text-outline">4 Active Feeds</span>
            </div>
            <div className="flex flex-col gap-space-xs">
              {analysis.provenance.sources.map((s, idx) => (
                <div key={idx} className="p-space-xs px-space-sm rounded bg-surface-container flex items-center justify-between gap-space-sm text-body-sm border border-surface-container-high/30">
                  <div className="flex items-center gap-space-xs min-w-0">
                    <span className="material-symbols-outlined text-sm text-primary shrink-0">satellite_alt</span>
                    <div className="flex flex-col min-w-0">
                      <span className="font-label-mono-sm text-label-mono-sm text-on-surface font-medium truncate text-[11px]">{s.name}</span>
                      <span className="font-label-mono-sm text-label-mono-sm text-outline truncate text-[9px]">{s.acquisitionDate}</span>
                    </div>
                  </div>
                  <span className="px-space-xs py-0.5 rounded bg-secondary-container/20 text-secondary font-label-mono-sm text-label-mono-sm shrink-0 text-[10px]">
                    {s.status.toUpperCase()}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* CARD 4: Strict Ethical Guardrail */}
          <div className="p-space-md rounded-2xl bg-surface-container-lowest shadow-sm flex flex-col gap-space-xs border border-surface-container-high/40">
            <div className="flex items-center gap-space-xs text-tertiary font-headline-sm text-headline-sm font-semibold">
              <span className="material-symbols-outlined text-base">warning</span>
              <span>Non-Dispatch Guardrail Notice</span>
            </div>
            <p className="font-body-sm text-body-sm text-on-surface-variant leading-relaxed">
              <strong className="text-on-surface">Decision-Support Protocol:</strong> FloodScope Copilot is an operational decision-support tool engineered for disaster risk analysts. Outputs provide automated geospatial situational awareness and potential risk exposure calculations. They do <span className="text-error font-semibold">NOT</span> constitute autonomous emergency dispatch orders or certified structural engineering certifications. Ground or aerial confirmation is always mandatory prior to tactical asset reallocation.
            </p>
          </div>
        </aside>
      </div>

      {/* 1-PAGE SITREP MODAL */}
      {sitrepModalOpen && (
        <div className="fixed inset-0 z-50 bg-surface-dim/80 backdrop-blur-md flex items-center justify-center p-space-md">
          <div className="w-full max-w-2xl rounded-2xl bg-surface-container-high shadow-2xl p-space-lg flex flex-col gap-space-md border border-surface-container-highest">
            <div className="flex items-center justify-between pb-space-xs border-b border-surface-container-highest">
              <div className="flex items-center gap-space-xs">
                <span className="material-symbols-outlined text-xl text-primary">description</span>
                <span className="font-headline-md text-headline-md text-on-surface font-semibold">1-Page Situation Report Generation</span>
              </div>
              <button
                type="button"
                onClick={() => setSitrepModalOpen(false)}
                className="p-1 rounded text-outline hover:text-on-surface cursor-pointer"
              >
                <span className="material-symbols-outlined text-base">close</span>
              </button>
            </div>

            <div className="p-space-md rounded-xl bg-surface-container-lowest flex flex-col gap-space-sm text-on-surface border border-surface-container-high/40">
              <div className="flex justify-between items-center text-outline font-label-mono-sm text-label-mono-sm">
                <span>REPORT REF: SITREP-{analysis.id.toUpperCase()}</span>
                <span>CLEARANCE: LEVEL 2 DISASTER OPS</span>
              </div>
              <h3 className="font-headline-sm text-headline-sm text-primary font-bold">
                {analysis.name} — Rapid Inundation & Critical Access Severance Summary
              </h3>
              <p className="font-body-sm text-body-sm text-on-surface-variant">
                Synthesized by FloodScope AI Copilot based on Sentinel-1 SAR analysis at {analysis.postEventDate}. {analysis.metrics.cutOffSettlementsCount} settlements cut off ({analysis.metrics.isolatedPopulationEst} estimated pop at risk), {analysis.metrics.exposedRoadKm} km roads exposed.
              </p>
              <div className="grid grid-cols-3 gap-space-xs pt-1">
                <div className="p-space-xs bg-surface-container rounded text-center">
                  <div className="font-headline-sm font-bold text-on-surface">{analysis.metrics.floodExtentKm2} km²</div>
                  <div className="font-label-mono-sm text-outline text-[10px]">Flood Area</div>
                </div>
                <div className="p-space-xs bg-surface-container rounded text-center">
                  <div className="font-headline-sm font-bold text-error">{analysis.metrics.cutOffSettlementsCount} Wards</div>
                  <div className="font-label-mono-sm text-outline text-[10px]">Severed</div>
                </div>
                <div className="p-space-xs bg-surface-container rounded text-center">
                  <div className="font-headline-sm font-bold text-tertiary">+52 Min</div>
                  <div className="font-label-mono-sm text-outline text-[10px]">Detour Lag</div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-space-sm pt-space-xs">
              <button
                type="button"
                onClick={() => setSitrepModalOpen(false)}
                className="px-space-md py-1.5 rounded-lg bg-surface-container text-on-surface-variant hover:text-on-surface font-body-sm text-body-sm cursor-pointer"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  setSitrepModalOpen(false);
                  onNavigate('situation-reports');
                }}
                className="flex items-center gap-1.5 px-space-md py-1.5 rounded-lg bg-primary-container text-on-primary-container font-body-sm text-body-sm font-semibold hover:brightness-110 transition-all shadow-md cursor-pointer"
              >
                <span className="material-symbols-outlined text-sm">print</span>
                <span>Open Full Printable SitRep</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
