import React from 'react';
import { DataMode } from '../types/index.ts';

interface SidebarProps {
  currentPath: string;
  onNavigate: (path: string) => void;
  dataMode: DataMode;
}

interface NavItem {
  path: string;
  label: string;
  icon: string;
}

const NAV_ITEMS: NavItem[] = [
  { path: 'overview', label: 'Overview', icon: 'dashboard' },
  { path: 'new-analysis', label: 'New Analysis', icon: 'add_chart' },
  { path: 'flood-map-explorer', label: 'Flood Map Explorer', icon: 'map' },
  { path: 'infrastructure-impact', label: 'Infrastructure Impact', icon: 'corporate_fare' },
  { path: 'settlement-accessibility', label: 'Settlement Accessibility', icon: 'alt_route' },
  { path: 'ai-situation-copilot', label: 'AI Situation Copilot', icon: 'psychology' },
  { path: 'situation-reports', label: 'Situation Reports', icon: 'description' },
  { path: 'data-and-methodology', label: 'Data & Methodology', icon: 'database' },
  { path: 'settings', label: 'Settings', icon: 'settings' }
];

export const Sidebar: React.FC<SidebarProps> = ({ currentPath, onNavigate, dataMode }) => {
  return (
    <aside className="fixed left-0 top-0 h-full w-[260px] bg-white z-50 flex flex-col justify-between shadow-sm border-r border-slate-200">
      <div className="flex flex-col flex-1 overflow-y-auto">
        {/* Brand Header */}
        <div className="p-4 flex items-center justify-between gap-2 bg-slate-50/80 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center text-amber-700 shadow-xs border border-amber-200">
              <span className="material-symbols-outlined text-xl">satellite_alt</span>
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1">
                <span className="text-sm text-slate-900 tracking-tight font-bold">FloodScope AI</span>
              </div>
              <span className="text-slate-400 uppercase tracking-wider text-[9px] font-semibold">Radar & Optical Intel</span>
            </div>
          </div>
          <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-bold uppercase text-[10px] border border-amber-200">Track B</span>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 px-3 py-4 flex flex-col gap-1">
          {NAV_ITEMS.map((item) => {
            const isActive = currentPath === item.path || (currentPath === 'flood-map' && item.path === 'flood-map-explorer');
            return (
              <button
                key={item.path}
                type="button"
                onClick={() => onNavigate(item.path)}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-left w-full cursor-pointer ${
                  isActive
                    ? 'bg-amber-50 text-amber-800 border-l-2 border-amber-600 font-semibold shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <span className={`material-symbols-outlined text-lg leading-none shrink-0 ${isActive ? 'text-amber-700' : 'text-slate-400'}`}>
                  {item.icon}
                </span>
                <span className="text-xs truncate">{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Footer Status & User Profile */}
      <div className="p-4 bg-slate-50 flex flex-col gap-2.5 border-t border-slate-200">
        <div className="flex items-center justify-between p-2 rounded-lg bg-white border border-slate-200 shadow-xs">
          <div className="flex items-center gap-2 min-w-0">
            <span className="relative flex h-2 w-2 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-600"></span>
            </span>
            <span className="text-slate-600 truncate max-w-[150px] text-[10px] font-medium">
              Sentinel-1 Orbit Synced
            </span>
          </div>
          <span className="material-symbols-outlined text-sm text-emerald-600">satellite_alt</span>
        </div>

        <div className="px-2 py-1 rounded bg-amber-100/70 border border-amber-300 text-center">
          <span className="text-amber-900 font-bold uppercase tracking-wider text-[10px]">
            {dataMode === 'LIVE' ? 'LIVE SATELLITE FEED' : 'DEMO / SYNTHETIC TESTBED'}
          </span>
        </div>

        <div className="flex items-center gap-2.5 p-1 rounded">
          <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-xs shrink-0 ring-1 ring-amber-300">
            OP
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-xs text-slate-800 font-bold truncate">Operational Lead</span>
            <span className="text-slate-400 truncate text-[10px]">Disaster Response Intel</span>
          </div>
        </div>
      </div>
    </aside>
  );
};
