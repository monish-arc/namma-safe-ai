import React, { useState } from 'react';
import {
  UserCheck,
  ChevronDown,
  Activity,
  RotateCcw,
} from 'lucide-react';
import { User, UserRole } from '../types';
import { DEMO_USERS } from '../data/mockData';
import { getAccessibleTabs, NavTab } from './Sidebar';

interface NavbarProps {
  currentUser: User;
  onSwitchUser: (user: User) => void;
  onResetData: () => void;
  activeTab?: NavTab;
  onSelectTab?: (tab: NavTab) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  onSwitchUser,
  onResetData,
  activeTab,
  onSelectTab,
}) => {
  const currentTab: NavTab = activeTab ?? 'dashboard';
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const tabs = getAccessibleTabs(currentUser.role);
  const canAccess = (tab: NavTab) => tabs.includes(tab);
  const isCitizen = currentUser.role === 'normal_citizen';

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case 'admin':
        return 'bg-purple-100 text-purple-800 border-purple-300';
      case 'state_officer':
      case 'district_officer':
      case 'sub_district_officer':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'field_officer':
      case 'local_office':
        return 'bg-amber-100 text-amber-800 border-amber-300';
      case 'gis_analysis_officer':
        return 'bg-cyan-100 text-cyan-800 border-cyan-300';
      case 'normal_citizen':
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const quickLinks: { tab: NavTab; label: string; activeWhen?: NavTab[] }[] = [];
  if (canAccess('dashboard')) quickLinks.push({ tab: 'dashboard', label: 'Dashboard' });
  if (canAccess('map')) quickLinks.push({ tab: 'map', label: 'Interactive Map' });
  if (canAccess('alerts')) quickLinks.push({ tab: 'alerts', label: 'Risk Alerts' });
  if (canAccess('simulator') || canAccess('priority')) {
    quickLinks.push({ tab: 'simulator', label: 'Relocation Engine', activeWhen: ['simulator', 'priority'] });
  }
  if (canAccess('field_reports')) quickLinks.push({ tab: 'field_reports', label: 'Field Reports' });
  if (canAccess('evacuation')) quickLinks.push({ tab: 'evacuation', label: 'Evacuation Routes' });

  return (
    <header
      id="main-navigation-bar"
      className="bg-slate-900 text-white border-b border-slate-700 sticky top-0 z-40 shrink-0 shadow-sm"
    >
      {/* Top Advisory Ticker */}
      <div className="bg-slate-950 px-6 py-1 border-b border-slate-800/90 flex items-center justify-between text-xs text-slate-400">
        <div className="flex items-center gap-2 overflow-hidden">
          <span className="flex items-center gap-1 text-amber-400 font-semibold uppercase tracking-wider text-[10px] bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/20 shrink-0">
            <Activity className="w-3 h-3 animate-pulse" /> Live Pilot
          </span>
          <span className="truncate text-[11px] text-slate-300">
            Chamoli District Geohazard Warning: Ongoing slope deformation monitoring active in Joshimath Sunil & Manohar Bagh wards (1.8 cm/day avg).
          </span>
        </div>
        <div className="hidden lg:flex items-center gap-4 shrink-0 text-slate-400 text-[11px]">
          <span>Authority: USDMA & DDMA Chamoli</span>
          <span className="font-mono text-slate-300">UTTARAKHAND GIS v1.4</span>
        </div>
      </div>

      {/* Main Header Bar */}
      <div className="h-16 flex items-center justify-between px-6">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-500 rounded flex items-center justify-center font-bold text-lg text-white shadow-sm shrink-0">
            N
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-white leading-none">
                NammaSafe AI
              </h1>
              <span className="text-[9px] bg-blue-500/20 text-blue-300 border border-blue-400/30 px-1 py-0.2 rounded font-mono font-semibold">
                PILOT
              </span>
            </div>
            <p className="text-[10px] text-slate-400 uppercase tracking-widest leading-normal mt-0.5">
              Proactive Red-Zone Planning Platform
            </p>
          </div>
        </div>

        {/* Center Quick Navigation Links */}
        {quickLinks.length > 0 && (
          <div className="hidden md:flex items-center gap-6">
            <div className="flex gap-5 text-sm font-medium">
              {quickLinks.map(({ tab, label, activeWhen }) => {
                const isActive = activeWhen
                  ? activeWhen.includes(currentTab)
                  : currentTab === tab;
                return (
                  <button
                    key={tab}
                    onClick={() => onSelectTab?.(tab)}
                    className={`transition cursor-pointer ${
                      isActive
                        ? 'text-blue-400 border-b-2 border-blue-400 pb-1 font-semibold'
                        : 'text-slate-400 hover:text-white pb-1'
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>

            <div className="h-8 w-[1px] bg-slate-700"></div>
          </div>
        )}

        {/* Right Side: Reset Data & User Profile */}
        <div className="flex items-center gap-4">
          {!isCitizen && (
            <button
              id="reset-demo-data-btn"
              onClick={onResetData}
              title="Reset synthetic demo data to default"
              className="hidden sm:flex items-center gap-1.5 text-xs text-slate-300 hover:text-white px-2.5 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 border border-slate-700 transition"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Data</span>
            </button>
          )}

          {isCitizen ? (
            <div className="flex items-center gap-3">
              <div className="leading-tight text-right hidden sm:block">
                <p className="text-xs font-bold text-white truncate max-w-[130px]">
                  {currentUser.full_name}
                </p>
                <p className="text-[10px] text-slate-400 capitalize">
                  {currentUser.designation || `${currentUser.role.replace('_', ' ')}`}
                </p>
              </div>
              <div className="w-8 h-8 rounded-full bg-slate-600 border border-slate-500 flex items-center justify-center font-bold text-xs text-white shadow-sm">
                {currentUser.full_name.charAt(0)}
              </div>
            </div>
          ) : (
            <div className="relative">
              <button
                id="role-switcher-dropdown-btn"
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center gap-3 text-right hover:opacity-90 transition focus:outline-none"
              >
                <div className="leading-tight text-right hidden sm:block">
                  <p className="text-xs font-bold text-white truncate max-w-[130px]">
                    {currentUser.full_name}
                  </p>
                  <p className="text-[10px] text-slate-400 capitalize">
                    {currentUser.designation || `${currentUser.role.replace('_', ' ')}, Chamoli`}
                  </p>
                </div>
                <div className="w-8 h-8 rounded-full bg-slate-600 border border-slate-500 flex items-center justify-center font-bold text-xs text-white shadow-sm">
                  {currentUser.full_name.charAt(0)}
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {dropdownOpen && (
                <div
                  id="role-switcher-menu"
                  className="absolute right-0 mt-2 w-72 bg-slate-900 border border-slate-700 rounded-lg shadow-2xl py-2 z-50 animate-in fade-in slide-in-from-top-2"
                >
                  <div className="px-3 py-2 border-b border-slate-800">
                    <p className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                      Switch Test Persona / Role
                    </p>
                    <p className="text-[11px] text-slate-400">
                      Test different RBAC permission sets
                    </p>
                  </div>
                  <div className="p-1 space-y-1">
                    {DEMO_USERS.map((user) => (
                      <button
                        key={user.id}
                        id={`switch-user-${user.username}`}
                        onClick={() => {
                          onSwitchUser(user);
                          setDropdownOpen(false);
                        }}
                        className={`w-full text-left px-3 py-2 rounded text-xs flex items-start gap-2 transition ${
                          currentUser.id === user.id
                            ? 'bg-slate-800 text-white'
                            : 'text-slate-300 hover:bg-slate-800/60'
                        }`}
                      >
                        <UserCheck
                          className={`w-4 h-4 mt-0.5 ${
                            currentUser.id === user.id ? 'text-emerald-400' : 'text-slate-500'
                          }`}
                        />
                        <div className="overflow-hidden">
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold">{user.full_name}</span>
                            <span
                              className={`text-[10px] px-1.5 py-0.2 rounded border font-medium ${getRoleBadge(
                                user.role
                              )}`}
                            >
                              {user.role.replace('_', ' ')}
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-400 truncate mt-0.5">
                            {user.designation}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};