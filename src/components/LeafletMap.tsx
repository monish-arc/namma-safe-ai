import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import {
  Layers,
  ShieldAlert,
  Home,
  ShieldCheck,
  Building,
  RotateCcw,
  Eye,
  EyeOff,
  Filter,
} from 'lucide-react';
import { Habitation, RelocationSite, RedZone, MapLayerItem } from '../types';

interface LeafletMapProps {
  habitations: Habitation[];
  relocationSites: RelocationSite[];
  redZones: RedZone[];
  infrastructure: MapLayerItem[];
  selectedHabitationId?: string;
  selectedSiteId?: string;
  onSelectHabitation: (hab: Habitation) => void;
  onSelectSite: (site: RelocationSite) => void;
}

export const LeafletMap: React.FC<LeafletMapProps> = ({
  habitations,
  relocationSites,
  redZones,
  infrastructure,
  selectedHabitationId,
  selectedSiteId,
  onSelectHabitation,
  onSelectSite,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const layersGroupRef = useRef<{
    redZonesLayer?: L.LayerGroup;
    habitationsLayer?: L.LayerGroup;
    sitesLayer?: L.LayerGroup;
    infraLayer?: L.LayerGroup;
  }>({});

  // Layer toggles
  const [showRedZones, setShowRedZones] = useState(true);
  const [showHabitations, setShowHabitations] = useState(true);
  const [showSites, setShowSites] = useState(true);
  const [showInfra, setShowInfra] = useState(true);
  const [priorityFilter, setPriorityFilter] = useState<string>('all');

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

    // OpenStreetMap standard tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors | NammaSafe AI Chamoli Pilot',
      maxZoom: 18,
    }).addTo(map);

    // Initialize layer groups
    layersGroupRef.current.redZonesLayer = L.layerGroup().addTo(map);
    layersGroupRef.current.habitationsLayer = L.layerGroup().addTo(map);
    layersGroupRef.current.sitesLayer = L.layerGroup().addTo(map);
    layersGroupRef.current.infraLayer = L.layerGroup().addTo(map);

    mapInstanceRef.current = map;

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

  // Update Red Zones Layer
  useEffect(() => {
    const layer = layersGroupRef.current.redZonesLayer;
    if (!layer || !mapInstanceRef.current) return;
    layer.clearLayers();

    if (!showRedZones) return;

    redZones.forEach((zone) => {
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
  }, [redZones, showRedZones]);

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

  const handleResetCenter = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([30.42, 79.35], 10, { duration: 1.2 });
    }
  };

  return (
    <div id="gis-map-component" className="relative w-full h-full min-h-[550px] rounded-xl overflow-hidden border border-slate-300 shadow-inner">
      {/* The Leaflet Canvas */}
      <div ref={mapContainerRef} className="w-full h-full z-0" />

      {/* Floating GIS Layer Controls */}
      <div
        id="gis-layer-control-panel"
        className="absolute top-4 left-4 z-10 bg-slate-900/90 backdrop-blur-md text-white p-3.5 rounded-xl border border-slate-700 shadow-xl max-w-xs text-xs space-y-3"
      >
        <div className="flex items-center justify-between border-b border-slate-700 pb-2">
          <div className="flex items-center gap-1.5 font-bold text-slate-200">
            <Layers className="w-4 h-4 text-red-400" />
            <span>GIS Map Layers</span>
          </div>
          <button
            onClick={handleResetCenter}
            title="Reset Map to Chamoli Center"
            className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Toggles */}
        <div className="space-y-2">
          <label className="flex items-center justify-between cursor-pointer group">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded bg-red-500/80 border border-red-400 inline-block" />
              <span className="group-hover:text-slate-100">Multi-Hazard Red Zones</span>
            </div>
            <input
              type="checkbox"
              checked={showRedZones}
              onChange={(e) => setShowRedZones(e.target.checked)}
              className="rounded accent-red-600 cursor-pointer"
            />
          </label>

          <label className="flex items-center justify-between cursor-pointer group">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-red-600 inline-block text-center text-[8px] text-white font-bold">●</span>
              <span className="group-hover:text-slate-100">Habitations (Priority)</span>
            </div>
            <input
              type="checkbox"
              checked={showHabitations}
              onChange={(e) => setShowHabitations(e.target.checked)}
              className="rounded accent-red-600 cursor-pointer"
            />
          </label>

          <label className="flex items-center justify-between cursor-pointer group">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded bg-emerald-600 inline-block text-center text-[8px] text-white">🛡️</span>
              <span className="group-hover:text-slate-100">Safe Relocation Enclaves</span>
            </div>
            <input
              type="checkbox"
              checked={showSites}
              onChange={(e) => setShowSites(e.target.checked)}
              className="rounded accent-emerald-600 cursor-pointer"
            />
          </label>

          <label className="flex items-center justify-between cursor-pointer group">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-slate-200 inline-block text-center text-[8px]">🏥</span>
              <span className="group-hover:text-slate-100">Infrastructure & Shelters</span>
            </div>
            <input
              type="checkbox"
              checked={showInfra}
              onChange={(e) => setShowInfra(e.target.checked)}
              className="rounded accent-blue-600 cursor-pointer"
            />
          </label>
        </div>

        {/* Priority Filter */}
        <div className="pt-2 border-t border-slate-700 space-y-1">
          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <span className="flex items-center gap-1">
              <Filter className="w-3 h-3 text-amber-400" /> Filter Villages
            </span>
          </div>
          <select
            id="map-priority-filter-select"
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 text-slate-200 rounded p-1 text-xs focus:ring-1 focus:ring-red-500 outline-none"
          >
            <option value="all">All Villages (10)</option>
            <option value="immediate relocation">Immediate Relocation (75+)</option>
            <option value="short-term relocation">Short-Term Relocation (50-74)</option>
            <option value="medium-term relocation">Medium-Term Relocation (30-49)</option>
          </select>
        </div>
      </div>

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
      </div>
    </div>
  );
};
