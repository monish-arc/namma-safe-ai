import React, { useState } from 'react';
import {
  Search,
  Layers,
  MapPin,
  Shield,
  Crosshair,
  Info,
  Maximize2,
} from 'lucide-react';
import { Habitation, RelocationSite, RedZone, MapLayerItem } from '../types';
import { LeafletMap } from '../components/LeafletMap';
import { RiskBadge } from '../components/RiskBadge';

interface GisMapPageProps {
  habitations: Habitation[];
  relocationSites: RelocationSite[];
  redZones: RedZone[];
  infrastructure: MapLayerItem[];
  onSelectHabitation: (hab: Habitation) => void;
  onSelectSite: (site: RelocationSite) => void;
}

export const GisMapPage: React.FC<GisMapPageProps> = ({
  habitations,
  relocationSites,
  redZones,
  infrastructure,
  onSelectHabitation,
  onSelectSite,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedHabId, setSelectedHabId] = useState<string | undefined>(undefined);
  const [selectedSiteId, setSelectedSiteId] = useState<string | undefined>(undefined);

  const filteredHabitations = habitations.filter(
    (h) =>
      h.village_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      h.village_code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div id="gis-map-view" className="space-y-4 animate-in fade-in duration-200">
      {/* Top Controls Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-1 min-w-[280px]">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              id="gis-village-search-input"
              type="text"
              placeholder="Search village (e.g. Joshimath, Raini, Helang)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
            />
          </div>

          <div className="hidden sm:flex items-center gap-2">
            <span className="text-xs text-slate-400 font-semibold uppercase text-[10px]">Hotspots:</span>
            <button
              onClick={() => {
                const j = habitations.find((h) => h.id === 'hab-joshimath');
                if (j) {
                  setSelectedHabId(j.id);
                  onSelectHabitation(j);
                }
              }}
              className="px-2.5 py-1 rounded-md bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-[11px] font-bold transition cursor-pointer"
            >
              Joshimath (86.8)
            </button>
            <button
              onClick={() => {
                const r = habitations.find((h) => h.id === 'hab-raini');
                if (r) {
                  setSelectedHabId(r.id);
                  onSelectHabitation(r);
                }
              }}
              className="px-2.5 py-1 rounded-md bg-orange-50 hover:bg-orange-100 text-orange-700 border border-orange-200 text-[11px] font-bold transition cursor-pointer"
            >
              Raini Gorge (87.2)
            </button>
            <button
              onClick={() => {
                const g = relocationSites.find((s) => s.id === 'site-gauchar-01');
                if (g) {
                  setSelectedSiteId(g.id);
                  onSelectSite(g);
                }
              }}
              className="px-2.5 py-1 rounded-md bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-[11px] font-bold transition cursor-pointer"
            >
              Gauchar Safe Site
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span className="inline-flex items-center gap-1.5 bg-slate-100 px-2.5 py-1 rounded-lg font-medium text-[11px]">
            <span className="w-2 h-2 rounded-full bg-red-500" /> 10 Habitations
          </span>
          <span className="inline-flex items-center gap-1.5 bg-slate-100 px-2.5 py-1 rounded-lg font-medium text-[11px]">
            <span className="w-2 h-2 rounded bg-emerald-600" /> 4 Safe Enclaves
          </span>
          <span className="inline-flex items-center gap-1.5 bg-slate-100 px-2.5 py-1 rounded-lg font-medium text-[11px]">
            <span className="w-2 h-2 rounded bg-red-400" /> 5 Red Zones
          </span>
        </div>
      </div>

      {/* Main Map Container */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Left Side: Habitations Quick List */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex flex-col h-[650px] overflow-hidden">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200">
            <div>
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Chamoli Habitations ({filteredHabitations.length})
              </h3>
              <p className="text-[10px] text-slate-400">Click marker or card to inspect</p>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 mt-3 pr-1">
            {filteredHabitations.map((hab) => (
              <div
                key={hab.id}
                id={`map-hab-item-${hab.id}`}
                onClick={() => {
                  setSelectedHabId(hab.id);
                  onSelectHabitation(hab);
                }}
                className={`p-3 rounded-lg border text-xs cursor-pointer transition ${
                  selectedHabId === hab.id
                    ? 'border-l-4 border-l-blue-600 bg-blue-50/70 border-slate-300 ring-1 ring-blue-500/20'
                    : 'border-l-4 border-l-transparent bg-slate-50 hover:bg-slate-100/80 border-slate-200'
                }`}
              >
                <div className="flex items-start justify-between gap-1 mb-1">
                  <span className="font-bold text-slate-900 line-clamp-1">
                    {hab.village_name}
                  </span>
                  <span className="text-[10px] font-extrabold text-slate-900 bg-white px-1.5 py-0.5 rounded border border-slate-200">
                    {hab.priority_score}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-500">
                  <span>Pop: {hab.population.toLocaleString()}</span>
                  <RiskBadge level={hab.priority_level} size="sm" showDot={false} />
                </div>
              </div>
            ))}
          </div>

          {/* Safe Sites Section */}
          <div className="pt-3 border-t border-slate-200">
            <h4 className="text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-emerald-600" /> Designated Safe Sites (4)
            </h4>
            <div className="space-y-1.5">
              {relocationSites.map((site) => (
                <div
                  key={site.id}
                  id={`map-site-item-${site.id}`}
                  onClick={() => {
                    setSelectedSiteId(site.id);
                    onSelectSite(site);
                  }}
                  className={`p-2 rounded border text-xs cursor-pointer flex items-center justify-between transition ${
                    selectedSiteId === site.id
                      ? 'bg-emerald-50 border-emerald-400 ring-1 ring-emerald-400'
                      : 'bg-slate-50 hover:bg-slate-100 border-slate-200'
                  }`}
                >
                  <span className="font-medium text-slate-800 truncate max-w-[150px]">
                    {site.site_name}
                  </span>
                  <span className="text-[10px] text-emerald-700 font-bold">
                    {site.available_capacity_families} slots
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Side: Leaflet Interactive Map */}
        <div className="lg:col-span-3 h-[650px]">
          <LeafletMap
            habitations={habitations}
            relocationSites={relocationSites}
            redZones={redZones}
            infrastructure={infrastructure}
            selectedHabitationId={selectedHabId}
            selectedSiteId={selectedSiteId}
            onSelectHabitation={(hab) => {
              setSelectedHabId(hab.id);
              onSelectHabitation(hab);
            }}
            onSelectSite={(site) => {
              setSelectedSiteId(site.id);
              onSelectSite(site);
            }}
          />
        </div>
      </div>
    </div>
  );
};
