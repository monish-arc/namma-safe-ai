import React from 'react';
import {
  X,
  CheckCircle2,
  Droplets,
  GraduationCap,
  HeartPulse,
  Route,
  Trees,
  ArrowRight,
  AlertCircle,
} from 'lucide-react';
import { RelocationSite } from '../types';

interface SiteModalProps {
  site: RelocationSite | null;
  onClose: () => void;
  onSimulate?: (siteId: string) => void;
}

export const SiteModal: React.FC<SiteModalProps> = ({
  site,
  onClose,
  onSimulate,
}) => {
  if (!site) return null;

  // Identify bottleneck resource
  const capacities = [
    { name: 'Water Network', cap: site.water_capacity_families, icon: Droplets, color: 'text-blue-600' },
    { name: 'School Enrolment', cap: site.school_capacity_families, icon: GraduationCap, color: 'text-indigo-600' },
    { name: 'Health Center', cap: site.health_capacity_families, icon: HeartPulse, color: 'text-rose-600' },
    { name: 'Road Throughput', cap: site.road_capacity_families, icon: Route, color: 'text-amber-600' },
    { name: 'Land & Housing', cap: site.land_capacity_families, icon: Trees, color: 'text-emerald-600' },
  ];

  const bottleneck = capacities.reduce((prev, curr) => (curr.cap < prev.cap ? curr : prev));

  return (
    <div
      id="site-details-modal-backdrop"
      className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        id="site-details-modal"
        className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-2xl w-full overflow-hidden text-slate-800 animate-in fade-in zoom-in-95 duration-150 my-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-emerald-950 text-white p-5 flex items-start justify-between border-b border-emerald-800">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-mono text-xs text-emerald-300 bg-emerald-900/80 px-2 py-0.5 rounded border border-emerald-700">
                SAFE RELOCATION SITE
              </span>
              <span className="bg-emerald-500/20 text-emerald-300 text-xs px-2 py-0.5 rounded-full border border-emerald-500/30 font-medium">
                {site.available_capacity_families} Slots Available
              </span>
            </div>
            <h2 className="text-xl font-bold tracking-tight">{site.site_name}</h2>
            <p className="text-xs text-emerald-300/80">
              Chamoli District | Geo: {site.latitude.toFixed(4)}°N, {site.longitude.toFixed(4)}°E | Area: {site.land_area_acres} Acres
            </p>
          </div>
          <button
            id="close-site-modal-btn"
            onClick={onClose}
            className="p-1.5 rounded-lg text-emerald-300/70 hover:text-white hover:bg-emerald-900 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {/* Suitability Score Summary */}
          <div className="bg-emerald-50/70 border border-emerald-200 rounded-lg p-4 flex flex-wrap items-center justify-between gap-4">
            <div>
              <span className="text-xs font-semibold text-emerald-900 uppercase tracking-wider block">
                Terrain Suitability Score
              </span>
              <div className="flex items-baseline gap-2 mt-0.5">
                <span className="text-3xl font-extrabold text-emerald-900">
                  {site.suitability_score}
                </span>
                <span className="text-xs text-emerald-700 font-medium">/ 100 benchmark</span>
              </div>
            </div>
            <div className="flex gap-3 text-center">
              <div className="bg-white px-3 py-1.5 rounded border border-emerald-200">
                <span className="text-[10px] text-slate-500 block">Low Hazard (30%)</span>
                <span className="text-sm font-bold text-emerald-700">{site.low_hazard_score}</span>
              </div>
              <div className="bg-white px-3 py-1.5 rounded border border-emerald-200">
                <span className="text-[10px] text-slate-500 block">Gentle Slope (20%)</span>
                <span className="text-sm font-bold text-emerald-700">{site.flat_land_score}</span>
              </div>
              <div className="bg-white px-3 py-1.5 rounded border border-emerald-200">
                <span className="text-[10px] text-slate-500 block">Road Access (15%)</span>
                <span className="text-sm font-bold text-emerald-700">{site.road_score}</span>
              </div>
            </div>
          </div>

          {/* Carrying Capacity Pillars */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Multi-Resource Carrying Capacity (Families)
              </h3>
              <span className="text-[11px] text-slate-500 font-mono">
                Formula: Min(All Resources)
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {capacities.map((item) => {
                const Icon = item.icon;
                const isBottle = item.name === bottleneck.name;
                return (
                  <div
                    key={item.name}
                    className={`p-3 rounded-lg border flex items-center justify-between text-xs ${
                      isBottle
                        ? 'bg-amber-50/80 border-amber-300 ring-1 ring-amber-400/50'
                        : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Icon className={`w-4 h-4 ${item.color}`} />
                      <div>
                        <span className="font-semibold text-slate-800 block">{item.name}</span>
                        {isBottle && (
                          <span className="text-[10px] text-amber-700 font-medium">
                            Critical Limiting Factor
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-bold text-slate-900">{item.cap}</span>
                      <span className="text-[10px] text-slate-500 block">families cap</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Bottleneck Alert */}
          <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2.5 text-xs text-amber-900">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold block mb-0.5">
                Pillar Bottleneck Detected: {bottleneck.name} ({bottleneck.cap} families)
              </span>
              <p className="text-[11px] text-amber-800">
                While land allows {site.land_capacity_families} families, overall human settlement cannot safely exceed {site.final_capacity_families} families without scaling {bottleneck.name.toLowerCase()} infrastructure.
              </p>
            </div>
          </div>

          {/* Occupancy and Availability */}
          <div className="border border-slate-200 rounded-lg p-4 bg-slate-50 space-y-3">
            <div className="flex justify-between text-xs text-slate-700">
              <span>Current Inhabited Occupancy:</span>
              <span className="font-bold">{site.current_occupancy_families} families</span>
            </div>
            <div className="flex justify-between text-xs text-slate-700">
              <span>Final Carrying Capacity:</span>
              <span className="font-bold">{site.final_capacity_families} families</span>
            </div>
            <div className="h-2.5 bg-slate-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full"
                style={{
                  width: `${(site.current_occupancy_families / site.final_capacity_families) * 100}%`,
                }}
              />
            </div>
            <div className="flex justify-between text-[11px] text-slate-500 pt-1">
              <span>{site.current_occupancy_families} Occupied</span>
              <span className="font-semibold text-emerald-700">
                {site.available_capacity_families} Available Slots
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:text-slate-800 bg-white hover:bg-slate-100 border border-slate-300 transition cursor-pointer"
          >
            Close
          </button>
          {onSimulate && (
            <button
              id={`simulate-modal-site-btn-${site.id}`}
              onClick={() => {
                onSimulate(site.id);
                onClose();
              }}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm transition cursor-pointer"
            >
              <span>Test in SafeShift Simulator</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
