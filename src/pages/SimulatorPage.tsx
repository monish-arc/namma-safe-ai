import React, { useState, useEffect } from 'react';
import {
  Compass,
  ArrowRight,
  ShieldCheck,
  AlertTriangle,
  Droplets,
  GraduationCap,
  HeartPulse,
  Route,
  Trees,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Download,
  Share2,
} from 'lucide-react';
import { Habitation, RelocationSite, SimulationResult } from '../types';

interface SimulatorPageProps {
  habitations: Habitation[];
  relocationSites: RelocationSite[];
  initialHabitationId?: string;
  initialSiteId?: string;
  onSimulate: (habId: string, siteId: string, families: number) => Promise<SimulationResult>;
  onPlanEvacuation?: (hab: Habitation) => void;
}

export const SimulatorPage: React.FC<SimulatorPageProps> = ({
  habitations,
  relocationSites,
  initialHabitationId,
  initialSiteId,
  onSimulate,
  onPlanEvacuation,
}) => {
  const [selectedHabId, setSelectedHabId] = useState<string>(
    initialHabitationId || habitations[0]?.id || 'hab-joshimath'
  );
  const [selectedSiteId, setSelectedSiteId] = useState<string>(
    initialSiteId || relocationSites[0]?.id || 'site-gauchar-01'
  );
  const [familiesCount, setFamiliesCount] = useState<number>(100);
  const [simulationResult, setSimulationResult] = useState<SimulationResult | null>(null);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

  const currentHab = habitations.find((h) => h.id === selectedHabId) || habitations[0];
  const currentSite = relocationSites.find((s) => s.id === selectedSiteId) || relocationSites[0];

  // Run simulation whenever parameters change or on mount
  useEffect(() => {
    runSimulation();
  }, [selectedHabId, selectedSiteId, familiesCount]);

  const runSimulation = async () => {
    if (!selectedHabId || !selectedSiteId || familiesCount <= 0) return;
    setIsRunning(true);
    try {
      const res = await onSimulate(selectedHabId, selectedSiteId, familiesCount);
      setSimulationResult(res);
    } catch (err) {
      console.error(err);
    } finally {
      setIsRunning(false);
    }
  };

  const handleSavePlan = () => {
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  return (
    <div id="safeshift-simulator-view" className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
              DECISION SIMULATION ENGINE
            </span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Compass className="w-5 h-5 text-blue-600" />
            <span>SafeShift Relocation & Capacity Simulator</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Model physical population transfers against multi-resource carrying capacity constraints (Water, Education, Health, Roads, Land)
          </p>
        </div>

        <div className="flex items-center gap-2">
          {onPlanEvacuation && currentHab && (
            <button
              id="simulator-plan-evacuation-btn"
              onClick={() => onPlanEvacuation(currentHab)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm transition cursor-pointer"
            >
              <Route className="w-3.5 h-3.5" />
              <span>Plan Evacuation from {currentHab.village_name}</span>
            </button>
          )}
          {saveSuccess && (
            <span className="text-xs text-emerald-700 font-semibold flex items-center gap-1 bg-emerald-50 px-2.5 py-1 rounded border border-emerald-200 animate-in fade-in">
              <CheckCircle2 className="w-3.5 h-3.5" /> Plan Saved to Drafts
            </span>
          )}
          <button
            onClick={handleSavePlan}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold border border-slate-300 shadow-sm transition cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Relocation Plan</span>
          </button>
        </div>
      </div>

      {/* Simulator Inputs & Result Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Interactive Input Controls */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-5">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100 pb-2.5">
            1. Select Relocation Parameters
          </h3>

          {/* 1. Source Habitation */}
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1.5">
              Source Vulnerable Habitation
            </label>
            <select
              id="simulator-source-hab-select"
              value={selectedHabId}
              onChange={(e) => setSelectedHabId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition"
            >
              {habitations.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.village_name} (Priority {h.priority_score} - {h.priority_level})
                </option>
              ))}
            </select>
            {currentHab && (
              <div className="mt-1.5 flex justify-between text-[11px] text-slate-500">
                <span>Total: {currentHab.households} households</span>
                <span className="text-red-600 font-medium">Hazard Score: {currentHab.hazard_score}/100</span>
              </div>
            )}
          </div>

          {/* 2. Destination Safe Site */}
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1.5">
              Destination Safe Relocation Site
            </label>
            <select
              id="simulator-dest-site-select"
              value={selectedSiteId}
              onChange={(e) => setSelectedSiteId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition"
            >
              {relocationSites.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.site_name} (Suitability {s.suitability_score} | Avail: {s.available_capacity_families})
                </option>
              ))}
            </select>
            {currentSite && (
              <div className="mt-1.5 flex justify-between text-[11px] text-slate-500">
                <span>Remaining: {currentSite.available_capacity_families} families</span>
                <span className="text-emerald-700 font-medium">Limiting Pillar: {currentSite.final_capacity_families} cap</span>
              </div>
            )}
          </div>

          {/* 3. Number of Families */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-700">
                Households to Relocate
              </label>
              <span className="font-extrabold text-sm text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-300">
                {familiesCount} families
              </span>
            </div>

            <input
              id="simulator-families-slider"
              type="range"
              min="10"
              max={Math.max(600, currentHab ? currentHab.households : 600)}
              step="10"
              value={familiesCount}
              onChange={(e) => setFamiliesCount(Number(e.target.value))}
              className="w-full accent-blue-600 mb-2 cursor-pointer"
            />

            {/* Quick Presets */}
            <div className="flex flex-wrap gap-1.5 text-[10px]">
              <button
                type="button"
                onClick={() => setFamiliesCount(50)}
                className="px-2.5 py-1 bg-slate-50 hover:bg-blue-50 hover:text-blue-700 rounded border border-slate-200 text-slate-700 font-medium transition cursor-pointer"
              >
                50 (Phase 1)
              </button>
              <button
                type="button"
                onClick={() => setFamiliesCount(100)}
                className="px-2.5 py-1 bg-slate-50 hover:bg-blue-50 hover:text-blue-700 rounded border border-slate-200 text-slate-700 font-medium transition cursor-pointer"
              >
                100 (Immediate)
              </button>
              <button
                type="button"
                onClick={() => setFamiliesCount(250)}
                className="px-2.5 py-1 bg-slate-50 hover:bg-blue-50 hover:text-blue-700 rounded border border-slate-200 text-slate-700 font-medium transition cursor-pointer"
              >
                250 (Bulk Shift)
              </button>
              <button
                type="button"
                onClick={() => currentHab && setFamiliesCount(Math.min(currentHab.households, 500))}
                className="px-2.5 py-1 bg-slate-50 hover:bg-blue-50 hover:text-blue-700 rounded border border-slate-200 text-slate-700 font-medium transition cursor-pointer"
              >
                Max Village
              </button>
            </div>
          </div>

          {/* Site Carrying Capacity Visual Bar */}
          {currentSite && (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-2">
              <div className="flex justify-between text-slate-700 font-semibold">
                <span>Site Threshold Usage:</span>
                <span>
                  {familiesCount} / {currentSite.available_capacity_families} avail
                </span>
              </div>
              <div className="h-2.5 bg-slate-200 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    familiesCount <= currentSite.available_capacity_families
                      ? 'bg-emerald-500'
                      : 'bg-red-500'
                  }`}
                  style={{
                    width: `${Math.min(
                      100,
                      (familiesCount / currentSite.available_capacity_families) * 100
                    )}%`,
                  }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-slate-500">
                <span>Safe Buffer</span>
                <span
                  className={
                    familiesCount > currentSite.available_capacity_families
                      ? 'text-red-600 font-bold'
                      : 'text-emerald-700 font-medium'
                  }
                >
                  {familiesCount > currentSite.available_capacity_families
                    ? `Deficit of ${familiesCount - currentSite.available_capacity_families}`
                    : `${currentSite.available_capacity_families - familiesCount} remaining slots`}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Simulation Result & Capacity Analysis */}
        <div className="lg:col-span-2 space-y-5">
          {simulationResult ? (
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-5">
              {/* Capacity Status Banner */}
              <div
                className={`p-4 rounded-xl border flex items-start gap-3 text-xs ${
                  simulationResult.is_capacity_sufficient
                    ? 'bg-emerald-50/80 border-emerald-200 text-emerald-950'
                    : 'bg-red-50/80 border-red-200 text-red-950'
                }`}
              >
                {simulationResult.is_capacity_sufficient ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                )}
                <div>
                  <h4 className="font-bold text-sm">
                    {simulationResult.is_capacity_sufficient
                      ? 'Relocation Feasible: Carrying Capacity Verified'
                      : 'Capacity Warning: Infrastructure Threshold Exceeded'}
                  </h4>
                  <p className="text-[11px] mt-0.5 leading-relaxed">
                    {simulationResult.is_capacity_sufficient
                      ? `The destination safe enclave can accommodate ${simulationResult.families_requested} families while preserving a buffer of ${simulationResult.remaining_capacity_after_relocation} families.`
                      : `The destination enclave cannot safely support ${simulationResult.families_requested} families. Deficit: ${Math.abs(
                          simulationResult.remaining_capacity_after_relocation
                        )} families.`}
                  </p>
                </div>
              </div>

              {/* Two Big Score Indicators */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Metric 1: Risk Reduction */}
                <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border border-emerald-500/30">
                  <span className="text-xs font-semibold text-emerald-800 uppercase tracking-wider block">
                    Compound Hazard Reduction
                  </span>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-4xl font-black text-emerald-700">
                      -{simulationResult.risk_reduction_percent}%
                    </span>
                    <span className="text-xs text-emerald-600 font-medium">risk exposure drop</span>
                  </div>
                  <p className="text-[11px] text-slate-600 mt-2">
                    Shift from {currentHab.village_name} (Hazard {currentHab.hazard_score}) to {currentSite.site_name} (Suitability {currentSite.suitability_score})
                  </p>
                </div>

                {/* Metric 2: Remaining Slots */}
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-xs font-semibold text-slate-600 uppercase tracking-wider block">
                    Remaining Site Slots
                  </span>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span
                      className={`text-4xl font-black ${
                        simulationResult.remaining_capacity_after_relocation >= 0
                          ? 'text-slate-900'
                          : 'text-red-600'
                      }`}
                    >
                      {simulationResult.remaining_capacity_after_relocation}
                    </span>
                    <span className="text-xs text-slate-500 font-medium">families available</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-2">
                    Baseline site limit: {currentSite.final_capacity_families} families
                  </p>
                </div>
              </div>

              {/* 4 Infrastructure Status Badges */}
              <div>
                <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-2.5">
                  Infrastructure Pillar Viability Checks
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  {/* Water */}
                  <div className="p-3 rounded-lg border border-slate-200 bg-slate-50/70 flex items-start gap-2.5">
                    <Droplets className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
                    <div>
                      <span className="font-bold text-slate-800 block">Water Network Supply</span>
                      <span
                        className={`text-[11px] font-medium ${
                          simulationResult.water_capacity_status.includes('Deficit')
                            ? 'text-red-600'
                            : 'text-emerald-700'
                        }`}
                      >
                        {simulationResult.water_capacity_status}
                      </span>
                    </div>
                  </div>

                  {/* School */}
                  <div className="p-3 rounded-lg border border-slate-200 bg-slate-50/70 flex items-start gap-2.5">
                    <GraduationCap className="w-4 h-4 text-indigo-500 mt-0.5 shrink-0" />
                    <div>
                      <span className="font-bold text-slate-800 block">School Enrolment Seats</span>
                      <span
                        className={`text-[11px] font-medium ${
                          simulationResult.school_capacity_status.includes('Overburdened')
                            ? 'text-red-600'
                            : 'text-emerald-700'
                        }`}
                      >
                        {simulationResult.school_capacity_status}
                      </span>
                    </div>
                  </div>

                  {/* Hospital */}
                  <div className="p-3 rounded-lg border border-slate-200 bg-slate-50/70 flex items-start gap-2.5">
                    <HeartPulse className="w-4 h-4 text-rose-500 mt-0.5 shrink-0" />
                    <div>
                      <span className="font-bold text-slate-800 block">Emergency Health Access</span>
                      <span className="text-[11px] font-medium text-emerald-700">
                        {simulationResult.hospital_access_status}
                      </span>
                    </div>
                  </div>

                  {/* Road */}
                  <div className="p-3 rounded-lg border border-slate-200 bg-slate-50/70 flex items-start gap-2.5">
                    <Route className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                    <div>
                      <span className="font-bold text-slate-800 block">Road Egress Throughput</span>
                      <span className="text-[11px] font-medium text-emerald-700">
                        {simulationResult.road_access_status}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Rationale Narrative */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
                <span className="font-bold text-slate-700 block">Decision Support Rationale:</span>
                <p className="text-slate-600 leading-relaxed">
                  {simulationResult.decision_rationale}
                </p>
              </div>

              {/* Alternative Site Recommendation if deficit */}
              {simulationResult.alternative_site_recommendation && (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-950 space-y-1.5">
                  <div className="flex items-center gap-1.5 font-bold text-blue-900">
                    <ShieldCheck className="w-4 h-4 text-blue-600" />
                    <span>Algorithmic Alternative Recommendation:</span>
                  </div>
                  <p className="text-blue-800">
                    Target site capacity is constrained. Recommended alternative with surplus capacity:
                  </p>
                  <div className="p-2 bg-white rounded border border-blue-200 font-semibold text-blue-900">
                    {simulationResult.alternative_site_recommendation}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white p-12 rounded-xl border border-slate-200 shadow-sm flex items-center justify-center text-slate-400 text-xs">
              Calculating Simulation Parameters...
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
