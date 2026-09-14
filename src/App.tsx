import React, { useState, useEffect, useRef } from 'react';
import {
  Navbar,
} from './components/Navbar';
import { Sidebar, getAccessibleTabs, NavTab } from './components/Sidebar';
import { VillageModal } from './components/VillageModal';
import { SiteModal } from './components/SiteModal';
import { AccessGate } from './components/AccessGate';

// Pages
import { DashboardPage } from './pages/DashboardPage';
import { GisMapPage } from './pages/GisMapPage';
import { HabitationsPage } from './pages/HabitationsPage';
import { PriorityPage } from './pages/PriorityPage';
import { SimulatorPage } from './pages/SimulatorPage';
import { FieldReportsPage } from './pages/FieldReportsPage';
import { ReportsPage } from './pages/ReportsPage';
import { AdminPage } from './pages/AdminPage';
import { DocsPage } from './pages/DocsPage';
import { RiskAlertsPage } from './pages/RiskAlertsPage';
import { EvacuationPlanPage } from './pages/EvacuationPlanPage';

// Types & Services
import {
  User,
  Habitation,
  RelocationSite,
  RedZone,
  FieldReport,
  RelocationRecommendation,
  DashboardSummary,
  MapLayerItem,
  HazardEvent,
  RegionSelection,
  RegionViewportFocus,
  EvacuationOriginPayload,
  FloodForecastResponse,
  DataStatusEntry,
} from './types';
import { DEMO_USERS } from './data/mockData';
import { apiService } from './services/api';
import { resolveRegionViewport } from './lib/regionViewport';
import {
  REGION_STATES,
  DISTRICTS_BY_STATE,
  SUBDISTRICTS_BY_DISTRICT,
} from './data/regions/hierarchy';

