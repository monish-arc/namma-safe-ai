import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Route as RouteIcon,
  MapPin,
  AlertTriangle,
  Ban,
  Loader2,
  PlayCircle,
  CheckCircle2,
} from 'lucide-react';
import {
  Habitation,
  HazardEvent,
  RelocationSite,
  RedZone,
  MapLayerItem,
  EvacuationPlanResponse,
  EvacuationOriginPayload,
  RoadConditionsResponse,
} from '../types';
import { LeafletMap } from '../components/LeafletMap';
import { apiService } from '../services/api';

interface EvacuationPlanPageProps {
  habitations: Habitation[];
  hazardEvents?: HazardEvent[];
  relocationSites: RelocationSite[];
  redZones: RedZone[];
  infrastructure: MapLayerItem[];
  initialOrigin?: EvacuationOriginPayload | null;
}

const STATUS_STYLES: Record<string, { label: string; cls: string }> = {
  SAFE: { label: 'SAFE ROUTE', cls: 'bg-emerald-600 text-white' },
  CAUTION: { label: 'CAUTION', cls: 'bg-amber-500 text-white' },
  NO_ROUTE: { label: 'NO SAFE ROAD ROUTE', cls: 'bg-red-600 text-white' },
  NO_SAFE_SITE: { label: 'NO SAFE DESTINATION', cls: 'bg-red-600 text-white' },
};

