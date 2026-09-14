import React from 'react';
import { Layers, RotateCcw, Waves, Filter, Satellite, Map as MapIcon } from 'lucide-react';
import { BasemapKey, DataStatusEntry, DataLayerStatus } from '../types';

interface MapLayerPanelProps {
  basemap: BasemapKey['id'];
  onBasemapChange: (basemap: BasemapKey['id']) => void;
  showRedZones: boolean;
  onRedZonesChange: (visible: boolean) => void;
  hazardTypes: string[];
  visibleHazardTypes: string[];
  onHazardTypeChange: (hazardType: string, visible: boolean) => void;
  showHabitations: boolean;
  onHabitationsChange: (visible: boolean) => void;
  showSites: boolean;
  onSitesChange: (visible: boolean) => void;
  showInfra: boolean;
  onInfraChange: (visible: boolean) => void;
  showRoute: boolean;
  onRouteChange: (visible: boolean) => void;
  showFlood: boolean;
  onFloodChange: (visible: boolean) => void;
  floodDataStatus?: DataLayerStatus;
  hasFloodData: boolean;
  priorityFilter: string;
  onPriorityFilterChange: (filter: string) => void;
  onResetCenter: () => void;
  dataStatus?: DataStatusEntry[] | null;
}

const BASEMAPS: { id: BasemapKey['id']; label: string; icon: React.ReactNode }[] = [
  { id: 'street', label: 'Street', icon: <MapIcon className="w-3 h-3" /> },
  { id: 'satellite', label: 'Satellite', icon: <Satellite className="w-3 h-3" /> },
];

const HAZARD_DOTS: Record<string, string> = {
  'Land Subsidence': 'bg-red-500',
  'Flash Flood': 'bg-sky-500',
  'Landslide': 'bg-orange-500',
  'Cloudburst': 'bg-purple-500',
};

