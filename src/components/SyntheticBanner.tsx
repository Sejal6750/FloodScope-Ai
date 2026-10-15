import React from 'react';
import { DataMode } from '../types/index.ts';

interface SyntheticBannerProps {
  dataMode: DataMode;
  analysisName?: string;
  customMessage?: string;
}

export const SyntheticBanner: React.FC<SyntheticBannerProps> = ({
  dataMode,
  analysisName = 'Active Analysis',
  customMessage
}) => {
  if (dataMode === 'LIVE') {
    return (
      <div className="w-full bg-emerald-50 border-b border-emerald-300 px-4 py-1.5 flex items-center justify-between text-emerald-900 text-xs font-medium">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-600"></span>
          </span>
          <span className="font-bold uppercase tracking-wider text-emerald-800">LIVE SATELLITE DATA CONNECTED</span>
          <span className="text-slate-600 hidden sm:inline">• Direct ESA / Sentinel Telemetry Feed Verified</span>
        </div>
        <span className="text-emerald-700 font-bold">Verified Ingest</span>
      </div>
    );
  }

  const isDemo = dataMode === 'DEMO_SYNTHETIC';

  return (
    <div className="w-full bg-amber-50/95 border-b border-amber-300 px-4 py-2 flex flex-wrap items-center justify-between gap-2 text-amber-950 text-xs shadow-xs">
      <div className="flex items-center gap-2">
        <span className="material-symbols-outlined text-sm text-amber-700 shrink-0">science</span>
        <span className="font-bold uppercase tracking-wider bg-amber-100 border border-amber-300 px-2 py-0.5 rounded text-amber-900 text-[11px]">
          {isDemo ? 'SYNTHETIC DEMO DATA — NOT A REAL FLOOD ASSESSMENT' : 'SAMPLE DATASET — UNVALIDATED INFERENCE'}
        </span>
        <span className="text-slate-600 text-xs hidden md:inline">
          {customMessage || (isDemo 
            ? 'Illustrative observations for Track B evaluation. Not for real-world emergency dispatch or operational decisions.' 
            : 'Pre-calibrated regional sample data. Ground-truth verification required prior to field deployment.')}
        </span>
      </div>
      <div className="flex items-center gap-1.5 text-slate-500 text-[11px] font-semibold">
        <span>DATA PROVENANCE:</span>
        <span className="text-amber-800 font-bold uppercase">{dataMode}</span>
      </div>
    </div>
  );
};