export const EvacuationPlanPage: React.FC<EvacuationPlanPageProps> = ({
  habitations,
  hazardEvents = [],
  relocationSites,
  redZones,
  infrastructure,
  initialOrigin,
}) => {
  const [originType, setOriginType] = useState<EvacuationOriginPayload['type']>('habitation');
  const [originId, setOriginId] = useState<string>('hab-joshimath');
  const [families, setFamilies] = useState(100);
  const [pickEnabled, setPickEnabled] = useState(false);
  const [picked, setPicked] = useState<{ lat: number; lng: number } | null>(null);

  const [route, setRoute] = useState<EvacuationPlanResponse | null>(null);
  const [roadConditions, setRoadConditions] = useState<RoadConditionsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadConditions = useCallback(async () => {
    try {
      setRoadConditions(await apiService.getRoadConditions());
    } catch {
      setRoadConditions(null);
    }
  }, []);

  useEffect(() => {
    loadConditions();
  }, [loadConditions]);

  // Apply an origin handed over from CTAs (village modal, matrix, habitation list).
  useEffect(() => {
    if (!initialOrigin) return;
    setOriginType(initialOrigin.type ?? 'habitation');
    setPicked(initialOrigin.lat && initialOrigin.lng ? { lat: initialOrigin.lat, lng: initialOrigin.lng } : null);
    if (initialOrigin.id) setOriginId(initialOrigin.id);
    setRoute(null);
  }, [initialOrigin]);

  const selectedHab = useMemo(
    () => habitations.find((h) => h.id === originId) ?? habitations[0],
    [habitations, originId]
  );
  const selectedEvent = useMemo(
    () => hazardEvents.find((e) => e.id === originId) ?? hazardEvents[0],
    [hazardEvents, originId]
  );

  const buildOrigin = useCallback((): EvacuationOriginPayload => {
    if (originType === 'map_click') {
      return {
        type: 'map_click',
        id: 'map-click',
        label: picked ? `${picked.lat.toFixed(4)}, ${picked.lng.toFixed(4)}` : undefined,
        lat: picked?.lat,
        lng: picked?.lng,
      };
    }
    if (originType === 'event') {
      if (!selectedEvent) throw new Error('Select an active event as the origin first');
      return { type: 'event', id: selectedEvent.id, label: selectedEvent.habitation_name ?? selectedEvent.id };
    }
    if (!selectedHab) throw new Error('Select an origin habitation first');
    return { type: 'habitation', id: selectedHab.id, label: selectedHab.village_name };
  }, [originType, picked, selectedEvent, selectedHab]);

  const runPlan = async () => {
    setError(null);
    setLoading(true);
    try {
      if (originType === 'map_click' && !picked) {
        setError('Click on the map to choose an evacuation origin point, or pick a village.');
        setLoading(false);
        return;
      }
      const origin = buildOrigin();
      const result = await apiService.planEvacuation(origin, families, undefined);
      setRoute(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Evacuation planning failed');
    } finally {
      setLoading(false);
    }
  };

  const confirmRoute = async () => {
    if (!route?.route_id) return;
    setConfirming(true);
    setError(null);
    try {
      const updated = await apiService.confirmEvacuationRoute(route.route_id, 'approved', 'Route verified by district EOC');
      setRoute(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not confirm route');
    } finally {
      setConfirming(false);
    }
  };

  const handleMapPick = (lat: number, lng: number) => {
    setPicked({ lat, lng });
    setPickEnabled(false);
  };

  const statusStyle = STATUS_STYLES[route?.route_status ?? ''] ?? {
    label: route?.route_status ?? 'PLAN FIRST',
    cls: 'bg-slate-600 text-white',
  };
  const isConfirmed = route?.status === 'confirmed';

  return (
    <div id="evacuation-plan-page" className="space-y-4 animate-in fade-in duration-200">
      {/* Header */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center">
            <RouteIcon className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900">Safe Evacuation Route Planner</h2>
            <p className="text-[11px] text-slate-500">
              Risk-aware routing on the curated NH-07 + feeder corridor — no straight-line shortcuts, every closed corridor honored.
            </p>
          </div>
        </div>
        {route?.route_id && (
          <div className="flex items-center gap-2 text-[11px]">
            <span className="bg-slate-100 px-2 py-1 rounded text-slate-600 font-medium">#{route.route_id}</span>
            <button
              id="evacuation-replan-button"
              onClick={runPlan}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-[11px] font-bold hover:bg-blue-700 transition disabled:opacity-50"
            >
              <PlayCircle className="w-3.5 h-3.5" /> Re-plan
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Planner Controls */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 space-y-4 lg:col-span-1">
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
              Evacuation origin
            </label>
            <select
              id="evacuation-origin-type"
              value={originType}
              onChange={(e) => {
                setOriginType(e.target.value as EvacuationOriginPayload['type']);
                if (e.target.value === 'map_click') setPicked(null);
              }}
              className="w-full text-xs p-2 border border-slate-200 rounded-lg bg-slate-50 text-slate-800 font-medium focus:ring-1 focus:ring-blue-500 outline-none"
            >
              <option value="habitation">Village / habitation</option>
              <option value="event">Linked disaster event</option>
              <option value="map_click">Map-clicked point</option>
            </select>
          </div>

          {originType !== 'map_click' && (
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                {originType === 'event' ? 'Active event' : 'Village'}
              </label>
              {originType === 'event' ? (
                <select
                  id="evacuation-origin-event"
                  value={selectedEvent?.id ?? ''}
                  onChange={(e) => setOriginId(e.target.value)}
                  className="w-full text-xs p-2 border border-slate-200 rounded-lg bg-slate-50 text-slate-800 font-medium focus:ring-1 focus:ring-blue-500 outline-none"
                >
                  {hazardEvents.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.habitation_name ?? e.id} — {e.hazard_type}
                    </option>
                  ))}
                </select>
              ) : (
                <select
                  id="evacuation-origin-habitation"
                  value={selectedHab?.id ?? ''}
                  onChange={(e) => setOriginId(e.target.value)}
                  className="w-full text-xs p-2 border border-slate-200 rounded-lg bg-slate-50 text-slate-800 font-medium focus:ring-1 focus:ring-blue-500 outline-none"
                >
                  {habitations.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.village_name} (Risk {h.priority_score})
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          {originType === 'map_click' && (
            <div className="p-3 rounded-lg bg-blue-50 border border-blue-200 text-[11px] text-blue-800">
              {picked ? (
                <span>
                  Chosen point: <strong>{picked.lat.toFixed(4)}, {picked.lng.toFixed(4)}</strong>
                </span>
              ) : (
                <span className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5" /> Enable map picking, then click the map.
                </span>
              )}
            </div>
          )}

          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
              Families planned
            </label>
            <input
              id="evacuation-families-input"
              type="number"
              min={1}
              max={50000}
              value={families}
              onChange={(e) => setFamilies(Math.max(1, Number(e.target.value) || 1))}
              className="w-full text-xs p-2 border border-slate-200 rounded-lg bg-slate-50 text-slate-800 font-medium focus:ring-1 focus:ring-blue-500 outline-none"
            />
          </div>

          {originType === 'map_click' && (
            <button
              id="evacuation-pick-button"
              onClick={() => setPickEnabled((on) => !on)}
              className={`w-full px-3 py-2 rounded-lg text-[11px] font-bold transition border ${
                pickEnabled ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-blue-700 border-blue-300 hover:bg-blue-50'
              }`}
            >
              {pickEnabled ? 'Picking origin on map…' : 'Pick origin on map'}
            </button>
          )}

          <button
            id="evacuation-plan-button"
            onClick={runPlan}
            disabled={loading}
            className="w-full inline-flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition disabled:opacity-50 cursor-pointer"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RouteIcon className="w-4 h-4" />}
            {loading ? 'Planning safest route…' : 'Plan evacuation route'}
          </button>

          {error && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-[11px] text-red-800 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {route && ['NO_ROUTE', 'NO_SAFE_SITE'].includes(route.route_status) && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-[11px] text-red-800">
              <strong>
                {route.route_status === 'NO_SAFE_SITE'
                  ? 'NO_SAFE_SITE — No safe destination with capacity'
                  : 'NO_ROUTE — No open, safe road corridor'}
              </strong>
              <ul className="list-disc pl-4 mt-1 space-y-0.5">
                {(route.warnings ?? []).slice(0, 4).map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Map */}
        <div className="lg:col-span-2 h-[560px] rounded-xl overflow-hidden border border-slate-200 shadow-sm">
          <LeafletMap
            habitations={habitations}
            relocationSites={relocationSites}
            redZones={redZones}
            infrastructure={infrastructure}
            selectedHabitationId={pickEnabled ? undefined : selectedHab?.id}
            evacuationRoute={route}
            evacuationRoadConditions={roadConditions}
            evacuationPickEnabled={pickEnabled}
            onEvacuationOriginPicked={handleMapPick}
          />
        </div>
      </div>

      {/* Route Result Summary */}
      {route && route.destination && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-slate-200">
            <div className="bg-white p-4">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Route status</p>
              <span className={`inline-block mt-1.5 px-2 py-1 rounded-md text-[11px] font-bold ${statusStyle.cls}`}>
                {statusStyle.label}
              </span>
            </div>
            <div className="bg-white p-4">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Safe destination</p>
              <p className="mt-1.5 text-sm font-bold text-slate-900">{route.destination.site_name}</p>
              <p className="text-[11px] text-slate-500">
                Capacity {route.destination.available_capacity_families} families · {route.destination.distance_km?.toFixed(1)} km
              </p>
            </div>
            <div className="bg-white p-4">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Distance / time</p>
              <p className="mt-1.5 text-sm font-bold text-slate-900">
                {route.distance_km?.toFixed(1)} km · ~{route.travel_time_min ?? '—'} min
              </p>
              <p className="text-[11px] text-slate-500">
                Safety {route.safety_score ?? '—'}/100 · Risk {route.risk_score ?? '—'}/100
              </p>
            </div>
            <div className="bg-white p-4 flex items-end justify-end">
              {route.route_status !== 'NO_ROUTE' && route.route_status !== 'NO_SAFE_SITE' && route.route_id && (
                <button
                  id="evacuation-confirm-button"
                  onClick={confirmRoute}
                  disabled={confirming || isConfirmed}
                  className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                    isConfirmed
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-300'
                      : 'bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50'
                  }`}
                >
                  {confirming ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                  {isConfirmed
                    ? `Confirmed ${route.confirmed_at ? route.confirmed_at.slice(0, 19).replace('T', ' ') : ''}`
                    : route.route_status === 'CAUTION'
                      ? 'Confirm with caution'
                      : 'Confirm & dispatch'}
                </button>
              )}
            </div>
          </div>

          <div className="p-4 border-t border-slate-200 space-y-3">
            <p className="text-xs text-slate-700 leading-relaxed">
              <span className="font-bold text-slate-900">Why this route: </span>
              {route.route_reason ?? route.selected_site_reason}
            </p>

            {(route.hazards_encountered?.length ?? 0) > 0 && (
              <div>
                <p className="text-[10px] font-bold text-amber-600 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" /> Hazard segments on route ({route.hazards_encountered?.length})
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {(route.hazards_encountered ?? []).map((h, i) => (
                    <div key={i} className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-[11px] text-amber-900">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold truncate">{h.road ?? 'Segment'}</span>
                        <span
                          className={`px-1.5 py-0.5 rounded text-[9px] font-bold shrink-0 ${
                            h.risk_level === 'Critical'
                              ? 'bg-red-600 text-white'
                              : h.risk_level === 'High'
                                ? 'bg-amber-500 text-white'
                                : 'bg-slate-200 text-slate-700'
                          }`}
                        >
                          {h.risk_level ?? '—'}
                        </span>
                      </div>
                      <p className="mt-1 text-amber-800">{h.zone_name ?? h.hazard_type ?? 'Hazard'}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {(route.blocked_segments?.length ?? 0) > 0 && (
              <div>
                <p className="text-[10px] font-bold text-red-600 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                  <Ban className="w-3.5 h-3.5" /> Closed corridors avoided ({route.blocked_segments?.length})
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {(route.blocked_segments ?? []).map((b, i) => (
                    <div key={i} className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-[11px] text-red-900">
                      <span className="font-bold">{b.name}</span>
                      <p className="mt-0.5 text-red-800">✕ {b.reason}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {route.is_synthetic_route && (
              <p className="text-[10px] text-slate-400 italic">
                Pilot data: route validated on the curated_demo corridor graph (NH-07 + key feeders); not live network telemetry.
              </p>
            )}

            {(route.data_sources?.length ?? 0) > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Data source</span>
                {route.data_sources!.map((ds, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-[9px] font-bold text-slate-600"
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full inline-block ${
                        ds.status === 'curated_demo' || ds.status === 'DEMO'
                          ? 'bg-amber-400'
                          : ds.status === 'LIVE'
                            ? 'bg-emerald-400'
                            : 'bg-slate-400'
                      }`}
                    />
                    {ds.layer.replace(/_/g, ' ')} · {ds.status.replace(/_/g, ' ')}
                  </span>
                ))}
                <span
                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-[9px] font-bold text-amber-700"
                  title="Flood boundaries are synthetic demo readings; connect GOOGLE_FLOOD_API_KEY for live forecasts."
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block" />
                  flood forecast · DEMO
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};