export const MapLayerPanel: React.FC<MapLayerPanelProps> = ({
  basemap,
  onBasemapChange,
  showRedZones,
  onRedZonesChange,
  hazardTypes,
  visibleHazardTypes,
  onHazardTypeChange,
  showHabitations,
  onHabitationsChange,
  showSites,
  onSitesChange,
  showInfra,
  onInfraChange,
  showRoute,
  onRouteChange,
  showFlood,
  onFloodChange,
  floodDataStatus = 'DEMO',
  hasFloodData,
  priorityFilter,
  onPriorityFilterChange,
  onResetCenter,
  dataStatus,
}) => {
  const floodDot =
    floodDataStatus === 'LIVE'
      ? 'bg-emerald-400'
      : floodDataStatus === 'FORECAST'
        ? 'bg-sky-400'
        : floodDataStatus === 'DEMO'
          ? 'bg-amber-400'
          : 'bg-slate-400';

  return (
    <div
      id="gis-layer-control-panel"
      className="absolute top-4 left-4 z-10 bg-slate-900/90 backdrop-blur-md text-white p-3.5 rounded-xl border border-slate-700 shadow-xl max-w-xs text-xs space-y-3"
    >
      <div className="flex items-center justify-between border-b border-slate-700 pb-2">
        <div className="flex items-center gap-1.5 font-bold text-slate-200">
          <Layers className="w-4 h-4 text-red-400" />
          <span>GIS Map Layers</span>
        </div>
        <button
          onClick={onResetCenter}
          title="Reset Map to Chamoli Center"
          className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Basemap switcher */}
      <div className="space-y-1.5">
        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Basemap</div>
        <div className="grid grid-cols-2 gap-1">
          {BASEMAPS.map((b) => (
            <button
              key={b.id}
              id={`map-basemap-${b.id}`}
              onClick={() => onBasemapChange(b.id)}
              className={`flex items-center justify-center gap-1 px-1.5 py-1.5 rounded-md text-[10px] font-semibold border transition cursor-pointer ${
                basemap === b.id
                  ? 'bg-red-600/90 border-red-400 text-white'
                  : 'bg-slate-800/80 border-slate-600 text-slate-300 hover:bg-slate-700'
              }`}
            >
              {b.icon}
              {b.label}
            </button>
          ))}
        </div>
      </div>

      {/* Hazard sub-toggles */}
      <div className="space-y-1.5">
        <label className="flex items-center justify-between cursor-pointer group">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded bg-red-500/80 border border-red-400 inline-block" />
            <span className="group-hover:text-slate-100">Hazard Zones</span>
          </div>
          <input
            type="checkbox"
            checked={showRedZones}
            onChange={(e) => onRedZonesChange(e.target.checked)}
            className="rounded accent-red-600 cursor-pointer"
          />
        </label>

        {showRedZones && (
          <div className="pl-5 space-y-1 border-l border-slate-700 ml-0.5">
            {hazardTypes.map((hazardType) => {
              const visible = visibleHazardTypes.includes(hazardType);
              const dot = HAZARD_DOTS[hazardType] ?? 'bg-red-500';
              return (
                <label key={hazardType} className="flex items-center justify-between cursor-pointer group text-[11px]">
                  <div className="flex items-center gap-1.5">
                    <span className={`w-2.5 h-2.5 rounded ${dot} inline-block`} />
                    <span className="group-hover:text-slate-100">{hazardType}</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={visible}
                    onChange={(e) => onHazardTypeChange(hazardType, e.target.checked)}
                    className="rounded accent-red-600 cursor-pointer"
                  />
                </label>
              );
            })}
          </div>
        )}
      </div>

      {/* Flood forecast toggle */}
      <label className="flex items-center justify-between cursor-pointer group">
        <div className="flex items-center gap-2">
          <Waves className="w-3.5 h-3.5 text-sky-400" />
          <span className="group-hover:text-slate-100">Flood Forecast</span>
          <span className={`w-2 h-2 rounded-full ${floodDot} inline-block`} title={floodDataStatus} />
        </div>
        <input
          id="map-flood-layer-toggle"
          type="checkbox"
          checked={showFlood}
          disabled={!hasFloodData}
          onChange={(e) => onFloodChange(e.target.checked)}
          className="rounded accent-sky-600 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
        />
      </label>

      {/* Operations toggles */}
      <div className="space-y-2">
        <label className="flex items-center justify-between cursor-pointer group">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-red-600 inline-block text-center text-[8px] text-white font-bold">●</span>
            <span className="group-hover:text-slate-100">Habitations (Priority)</span>
          </div>
          <input
            type="checkbox"
            checked={showHabitations}
            onChange={(e) => onHabitationsChange(e.target.checked)}
            className="rounded accent-red-600 cursor-pointer"
          />
        </label>

        <label className="flex items-center justify-between cursor-pointer group">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded bg-emerald-600 inline-block text-center text-[8px] text-white">🛡️</span>
            <span className="group-hover:text-slate-100">Safe Relocation Enclaves</span>
          </div>
          <input
            type="checkbox"
            checked={showSites}
            onChange={(e) => onSitesChange(e.target.checked)}
            className="rounded accent-emerald-600 cursor-pointer"
          />
        </label>

        <label className="flex items-center justify-between cursor-pointer group">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-slate-200 inline-block text-center text-[8px]">🏥</span>
            <span className="group-hover:text-slate-100">Infrastructure & Shelters</span>
          </div>
          <input
            type="checkbox"
            checked={showInfra}
            onChange={(e) => onInfraChange(e.target.checked)}
            className="rounded accent-blue-600 cursor-pointer"
          />
        </label>

        <label className="flex items-center justify-between cursor-pointer group">
          <div className="flex items-center gap-2">
            <span className="inline-block h-0.5 w-4 rounded bg-emerald-400 align-middle" />
            <span className="group-hover:text-slate-100">Evacuation Route & Closures</span>
          </div>
          <input
            type="checkbox"
            checked={showRoute}
            onChange={(e) => onRouteChange(e.target.checked)}
            className="rounded accent-emerald-600 cursor-pointer"
          />
        </label>
      </div>

      {/* Priority Filter */}
      <div className="pt-2 border-t border-slate-700 space-y-1">
        <div className="flex items-center justify-between text-[11px] text-slate-400">
          <span className="flex items-center gap-1">
            <Filter className="w-3 h-3 text-amber-400" /> Filter Villages
          </span>
        </div>
        <select
          id="map-priority-filter-select"
          value={priorityFilter}
          onChange={(e) => onPriorityFilterChange(e.target.value)}
          className="w-full bg-slate-800 border border-slate-700 text-slate-200 rounded p-1 text-xs focus:ring-1 focus:ring-red-500 outline-none"
        >
          <option value="all">All Villages</option>
          <option value="immediate relocation">Immediate Relocation (75+)</option>
          <option value="short-term relocation">Short-Term Relocation (50-74)</option>
          <option value="medium-term relocation">Medium-Term Relocation (30-49)</option>
        </select>
      </div>

      {/* Data source summary */}
      {dataStatus && dataStatus.length > 0 && (
        <div className="pt-2 border-t border-slate-700 space-y-1 text-[10px]">
          <div className="font-bold text-slate-400 uppercase tracking-wider">Data source</div>
          <div className="space-y-0.5">
            {dataStatus.slice(0, 5).map((entry) => (
              <div key={entry.layer} className="flex items-center justify-between text-slate-400">
                <span className="capitalize">{entry.layer.replace(/_/g, ' ')}</span>
                <span className="font-bold text-slate-200">{entry.status}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};