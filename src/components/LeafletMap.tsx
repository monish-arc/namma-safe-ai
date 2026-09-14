import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { Habitation, RelocationSite, RedZone, MapLayerItem, EvacuationPlanResponse, RoadConditionsResponse, FloodForecastResponse, DataStatusEntry, BasemapKey } from '../types';
import type { RegionViewportFocus } from '../lib/regionViewport';
import { MapLayerPanel } from './MapLayerPanel';
import { DataSourceStatus } from './DataSourceStatus';

interface LeafletMapProps {
  habitations: Habitation[];
  relocationSites: RelocationSite[];
  redZones: RedZone[];
  infrastructure: MapLayerItem[];
  selectedHabitationId?: string;
  selectedSiteId?: string;
  focus?: RegionViewportFocus | null;
  onSelectHabitation: (hab: Habitation) => void;
  onSelectSite: (site: RelocationSite) => void;
  evacuationRoute?: EvacuationPlanResponse | null;
  evacuationRoadConditions?: RoadConditionsResponse | null;
  evacuationPickEnabled?: boolean;
  onEvacuationOriginPicked?: (lat: number, lng: number) => void;
  floodForecast?: FloodForecastResponse | null;
  dataStatus?: DataStatusEntry[] | null;
}

export const LeafletMap: React.FC<LeafletMapProps> = ({
  habitations,
  relocationSites,
  redZones,
  infrastructure,
  selectedHabitationId,
  selectedSiteId,
  focus,
  onSelectHabitation,
  onSelectSite,
  evacuationRoute,
  evacuationRoadConditions,
  evacuationPickEnabled = false,
  onEvacuationOriginPicked,
  floodForecast = null,
  dataStatus = null,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const basemapLayerRef = useRef<L.Layer | null>(null);
  const pickEnabledRef = useRef(evacuationPickEnabled);
  const onPickRef = useRef(onEvacuationOriginPicked);
  pickEnabledRef.current = evacuationPickEnabled;
  onPickRef.current = onEvacuationOriginPicked;
  const layersGroupRef = useRef<{
    redZonesLayer?: L.LayerGroup;
    habitationsLayer?: L.LayerGroup;
    sitesLayer?: L.LayerGroup;
    infraLayer?: L.LayerGroup;
    routeLayer?: L.LayerGroup;
    floodLayer?: L.LayerGroup;
  }>({});

  // Layer toggles
  const [basemap, setBasemap] = useState<BasemapKey['id']>('street');
  const [showRedZones, setShowRedZones] = useState(true);
  const [visibleHazardTypes, setVisibleHazardTypes] = useState<string[]>([]);
  const [showHabitations, setShowHabitations] = useState(true);
  const [showSites, setShowSites] = useState(true);
  const [showInfra, setShowInfra] = useState(true);
  const [showRoute, setShowRoute] = useState(true);
  const [showFlood, setShowFlood] = useState(false);
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [basemapError, setBasemapError] = useState<string | null>(null);

  const availableHazardTypes = Array.from(new Set(redZones.map((z) => z.hazard_type)));
  const hasFloodData = Boolean(floodForecast && (floodForecast.gauges.length > 0 || floodForecast.zones.length > 0));

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [30.42, 79.35],
      zoom: 10,
      zoomControl: false,
    });

    // Add clean zoom control top-right
    L.control.zoom({ position: 'topright' }).addTo(map);

    // Initialize layer groups
    layersGroupRef.current.redZonesLayer = L.layerGroup().addTo(map);
    layersGroupRef.current.habitationsLayer = L.layerGroup().addTo(map);
    layersGroupRef.current.sitesLayer = L.layerGroup().addTo(map);
    layersGroupRef.current.infraLayer = L.layerGroup().addTo(map);
    layersGroupRef.current.routeLayer = L.layerGroup().addTo(map);
    layersGroupRef.current.floodLayer = L.layerGroup().addTo(map);

    mapInstanceRef.current = map;

    // Debug hook so automated checks can assert map relocation.
    (window as unknown as { __namsafeMap?: L.Map }).__namsafeMap = map;

    // Evacuation origin picking on click
    map.on('click', (event: L.LeafletMouseEvent) => {
      if (!pickEnabledRef.current) return;
      onPickRef.current?.(event.latlng.lat, event.latlng.lng);
    });

    // Handle container resize
    const resizeObserver = new ResizeObserver(() => {
      map.invalidateSize();
    });
    resizeObserver.observe(mapContainerRef.current);

    return () => {
      resizeObserver.disconnect();
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Basemap switcher: Google Maps (primary) / Esri+OSM (fallback when no API key)
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Remove old basemap layer (may be TileLayer or LayerGroup)
    if (basemapLayerRef.current) {
      map.removeLayer(basemapLayerRef.current);
      basemapLayerRef.current = null;
    }

    setBasemapError(null);

    const googleKey = (import.meta as { env?: Record<string, string> }).env?.VITE_GOOGLE_MAPS_API_KEY || '';

    if (googleKey) {
      // --- Google Maps Platform tiles (official Map Tiles API) ---
      const lyrsMap: Record<BasemapKey['id'], string> = {
        street: 'm',
        satellite: 'y',
      };
      const lyrs = lyrsMap[basemap] ?? 'm';
      const url = `https://maps.googleapis.com/maps/vt?lyrs=${lyrs}&x={x}&y={y}&z={z}&key=${googleKey}`;
      const attribution = 'Map data &copy; <a href="https://www.google.com/maps">Google</a> | NammaSafe AI';
      const layer = L.tileLayer(url, {
        attribution,
        maxZoom: 21,
        subdomains: [],
      });
      layer.on('tileerror', () => setBasemapError('MAP SOURCE UNAVAILABLE'));
      basemapLayerRef.current = layer.addTo(map);
    } else {
      // --- Esri + OSM fallback (all free, no key) ---
      const ESRI_ATTR = 'Tiles &copy; Esri | NammaSafe AI';

      if (basemap === 'street') {
        // OpenStreetMap standard tiles — real content at every native zoom (z0-19)
        const street = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors | NammaSafe AI',
          maxZoom: 18,
        });
        street.on('tileerror', () => setBasemapError('MAP SOURCE UNAVAILABLE'));
        basemapLayerRef.current = street.addTo(map);
      } else if (basemap === 'satellite') {
        // Satellite imagery (base) + CartoDB transparent label/road overlay
        // CartoDB only_labels tiles are transparent PNG — no opaque background,
        // so satellite imagery stays fully visible with labels/roads on top.
        const imagery = L.tileLayer(
          'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
          {
            attribution: `${ESRI_ATTR} — Source: Esri, Maxar, Earthstar Geographics`,
            maxZoom: 18,
          }
        );
        const labels = L.tileLayer(
          'https://basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}.png',
          {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/">CARTO</a>',
            maxZoom: 18,
          }
        );
        labels.on('tileerror', () => setBasemapError('MAP SOURCE UNAVAILABLE — labels unavailable'));
        basemapLayerRef.current = L.layerGroup([imagery, labels]).addTo(map);
      }
    }

    // Expose which provider is active for the data-status panel
    (window as unknown as { __namsafeBasemapProvider?: string }).__namsafeBasemapProvider = googleKey ? 'google' : 'esri_fallback';
  }, [basemap]);

  // Keep hazard sub-toggles in sync with whatever zones are loaded
  useEffect(() => {
    setVisibleHazardTypes((prev) => {
      if (availableHazardTypes.length === 0) return prev;
      const missing = availableHazardTypes.filter((t) => !prev.includes(t));
      return missing.length > 0 ? [...prev, ...missing] : prev;
    });
  }, [availableHazardTypes.length]);

  // Update Red Zones Layer
  useEffect(() => {
    const layer = layersGroupRef.current.redZonesLayer;
    if (!layer || !mapInstanceRef.current) return;
    layer.clearLayers();

    if (!showRedZones) return;

    redZones.forEach((zone) => {
      if (visibleHazardTypes.length > 0 && !visibleHazardTypes.includes(zone.hazard_type)) return;

      const getZoneColor = (type: string) => {
        switch (type) {
          case 'Land Subsidence':
            return { fill: '#dc2626', stroke: '#991b1b' }; // red
          case 'Flash Flood':
            return { fill: '#0284c7', stroke: '#0369a1' }; // blue
          case 'Landslide':
            return { fill: '#ea580c', stroke: '#c2410c' }; // orange
          case 'Cloudburst':
            return { fill: '#9333ea', stroke: '#7e22ce' }; // purple
          default:
            return { fill: '#ef4444', stroke: '#b91c1c' };
        }
      };

      const colors = getZoneColor(zone.hazard_type);

      // GeoJSON Polygon
      const geoJsonLayer = L.geoJSON(zone.zone_geometry as any, {
        style: {
          color: colors.stroke,
          weight: 2,
          opacity: 0.8,
          fillColor: colors.fill,
          fillOpacity: 0.25,
          dashArray: zone.hazard_type === 'Land Subsidence' ? '6, 4' : undefined,
        },
      });

      geoJsonLayer.bindTooltip(
        `<strong>${zone.zone_name}</strong><br/><span style="color:${colors.stroke}">${zone.hazard_type}</span> | Risk: ${zone.hazard_score}/100`,
        { sticky: true, className: 'leaflet-custom-tooltip' }
      );

      layer.addLayer(geoJsonLayer);
    });
  }, [redZones, showRedZones, visibleHazardTypes]);

  // Update Flood Forecast Layer (river gauges + inundation zones)
  useEffect(() => {
    const layer = layersGroupRef.current.floodLayer;
    if (!layer || !mapInstanceRef.current) return;
    layer.clearLayers();

    if (!showFlood || !floodForecast) return;

    // Gauges (colored by risk level)
    floodForecast.gauges.forEach((gauge) => {
      const riskColor =
        gauge.risk_level === 'EXTREME'
          ? '#dc2626'
          : gauge.risk_level === 'HIGH'
            ? '#ea580c'
            : gauge.risk_level === 'MODERATE'
              ? '#d97706'
              : '#10b981';

      const circle = L.circleMarker([gauge.latitude, gauge.longitude], {
        radius: 9,
        color: '#0f172a',
        weight: 2,
        fillColor: riskColor,
        fillOpacity: 0.9,
      });

      circle.bindTooltip(
        `<strong>${gauge.gauge_name}</strong><br/>River: ${gauge.river}<br/>Level: ${gauge.current_level_m.toFixed(2)} m (warning ${gauge.warning_level_m.toFixed(2)}, danger ${gauge.danger_level_m.toFixed(2)})<br/>Risk: <span style="color:${riskColor};font-weight:bold">${gauge.risk_level}</span> <em>(${gauge.data_status ?? 'DEMO'})</em>`,
        { sticky: true }
      );

      layer.addLayer(circle);
    });

    // Inundation zones (HIGH/EXTREME river gauges)
    floodForecast.zones.forEach((zone) => {
      const zoneLayer = L.geoJSON(zone.geometry as any, {
        style: {
          color: '#0369a1',
          weight: 2,
          opacity: 0.8,
          fillColor: '#0284c7',
          fillOpacity: 0.28,
          dashArray: '5, 5',
        },
      });
      zoneLayer.bindTooltip(
        `<strong>${zone.gauge_name} — ${zone.risk_level} flood</strong><br/>River: ${zone.river}<br/>Possible inundation zone`,
        { sticky: true }
      );
      layer.addLayer(zoneLayer);
    });
  }, [floodForecast, showFlood]);

  // Update Habitations Layer
  useEffect(() => {
    const layer = layersGroupRef.current.habitationsLayer;
    if (!layer || !mapInstanceRef.current) return;
    layer.clearLayers();

    if (!showHabitations) return;

    const filtered = habitations.filter((h) => {
      if (priorityFilter === 'all') return true;
      return h.priority_level.toLowerCase() === priorityFilter.toLowerCase();
    });

    filtered.forEach((hab) => {
      const getMarkerColor = (level: string) => {
        switch (level) {
          case 'Immediate Relocation':
            return { bg: '#dc2626', border: '#7f1d1d', text: '#ffffff' };
          case 'Short-Term Relocation':
            return { bg: '#f59e0b', border: '#b45309', text: '#ffffff' };
          case 'Medium-Term Relocation':
            return { bg: '#eab308', border: '#a16207', text: '#ffffff' };
          case 'Monitor Only':
          default:
            return { bg: '#10b981', border: '#047857', text: '#ffffff' };
        }
      };

      const c = getMarkerColor(hab.priority_level);
      const isSelected = hab.id === selectedHabitationId;

      const iconHtml = `
        <div class="cursor-pointer transition-transform hover:scale-110" style="
          display: flex;
          align-items: center;
          justify-content: center;
          width: 32px;
          height: 32px;
          background-color: ${c.bg};
          border: ${isSelected ? '3px solid #1e293b' : `2px solid ${c.border}`};
          border-radius: 50%;
          box-shadow: 0 4px 6px -1px rgba(0,0,0,0.3);
          color: ${c.text};
          font-weight: 700;
          font-size: 11px;
          outline: ${isSelected ? '3px solid #ef4444' : 'none'};
        ">
          ${Math.round(hab.priority_score)}
        </div>
      `;

      const customIcon = L.divIcon({
        html: iconHtml,
        className: 'custom-village-icon',
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });

      const marker = L.marker([hab.latitude, hab.longitude], { icon: customIcon });

      marker.bindTooltip(
        `<strong>${hab.village_name}</strong><br/>Priority: <span style="font-weight:bold">${hab.priority_score} (${hab.priority_level})</span><br/>Pop: ${hab.population.toLocaleString()}`,
        { direction: 'top', offset: [0, -16] }
      );

      marker.on('click', () => {
        onSelectHabitation(hab);
      });

      layer.addLayer(marker);
    });
  }, [habitations, showHabitations, priorityFilter, selectedHabitationId, onSelectHabitation]);

  // Update Relocation Sites Layer
  useEffect(() => {
    const layer = layersGroupRef.current.sitesLayer;
    if (!layer || !mapInstanceRef.current) return;
    layer.clearLayers();

    if (!showSites) return;

    relocationSites.forEach((site) => {
      const isSelected = site.id === selectedSiteId;

      const iconHtml = `
        <div class="cursor-pointer transition-transform hover:scale-110" style="
          display: flex;
          align-items: center;
          justify-content: center;
          width: 36px;
          height: 36px;
          background-color: #047857;
          border: ${isSelected ? '3px solid #facc15' : '2px solid #065f46'};
          border-radius: 8px;
          box-shadow: 0 4px 10px rgba(4, 120, 87, 0.4);
          color: #ffffff;
          font-size: 16px;
        ">
          🛡️
        </div>
      `;

      const customIcon = L.divIcon({
        html: iconHtml,
        className: 'custom-site-icon',
        iconSize: [36, 36],
        iconAnchor: [18, 18],
      });

      const marker = L.marker([site.latitude, site.longitude], { icon: customIcon });

      marker.bindTooltip(
        `<strong>${site.site_name} (SAFE ZONE)</strong><br/>Suitability: ${site.suitability_score}/100<br/>Avail Capacity: ${site.available_capacity_families} families`,
        { direction: 'top', offset: [0, -18] }
      );

      // Add a 2km safe buffer circle
      const buffer = L.circle([site.latitude, site.longitude], {
        radius: 2000,
        color: '#10b981',
        weight: 1,
        fillColor: '#34d399',
        fillOpacity: 0.15,
      });

      marker.on('click', () => {
        onSelectSite(site);
      });

      layer.addLayer(buffer);
      layer.addLayer(marker);
    });
  }, [relocationSites, showSites, selectedSiteId, onSelectSite]);

  // Update Infrastructure Layer
  useEffect(() => {
    const layer = layersGroupRef.current.infraLayer;
    if (!layer || !mapInstanceRef.current) return;
    layer.clearLayers();

    if (!showInfra) return;

    infrastructure.forEach((item) => {
      const isHospital = item.type === 'hospital';
      const isSchool = item.type === 'school';

      const iconChar = isHospital ? '🏥' : isSchool ? '🏫' : '🛣️';

      const customIcon = L.divIcon({
        html: `
          <div style="
            display: flex;
            align-items: center;
            justify-content: center;
            width: 26px;
            height: 26px;
            background: white;
            border: 1px solid #94a3b8;
            border-radius: 50%;
            font-size: 14px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.2);
          ">
            ${iconChar}
          </div>
        `,
        className: 'infra-icon',
        iconSize: [26, 26],
        iconAnchor: [13, 13],
      });

      const marker = L.marker([item.latitude, item.longitude], { icon: customIcon });
      marker.bindTooltip(
        `<strong>${item.name}</strong><br/><span style="text-transform:capitalize;color:#475569">${item.type.replace('_', ' ')}</span>: ${item.capacity_or_type}`,
        { direction: 'top', offset: [0, -13] }
      );

      layer.addLayer(marker);
    });
  }, [infrastructure, showInfra]);

  // Update Evacuation Route + Blocked/Closed Road Overlay
  useEffect(() => {
    const layer = layersGroupRef.current.routeLayer;
    if (!layer || !mapInstanceRef.current) return;
    layer.clearLayers();

    if (!showRoute) return;

    const routeColor =
      evacuationRoute?.route_status === 'SAFE' ? '#10b981' : evacuationRoute?.route_status === 'CAUTION' ? '#f59e0b' : '#64748b';

    // 1) Closed / restricted road conditions (drawn first, under the route)
    const highlightedStatuses = new Set<string>(['CLOSED', 'RESTRICTED', 'HIGH_RISK_EXIT']);
    (evacuationRoadConditions?.segments ?? []).forEach((seg) => {
      if (!seg.geometry || !highlightedStatuses.has(seg.status)) return;
      const latlngs = seg.geometry.coordinates.map(([lng, lat]) => [lat, lng] as [number, number]);
      const closed = seg.status === 'CLOSED';
      const polyline = L.polyline(latlngs, {
        color: closed ? '#dc2626' : '#f97316',
        weight: 6,
        opacity: 0.7,
        dashArray: closed ? '8, 6' : '2, 6',
      }).bindTooltip(`<strong>${seg.name}</strong><br/>Status: ${closed ? 'Closed' : 'Restricted'} (walk/exit only)`, { sticky: true });
      layer.addLayer(polyline);
    });

    // 2) Immediate blocked segments near the route corridor
    (evacuationRoute?.blocked_segments ?? []).forEach((block) => {
      if (!block.geometry) return;
      const latlngs = block.geometry.coordinates.map(([lng, lat]) => [lat, lng] as [number, number]);
      const polyline = L.polyline(latlngs, {
        color: '#dc2626',
        weight: 7,
        opacity: 0.8,
        dashArray: '8, 6',
      }).bindTooltip(`<strong>BLOCKED</strong> ${block.name}<br/>${block.reason}`, { sticky: true });
      layer.addLayer(polyline);
    });

    // 3) The recommended route itself
    if (evacuationRoute?.route_geometry?.coordinates?.length) {
      const latlngs = evacuationRoute.route_geometry.coordinates.map(([lng, lat]) => [lat, lng] as [number, number]);
      const routePolyline = L.polyline(latlngs, {
        color: routeColor,
        weight: 5,
        opacity: 0.95,
      }).bindTooltip(
        `<strong>${evacuationRoute.route_status ?? ''} route</strong><br/>${evacuationRoute.destination?.site_name ?? ''}<br/>${evacuationRoute.distance_km?.toFixed(1) ?? '—'} km · ~${evacuationRoute.travel_time_min ?? '—'} min`,
        { sticky: true }
      );
      layer.addLayer(routePolyline);

      // Origin marker
      const origin = evacuationRoute.origin;
      if (origin?.latitude && origin?.longitude) {
        const originIcon = L.divIcon({
          html: '<div style="display:flex;align-items:center;justify-content:center;width:30px;height:30px;border-radius:50%;background:#dc2626;border:2px solid #7f1d1d;color:#fff;font-weight:800;font-size:14px;box-shadow:0 3px 8px rgba(0,0,0,0.4);">▲</div>',
          className: 'evac-origin-icon',
          iconSize: [30, 30],
          iconAnchor: [15, 15],
        });
        const originMarker = L.marker([origin.latitude, origin.longitude], { icon: originIcon })
          .bindTooltip(`<strong>Origin</strong><br/>${origin.label ?? 'Selected origin'}`, { direction: 'top', offset: [0, -15] });
        layer.addLayer(originMarker);
      }

      // Destination marker
      const dest = evacuationRoute.destination;
      if (dest?.latitude && dest?.longitude) {
        const destIcon = L.divIcon({
          html: '<div style="display:flex;align-items:center;justify-content:center;width:32px;height:32px;border-radius:8px;background:#047857;border:2px solid #065f46;color:#fff;font-size:16px;box-shadow:0 3px 10px rgba(4,120,87,0.5);">🛡️</div>',
          className: 'evac-dest-icon',
          iconSize: [32, 32],
          iconAnchor: [16, 16],
        });
        const destMarker = L.marker([dest.latitude, dest.longitude], { icon: destIcon })
          .bindTooltip(`<strong>Safe destination</strong><br/>${dest.site_name}<br/>Capacity: ${dest.available_capacity_families} families`, { direction: 'top', offset: [0, -16] });
        layer.addLayer(destMarker);
      }

      // Hazard waypoints
      (evacuationRoute.hazards_encountered ?? []).forEach((hazard) => {
        if (!hazard.latitude && !hazard.longitude) return;
        const hazardIcon = L.divIcon({
          html: '<div style="display:flex;align-items:center;justify-content:center;width:20px;height:20px;border-radius:50%;background:#facc15;border:2px solid #a16207;color:#422006;font-size:12px;font-weight:900;">!</div>',
          className: 'evac-hazard-icon',
          iconSize: [20, 20],
          iconAnchor: [10, 10],
        });
        const hazardMarker = L.marker([hazard.latitude, hazard.longitude], { icon: hazardIcon })
          .bindTooltip(`<strong>${hazard.zone_name ?? hazard.hazard_type ?? 'Hazard'}</strong><br/>${hazard.road ?? ''}`, { direction: 'top', offset: [0, -10] });
        layer.addLayer(hazardMarker);
      });
    }
  }, [evacuationRoute, evacuationRoadConditions, showRoute]);

  // Fly to the region selected in the Region Quick-Select
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !focus) return;
    if (focus.bounds) {
      map.flyToBounds(
        L.latLngBounds([
          [focus.bounds[0], focus.bounds[1]],
          [focus.bounds[2], focus.bounds[3]],
        ]),
        { duration: 1.2 }
      );
    } else {
      map.flyTo([focus.lat, focus.lng], focus.zoom, { duration: 1.2 });
    }
  }, [focus?.key]);

  const handleResetCenter = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([30.42, 79.35], 10, { duration: 1.2 });
    }
  };

  return (
    <div id="gis-map-component" className="relative w-full h-full min-h-[550px] rounded-xl overflow-hidden border border-slate-300 shadow-inner">
      {/* The Leaflet Canvas */}
      <div ref={mapContainerRef} className="w-full h-full z-0" />

      {/* Basemap tile failure banner */}
      {basemapError && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 bg-red-900/90 text-red-100 text-[11px] font-bold px-3 py-1.5 rounded-lg border border-red-700 shadow-lg whitespace-nowrap">
          {basemapError}
        </div>
      )}

      {/* Professional Layer Control Panel */}
      <MapLayerPanel
        basemap={basemap}
        onBasemapChange={setBasemap}
        showRedZones={showRedZones}
        onRedZonesChange={setShowRedZones}
        hazardTypes={availableHazardTypes}
        visibleHazardTypes={visibleHazardTypes}
        onHazardTypeChange={(ht, visible) =>
          setVisibleHazardTypes((prev) =>
            visible ? [...prev, ht] : prev.filter((t) => t !== ht)
          )
        }
        showHabitations={showHabitations}
        onHabitationsChange={setShowHabitations}
        showSites={showSites}
        onSitesChange={setShowSites}
        showInfra={showInfra}
        onInfraChange={setShowInfra}
        showRoute={showRoute}
        onRouteChange={setShowRoute}
        showFlood={showFlood}
        onFloodChange={setShowFlood}
        floodDataStatus={floodForecast?.data_status ?? 'NOT CONFIGURED'}
        hasFloodData={hasFloodData}
        priorityFilter={priorityFilter}
        onPriorityFilterChange={setPriorityFilter}
        onResetCenter={handleResetCenter}
        dataStatus={dataStatus}
      />

      {/* Data Source Status (bottom-left) */}
      <DataSourceStatus layers={dataStatus} />

      {/* Floating Legend */}
      <div
        id="gis-map-legend"
        className="absolute bottom-4 right-4 z-10 bg-slate-900/90 backdrop-blur-md text-white p-3 rounded-xl border border-slate-700 shadow-xl text-xs space-y-1.5"
      >
        <div className="font-bold text-[11px] text-slate-300 uppercase tracking-wider mb-1">
          Priority Legend
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-red-600 inline-block shrink-0" />
          <span>Immediate Relocation (&ge; 75)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-amber-500 inline-block shrink-0" />
          <span>Short-Term Relocation (50 - 74)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-yellow-500 inline-block shrink-0" />
          <span>Medium-Term Relocation (30 - 49)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded bg-emerald-600 inline-block shrink-0 text-[9px] text-center">🛡️</span>
          <span>Safe Site (+2km Buffer)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-block h-0.5 w-4 rounded bg-emerald-400 shrink-0" />
          <span>Evacuation Route (SAFE)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-block h-0.5 w-4 rounded bg-amber-500 shrink-0" />
          <span>Evacuation Route (CAUTION)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-block w-4 shrink-0 text-center text-[10px] leading-none" style={{ borderTop: '3px dashed #dc2626' }} />
          <span>Closed Corridor</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-block w-4 shrink-0 text-center text-[10px] leading-none" style={{ borderTop: '3px dotted #f97316' }} />
          <span>Restricted Segment</span>
        </div>
        {hasFloodData && (
          <>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full border-2 border-slate-900 inline-block shrink-0" style={{ background: '#0284c7' }} />
              <span>Flood Gauge / Zone</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
