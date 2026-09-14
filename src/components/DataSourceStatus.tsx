import React, { useState } from 'react';
import { Database, ChevronUp, ChevronDown } from 'lucide-react';
import { DataStatusEntry, DataLayerStatus } from '../types';

const STATUS_DOT: Record<string, { cls: string; label: string }> = {
  LIVE: { cls: 'bg-emerald-400', label: 'Live' },
  FORECAST: { cls: 'bg-sky-400', label: 'Forecast' },
  DEMO: { cls: 'bg-amber-400', label: 'Demo' },
  'NOT CONFIGURED': { cls: 'bg-slate-400', label: 'Not configured' },
  UNAVAILABLE: { cls: 'bg-red-400', label: 'Unavailable' },
};

const LAYER_LABELS: Record<string, string> = {
  road_network: 'Road Network',
  hazard_zones: 'Hazard Zones',
  habitation_risk: 'Habitation Risk',
  relocation_sites: 'Relocation Sites',
  flood_forecast: 'Flood Forecast',
  satellite_tiles: 'Satellite Tiles',
  road_conditions: 'Road Conditions',
  evacuation_routes: 'Evacuation Routes',
  google_map_tiles: 'Google Map Tiles',
};

const DEFAULT_LAYERS: DataStatusEntry[] = [
  { layer: 'google_map_tiles', status: 'NOT CONFIGURED', source: 'Google Maps API key not configured', updated_at: '—' },
  { layer: 'flood_forecast', status: 'NOT CONFIGURED', source: 'API key not configured', updated_at: '—' },
  { layer: 'satellite_tiles', status: 'LIVE', source: 'Esri World Imagery (free, no key)', updated_at: '—' },
  { layer: 'hazard_zones', status: 'DEMO', source: 'Synthetic red-zone polygons', updated_at: '—' },
  { layer: 'road_network', status: 'DEMO', source: 'Curated pilot graph', updated_at: '—' },
  { layer: 'evacuation_routes', status: 'DEMO', source: 'A* on curated graph', updated_at: '—' },
];

export const DataSourceStatus: React.FC<{ layers?: DataStatusEntry[] | null }> = ({ layers }) => {
  const [expanded, setExpanded] = useState(false);
  const entries = layers && layers.length > 0 ? layers : DEFAULT_LAYERS;

  const summary: Record<string, number> = {};
  for (const e of entries) {
    if (e.status === 'LIVE') continue;
    summary[e.status] = (summary[e.status] ?? 0) + 1;
  }

  const summaryCounts: Array<[string, number]> = Object.entries(summary).sort((a, b) => b[1] - a[1]);
  const summaryLabel = summaryCounts
    .map(([status, count]) => `${status.toLowerCase()}×${count}`)
    .join(' · ');

  return (
    <div
      id="gis-data-status-panel"
      className="absolute bottom-4 left-4 z-10 bg-slate-900/90 backdrop-blur-md text-white p-3 rounded-xl border border-slate-700 shadow-xl text-[11px] w-64"
    >
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between cursor-pointer"
      >
        <span className="flex items-center gap-1.5 font-bold text-slate-200">
          <Database className="w-3.5 h-3.5 text-cyan-400" /> Data Source Status
        </span>
        {expanded ? <ChevronUp className="w-3.5 h-3.5 text-slate-400" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-400" />}
      </button>

      <p className="text-[10px] text-amber-300/90 mt-1">{summaryLabel || 'All layers live'}</p>

      {expanded && (
        <div className="mt-2 space-y-1.5 border-t border-slate-700 pt-2">
          {entries.map((entry) => {
            const dot = STATUS_DOT[entry.status] ?? STATUS_DOT['NOT CONFIGURED'];
            return (
              <div key={entry.layer} className="space-y-0.5">
                <div className="flex items-center justify-between">
                  <span className="text-slate-300">{LAYER_LABELS[entry.layer] ?? entry.layer.replace(/_/g, ' ')}</span>
                  <span
                    className={`inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full ${dot.cls} bg-opacity-20 text-slate-200`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${dot.cls} inline-block`} />
                    {dot.label}
                  </span>
                </div>
                <p className="text-[9px] text-slate-500 leading-tight">{entry.source}</p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};