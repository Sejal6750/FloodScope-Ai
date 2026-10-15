import React, { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import { AnalysisAssessment, CreateAnalysisPayload, GeoLocation } from '../types/index.ts';
import { SyntheticBanner } from './SyntheticBanner.tsx';

interface NewAnalysisViewProps {
  selectedLocation?: GeoLocation | null;
  onAnalysisCreated: (newAnalysis: AnalysisAssessment) => void;
  onNavigate: (path: string) => void;
}

export const NewAnalysisView: React.FC<NewAnalysisViewProps> = ({
  selectedLocation,
  onAnalysisCreated,
  onNavigate
}) => {
  const [activeStep, setActiveStep] = useState<number>(1);
  const [studyName, setStudyName] = useState<string>(
    selectedLocation ? `${selectedLocation.name} Flood AOI` : 'Trishuli Valley Pilot #10'
  );
  const [minLon, setMinLon] = useState<string>(
    selectedLocation ? selectedLocation.bbox[0].toFixed(4) : '85.05'
  );
  const [minLat, setMinLat] = useState<string>(
    selectedLocation ? selectedLocation.bbox[1].toFixed(4) : '27.85'
  );
  const [maxLon, setMaxLon] = useState<string>(
    selectedLocation ? selectedLocation.bbox[2].toFixed(4) : '85.35'
  );
  const [maxLat, setMaxLat] = useState<string>(
    selectedLocation ? selectedLocation.bbox[3].toFixed(4) : '28.15'
  );
  const [startDate, setStartDate] = useState<string>('2026-08-14');
  const [endDate, setEndDate] = useState<string>('2026-08-16');

  // Update form inputs if selectedLocation changes
  useEffect(() => {
    if (selectedLocation) {
      setStudyName(`${selectedLocation.name} Flood AOI`);
      setMinLon(selectedLocation.bbox[0].toFixed(4));
      setMinLat(selectedLocation.bbox[1].toFixed(4));
      setMaxLon(selectedLocation.bbox[2].toFixed(4));
      setMaxLat(selectedLocation.bbox[3].toFixed(4));
    }
  }, [selectedLocation]);

  // Source selections
  const [srcS1, setSrcS1] = useState<boolean>(true);
  const [srcS2, setSrcS2] = useState<boolean>(true);
  const [srcDem, setSrcDem] = useState<boolean>(true);
  const [srcOsm, setSrcOsm] = useState<boolean>(true);

  // Model parameters
  const [architecture, setArchitecture] = useState<string>('Multimodal UNet SAR+Optical Change Fusion (v2.4 - Balanced)');
  const [sarThreshold, setSarThreshold] = useState<number>(-14.2);
  const [slopeThreshold, setSlopeThreshold] = useState<number>(25.0);

  // Execution state
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [executionLog, setExecutionLog] = useState<string>('');
  const [serverError, setServerError] = useState<string | null>(null);

  // Map references
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const aoiLayerRef = useRef<L.Rectangle | null>(null);

  const selectedCount = [srcS1, srcS2, srcDem, srcOsm].filter(Boolean).length;

  // --- Client-Side Validation Logic for Bounding Boxes & Temporal Windows ---
  const minLatNum = parseFloat(minLat);
  const maxLatNum = parseFloat(maxLat);
  const minLonNum = parseFloat(minLon);
  const maxLonNum = parseFloat(maxLon);

  const isMinLatFinite = !isNaN(minLatNum) && isFinite(minLatNum);
  const isMaxLatFinite = !isNaN(maxLatNum) && isFinite(maxLatNum);
  const isMinLonFinite = !isNaN(minLonNum) && isFinite(minLonNum);
  const isMaxLonFinite = !isNaN(maxLonNum) && isFinite(maxLonNum);

  const isMinLatRange = isMinLatFinite && minLatNum >= -90 && minLatNum <= 90;
  const isMaxLatRange = isMaxLatFinite && maxLatNum >= -90 && maxLatNum <= 90;
  const isMinLonRange = isMinLonFinite && minLonNum >= -180 && minLonNum <= 180;
  const isMaxLonRange = isMaxLonFinite && maxLonNum >= -180 && maxLonNum <= 180;

  const isLatOrderValid = isMinLatRange && isMaxLatRange && minLatNum < maxLatNum;
  const isLonOrderValid = isMinLonRange && isMaxLonRange && minLonNum < maxLonNum;

  const latSpan = isLatOrderValid ? maxLatNum - minLatNum : 0;
  const lonSpan = isLonOrderValid ? maxLonNum - minLonNum : 0;

  const isMinSpanValid = latSpan >= 0.01 && lonSpan >= 0.01;
  const isMaxSpanValid = latSpan <= 12.0 && lonSpan <= 15.0;
  const isSpanValid = isMinSpanValid && isMaxSpanValid;

  const isBBoxValid =
    isMinLatRange &&
    isMaxLatRange &&
    isMinLonRange &&
    isMaxLonRange &&
    isLatOrderValid &&
    isLonOrderValid &&
    isSpanValid;

  // Approximate surface area calculation (WGS 84 ellipsoid approximation)
  const avgLatRad = isLatOrderValid ? (((minLatNum + maxLatNum) / 2) * Math.PI) / 180 : 0;
  const approxWidthKm = isLonOrderValid ? lonSpan * 111.32 * Math.cos(avgLatRad) : 0;
  const approxHeightKm = isLatOrderValid ? latSpan * 110.57 : 0;
  const approxAreaKm2 = Math.round(approxWidthKm * approxHeightKm * 10) / 10;

  // Date range validation
  const isStartDateValid = Boolean(startDate) && !isNaN(new Date(startDate).getTime());
  const isEndDateValid = Boolean(endDate) && !isNaN(new Date(endDate).getTime());
  const startDt = new Date(startDate);
  const endDt = new Date(endDate);
  const isDateOrderValid = isStartDateValid && isEndDateValid && startDt <= endDt;
  const daysDiff = isDateOrderValid ? (endDt.getTime() - startDt.getTime()) / (1000 * 60 * 60 * 24) : 0;
  const isDateSpanValid = isDateOrderValid && daysDiff <= 180;

  // Field-specific validation error strings for inline UI feedback
  const minLonError = !isMinLonFinite
    ? 'Valid number required'
    : !isMinLonRange
    ? 'Must be [-180°, 180°]'
    : isMaxLonRange && minLonNum >= maxLonNum
    ? 'Must be < East Lon'
    : null;

  const minLatError = !isMinLatFinite
    ? 'Valid number required'
    : !isMinLatRange
    ? 'Must be [-90°, 90°]'
    : isMaxLatRange && minLatNum >= maxLatNum
    ? 'Must be < North Lat'
    : null;

  const maxLonError = !isMaxLonFinite
    ? 'Valid number required'
    : !isMaxLonRange
    ? 'Must be [-180°, 180°]'
    : isMinLonRange && minLonNum >= maxLonNum
    ? 'Must be > West Lon'
    : null;

  const maxLatError = !isMaxLatFinite
    ? 'Valid number required'
    : !isMaxLatRange
    ? 'Must be [-90°, 90°]'
    : isMinLatRange && minLatNum >= maxLatNum
    ? 'Must be > South Lat'
    : null;

  const startDateError = !startDate
    ? 'Start date required'
    : !isStartDateValid
    ? 'Invalid date format'
    : !isDateOrderValid
    ? 'Cannot be after End Date'
    : null;

  const endDateError = !endDate
    ? 'End date required'
    : !isEndDateValid
    ? 'Invalid date format'
    : !isDateOrderValid
    ? 'Cannot be before Start Date'
    : !isDateSpanValid
    ? `Exceeds 180d max (${Math.round(daysDiff)}d)`
    : null;

  // Step-level validation
  const isStep1Valid = isBBoxValid && studyName.trim().length > 0;
  const isStep2Valid = isDateOrderValid && isDateSpanValid;
  const isFormValid = isStep1Valid && isStep2Valid && selectedCount > 0;

  // Comprehensive Validation Error Summary
  const validationErrors: string[] = [];
  if (!studyName.trim()) validationErrors.push('Study Area Name is required and cannot be empty.');
  if (!isMinLatRange) validationErrors.push('South (Min Latitude) must be a valid number between -90° and 90°.');
  if (!isMaxLatRange) validationErrors.push('North (Max Latitude) must be a valid number between -90° and 90°.');
  if (!isMinLonRange) validationErrors.push('West (Min Longitude) must be a valid number between -180° and 180°.');
  if (!isMaxLonRange) validationErrors.push('East (Max Longitude) must be a valid number between -180° and 180°.');
  if (isMinLatRange && isMaxLatRange && minLatNum >= maxLatNum) {
    validationErrors.push('South Latitude must be strictly less than North Latitude.');
  }
  if (isMinLonRange && isMaxLonRange && minLonNum >= maxLonNum) {
    validationErrors.push('West Longitude must be strictly less than East Longitude.');
  }
  if (isLatOrderValid && isLonOrderValid && !isMinSpanValid) {
    validationErrors.push('Bounding box is too small: latitude and longitude spans must be at least 0.01° (~1.1 km).');
  }
  if (isLatOrderValid && isLonOrderValid && !isMaxSpanValid) {
    validationErrors.push('Bounding box exceeds maximum satellite analysis limit: 12° latitude by 15° longitude.');
  }
  if (!startDate) {
    validationErrors.push('Event start date is required.');
  } else if (!isStartDateValid) {
    validationErrors.push('Event start date must be a valid ISO date.');
  }
  if (!endDate) {
    validationErrors.push('Event end date is required.');
  } else if (!isEndDateValid) {
    validationErrors.push('Event end date must be a valid ISO date.');
  }
  if (isStartDateValid && isEndDateValid && !isDateOrderValid) {
    validationErrors.push('Event start date cannot be chronologically after end date.');
  } else if (isDateOrderValid && !isDateSpanValid) {
    validationErrors.push(`Observation window (${Math.round(daysDiff)} days) exceeds the maximum allowable baseline of 180 days.`);
  }
  if (selectedCount === 0) {
    validationErrors.push('At least one Earth observation or vector infrastructure layer must be selected.');
  }

  // Initialize and maintain the real Leaflet satellite map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const centerLat = isBBoxValid ? (minLatNum + maxLatNum) / 2 : 27.98;
      const centerLon = isBBoxValid ? (minLonNum + maxLonNum) / 2 : 85.18;

      const map = L.map(mapContainerRef.current, {
        center: [centerLat, centerLon],
        zoom: 10,
        zoomControl: true,
        attributionControl: true
      });

      // Esri World Imagery real satellite tiles
      L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
        maxZoom: 18
      }).addTo(map);

      mapInstanceRef.current = map;
    }

    const map = mapInstanceRef.current;

    // Invalidate size to guarantee crisp map rendering without grey tiles
    const resizeTimer = setTimeout(() => {
      map.invalidateSize();
    }, 150);

    // Update AOI Rectangle
    if (aoiLayerRef.current) {
      map.removeLayer(aoiLayerRef.current);
      aoiLayerRef.current = null;
    }

    if (isBBoxValid && map) {
      const bounds: L.LatLngBoundsExpression = [
        [minLatNum, minLonNum],
        [maxLatNum, maxLonNum]
      ];

      const rect = L.rectangle(bounds, {
        color: '#d97706',
        weight: 2,
        fillColor: '#f59e0b',
        fillOpacity: 0.18,
        dashArray: '6, 6'
      }).addTo(map);

      rect.bindTooltip(`${studyName} [AOI: ${approxAreaKm2} km²]`, {
        permanent: true,
        direction: 'top',
        className: 'text-xs font-semibold'
      });
      aoiLayerRef.current = rect;

      try {
        map.fitBounds(bounds, { padding: [24, 24], maxZoom: 12 });
      } catch {
        // ignore
      }
    }

    return () => clearTimeout(resizeTimer);
  }, [minLatNum, maxLatNum, minLonNum, maxLonNum, isBBoxValid, studyName, approxAreaKm2]);

  const handleRunAnalysis = async () => {
    if (!isFormValid) {
      setServerError(`Cannot submit analysis: ${validationErrors.join(' | ')}`);
      return;
    }

    setIsRunning(true);
    setServerError(null);
    setExecutionLog('Validating parameters with satellite processing cluster...');

    const payload: CreateAnalysisPayload = {
      studyAreaName: studyName.trim(),
      bbox: [minLonNum, minLatNum, maxLonNum, maxLatNum],
      startDate,
      endDate,
      sources: {
        sentinel1: srcS1,
        sentinel2: srcS2,
        copernicusDem: srcDem,
        osmInfrastructure: srcOsm
      },
      algorithm: architecture,
      sarThresholdDb: sarThreshold,
      slopeExclusionDeg: slopeThreshold
    };

    try {
      // 1. Client-to-server preflight validation check
      const valResponse = await fetch('/api/analyses/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const valData = await valResponse.json();

      if (!valData.valid) {
        throw new Error(`Server validation rejected coordinates or dates: ${valData.errors.join(' | ')}`);
      }

      setExecutionLog('Server validation verified. Dispatching GPU Pipeline... Ingesting Sentinel-1 radar and terrain tensors.');

      // 2. Run analysis pipeline
      const response = await fetch('/api/analyses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.errors?.join(' | ') || data.message || 'Pipeline execution failed on server');
      }

      setExecutionLog('Pipeline Complete! Flood extent and graph severance computed.');

      setTimeout(() => {
        setIsRunning(false);
        if (data.analysis) {
          onAnalysisCreated(data.analysis);
          onNavigate('flood-map-explorer');
        }
      }, 1200);
    } catch (err: any) {
      setIsRunning(false);
      setServerError(err.message || 'Execution error');
      setExecutionLog('');
    }
  };

  return (
    <div className="flex flex-col w-full space-y-6">
      <SyntheticBanner
        dataMode="DEMO_SYNTHETIC"
        customMessage="New analysis submissions will compute metrics based on the provided bounding box and sensor threshold settings."
      />

      {/* Notification Toast */}
      {executionLog && (
        <div className="fixed bottom-6 right-8 z-50 px-4 py-3 rounded-xl bg-white text-amber-800 shadow-xl border border-amber-300 flex items-center gap-2">
          <span className="material-symbols-outlined text-base animate-pulse text-amber-600">radar</span>
          <span className="text-xs font-semibold">{executionLog}</span>
        </div>
      )}

      {/* Page Header & Stepper Section */}
      <div className="p-6 bg-white rounded-xl shadow-sm border border-slate-200">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 mb-6">
          <div className="flex flex-col">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[11px] uppercase tracking-wider text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded font-semibold">
                SAR + Optical Pipeline v2.4
              </span>
              <span className="text-slate-300">|</span>
              <span className="text-xs text-slate-500">
                Workflow Session: <span className="text-slate-800 font-semibold">TRISHULI-202608-RUN10</span>
              </span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Configure New Flood Disaster Analysis
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Define spatial bounds, satellite temporal windows, digital elevation grids, and ML inference topology.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 self-start xl:self-auto">
            <button
              type="button"
              onClick={() => {
                setStudyName('Trishuli Watershed AOI-04');
                setMinLon('85.05');
                setMinLat('27.85');
                setMaxLon('85.35');
                setMaxLat('28.15');
                setStartDate('2026-08-14');
                setEndDate('2026-08-16');
                setServerError(null);
              }}
              className="px-3 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-900 text-xs font-semibold border border-amber-300 flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-sm text-amber-700">restore</span>
              <span>Trishuli (Default)</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setStudyName('Guwahati Brahmaputra Flood Sector');
                setMinLon('91.59');
                setMinLat('26.02');
                setMaxLon('91.91');
                setMaxLat('26.34');
                setStartDate('2026-08-01');
                setEndDate('2026-08-15');
                setServerError(null);
              }}
              className="px-3 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-900 text-xs font-semibold border border-amber-300 flex items-center gap-1 transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-sm text-amber-700">water</span>
              <span>Guwahati (Assam)</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setStudyName('Mumbai Coastal Flood Zone');
                setMinLon('72.77');
                setMinLat('18.89');
                setMaxLon('72.99');
                setMaxLat('19.27');
                setStartDate('2026-07-20');
                setEndDate('2026-08-05');
                setServerError(null);
              }}
              className="px-3 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-medium border border-slate-200 flex items-center gap-1 transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-sm text-slate-500">domain</span>
              <span>Mumbai</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setStudyName('Delhi NCR Yamuna Flood Basin');
                setMinLon('76.84');
                setMinLat('28.40');
                setMaxLon('77.35');
                setMaxLat('28.88');
                setStartDate('2026-08-05');
                setEndDate('2026-08-16');
                setServerError(null);
              }}
              className="px-3 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-medium border border-slate-200 flex items-center gap-1 transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-sm text-slate-500">location_city</span>
              <span>Delhi NCR</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setStudyName('Chennai Coromandel Basin');
                setMinLon('80.12');
                setMinLat('12.92');
                setMaxLon('80.34');
                setMaxLat('13.24');
                setStartDate('2026-10-01');
                setEndDate('2026-10-15');
                setServerError(null);
              }}
              className="px-3 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-medium border border-slate-200 flex items-center gap-1 transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-sm text-slate-500">tsunami</span>
              <span>Chennai</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setStudyName('Jaipur Drainage Catchment');
                setMinLon('75.68');
                setMinLat('26.78');
                setMaxLon('75.92');
                setMaxLat('27.04');
                setStartDate('2026-08-01');
                setEndDate('2026-08-12');
                setServerError(null);
              }}
              className="px-3 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-medium border border-slate-200 flex items-center gap-1 transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-sm text-slate-500">fort</span>
              <span>Jaipur</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setStudyName('Koshi Basin Flood Plain');
                setMinLon('86.95');
                setMinLat('26.45');
                setMaxLon('87.35');
                setMaxLat('26.85');
                setStartDate('2026-08-10');
                setEndDate('2026-08-18');
                setServerError(null);
              }}
              className="px-3 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-medium border border-slate-200 flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-sm text-slate-500">history</span>
              <span>Koshi</span>
            </button>
            <button
              type="button"
              onClick={() => {
                // Inverted latitude/longitude demonstrating client and server validation
                setStudyName('Inverted Bounds Test');
                setMinLon('85.35');
                setMinLat('28.15');
                setMaxLon('85.05');
                setMaxLat('27.85');
                setStartDate('2026-08-20');
                setEndDate('2026-08-10');
                setServerError(null);
              }}
              className="px-2.5 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-800 text-xs font-medium border border-rose-200 flex items-center gap-1 transition-colors cursor-pointer"
              title="Test validation errors logic with inverted bounds and backwards dates"
            >
              <span className="material-symbols-outlined text-sm text-rose-600">bug_report</span>
              <span>Test Invalid</span>
            </button>
          </div>
        </div>

        {/* 5-Step Visual Stepper Bar */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-2 bg-slate-50 p-2 rounded-xl border border-slate-200">
          {[
            { num: 1, title: 'Area of Interest', subtitle: `${studyName}`, valid: isStep1Valid },
            { num: 2, title: 'Temporal Windows', subtitle: `${startDate} → ${endDate}`, valid: isStep2Valid },
            { num: 3, title: 'Satellite Data Sources', subtitle: `${selectedCount}/4 Layers Selected`, valid: selectedCount > 0 },
            { num: 4, title: 'AI & Fusion Params', subtitle: 'UNet Change Fusion', valid: true },
            { num: 5, title: 'Review & Compute', subtitle: 'Cluster Dispatch', valid: isFormValid }
          ].map((s) => {
            const isStepActive = activeStep === s.num;
            const isCompleted = activeStep > s.num && s.valid;
            return (
              <button
                key={s.num}
                type="button"
                onClick={() => setActiveStep(s.num)}
                className={`flex items-center gap-3 p-2.5 rounded-lg text-left transition-all cursor-pointer ${
                  isStepActive
                    ? 'bg-white text-amber-800 shadow-sm border border-amber-300'
                    : 'hover:bg-white/80 text-slate-600'
                }`}
              >
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                  isStepActive
                    ? 'bg-amber-600 text-white'
                    : isCompleted
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    : 'bg-slate-200 text-slate-600'
                }`}>
                  {isCompleted ? <span className="material-symbols-outlined text-sm font-bold">check</span> : s.num}
                </div>
                <div className="flex flex-col min-w-0">
                  <span className={`text-[11px] uppercase tracking-wider font-semibold ${isStepActive ? 'text-amber-800' : 'text-slate-500'}`}>
                    Step 0{s.num} {isStepActive && '• Active'}
                  </span>
                  <span className="text-xs font-semibold text-slate-800 truncate">{s.title}</span>
                  <span className="text-[10px] text-slate-400 truncate">{s.subtitle}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Live Validation Alert Notice */}
      {validationErrors.length > 0 && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-xs shadow-xs">
          <div className="flex items-center gap-2 font-bold mb-1.5">
            <span className="material-symbols-outlined text-amber-700 text-base">warning</span>
            <span>Input Validation Requirements ({validationErrors.length} pending):</span>
          </div>
          <ul className="list-disc pl-5 space-y-1 text-amber-800 font-medium">
            {validationErrors.map((err, i) => (
              <li key={i}>{err}</li>
            ))}
          </ul>
        </div>
      )}

      {serverError && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-300 text-rose-900 text-xs flex items-start gap-2 shadow-xs">
          <span className="material-symbols-outlined text-rose-700 text-base mt-0.5">error</span>
          <div>
            <strong className="block font-bold">Server Validation & Execution Notice:</strong>
            <span>{serverError}</span>
          </div>
        </div>
      )}

      {/* Main Workflow Workspace (Split View) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Form Controls (6 cols) */}
        <div className="lg:col-span-6 flex flex-col gap-4">
          {/* STEP 1 PANE */}
          {activeStep === 1 && (
            <div className="p-6 rounded-xl bg-white shadow-sm flex flex-col gap-4 border border-slate-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-amber-600">polyline</span>
                  <h2 className="text-base font-bold text-slate-900">Step 1: Geographic Bounding & AOI</h2>
                </div>
                <span className={`text-[11px] px-2.5 py-0.5 rounded font-bold ${
                  isBBoxValid
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-300'
                    : 'bg-rose-50 text-rose-800 border border-rose-300'
                }`}>
                  {isBBoxValid ? '✓ Valid Bounding Box' : '⚠ Coordinates Invalid'}
                </span>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs uppercase font-semibold text-slate-500">Study Area Name</label>
                <input
                  type="text"
                  value={studyName}
                  onChange={(e) => setStudyName(e.target.value)}
                  placeholder="e.g. Trishuli Watershed AOI-04"
                  className={`w-full bg-slate-50 px-3 py-2 rounded-lg text-slate-900 text-xs border ${
                    !studyName.trim() ? 'border-rose-400 bg-rose-50/20' : 'border-slate-200'
                  } focus:outline-none focus:border-amber-500 focus:bg-white`}
                />
                {!studyName.trim() && (
                  <span className="text-[10px] text-rose-600 font-semibold mt-0.5">Study Area Name cannot be empty</span>
                )}
              </div>

              {/* BBox Coordinates Grid with Real-Time Validation Feedback */}
              <div>
                <label className="text-xs uppercase font-semibold text-slate-500 block mb-1.5">
                  Geographic Coordinates (WGS 84 Decimal Degrees)
                </label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 bg-slate-50 p-3 rounded-lg border border-slate-200">
                  <div className="flex flex-col">
                    <span className="text-[10px] text-slate-500 font-medium">West (Min Lon)</span>
                    <input
                      type="number"
                      step="0.01"
                      value={minLon}
                      onChange={(e) => setMinLon(e.target.value)}
                      className={`bg-white font-mono text-xs font-semibold px-2 py-1.5 rounded border transition-colors ${
                        minLonError ? 'border-rose-400 bg-rose-50/30 text-rose-800' : 'border-slate-300 text-slate-800'
                      } focus:outline-none focus:border-amber-500`}
                    />
                    <div className="flex items-center justify-between text-[9px] mt-0.5">
                      <span className="text-slate-400">[-180°, 180°]</span>
                      {minLonError && <span className="text-rose-600 font-bold truncate">{minLonError}</span>}
                    </div>
                  </div>

                  <div className="flex flex-col">
                    <span className="text-[10px] text-slate-500 font-medium">South (Min Lat)</span>
                    <input
                      type="number"
                      step="0.01"
                      value={minLat}
                      onChange={(e) => setMinLat(e.target.value)}
                      className={`bg-white font-mono text-xs font-semibold px-2 py-1.5 rounded border transition-colors ${
                        minLatError ? 'border-rose-400 bg-rose-50/30 text-rose-800' : 'border-slate-300 text-slate-800'
                      } focus:outline-none focus:border-amber-500`}
                    />
                    <div className="flex items-center justify-between text-[9px] mt-0.5">
                      <span className="text-slate-400">[-90°, 90°]</span>
                      {minLatError && <span className="text-rose-600 font-bold truncate">{minLatError}</span>}
                    </div>
                  </div>

                  <div className="flex flex-col">
                    <span className="text-[10px] text-slate-500 font-medium">East (Max Lon)</span>
                    <input
                      type="number"
                      step="0.01"
                      value={maxLon}
                      onChange={(e) => setMaxLon(e.target.value)}
                      className={`bg-white font-mono text-xs font-semibold px-2 py-1.5 rounded border transition-colors ${
                        maxLonError ? 'border-rose-400 bg-rose-50/30 text-rose-800' : 'border-slate-300 text-slate-800'
                      } focus:outline-none focus:border-amber-500`}
                    />
                    <div className="flex items-center justify-between text-[9px] mt-0.5">
                      <span className="text-slate-400">[-180°, 180°]</span>
                      {maxLonError && <span className="text-rose-600 font-bold truncate">{maxLonError}</span>}
                    </div>
                  </div>

                  <div className="flex flex-col">
                    <span className="text-[10px] text-slate-500 font-medium">North (Max Lat)</span>
                    <input
                      type="number"
                      step="0.01"
                      value={maxLat}
                      onChange={(e) => setMaxLat(e.target.value)}
                      className={`bg-white font-mono text-xs font-semibold px-2 py-1.5 rounded border transition-colors ${
                        maxLatError ? 'border-rose-400 bg-rose-50/30 text-rose-800' : 'border-slate-300 text-slate-800'
                      } focus:outline-none focus:border-amber-500`}
                    />
                    <div className="flex items-center justify-between text-[9px] mt-0.5">
                      <span className="text-slate-400">[-90°, 90°]</span>
                      {maxLatError && <span className="text-rose-600 font-bold truncate">{maxLatError}</span>}
                    </div>
                  </div>
                </div>

                {/* Dimension & Span Readout */}
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs flex flex-col gap-1.5 mt-2">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-600 font-medium">Calculated AOI Surface Area:</span>
                    <span className={`font-mono font-bold ${isBBoxValid ? 'text-amber-800 text-sm' : 'text-slate-400'}`}>
                      {isBBoxValid ? `${approxAreaKm2} km²` : '—'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-[11px] text-slate-500">
                    <span>
                      Lat Span: <strong className={isLatOrderValid && latSpan >= 0.01 && latSpan <= 12 ? 'text-slate-800' : 'text-rose-600'}>
                        {isLatOrderValid ? `${latSpan.toFixed(3)}° (~${(latSpan * 110.57).toFixed(1)} km)` : 'Invalid'}
                      </strong>
                    </span>
                    <span>
                      Lon Span: <strong className={isLonOrderValid && lonSpan >= 0.01 && lonSpan <= 15 ? 'text-slate-800' : 'text-rose-600'}>
                        {isLonOrderValid ? `${lonSpan.toFixed(3)}° (~${(approxWidthKm).toFixed(1)} km)` : 'Invalid'}
                      </strong>
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-[10px] text-slate-400 pt-1 border-t border-slate-200">
                    <span>Center: {isBBoxValid ? `${((minLatNum + maxLatNum) / 2).toFixed(3)}°N, ${((minLonNum + maxLonNum) / 2).toFixed(3)}°E` : 'Coordinates invalid'}</span>
                    <span className={isBBoxValid ? 'text-emerald-700 font-semibold' : 'text-rose-600 font-semibold'}>
                      {isBBoxValid ? '✓ Within Sensor Processing Limits' : '⚠ Bounding box invalid'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={() => {
                    if (isStep1Valid) setActiveStep(2);
                  }}
                  disabled={!isStep1Valid}
                  className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-xs transition-colors cursor-pointer"
                >
                  Continue to Step 2 →
                </button>
              </div>
            </div>
          )}

          {/* STEP 2 PANE */}
          {activeStep === 2 && (
            <div className="p-6 rounded-xl bg-white shadow-sm flex flex-col gap-4 border border-slate-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-amber-600">calendar_month</span>
                  <h2 className="text-base font-bold text-slate-900">Step 2: Event Timeline & Satellite Baseline</h2>
                </div>
                <span className={`text-[11px] px-2.5 py-0.5 rounded font-bold ${
                  isStep2Valid ? 'bg-emerald-50 text-emerald-800 border border-emerald-300' : 'bg-rose-50 text-rose-800 border border-rose-300'
                }`}>
                  {isStep2Valid ? '✓ Valid Date Range' : '⚠ Invalid Date Range'}
                </span>
              </div>

              <div className="space-y-3">
                <label className="text-xs uppercase font-semibold text-slate-500">Disaster Event Window (UTC)</label>
                <div className="flex flex-col sm:flex-row items-center gap-3">
                  <div className="w-full sm:flex-1 bg-slate-50 p-2.5 rounded-lg border border-slate-200 flex flex-col gap-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-500 font-medium">Event Start:</span>
                      <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className={`bg-white px-2 py-1 text-xs text-slate-800 font-semibold rounded border ${
                          startDateError ? 'border-rose-400 bg-rose-50/30' : 'border-slate-300'
                        } focus:outline-none focus:border-amber-500`}
                      />
                    </div>
                    {startDateError && (
                      <span className="text-[10px] text-rose-600 font-semibold text-right">{startDateError}</span>
                    )}
                  </div>
                  <span className="material-symbols-outlined text-slate-400 hidden sm:block">arrow_forward</span>
                  <div className="w-full sm:flex-1 bg-slate-50 p-2.5 rounded-lg border border-slate-200 flex flex-col gap-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-500 font-medium">Event End:</span>
                      <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className={`bg-white px-2 py-1 text-xs text-slate-800 font-semibold rounded border ${
                          endDateError ? 'border-rose-400 bg-rose-50/30' : 'border-slate-300'
                        } focus:outline-none focus:border-amber-500`}
                      />
                    </div>
                    {endDateError && (
                      <span className="text-[10px] text-rose-600 font-semibold text-right">{endDateError}</span>
                    )}
                  </div>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs flex justify-between items-center">
                  <span className="text-slate-600">Calculated Observation Window:</span>
                  <span className={`font-mono font-bold ${isDateSpanValid ? 'text-slate-800' : 'text-rose-600'}`}>
                    {isDateOrderValid ? `${Math.round(daysDiff)} days` : 'Invalid order'}
                    <span className="text-[10px] text-slate-400 font-normal ml-1">(max 180 days)</span>
                  </span>
                </div>
              </div>

              <div className="flex justify-between pt-2">
                <button
                  type="button"
                  onClick={() => setActiveStep(1)}
                  className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-xs transition-colors cursor-pointer"
                >
                  ← Back to Step 1
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (isStep2Valid) setActiveStep(3);
                  }}
                  disabled={!isStep2Valid}
                  className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-xs transition-colors cursor-pointer"
                >
                  Continue to Step 3 →
                </button>
              </div>
            </div>
          )}

          {/* STEP 3 PANE */}
          {activeStep === 3 && (
            <div className="p-6 rounded-xl bg-white shadow-sm flex flex-col gap-4 border border-slate-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-amber-600">satellite_alt</span>
                  <h2 className="text-base font-bold text-slate-900">Step 3: Satellite & Earth Observation Layers</h2>
                </div>
                <span className="text-[11px] px-2 py-0.5 rounded font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                  {selectedCount}/4 Layers
                </span>
              </div>

              <div className="space-y-3">
                {/* Sentinel-1 */}
                <div
                  onClick={() => setSrcS1(!srcS1)}
                  className={`p-3.5 rounded-lg border flex items-start gap-3 cursor-pointer transition-colors ${
                    srcS1 ? 'bg-amber-50/50 border-amber-300' : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <input type="checkbox" checked={srcS1} onChange={() => {}} className="mt-0.5 accent-amber-600" />
                  <div className="flex-1">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-slate-900">Sentinel-1 C-SAR GRD (Active Radar)</span>
                      <span className="text-[10px] text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded font-semibold">Cloud Penetrating</span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">5.405 GHz dual-polarization (VV+VH) backscatter change detection for surface water mapping.</p>
                  </div>
                </div>

                {/* Sentinel-2 */}
                <div
                  onClick={() => setSrcS2(!srcS2)}
                  className={`p-3.5 rounded-lg border flex items-start gap-3 cursor-pointer transition-colors ${
                    srcS2 ? 'bg-amber-50/50 border-amber-300' : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <input type="checkbox" checked={srcS2} onChange={() => {}} className="mt-0.5 accent-amber-600" />
                  <div className="flex-1">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-slate-900">Sentinel-2 MSI Optical Reflectance</span>
                      <span className="text-[10px] text-slate-600 bg-slate-200 px-1.5 py-0.5 rounded font-semibold">10m Multispectral</span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">Provides MNDWI and true color verification when cloud cover is below 35%.</p>
                  </div>
                </div>

                {/* Copernicus DEM */}
                <div
                  onClick={() => setSrcDem(!srcDem)}
                  className={`p-3.5 rounded-lg border flex items-start gap-3 cursor-pointer transition-colors ${
                    srcDem ? 'bg-amber-50/50 border-amber-300' : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <input type="checkbox" checked={srcDem} onChange={() => {}} className="mt-0.5 accent-amber-600" />
                  <div className="flex-1">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-slate-900">Copernicus GLO-30 Digital Elevation Model</span>
                      <span className="text-[10px] text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded font-semibold">Topographic Mask</span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">Excludes mountain radar shadow and steep slopes (&gt;25°) from false water classifications.</p>
                  </div>
                </div>

                {/* OSM Infrastructure */}
                <div
                  onClick={() => setSrcOsm(!srcOsm)}
                  className={`p-3.5 rounded-lg border flex items-start gap-3 cursor-pointer transition-colors ${
                    srcOsm ? 'bg-amber-50/50 border-amber-300' : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <input type="checkbox" checked={srcOsm} onChange={() => {}} className="mt-0.5 accent-amber-600" />
                  <div className="flex-1">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-slate-900">OpenStreetMap Vector Infrastructure</span>
                      <span className="text-[10px] text-blue-700 bg-blue-100 px-1.5 py-0.5 rounded font-semibold">Transport Graph</span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">Road network vectors, bridges, and settlement nodes for graph accessibility modeling.</p>
                  </div>
                </div>
              </div>

              <div className="flex justify-between pt-2">
                <button
                  type="button"
                  onClick={() => setActiveStep(2)}
                  className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-xs transition-colors cursor-pointer"
                >
                  ← Back to Step 2
                </button>
                <button
                  type="button"
                  onClick={() => setActiveStep(4)}
                  className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs transition-colors cursor-pointer"
                >
                  Continue to Step 4 →
                </button>
              </div>
            </div>
          )}

          {/* STEP 4 PANE */}
          {activeStep === 4 && (
            <div className="p-6 rounded-xl bg-white shadow-sm flex flex-col gap-4 border border-slate-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-amber-600">psychology</span>
                  <h2 className="text-base font-bold text-slate-900">Step 4: AI & Inference Pipeline Tuning</h2>
                </div>
                <span className="text-[11px] px-2 py-0.5 rounded font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                  Model Calibration
                </span>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-xs uppercase font-semibold text-slate-500 block mb-1">
                    Segmentation Architecture
                  </label>
                  <select
                    value={architecture}
                    onChange={(e) => setArchitecture(e.target.value)}
                    className="w-full bg-slate-50 text-slate-800 text-xs p-2.5 rounded-lg border border-slate-200 focus:outline-none focus:border-amber-500"
                  >
                    <option>Multimodal UNet SAR+Optical Change Fusion (v2.4 - Balanced)</option>
                    <option>DeepLabv3+ SAR-Only ResNet50 (Radar-dominant, Cloud-resilient)</option>
                    <option>Fast-Inference Otsu + Morphological Filtering (Baseline)</option>
                  </select>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-xs uppercase font-semibold text-slate-500">SAR Calibrated Threshold (Δσ° dB Cutoff)</label>
                    <span className="text-xs font-bold text-amber-700">{sarThreshold} dB</span>
                  </div>
                  <input
                    type="range"
                    min="-25.0"
                    max="-5.0"
                    step="0.2"
                    value={sarThreshold}
                    onChange={(e) => setSarThreshold(parseFloat(e.target.value))}
                    className="w-full accent-amber-600"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
                    <span>Conservative (-25 dB)</span>
                    <span>Adaptive (-14.2 dB)</span>
                    <span>Aggressive (-5 dB)</span>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-xs uppercase font-semibold text-slate-500">DEM Slope Exclusion Cutoff</label>
                    <span className="text-xs font-bold text-amber-700">{slopeThreshold}°</span>
                  </div>
                  <input
                    type="range"
                    min="10.0"
                    max="45.0"
                    step="1.0"
                    value={slopeThreshold}
                    onChange={(e) => setSlopeThreshold(parseFloat(e.target.value))}
                    className="w-full accent-amber-600"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
                    <span>Low Hills (15°)</span>
                    <span>Standard Valley (25°)</span>
                    <span>Steep Ridges (45°)</span>
                  </div>
                </div>
              </div>

              <div className="flex justify-between pt-2">
                <button
                  type="button"
                  onClick={() => setActiveStep(3)}
                  className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-xs transition-colors cursor-pointer"
                >
                  ← Back to Step 3
                </button>
                <button
                  type="button"
                  onClick={() => setActiveStep(5)}
                  className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs transition-colors cursor-pointer"
                >
                  Continue to Step 5 →
                </button>
              </div>
            </div>
          )}

          {/* STEP 5 PANE */}
          {activeStep === 5 && (
            <div className="p-6 rounded-xl bg-white shadow-sm flex flex-col gap-4 border border-slate-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-amber-600">fact_check</span>
                  <h2 className="text-base font-bold text-slate-900">Step 5: Review & Pre-Flight Telemetry</h2>
                </div>
                <span className={`text-[11px] px-2 py-0.5 rounded font-semibold ${
                  isFormValid ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
                }`}>
                  {isFormValid ? 'All Parameters Verified' : 'Check Validation Errors'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                  <span className="text-[10px] uppercase font-semibold text-slate-400 block">Target AOI</span>
                  <span className="font-bold text-slate-800">{studyName}</span>
                </div>
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                  <span className="text-[10px] uppercase font-semibold text-slate-400 block">Temporal Range</span>
                  <span className="font-bold text-slate-800">{startDate} → {endDate}</span>
                </div>
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                  <span className="text-[10px] uppercase font-semibold text-slate-400 block">Bounding Box</span>
                  <span className="font-mono text-slate-700">[{minLonNum}, {minLatNum}, {maxLonNum}, {maxLatNum}]</span>
                </div>
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                  <span className="text-[10px] uppercase font-semibold text-slate-400 block">Active Sensors</span>
                  <span className="font-bold text-amber-700">{selectedCount} Layers Selected</span>
                </div>
              </div>
            </div>
          )}

          {/* Action Control Box (Persistent) */}
          <div className="p-5 rounded-xl bg-white shadow-sm flex flex-col gap-4 border border-slate-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-amber-600 text-xl">speed</span>
                <div>
                  <div className="text-xs font-bold text-slate-900">Cluster Workload Estimator</div>
                  <div className="text-[10px] text-slate-500">Sentinel-1 GRD SAR + DEM Slope Masking Engine</div>
                </div>
              </div>
              <div className="text-right">
                <span className="text-sm font-bold text-amber-700">~15 sec</span>
                <span className="text-[10px] text-slate-400 block">Direct Simulation</span>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-between gap-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setActiveStep(prev => Math.max(1, prev - 1))}
                className="px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium transition-colors cursor-pointer"
              >
                Back
              </button>
              <div className="flex items-center gap-2">
                {!isFormValid && (
                  <span className="text-[10px] text-rose-600 font-semibold hidden sm:inline">
                    Resolve validation errors to submit
                  </span>
                )}
                <button
                  type="button"
                  onClick={handleRunAnalysis}
                  disabled={isRunning || !isFormValid}
                  className="px-5 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-xs flex items-center gap-2 shadow-sm transition-all cursor-pointer"
                  title={!isFormValid ? `Validation requirements: ${validationErrors.join('; ')}` : 'Run flood analysis simulation'}
                >
                  <span className={`material-symbols-outlined text-base ${isRunning ? 'animate-spin' : ''}`}>
                    {isRunning ? 'refresh' : 'play_arrow'}
                  </span>
                  <span>{isRunning ? 'Running Analysis...' : 'Run Flood Analysis [Job Ingest]'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Interactive Real Satellite Map (6 cols) */}
        <div className="lg:col-span-6 flex flex-col gap-4">
          <div className="rounded-xl bg-white shadow-sm overflow-hidden flex flex-col border border-slate-200">
            {/* Panel Header */}
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-amber-600 text-base">satellite_alt</span>
                <span className="text-xs font-bold text-slate-900">Live Satellite Imagery & AOI Footprint</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-semibold text-amber-800 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded">
                  Esri World Imagery
                </span>
              </div>
            </div>

            {/* Real Satellite Map Leaflet Viewport */}
            <div className="relative w-full h-[420px] bg-slate-100">
              <div ref={mapContainerRef} className="w-full h-full z-0" />

              {/* HUD Overlay with Live Coordinates */}
              <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-lg shadow-sm border border-slate-200 text-[11px] font-mono text-slate-700 z-10 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                <span>AOI: {studyName}</span>
              </div>

              <div className="absolute bottom-6 left-3 bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-lg shadow-sm border border-slate-200 text-[10px] font-mono text-slate-600 z-10">
                SW: {minLatNum.toFixed(3)}°N, {minLonNum.toFixed(3)}°E | NE: {maxLatNum.toFixed(3)}°N, {maxLonNum.toFixed(3)}°E
              </div>
            </div>

            {/* Data Ingestion Status Checklist */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col gap-2">
              <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                Earth Observation Layer Pipeline Readiness
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                <div className="p-2.5 rounded bg-white border border-slate-200 flex items-center gap-2">
                  <span className="material-symbols-outlined text-emerald-600 text-sm font-bold">check_circle</span>
                  <div className="flex flex-col min-w-0">
                    <span className="font-semibold text-slate-800 truncate text-[11px]">Sentinel-1 C-SAR</span>
                    <span className="text-[10px] text-emerald-700 truncate">Orbit 121 (Desc)</span>
                  </div>
                </div>
                <div className="p-2.5 rounded bg-white border border-slate-200 flex items-center gap-2">
                  <span className="material-symbols-outlined text-emerald-600 text-sm font-bold">check_circle</span>
                  <div className="flex flex-col min-w-0">
                    <span className="font-semibold text-slate-800 truncate text-[11px]">Copernicus DEM</span>
                    <span className="text-[10px] text-emerald-700 truncate">GLO-30 Cached</span>
                  </div>
                </div>
                <div className="p-2.5 rounded bg-white border border-slate-200 flex items-center gap-2">
                  <span className="material-symbols-outlined text-emerald-600 text-sm font-bold">check_circle</span>
                  <div className="flex flex-col min-w-0">
                    <span className="font-semibold text-slate-800 truncate text-[11px]">OSM Infrastructure</span>
                    <span className="text-[10px] text-emerald-700 truncate">Highway Graph Ready</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
