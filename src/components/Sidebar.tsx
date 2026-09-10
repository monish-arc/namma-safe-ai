import React from 'react';
import {
  LayoutDashboard,
  Map,
  Home,
  SlidersHorizontal,
  Compass,
  FileText,
  Database,
  BookOpen,
  Info,
  BellRing,
} from 'lucide-react';
import { UserRole } from '../types';

export type NavTab =
  | 'dashboard'
  | 'map'
  | 'alerts'
  | 'habitations'
  | 'priority'
  | 'simulator'
  | 'field_reports'
  | 'directive'
  | 'admin'
  | 'docs';

interface SidebarProps {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  userRole: UserRole;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  userRole,
}) => {
  const [selectedRegion, setSelectedRegion] = React.useState('Chamoli District, UK');

  const navItems = [
    {
      id: 'dashboard' as NavTab,
      label: 'Executive Dashboard',
      icon: LayoutDashboard,
      roles: ['local_office', 'sub_district_officer', 'district_officer', 'state_officer', 'gis_analysis_officer', 'admin'],
    },
    {
      id: 'map' as NavTab,
      label: 'Interactive GIS Map',
      icon: Map,
      roles: ['normal_citizen', 'field_officer', 'local_office', 'sub_district_officer', 'district_officer', 'state_officer', 'gis_analysis_officer', 'admin'],
    },
    {
      id: 'alerts' as NavTab,
      label: 'Risk Alerts',
      icon: BellRing,
      roles: ['normal_citizen', 'field_officer', 'local_office', 'sub_district_officer', 'district_officer', 'state_officer', 'gis_analysis_officer', 'admin'],
    },
    {
      id: 'habitations' as NavTab,
      label: 'Habitations & Risk',
      icon: Home,
      roles: ['local_office', 'sub_district_officer', 'district_officer', 'state_officer', 'gis_analysis_officer', 'admin'],
    },
    {
      id: 'priority' as NavTab,
      label: 'Relocation Matrix',
      icon: SlidersHorizontal,
      roles: ['local_office', 'sub_district_officer', 'district_officer', 'state_officer', 'gis_analysis_officer', 'admin'],
    },
    {
      id: 'simulator' as NavTab,
      label: 'SafeShift Simulator',
      icon: Compass,
      roles: ['local_office', 'sub_district_officer', 'district_officer', 'state_officer', 'admin'],
    },
    {
      id: 'field_reports' as NavTab,
      label: 'Field Hazard Reports',
      icon: FileText,
      roles: ['field_officer', 'local_office', 'sub_district_officer', 'district_officer', 'state_officer', 'admin'],
    },
    {
      id: 'directive' as NavTab,
      label: 'Directive Brief',
      icon: BookOpen,
      roles: ['local_office', 'sub_district_officer', 'district_officer', 'state_officer', 'admin'],
    },
    {
      id: 'admin' as NavTab,
      label: 'Control & Personas',
      icon: Database,
      roles: ['admin'],
    },
    {
      id: 'docs' as NavTab,
      label: 'Specs & Formulas',
      icon: Info,
      roles: ['local_office', 'sub_district_officer', 'district_officer', 'state_officer', 'gis_analysis_officer', 'admin'],
    },
  ];

  return (
    <aside
      id="main-sidebar"
      className="w-56 lg:w-60 bg-white border-r border-slate-200 p-4 flex flex-col gap-5 shrink-0 overflow-y-auto select-none"
    >
      <div className="space-y-1">
        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block px-1 mb-2">
          Navigation
        </label>
        <nav className="space-y-1">
          {navItems.map((item) => {
            const hasAccess = item.roles.includes(userRole);
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                id={`sidebar-tab-${item.id}`}
                onClick={() => hasAccess && onSelectTab(item.id)}
                disabled={!hasAccess}
                className={`w-full flex items-center gap-2.5 p-2 rounded-md text-xs sm:text-sm font-medium transition cursor-pointer ${
                  isActive
                    ? 'bg-blue-50 text-blue-700 font-semibold border border-blue-100/80 shadow-xs'
                    : hasAccess
                    ? 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    : 'opacity-40 cursor-not-allowed text-slate-400'
                }`}
              >
                <Icon
                  className={`w-4 h-4 shrink-0 ${
                    isActive ? 'text-blue-600' : hasAccess ? 'text-slate-400' : 'text-slate-300'
                  }`}
                />
                <span className="truncate">{item.label}</span>
                {!hasAccess && (
                  <span className="ml-auto text-[9px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded uppercase">
                    Locked
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Region Quick-Select */}
      <div className="space-y-3 pt-2 border-t border-slate-100">
        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block px-1">
          Region Quick-Select
        </label>
        <select
          id="sidebar-region-quick-select"
          value={selectedRegion}
          onChange={(e) => setSelectedRegion(e.target.value)}
          className="w-full text-xs p-2 border border-slate-200 rounded-lg bg-slate-50 text-slate-800 font-medium focus:ring-1 focus:ring-blue-500 focus:bg-white outline-none cursor-pointer"
        >
          <option value="Chamoli District, UK">Chamoli District, UK</option>
          <option value="Joshimath Sub-Division">Joshimath Sub-Division</option>
          <option value="Karnaprayag Buffer">Karnaprayag Buffer</option>
        </select>

        {/* Alert Level Box */}
        <div className="p-3 bg-slate-900 rounded-lg text-white shadow-sm">
          <p className="text-[10px] text-slate-400 uppercase font-semibold tracking-wider">
            Current Alert Level
          </p>
          <p className="text-base lg:text-lg font-bold text-orange-400 mt-0.5">
            LEVEL 3: MODERATE
          </p>
          <p className="text-[10px] text-slate-300 mt-1 leading-snug">
            High Rainfall predicted in Joshimath block for next 48h.
          </p>
        </div>
      </div>

      {/* PostGIS Connected Footer Widget */}
      <div className="mt-auto p-3 border border-blue-100 bg-blue-50 rounded-lg shadow-sm">
        <p className="text-xs font-semibold text-blue-800 flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
          PostGIS Connected
        </p>
        <p className="text-[10px] text-blue-600 italic mt-0.5">
          Syncing with Bhuvan Satellite (Simulated)
        </p>
      </div>
    </aside>
  );
};
