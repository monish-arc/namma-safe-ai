import React, { useEffect, useMemo, useState } from 'react';
import {
  LayoutDashboard,
  Map as MapIcon,
  Home,
  SlidersHorizontal,
  Compass,
  FileText,
  Database,
  BookOpen,
  Info,
  BellRing,
  MapPin,
  Route as RouteIcon,
} from 'lucide-react';
import { UserRole, RegionPlace, RegionSelection } from '../types';
import { loadVillageChunk } from '../data/regions/villages/villageLoaders';
import {
  REGION_STATES,
  DISTRICTS_BY_STATE,
  SUBDISTRICTS_BY_DISTRICT,
} from '../data/regions/hierarchy';

export type NavTab =
  | 'dashboard'
  | 'map'
  | 'alerts'
  | 'habitations'
  | 'priority'
  | 'simulator'
  | 'evacuation'
  | 'field_reports'
  | 'directive'
  | 'admin'
  | 'docs';

export interface NavItem {
  id: NavTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: UserRole[];
}

export const NAV_ITEMS: NavItem[] = [
  {
    id: 'dashboard',
    label: 'Executive Dashboard',
    icon: LayoutDashboard,
    roles: ['local_office', 'sub_district_officer', 'district_officer', 'state_officer', 'gis_analysis_officer', 'admin'],
  },
  {
    id: 'map',
    label: 'Interactive GIS Map',
    icon: MapIcon,
    roles: ['normal_citizen', 'field_officer', 'local_office', 'sub_district_officer', 'district_officer', 'state_officer', 'gis_analysis_officer', 'admin'],
  },
  {
    id: 'alerts',
    label: 'Risk Alerts',
    icon: BellRing,
    roles: ['normal_citizen', 'field_officer', 'local_office', 'sub_district_officer', 'district_officer', 'state_officer', 'gis_analysis_officer', 'admin'],
  },
  {
    id: 'habitations',
    label: 'Habitations & Risk',
    icon: Home,
    roles: ['local_office', 'sub_district_officer', 'district_officer', 'state_officer', 'gis_analysis_officer', 'admin'],
  },
  {
    id: 'priority',
    label: 'Relocation Matrix',
    icon: SlidersHorizontal,
    roles: ['local_office', 'sub_district_officer', 'district_officer', 'state_officer', 'gis_analysis_officer', 'admin'],
  },
  {
    id: 'simulator',
    label: 'SafeShift Simulator',
    icon: Compass,
    roles: ['local_office', 'sub_district_officer', 'district_officer', 'state_officer', 'admin'],
  },
  {
    id: 'evacuation',
    label: 'Evacuation Routes',
    icon: RouteIcon,
    roles: ['local_office', 'sub_district_officer', 'district_officer', 'state_officer', 'gis_analysis_officer', 'admin'],
  },
  {
    id: 'field_reports',
    label: 'Field Hazard Reports',
    icon: FileText,
    roles: ['field_officer', 'local_office', 'sub_district_officer', 'district_officer', 'state_officer', 'admin'],
  },
  {
    id: 'directive',
    label: 'Directive Brief',
    icon: BookOpen,
    roles: ['local_office', 'sub_district_officer', 'district_officer', 'state_officer', 'admin'],
  },
  {
    id: 'admin',
    label: 'Control & Personas',
    icon: Database,
    roles: ['admin'],
  },
  {
    id: 'docs',
    label: 'Specs & Formulas',
    icon: Info,
    roles: ['local_office', 'sub_district_officer', 'district_officer', 'state_officer', 'gis_analysis_officer', 'admin'],
  },
];

export const getAccessibleTabs = (role: UserRole): NavTab[] =>
  NAV_ITEMS.filter((item) => item.roles.includes(role)).map((item) => item.id);

const villageChunkCache = new Map<number, Record<number, RegionPlace[]>>();

async function loadVillagesForState(stateCode: number): Promise<Record<number, RegionPlace[]>> {
  const cached = villageChunkCache.get(stateCode);
  if (cached) return cached;
  const mod = await loadVillageChunk(stateCode);
  const chunk: Record<number, RegionPlace[]> = mod.VILLAGES_BY_SUBDISTRICT ?? {};
  villageChunkCache.set(stateCode, chunk);
  return chunk;
}

interface SidebarProps {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  userRole: UserRole;
  region: RegionSelection;
  onRegionChange: (region: RegionSelection) => void;
}