const DEFAULT_REGION: RegionSelection = (() => {
  const state = REGION_STATES.find((s) => s.code === 5) ?? null;
  const district =
    (state && DISTRICTS_BY_STATE[5]?.find((d) => d.code === 47)) ?? null;
  const subDistrict =
    (district && SUBDISTRICTS_BY_DISTRICT[47]?.find((s) => s.code === 284)) ?? null;
  return { state, district, subDistrict, place: null };
})();

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const [selectedRegion, setSelectedRegion] = useState<RegionSelection>(DEFAULT_REGION);
  const [regionFocus, setRegionFocus] = useState<RegionViewportFocus | null>(null);
  const regionFocusKeyRef = useRef(0);
  const [loading, setLoading] = useState(true);

  // Core Data
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [habitations, setHabitations] = useState<Habitation[]>([]);
  const [relocationSites, setRelocationSites] = useState<RelocationSite[]>([]);
  const [redZones, setRedZones] = useState<RedZone[]>([]);
  const [fieldReports, setFieldReports] = useState<FieldReport[]>([]);
  const [recommendations, setRecommendations] = useState<RelocationRecommendation[]>([]);
  const [infrastructure, setInfrastructure] = useState<MapLayerItem[]>([]);
  const [hazardEvents, setHazardEvents] = useState<HazardEvent[]>([]);
  const [floodForecast, setFloodForecast] = useState<FloodForecastResponse | null>(null);
  const [dataStatus, setDataStatus] = useState<DataStatusEntry[] | null>(null);

  // Modals & Cross-tab Navigation State
  const [modalHabitation, setModalHabitation] = useState<Habitation | null>(null);
  const [modalSite, setModalSite] = useState<RelocationSite | null>(null);
  const [simulatorHabId, setSimulatorHabId] = useState<string | undefined>(undefined);
  const [simulatorSiteId, setSimulatorSiteId] = useState<string | undefined>(undefined);
  const [evacuationOrigin, setEvacuationOrigin] = useState<EvacuationOriginPayload | null>(null);

  // Initial load
  useEffect(() => {
    loadAllData();
  }, []);

  // CLAMP active tab to the current role's allowed navigation
  useEffect(() => {
    if (!currentUser) return;
    const tabs = getAccessibleTabs(currentUser.role);
    if (tabs.length > 0 && !tabs.includes(activeTab)) {
      setActiveTab(tabs[0]);
    }
  }, [currentUser, activeTab]);

  // RESOLVE region selection → map viewport (offline-first + geocode fallback)
  useEffect(() => {
    let cancelled = false;
    resolveRegionViewport(selectedRegion, habitations)
      .then((viewport) => {
        if (cancelled || !viewport) return;
        regionFocusKeyRef.current += 1;
        setRegionFocus({ ...viewport, key: String(regionFocusKeyRef.current) });
      })
      .catch(() => {
        /* leave map unchanged if resolution fails */
      });
    return () => {
      cancelled = true;
    };
  }, [selectedRegion, habitations]);

  const loadAllData = async () => {
    setLoading(true);
    try {
      const [
        sumData,
        habData,
        sitesData,
        zonesData,
        reportsData,
        recsData,
        infraData,
        eventsData,
        floodData,
        statusData,
      ] = await Promise.all([
        apiService.getDashboardSummary(),
        apiService.getHabitations(),
        apiService.getRelocationSites(),
        apiService.getRedZones(),
        apiService.getFieldReports(),
        apiService.getRecommendations(),
        apiService.getInfrastructure(),
        apiService.getHazardEvents(),
        apiService.getFloodForecast().catch(() => null),
        apiService.getDataStatus().catch(() => null),
      ]);

      setSummary(sumData);
      setHabitations(habData);
      setRelocationSites(sitesData);
      setRedZones(zonesData);
      setFieldReports(reportsData);
      setRecommendations(recsData);
      setInfrastructure(infraData);
      setHazardEvents(eventsData);
      setFloodForecast(floodData);
      setDataStatus(statusData?.layers ?? null);
    } catch (err) {
      console.error('Error loading initial data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Cross-module actions
  const handleLaunchSimulation = (habId: string, siteId?: string) => {
    setSimulatorHabId(habId);
    if (siteId) {
      setSimulatorSiteId(siteId);
    }
    setActiveTab('simulator');
  };

  const handleOpenEvacuation = (origin?: EvacuationOriginPayload | Habitation) => {
    if (origin && 'village_name' in origin) {
      setEvacuationOrigin({
        type: 'habitation',
        id: origin.id,
        label: origin.village_name,
        lat: origin.latitude,
        lng: origin.longitude,
      });
    } else if (origin) {
      setEvacuationOrigin(origin);
    } else {
      setEvacuationOrigin(null);
    }
    setActiveTab('evacuation');
  };

  const handleSwitchUser = (user: User) => {
    setCurrentUser(user);
    setEvacuationOrigin(null);
  };

  const handleEnterPortal = (user: User) => {
    setCurrentUser(user);
  };

  const handleResetData = async () => {
    await apiService.resetSeedData();
    await loadAllData();
  };

  const handleSubmitReport = async (reportData: Partial<FieldReport>) => {
    const created = await apiService.submitFieldReport({
      ...reportData,
      officer_name: currentUser.full_name,
    });
    setFieldReports((prev) => [created, ...prev]);
    return created;
  };

  const handleVerifyReport = async (reportId: string) => {
    const updated = await apiService.verifyFieldReport(reportId, currentUser.full_name);
    setFieldReports((prev) =>
      prev.map((r) => (r.id === reportId ? updated : r))
    );
    return updated;
  };

  const handleRecalculatePriority = async (params: any) => {
    const updatedHab = await apiService.recalculatePriority(params);
    setHabitations((prev) =>
      prev.map((h) => (h.id === updatedHab.id ? updatedHab : h))
    );
    // Refresh summary
    const newSummary = await apiService.getDashboardSummary();
    setSummary(newSummary);
    return updatedHab;
  };

  if (!currentUser) {
    return <AccessGate users={DEMO_USERS} onEnter={handleEnterPortal} />;
  }

  return (
    <div className="h-screen w-full flex flex-col bg-slate-100 text-slate-800 overflow-hidden font-sans antialiased">
      {/* Top Navbar */}
      <Navbar
        currentUser={currentUser}
        onSwitchUser={handleSwitchUser}
        onResetData={handleResetData}
        activeTab={activeTab}
        onSelectTab={(tab) => setActiveTab(tab)}
      />

      {/* Main Workspace Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar */}
        <Sidebar
          activeTab={activeTab}
          onSelectTab={(tab) => setActiveTab(tab)}
          userRole={currentUser.role}
          region={selectedRegion}
          onRegionChange={setSelectedRegion}
        />

        {/* Content Viewport */}
        <main
          id="main-app-content-viewport"
          className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-slate-50 flex flex-col gap-6"
        >
          {loading ? (
            <div className="flex flex-col items-center justify-center h-80 space-y-3">
              <div className="w-10 h-10 border-4 border-slate-300 border-t-red-600 rounded-full animate-spin" />
              <p className="text-sm font-semibold text-slate-600">
                Initializing Chamoli Multi-Hazard GIS Data...
              </p>
            </div>
          ) : (
            <>
              {activeTab === 'dashboard' && (
                <DashboardPage
                  summary={summary}
                  onSelectHabitation={(hab) => setModalHabitation(hab)}
                  onNavigateTab={(tab) => setActiveTab(tab)}
                />
              )}

              {activeTab === 'map' && (
                <GisMapPage
                  habitations={habitations}
                  relocationSites={relocationSites}
                  redZones={redZones}
                  infrastructure={infrastructure}
                  onSelectHabitation={(hab) => setModalHabitation(hab)}
                  onSelectSite={(site) => setModalSite(site)}
                  focusRegion={regionFocus}
                  onOpenEvacuation={(hab) => handleOpenEvacuation(hab)}
                  floodForecast={floodForecast}
                  dataStatus={dataStatus}
                />
              )}

              {activeTab === 'alerts' && (
                <RiskAlertsPage redZones={redZones} events={hazardEvents} />
              )}

              {activeTab === 'habitations' && (
                <HabitationsPage
                  habitations={habitations}
                  onSelectHabitation={(hab) => setModalHabitation(hab)}
                  onSimulateHabitation={(habId) => handleLaunchSimulation(habId)}
                  onPlanEvacuation={(hab) => handleOpenEvacuation(hab)}
                />
              )}

              {activeTab === 'priority' && (
                <PriorityPage
                  habitations={habitations}
                  recommendations={recommendations}
                  onSelectHabitation={(hab) => setModalHabitation(hab)}
                  onSimulate={(habId, siteId) => handleLaunchSimulation(habId, siteId)}
                  onPlanEvacuation={(hab) => handleOpenEvacuation(hab)}
                  onRecalculatePriority={handleRecalculatePriority}
                />
              )}

              {activeTab === 'simulator' && (
                <SimulatorPage
                  habitations={habitations}
                  relocationSites={relocationSites}
                  initialHabitationId={simulatorHabId}
                  initialSiteId={simulatorSiteId}
                  onSimulate={(habId, siteId, fams) =>
                    apiService.simulateRelocation(habId, siteId, fams)
                  }
                  onPlanEvacuation={(hab) => handleOpenEvacuation(hab)}
                />
              )}

              {activeTab === 'evacuation' && (
                <EvacuationPlanPage
                  habitations={habitations}
                  hazardEvents={hazardEvents}
                  relocationSites={relocationSites}
                  redZones={redZones}
                  infrastructure={infrastructure}
                  initialOrigin={evacuationOrigin}
                />
              )}

              {activeTab === 'field_reports' && (
                <FieldReportsPage
                  reports={fieldReports}
                  habitations={habitations}
                  currentUser={currentUser}
                  onSubmitReport={handleSubmitReport}
                  onVerifyReport={handleVerifyReport}
                  onSelectHabitation={(hab) => setModalHabitation(hab)}
                />
              )}

              {activeTab === 'directive' && (
                <ReportsPage
                  habitations={habitations}
                  relocationSites={relocationSites}
                  recommendations={recommendations}
                />
              )}

              {activeTab === 'admin' && (
                <AdminPage
                  currentUser={currentUser}
                  onSwitchUser={handleSwitchUser}
                  onResetSeedData={handleResetData}
                />
              )}

              {activeTab === 'docs' && <DocsPage />}
            </>
          )}
        </main>
      </div>

      {/* Professional Polish Standard Footer */}
      <footer className="h-8 bg-white border-t border-slate-200 px-6 flex items-center justify-between text-[10px] text-slate-400 font-medium shrink-0">
        <div>&copy; 2024 NammaSafe AI - Govt of India Pilot Program</div>
        <div className="flex items-center gap-4">
          <span className="hidden sm:inline">v1.0.4-beta (Monsoon Release)</span>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-slate-500 font-semibold">System Operational</span>
          </div>
        </div>
      </footer>

      {/* Village Deep Risk Inspection Modal */}
      {modalHabitation && (
        <VillageModal
          habitation={modalHabitation}
          historicalEvents={hazardEvents.filter(
            (e) => e.habitation_id === modalHabitation.id
          )}
          recommendation={recommendations.find(
            (r) => r.habitation_id === modalHabitation.id
          )}
          onClose={() => setModalHabitation(null)}
          onSimulate={(habId) => handleLaunchSimulation(habId)}
          onPlanEvacuation={(hab) => handleOpenEvacuation(hab)}
        />
      )}

      {/* Relocation Site Carrying Capacity Inspection Modal */}
      {modalSite && (
        <SiteModal
          site={modalSite}
          onClose={() => setModalSite(null)}
          onSimulate={(siteId) => {
            setSimulatorSiteId(siteId);
            setActiveTab('simulator');
          }}
        />
      )}
    </div>
  );
}
