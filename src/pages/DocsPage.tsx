import React from 'react';
import {
  BookOpen,
  Calculator,
  Database,
  Layers,
  ShieldCheck,
  Cpu,
  GitBranch,
} from 'lucide-react';

export const DocsPage: React.FC = () => {
  return (
    <div id="system-docs-view" className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-indigo-600 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded">
              MATHEMATICAL SPECIFICATIONS
            </span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-indigo-600" />
            <span>NammaSafe AI Decision-Support Formulas & Architecture</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Transparent mathematical models, resource constraint formulations, and PostGIS schema standards
          </p>
        </div>
      </div>

      {/* Grid of Formulas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Formula 1: Relocation Priority Score */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-3">
          <div className="flex items-center gap-2 text-red-600 font-bold text-sm">
            <Calculator className="w-4 h-4" />
            <span>1. Relocation Priority Index (RPI)</span>
          </div>
          <div className="p-3 bg-slate-900 text-white rounded-lg font-mono text-xs overflow-x-auto">
            Priority = 0.50 &times; Hazard + 0.30 &times; Vulnerability + 0.20 &times; History
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            Combines dynamic environmental threats (landslide, flood, cloudburst), localized socio-economic vulnerability (population density, dependents, medical access), and historical recurrence to provide an unbiased ranking for DM priority orders.
          </p>
          <div className="text-[11px] text-slate-500 pt-2 border-t border-slate-100 space-y-1">
            <div className="flex justify-between">
              <span className="font-semibold text-red-600">Immediate Relocation:</span>
              <span>Score &ge; 75.0</span>
            </div>
            <div className="flex justify-between">
              <span className="font-semibold text-amber-600">Short-Term Relocation:</span>
              <span>Score 50.0 &ndash; 74.9</span>
            </div>
            <div className="flex justify-between">
              <span className="font-semibold text-yellow-600">Medium-Term Relocation:</span>
              <span>Score 30.0 &ndash; 49.9</span>
            </div>
            <div className="flex justify-between">
              <span className="font-semibold text-emerald-600">Monitor Only:</span>
              <span>Score &lt; 30.0</span>
            </div>
          </div>
        </div>

        {/* Formula 2: Composite Hazard Score */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-3">
          <div className="flex items-center gap-2 text-amber-600 font-bold text-sm">
            <Layers className="w-4 h-4" />
            <span>2. Composite Hazard Score</span>
          </div>
          <div className="p-3 bg-slate-900 text-white rounded-lg font-mono text-xs overflow-x-auto">
            Hazard = 0.40 &times; Landslide + 0.30 &times; Flood + 0.20 &times; Rain + 0.10 &times; Frequency
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            Synthesizes multi-hazard exposure calibrated for Himalayan terrain. Landslide risk receives highest weighting due to chronic valley wall subsidence along shear faults (e.g. Main Central Thrust in Chamoli).
          </p>
          <div className="text-[11px] text-slate-500 pt-2 border-t border-slate-100">
            <span>Calibrated with 20 historical Chamoli disaster events (2013 Kedarnath surge, 2021 Rishiganga burst, 2023 Joshimath subsidence).</span>
          </div>
        </div>

        {/* Formula 3: Relocation Site Suitability */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-3">
          <div className="flex items-center gap-2 text-emerald-600 font-bold text-sm">
            <ShieldCheck className="w-4 h-4" />
            <span>3. Relocation Site Suitability Index</span>
          </div>
          <div className="p-3 bg-slate-900 text-white rounded-lg font-mono text-xs overflow-x-auto">
            Suitability = 0.30 &times; LowHazard + 0.20 &times; FlatLand + 0.15 &times; Road + 0.15 &times; Water + 0.10 &times; Health + 0.10 &times; School
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            Evaluates prospective rehabilitation enclaves. Mandates low multi-hazard score, stable gradient (&lt; 15&deg; slope), year-round road connectivity, and accessible social infrastructure within a 2 km buffer.
          </p>
        </div>

        {/* Formula 4: Multi-Resource Carrying Capacity */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-3">
          <div className="flex items-center gap-2 text-blue-600 font-bold text-sm">
            <Cpu className="w-4 h-4" />
            <span>4. Multi-Resource Carrying Capacity</span>
          </div>
          <div className="p-3 bg-slate-900 text-white rounded-lg font-mono text-xs overflow-x-auto">
            Capacity = Min(Land, Water, School, Health, Road)
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            Adopts Liebig&apos;s Law of the Minimum: Total safe settlement capacity cannot exceed the most constrained resource pillar. Prevents overburdening mountain towns and ensures sustainable habitat creation.
          </p>
          <div className="text-[11px] text-slate-500 pt-2 border-t border-slate-100">
            <span>Identifies exact limiting bottleneck (e.g. Gauchar water network capacity: 550 families).</span>
          </div>
        </div>
      </div>

      {/* Tech Stack & Standards */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <Database className="w-4 h-4 text-purple-600" />
          <span>System Architecture & Integration Topology</span>
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
            <span className="font-bold text-slate-800 block mb-1">Frontend Layer</span>
            <p className="text-slate-600 text-[11px]">
              React 19, TypeScript, Vite, Tailwind CSS, Leaflet GIS mapping with custom divIcons, and Recharts visualization.
            </p>
          </div>
          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
            <span className="font-bold text-slate-800 block mb-1">Backend Microservice</span>
            <p className="text-slate-600 text-[11px]">
              Python FastAPI with Pydantic schema validation, JWT auth, RBAC permissions, and pure algorithmic risk engine.
            </p>
          </div>
          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
            <span className="font-bold text-slate-800 block mb-1">Geospatial Database</span>
            <p className="text-slate-600 text-[11px]">
              PostgreSQL with PostGIS extension (`init.sql`), spatial GIST indexing, GeoJSON polygon geometries, and Alembic migrations.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
