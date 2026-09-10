import React from 'react';
import {
  Users,
  ShieldAlert,
  Home,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  MapPin,
  ExternalLink,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { DashboardSummary, Habitation } from '../types';
import { RiskBadge } from '../components/RiskBadge';

interface DashboardPageProps {
  summary: DashboardSummary | null;
  onSelectHabitation: (hab: Habitation) => void;
  onNavigateTab: (tab: any) => void;
}

const PRIORITY_COLORS: Record<string, string> = {
  'Immediate Relocation': '#dc2626',
  'Short-Term Relocation': '#f59e0b',
  'Medium-Term Relocation': '#eab308',
  'Monitor Only': '#10b981',
};

export const DashboardPage: React.FC<DashboardPageProps> = ({
  summary,
  onSelectHabitation,
  onNavigateTab,
}) => {
  if (!summary) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-500 text-sm">
        Loading Chamoli District Dashboard Metrics...
      </div>
    );
  }

  // Hazard chart data
  const hazardChartData = summary.hazard_distribution.map((h) => ({
    name: h.hazard_type,
    count: h.count,
    population: h.affected_population,
  }));

  // Priority chart data
  const priorityChartData = summary.relocation_priority_distribution
    .filter((p) => p.count > 0)
    .map((p) => ({
      name: p.level,
      value: p.count,
      color: PRIORITY_COLORS[p.level] || '#64748b',
    }));

  return (
    <div id="executive-dashboard-view" className="space-y-6 animate-in fade-in duration-200">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 rounded-xl p-6 text-white border border-slate-700 shadow-md flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="bg-red-500/20 text-red-300 border border-red-500/30 text-xs px-2.5 py-0.5 rounded-full font-mono font-medium">
              OPERATIONAL GIS PILOT
            </span>
            <span className="text-xs text-slate-400">
              Chamoli District, Uttarakhand
            </span>
          </div>
          <h2 className="text-2xl font-extrabold tracking-tight">
            Proactive Red-Zone & Relocation Decision Platform
          </h2>
          <p className="text-sm text-slate-300 mt-1 max-w-2xl">
            Autonomous multi-hazard ranking, infrastructure carrying-capacity bottleneck detection, and safe-shift simulation across the Alaknanda, Rishiganga, and Pindar drainage basins.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            id="open-gis-map-dashboard-btn"
            onClick={() => onNavigateTab('map')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm transition cursor-pointer"
          >
            <MapPin className="w-4 h-4" />
            <span>Launch GIS Map</span>
          </button>
          <button
            id="open-safeshift-dashboard-btn"
            onClick={() => onNavigateTab('simulator')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 text-xs font-bold transition cursor-pointer"
          >
            <span>SafeShift Simulator</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 4 Key Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1 */}
        <div
          id="metric-card-high-risk-population"
          className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              High-Risk Population
            </span>
            <div className="w-7 h-7 rounded-md bg-amber-50 text-amber-600 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-1">
            {summary.high_risk_population.toLocaleString()}
          </p>
          <span className="text-[10px] text-amber-600 font-medium block mt-1">
            Across 10 surveyed habitations
          </span>
        </div>

        {/* Metric 2 */}
        <div
          id="metric-card-active-red-zones"
          className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Active Red Zones
            </span>
            <div className="w-7 h-7 rounded-md bg-red-50 text-red-600 flex items-center justify-center">
              <ShieldAlert className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-red-600 mt-1">
            {summary.active_red_zones_count} Zones
          </p>
          <span className="text-[10px] text-slate-400 block mt-1">
            Chamoli, Joshimath & Alaknanda
          </span>
        </div>

        {/* Metric 3 */}
        <div
          id="metric-card-safe-capacity"
          className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Safe Relocation Capacity
            </span>
            <div className="w-7 h-7 rounded-md bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-emerald-600 mt-1">
            {summary.available_safe_site_capacity.toLocaleString()} <span className="text-xs font-normal text-slate-500">families</span>
          </p>
          <span className="text-[10px] text-emerald-600 font-medium block mt-1">
            Across {summary.total_safe_sites} buffer enclaves
          </span>
        </div>

        {/* Metric 4 */}
        <div
          id="metric-card-immediate-relocation"
          className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Immediate Relocation
            </span>
            <div className="w-7 h-7 rounded-md bg-red-50 text-red-600 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-1">
            {summary.immediate_relocation_villages_count} <span className="text-xs font-normal text-slate-400">Villages</span>
          </p>
          <span className="text-[10px] text-red-600 font-medium block mt-1">
            Score &ge; 75 (High Urgency Status)
          </span>
        </div>
      </div>

      {/* Main Split: GIS Map Preview & Relocation Priority List */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Col 1-2: GIS Multi-Hazard Map Preview Card */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col relative min-h-[380px]">
          <div className="p-3.5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-slate-500" />
              <h3 className="text-xs font-bold uppercase text-slate-600 tracking-wider">
                GIS Multi-Hazard Map (Chamoli Pilot)
              </h3>
            </div>
            <div className="flex gap-2">
              <span className="px-2 py-0.5 bg-red-100 text-red-700 text-[10px] rounded border border-red-200 font-bold">
                5 Red Zones
              </span>
              <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[10px] rounded border border-emerald-200 font-bold">
                4 Safe Sites
              </span>
            </div>
          </div>

          {/* Map Preview Body */}
          <div className="flex-1 bg-slate-900 relative overflow-hidden flex flex-col justify-between p-6 text-white">
            <div className="absolute inset-0 opacity-20 pointer-events-none bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:16px_16px]" />

            <div className="relative z-10 space-y-2">
              <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-400/30 text-[11px] font-mono">
                <span>Alaknanda & Dhauliganga Confluence</span>
              </div>
              <h4 className="text-lg font-bold text-white tracking-tight">
                Chamoli Pilot Hazard Overlays Active
              </h4>
              <p className="text-xs text-slate-300 max-w-lg leading-relaxed">
                Vector polygons delineating active subsidence scarps in Joshimath (Sunil, Manohar Bagh, Ravigram), flood hazard inundation buffers in Raini & Tapovan, and Liebig-verified relocation enclaves in Gauchar, Pipalkoti, and Gwaldam.
              </p>
            </div>

            {/* Quick Stat Tags */}
            <div className="relative z-10 grid grid-cols-3 gap-3 my-4">
              <div className="p-2.5 rounded-lg bg-slate-800/80 border border-slate-700/80">
                <span className="text-[10px] text-slate-400 block uppercase font-bold">Monitored Basin</span>
                <span className="text-xs font-semibold text-slate-200">Alaknanda (Himalayas)</span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-800/80 border border-slate-700/80">
                <span className="text-[10px] text-slate-400 block uppercase font-bold">Active Sensors</span>
                <span className="text-xs font-semibold text-emerald-400">12 Telemetry Points</span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-800/80 border border-slate-700/80">
                <span className="text-[10px] text-slate-400 block uppercase font-bold">Spatial Engine</span>
                <span className="text-xs font-semibold text-blue-400">Leaflet + PostGIS</span>
              </div>
            </div>

            <div className="relative z-10 flex items-center justify-between pt-2 border-t border-slate-800">
              <span className="text-[11px] text-slate-400">
                Open full interactive GIS viewer with layer filtering & coordinates
              </span>
              <button
                id="launch-gis-map-from-card"
                onClick={() => onNavigateTab('map')}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow transition flex items-center gap-1.5"
              >
                <span>Launch Interactive Map</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Col 3: Relocation Priority List */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex flex-col gap-3 overflow-hidden">
          <div className="flex justify-between items-center border-b border-slate-100 pb-2">
            <h3 className="text-xs font-bold uppercase text-slate-600 tracking-wider">
              Relocation Priority List
            </h3>
            <button
              onClick={() => onNavigateTab('priority')}
              className="text-xs text-blue-600 hover:text-blue-700 font-semibold cursor-pointer"
            >
              View All (10)
            </button>
          </div>

          <div className="flex flex-col gap-2.5 overflow-y-auto pr-1 flex-1">
            {/* Critical */}
            <div
              onClick={() => {
                const hab = summary.top_five_critical_villages[0];
                if (hab) onSelectHabitation(hab);
              }}
              className="p-3 bg-red-50 border-l-4 border-red-500 rounded-r-lg cursor-pointer hover:bg-red-100/60 transition space-y-1"
            >
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-slate-800">Joshimath (Ward 1-4)</span>
                <span className="text-[10px] bg-red-600 text-white px-1.5 py-0.2 rounded uppercase font-bold tracking-wider">
                  Critical
                </span>
              </div>
              <p className="text-[10px] text-slate-500">Pop: 3,450 | Landslide & Subsidence</p>
              <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden mt-1">
                <div className="bg-red-600 h-full w-[94%]" />
              </div>
            </div>

            {/* High */}
            <div
              onClick={() => {
                const hab = summary.top_five_critical_villages[1];
                if (hab) onSelectHabitation(hab);
              }}
              className="p-3 bg-orange-50 border-l-4 border-orange-500 rounded-r-lg cursor-pointer hover:bg-orange-100/60 transition space-y-1"
            >
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-slate-800">Raini Village</span>
                <span className="text-[10px] bg-orange-500 text-white px-1.5 py-0.2 rounded uppercase font-bold tracking-wider">
                  High
                </span>
              </div>
              <p className="text-[10px] text-slate-500">Pop: 820 | Flash Flood Risk (Rishiganga)</p>
              <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden mt-1">
                <div className="bg-orange-500 h-full w-[88%]" />
              </div>
            </div>

            {/* Moderate */}
            <div
              onClick={() => {
                const hab = summary.top_five_critical_villages[2];
                if (hab) onSelectHabitation(hab);
              }}
              className="p-3 bg-yellow-50 border-l-4 border-yellow-500 rounded-r-lg cursor-pointer hover:bg-yellow-100/60 transition space-y-1"
            >
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-slate-800">Tapovan Valley</span>
                <span className="text-[10px] bg-yellow-500 text-white px-1.5 py-0.2 rounded uppercase font-bold tracking-wider">
                  Moderate
                </span>
              </div>
              <p className="text-[10px] text-slate-500">Pop: 1,240 | Slope Failure & Cloudburst</p>
              <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden mt-1">
                <div className="bg-yellow-500 h-full w-[78%]" />
              </div>
            </div>

            {/* Monitor */}
            <div
              onClick={() => {
                const hab = summary.top_five_critical_villages[3];
                if (hab) onSelectHabitation(hab);
              }}
              className="p-3 bg-emerald-50 border-l-4 border-emerald-500 rounded-r-lg cursor-pointer hover:bg-emerald-100/60 transition space-y-1"
            >
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-slate-800">Helang Settlement</span>
                <span className="text-[10px] bg-emerald-600 text-white px-1.5 py-0.2 rounded uppercase font-bold tracking-wider">
                  Monitor
                </span>
              </div>
              <p className="text-[10px] text-slate-500">Pop: 980 | Soil Creep & Erosion</p>
              <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden mt-1">
                <div className="bg-emerald-500 h-full w-[76%]" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Row: Hazard Weightage Distribution, Site Carrying Capacity, Recent Field Reports */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Hazard Weightage Distribution */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex flex-col justify-between">
          <div>
            <h3 className="text-xs font-bold uppercase text-slate-500 tracking-wider">
              Hazard Weightage Distribution
            </h3>
            <p className="text-[10px] text-slate-400 mt-0.5">
              Empirical multi-hazard weights applied across Chamoli pilot
            </p>
          </div>
          <div className="flex items-end gap-3 h-20 pt-4 px-2">
            <div className="flex-1 flex flex-col items-center gap-1.5">
              <span className="text-[9px] font-bold text-red-600">45%</span>
              <div className="w-full bg-red-400 rounded-t h-16" title="Landslide: 45%" />
              <span className="text-[9px] font-bold text-slate-500 truncate w-full text-center">Landslide</span>
            </div>
            <div className="flex-1 flex flex-col items-center gap-1.5">
              <span className="text-[9px] font-bold text-blue-600">25%</span>
              <div className="w-full bg-blue-400 rounded-t h-10" title="Flash Flood: 25%" />
              <span className="text-[9px] font-bold text-slate-500 truncate w-full text-center">Flood</span>
            </div>
            <div className="flex-1 flex flex-col items-center gap-1.5">
              <span className="text-[9px] font-bold text-indigo-600">20%</span>
              <div className="w-full bg-indigo-400 rounded-t h-8" title="Cloudburst: 20%" />
              <span className="text-[9px] font-bold text-slate-500 truncate w-full text-center">Cloudburst</span>
            </div>
            <div className="flex-1 flex flex-col items-center gap-1.5">
              <span className="text-[9px] font-bold text-slate-600">10%</span>
              <div className="w-full bg-slate-400 rounded-t h-4" title="Seismic: 10%" />
              <span className="text-[9px] font-bold text-slate-500 truncate w-full text-center">Seismic</span>
            </div>
          </div>
        </div>

        {/* Site Carrying Capacity (Liebig's Law) */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex flex-col justify-between">
          <div>
            <h3 className="text-xs font-bold uppercase text-slate-500 tracking-wider">
              Site Carrying Capacity (Liebig)
            </h3>
            <p className="text-[10px] text-slate-400 mt-0.5">
              Multi-resource bottleneck: Water, School, Health, Roads & Land
            </p>
          </div>
          <div className="space-y-2 pt-2">
            <div className="flex justify-between text-xs font-bold text-slate-800">
              <span>Allocated Capacity</span>
              <span>850 / 1,370 Units</span>
            </div>
            <div className="h-3.5 bg-slate-100 rounded-full overflow-hidden flex border border-slate-200">
              <div className="bg-emerald-500 h-full w-[62%]" />
            </div>
            <p className="text-[10px] text-slate-500 leading-snug">
              62% capacity utilized across 4 safe enclaves. Drinking water distribution network forms the active limiting resource in Gauchar.
            </p>
          </div>
        </div>

        {/* Recent Field Reports */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex flex-col justify-between">
          <div className="flex justify-between items-center">
            <h3 className="text-xs font-bold uppercase text-slate-500 tracking-wider">
              Recent Field Reports
            </h3>
            <button
              onClick={() => onNavigateTab('field_reports')}
              className="text-[10px] text-blue-600 hover:text-blue-700 font-semibold"
            >
              All Reports
            </button>
          </div>
          <div className="space-y-2 mt-2">
            {summary.recent_field_reports.slice(0, 2).map((r) => (
              <div key={r.id} className="flex items-center gap-2 p-1.5 bg-slate-50 rounded border border-slate-200 text-xs">
                <div className="w-7 h-7 rounded bg-slate-200 text-slate-700 flex items-center justify-center text-[10px] font-bold shrink-0">
                  {r.officer_name.charAt(0)}
                </div>
                <div className="overflow-hidden flex-1">
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-bold text-slate-800 truncate text-[11px]">{r.habitation_name}</span>
                    <span className="text-[9px] bg-red-100 text-red-600 px-1 rounded border border-red-200 font-bold shrink-0">
                      {r.severity}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500 truncate">{r.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Visual Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Hazard Distribution Bar Chart */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Multi-Hazard Historical Incidence
              </h3>
              <p className="text-xs text-slate-500">
                Documented extreme events across Chamoli monitoring points
              </p>
            </div>
            <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
              20 Events Recorded
            </span>
          </div>

          <div className="h-64 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={hazardChartData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-15} textAnchor="end" />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    color: '#fff',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                  formatter={(val: any, name: any) => [val, name === 'count' ? 'Events' : 'Affected People']}
                />
                <Bar dataKey="count" name="Recorded Events" fill="#dc2626" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Priority Level Breakdown Pie Chart */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Relocation Priority Classification
              </h3>
              <p className="text-xs text-slate-500">
                Threshold-based decision categorization of 10 pilot habitations
              </p>
            </div>
          </div>

          <div className="h-64 w-full pt-2 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={priorityChartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {priorityChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    color: '#fff',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                  formatter={(val: any) => [`${val} Habitations`, 'Count']}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Top 5 Critical Villages Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-red-600" />
              <span>Top 5 High-Priority Vulnerable Habitations</span>
            </h3>
            <p className="text-xs text-slate-500">
              Ranked objectively by Relocation Priority Index (50% Hazard + 30% Vulnerability + 20% Disaster History)
            </p>
          </div>
          <button
            onClick={() => onNavigateTab('priority')}
            className="text-xs font-semibold text-red-600 hover:text-red-700 flex items-center gap-1"
          >
            <span>View Full Priority Ranking</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200">
              <tr>
                <th className="px-5 py-3">Rank & Village</th>
                <th className="px-4 py-3">Priority Score</th>
                <th className="px-4 py-3">Priority Level</th>
                <th className="px-4 py-3">Hazard (50%)</th>
                <th className="px-4 py-3">Vulnerability (30%)</th>
                <th className="px-4 py-3">Population</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {summary.top_five_critical_villages.map((hab, index) => (
                <tr
                  key={hab.id}
                  className="hover:bg-slate-50/80 transition cursor-pointer"
                  onClick={() => onSelectHabitation(hab)}
                >
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 font-bold flex items-center justify-center text-[10px]">
                        #{index + 1}
                      </span>
                      <div>
                        <span className="font-bold text-slate-900 block">{hab.village_name}</span>
                        <span className="text-[10px] text-slate-400 font-mono">{hab.village_code}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 font-extrabold text-sm text-slate-900">
                    {hab.priority_score}
                  </td>
                  <td className="px-4 py-3.5">
                    <RiskBadge level={hab.priority_level} size="sm" />
                  </td>
                  <td className="px-4 py-3.5 text-red-600 font-semibold">{hab.hazard_score}</td>
                  <td className="px-4 py-3.5 text-amber-600 font-semibold">{hab.vulnerability_score}</td>
                  <td className="px-4 py-3.5">{hab.population.toLocaleString()} ({hab.households} households)</td>
                  <td className="px-5 py-3.5 text-right">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectHabitation(hab);
                      }}
                      className="px-2.5 py-1 rounded-md bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold border border-blue-200 text-xs transition cursor-pointer"
                    >
                      Analyze Risk
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent Field Reports Feed */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Verified Rapid Assessment Ground Reports
            </h3>
            <p className="text-xs text-slate-500">
              Real-time observational updates submitted by field geologists and disaster officers
            </p>
          </div>
          <button
            onClick={() => onNavigateTab('reports')}
            className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
          >
            <span>All Field Reports</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {summary.recent_field_reports.slice(0, 3).map((report) => (
            <div
              key={report.id}
              className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/50 flex flex-col justify-between text-xs space-y-2"
            >
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-semibold text-slate-800">{report.habitation_name}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded font-medium ${
                      report.verified
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {report.verified ? 'Verified' : 'Pending'}
                  </span>
                </div>
                <p className="text-slate-600 line-clamp-3 text-[11px] leading-relaxed">
                  {report.description}
                </p>
              </div>

              <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between text-[10px] text-slate-400">
                <span>By {report.officer_name.split(' ')[0]}</span>
                <span>{new Date(report.reported_at).toLocaleDateString()}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
