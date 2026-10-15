import React, { useState, useEffect } from 'react';
import { DataSourceStatus, LogEntry } from '../types/index.ts';

interface SettingsViewProps {
  onNavigate: (path: string) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = () => {
  const [dataSources, setDataSources] = useState<DataSourceStatus[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [testingAll, setTestingAll] = useState(false);
  const [testingSource, setTestingSource] = useState<string | null>(null);
  const [logFilter, setLogFilter] = useState<'ALL' | 'INFO' | 'WARN' | 'ERROR'>('ALL');
  const [searchLog, setSearchLog] = useState('');
  const [radarThreshold, setRadarThreshold] = useState(-14.2);
  const [slopeThreshold, setSlopeThreshold] = useState(25);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const fetchStatus = async () => {
    try {
      const [srcRes, logRes] = await Promise.all([
        fetch('/api/datasources/status'),
        fetch('/api/logs')
      ]);
      if (srcRes.ok) setDataSources(await srcRes.json());
      if (logRes.ok) setLogs(await logRes.json());
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const handleTestAll = async () => {
    setTestingAll(true);
    setStatusMessage('Running comprehensive network diagnostics across all remote sensing endpoints...');
    try {
      const res = await fetch('/api/datasources/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
      if (res.ok) {
        await fetchStatus();
        setStatusMessage('Diagnostics complete. All provider statuses updated.');
      }
    } catch {
      setStatusMessage('Network diagnostic request failed.');
    } finally {
      setTestingAll(false);
      setTimeout(() => setStatusMessage(null), 4000);
    }
  };

  const handleTestSource = async (id: string) => {
    setTestingSource(id);
    try {
      await fetch('/api/datasources/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceId: id })
      });
      await fetchStatus();
    } finally {
      setTestingSource(null);
    }
  };

  const filteredLogs = logs.filter((log) => {
    const matchesFilter = logFilter === 'ALL' || log.level === logFilter;
    const matchesSearch = !searchLog || log.message.toLowerCase().includes(searchLog.toLowerCase()) || log.stage.toLowerCase().includes(searchLog.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const handleExportLogs = () => {
    const text = logs.map(l => `[${l.timestamp}] [${l.level}] [${l.stage}] ${l.message}`).join('\n');
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `floodscope-system-logs-${new Date().toISOString().slice(0, 10)}.log`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-surface-container border border-surface-variant/40 rounded-xl p-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-2xl">tune</span>
            <h1 className="text-xl font-bold text-slate-100">System Settings & Remote Sensing Diagnostics</h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Configure satellite sensor endpoints, verify live API connections, inspect raw pipeline logs, and calibrate change detection thresholds.
          </p>
        </div>

        <button
          onClick={handleTestAll}
          disabled={testingAll}
          className="px-4 py-2 bg-primary hover:bg-primary/90 disabled:opacity-50 text-surface font-semibold text-xs rounded-lg flex items-center gap-2 shadow-md transition-all"
        >
          <span className={`material-symbols-outlined text-sm ${testingAll ? 'animate-spin' : ''}`}>
            {testingAll ? 'sync' : 'network_ping'}
          </span>
          {testingAll ? 'Testing All Endpoints...' : 'Test All Connections'}
        </button>
      </div>

      {statusMessage && (
        <div className="p-3 bg-primary/10 border border-primary/30 rounded-lg text-xs text-cyan-300 font-mono flex items-center gap-2">
          <span className="material-symbols-outlined text-sm">info</span>
          {statusMessage}
        </div>
      )}

      {/* Grid of Data Source Connections */}
      <div className="space-y-3">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
          <span className="material-symbols-outlined text-primary text-base">cloud_sync</span>
          Remote Sensing Data Sources & Auth Diagnostics
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {dataSources.map((source) => (
            <div key={source.id} className="p-4 bg-surface-container rounded-xl border border-surface-variant/40 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-bold text-slate-100 text-sm">{source.name}</h3>
                  <span className="text-xs text-slate-400 font-mono">{source.provider}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                    source.status === 'CONNECTED_TESTED' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' :
                    source.status === 'CACHED_AVAILABLE' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' :
                    'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  }`}>
                    {source.statusLabel || source.status}
                  </span>
                  <button
                    onClick={() => handleTestSource(source.id)}
                    disabled={testingSource === source.id}
                    className="p-1.5 bg-surface-variant hover:bg-slate-700 disabled:opacity-50 text-slate-300 text-xs rounded border border-slate-700 transition-colors"
                    title="Ping test"
                  >
                    <span className={`material-symbols-outlined text-xs ${testingSource === source.id ? 'animate-spin' : ''}`}>
                      refresh
                    </span>
                  </button>
                </div>
              </div>

              <div className="bg-surface-container-high/60 p-2.5 rounded font-mono text-[11px] space-y-1 text-slate-300">
                <div className="flex justify-between">
                  <span className="text-slate-500">Endpoint:</span>
                  <span className="truncate max-w-[200px]" title={source.endpointUrl}>{source.endpointUrl}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Authentication:</span>
                  <span>{source.requiredCredentials.length > 0 ? source.requiredCredentials.join(', ') : 'Public Open Access'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Last Latency:</span>
                  <span className="text-cyan-400">{source.latencyMs ? `${source.latencyMs}ms` : 'Untested'}</span>
                </div>
              </div>

              {source.description && (
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  {source.description}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Algorithm Tuning & Credentials Configuration */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-5 bg-surface-container rounded-xl border border-surface-variant/40 space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-base">sliders</span>
            SAR Algorithm Calibration Parameters
          </h2>

          <div className="space-y-4 text-xs">
            <div>
              <div className="flex justify-between mb-1.5 font-mono">
                <span className="text-slate-300">Backscatter Delta Threshold (dB)</span>
                <span className="text-cyan-400 font-bold">{radarThreshold} dB</span>
              </div>
              <input
                type="range"
                min="-25"
                max="-5"
                step="0.2"
                value={radarThreshold}
                onChange={(e) => setRadarThreshold(parseFloat(e.target.value))}
                className="w-full accent-cyan-400 bg-surface-container-high rounded cursor-pointer"
              />
              <span className="text-[10px] text-slate-500 block mt-1">
                Lower values require greater radar attenuation, reducing false positives in marshy areas.
              </span>
            </div>

            <div>
              <div className="flex justify-between mb-1.5 font-mono">
                <span className="text-slate-300">Copernicus DEM Slope Cutoff</span>
                <span className="text-cyan-400 font-bold">{slopeThreshold}°</span>
              </div>
              <input
                type="range"
                min="10"
                max="45"
                step="1"
                value={slopeThreshold}
                onChange={(e) => setSlopeThreshold(parseInt(e.target.value))}
                className="w-full accent-cyan-400 bg-surface-container-high rounded cursor-pointer"
              />
              <span className="text-[10px] text-slate-500 block mt-1">
                Excludes pixels on steep mountain terrain to eliminate radar layover and shadow false detections.
              </span>
            </div>
          </div>
        </div>

        {/* Credentials & Environment Setup Info */}
        <div className="p-5 bg-surface-container rounded-xl border border-surface-variant/40 space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-base">security</span>
            Secure Credential & API Guidance
          </h2>

          <div className="text-xs space-y-3 text-slate-400 leading-relaxed">
            <p>
              In compliance with AI Studio build guidelines and remote sensing best practices, <strong>no private API keys or tokens are stored in client-side code</strong>.
            </p>
            <div className="bg-surface-container-high p-3 rounded font-mono text-[11px] space-y-1.5 text-slate-300 border border-slate-800">
              <div className="text-cyan-300 font-bold">Copernicus Data Space Ecosystem (CDSE):</div>
              <div className="text-slate-400">Public OData catalogue accessed via server proxy. Full tile download requires OAuth client credentials in <code>.env</code>.</div>
              <div className="text-emerald-300 font-bold mt-2">Gemini API Key:</div>
              <div className="text-slate-400">Injected securely into server environment (<code>process.env.GEMINI_API_KEY</code>).</div>
            </div>
          </div>
        </div>
      </div>

      {/* Terminal Execution Log Viewer */}
      <div className="p-5 bg-surface-container rounded-xl border border-surface-variant/40 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-emerald-400 text-base">terminal</span>
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-200">System Execution Logs & Telemetry Stream</h2>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Search logs..."
              value={searchLog}
              onChange={(e) => setSearchLog(e.target.value)}
              className="px-2.5 py-1 bg-surface-container-high border border-surface-variant/60 rounded text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-primary font-mono"
            />
            <div className="flex bg-surface-container-high rounded p-0.5 border border-surface-variant/40 text-[10px] font-mono">
              {(['ALL', 'INFO', 'WARN', 'ERROR'] as const).map((lvl) => (
                <button
                  key={lvl}
                  onClick={() => setLogFilter(lvl)}
                  className={`px-2 py-0.5 rounded transition-colors ${
                    logFilter === lvl ? 'bg-primary text-surface font-bold' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {lvl}
                </button>
              ))}
            </div>
            <button
              onClick={handleExportLogs}
              className="p-1.5 bg-surface-variant hover:bg-slate-700 text-slate-300 text-xs rounded border border-slate-700"
              title="Download full log"
            >
              <span className="material-symbols-outlined text-xs">download</span>
            </button>
          </div>
        </div>

        {/* Terminal Window */}
        <div className="bg-slate-950 rounded-lg p-4 font-mono text-xs text-slate-300 h-64 overflow-y-auto space-y-1.5 border border-slate-800">
          {filteredLogs.length === 0 ? (
            <div className="text-slate-600 text-center py-8">No matching log entries found.</div>
          ) : (
            filteredLogs.map((log) => (
              <div key={log.id} className="flex items-start gap-2 text-[11px] leading-relaxed hover:bg-slate-900/60 p-0.5 rounded">
                <span className="text-slate-500 select-none">{new Date(log.timestamp).toLocaleTimeString()}</span>
                <span className={`px-1 py-0.2 rounded font-bold text-[9px] select-none ${
                  log.level === 'ERROR' ? 'bg-rose-500/20 text-rose-400' :
                  log.level === 'WARN' ? 'bg-amber-500/20 text-amber-400' :
                  'bg-cyan-500/20 text-cyan-400'
                }`}>
                  {log.level}
                </span>
                <span className="text-primary/70 select-none">[{log.stage}]</span>
                <span className="text-slate-300 flex-1">{log.message}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