const regionSelectClass =
  'w-full text-xs p-2 border border-slate-200 rounded-lg bg-slate-50 text-slate-800 font-medium focus:ring-1 focus:ring-blue-500 focus:bg-white outline-none cursor-pointer';

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  userRole,
  region,
  onRegionChange,
}) => {
  const [loadingPlaces, setLoadingPlaces] = useState(false);
  const [placesBySubDistrict, setPlacesBySubDistrict] = useState<Record<number, RegionPlace[]> | null>(null);

  const accessibleItems = useMemo(
    () => NAV_ITEMS.filter((item) => item.roles.includes(userRole)),
    [userRole]
  );

  const currentDistricts = useMemo(
    () => (region.state ? DISTRICTS_BY_STATE[region.state.code] ?? [] : []),
    [region.state]
  );
  const currentSubDistricts = useMemo(
    () => (region.district ? SUBDISTRICTS_BY_DISTRICT[region.district.code] ?? [] : []),
    [region.district]
  );

  const currentPlaces = useMemo(() => {
    if (!region.subDistrict || !placesBySubDistrict) return [];
    return placesBySubDistrict[region.subDistrict.code] ?? [];
  }, [region.subDistrict, placesBySubDistrict]);

  useEffect(() => {
    let cancelled = false;
    if (!region.subDistrict) {
      setPlacesBySubDistrict(null);
      setLoadingPlaces(false);
      return;
    }
    if (!region.state) return;
    setLoadingPlaces(true);
    loadVillagesForState(region.state.code)
      .then((chunk) => {
        if (cancelled) return;
        setPlacesBySubDistrict(chunk);
      })
      .finally(() => {
        if (!cancelled) setLoadingPlaces(false);
      });
    return () => {
      cancelled = true;
    };
  }, [region.state, region.subDistrict]);

  const changeState = (code: number) => {
    const state = REGION_STATES.find((s) => s.code === code) ?? null;
    onRegionChange({
      state,
      district: null,
      subDistrict: null,
      place: null,
    });
  };

  const changeDistrict = (code: number) => {
    const district = currentDistricts.find((d) => d.code === code) ?? null;
    onRegionChange({
      ...region,
      district,
      subDistrict: null,
      place: null,
    });
  };

  const changeSubDistrict = (code: number) => {
    const subDistrict = currentSubDistricts.find((s) => s.code === code) ?? null;
    onRegionChange({
      ...region,
      subDistrict,
      place: null,
    });
  };

  const changePlace = (code: number) => {
    const place = currentPlaces.find((p) => p[0] === code) ?? null;
    onRegionChange({ ...region, place });
  };

  const breadcrumb = [
    region.state?.name,
    region.district?.name,
    region.subDistrict?.name,
    region.place ? region.place[1] : null,
  ]
    .filter(Boolean)
    .join(' › ');

  return (
    <aside
      id="main-sidebar"
      className="w-56 lg:w-60 bg-white border-r border-slate-200 p-4 flex flex-col gap-5 shrink-0 overflow-y-auto select-none"
    >
      <div className="space-y-1">
        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block px-1 mb-2">
          Navigation — {accessibleItems.length} of {NAV_ITEMS.length}
        </label>
        <nav className="space-y-1">
          {accessibleItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                id={`sidebar-tab-${item.id}`}
                onClick={() => onSelectTab(item.id)}
                className={`w-full flex items-center gap-2.5 p-2 rounded-md text-xs sm:text-sm font-medium transition cursor-pointer ${
                  isActive
                    ? 'bg-blue-50 text-blue-700 font-semibold border border-blue-100/80 shadow-xs'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <Icon
                  className={`w-4 h-4 shrink-0 ${
                    isActive ? 'text-blue-600' : 'text-slate-400'
                  }`}
                />
                <span className="truncate">{item.label}</span>
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

        <label className="block">
          <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide block mb-1 px-0.5">
            State / UT
          </span>
          <select
            id="sidebar-region-state"
            value={region.state?.code ?? ''}
            onChange={(e) => changeState(Number(e.target.value))}
            className={regionSelectClass}
          >
            <option value="" disabled>
              Select state…
            </option>
            {REGION_STATES.map((s) => (
              <option key={s.code} value={s.code}>
                {s.name}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide block mb-1 px-0.5">
            District
          </span>
          <select
            id="sidebar-region-district"
            value={region.district?.code ?? ''}
            onChange={(e) => changeDistrict(Number(e.target.value))}
            disabled={!currentDistricts.length}
            className={`${regionSelectClass} disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            <option value="" disabled>
              {region.state ? 'Select district…' : 'Select a state first'}
            </option>
            {currentDistricts.map((d) => (
              <option key={d.code} value={d.code}>
                {d.name}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide block mb-1 px-0.5">
            Sub-district
          </span>
          <select
            id="sidebar-region-subdistrict"
            value={region.subDistrict?.code ?? ''}
            onChange={(e) => changeSubDistrict(Number(e.target.value))}
            disabled={!currentSubDistricts.length}
            className={`${regionSelectClass} disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            <option value="" disabled>
              {region.district ? 'Select sub-district…' : 'Select a district first'}
            </option>
            {currentSubDistricts.map((s) => (
              <option key={s.code} value={s.code}>
                {s.name}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide block mb-1 px-0.5">
            Place / Village
          </span>
          <select
            id="sidebar-region-place"
            value={region.place?.[0] ?? ''}
            onChange={(e) => changePlace(Number(e.target.value))}
            disabled={!currentSubDistricts.length || loadingPlaces}
            className={`${regionSelectClass} disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            <option value="" disabled>
              {!region.subDistrict
                ? 'Select a sub-district first'
                : loadingPlaces
                ? 'Loading villages…'
                : 'Select a place…'}
            </option>
            {currentPlaces.map(([code, name]) => (
              <option key={code} value={code}>
                {name}
              </option>
            ))}
          </select>
        </label>

        {breadcrumb ? (
          <p className="flex items-start gap-1 px-1 text-[11px] text-slate-600 font-medium leading-snug">
            <MapPin className="w-3 h-3 text-blue-600 mt-0.5 shrink-0" />
            <span className="break-words">{breadcrumb}</span>
          </p>
        ) : null}

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