import React from 'react';
import { AlertTriangle, CalendarDays, MapPin } from 'lucide-react';
import { HazardEvent, RedZone } from '../types';

interface RiskAlertsPageProps {
  redZones: RedZone[];
  events: HazardEvent[];
}

export const RiskAlertsPage: React.FC<RiskAlertsPageProps> = ({ redZones, events }) => (
  <div className="space-y-6 animate-in fade-in duration-200">
    <div className="rounded-xl border border-red-200 bg-red-50 p-5">
      <div className="flex items-center gap-2 text-red-800">
        <AlertTriangle className="w-5 h-5" />
        <h2 className="font-bold text-lg">Risk alerts and active hazard zones</h2>
      </div>
      <p className="mt-1 text-sm text-red-700">View-only public safety information for the selected area.</p>
    </div>

    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      <section className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-slate-200 px-5 py-3 font-bold text-slate-800">Mapped risk zones</div>
        <div className="divide-y divide-slate-100">
          {redZones.map((zone) => (
            <article key={zone.id} className="p-4 flex gap-3">
              <AlertTriangle className="w-4 h-4 mt-0.5 text-red-600" />
              <div>
                <h3 className="font-semibold text-sm text-slate-900">{zone.zone_name}</h3>
                <p className="text-xs text-slate-500 mt-1">{zone.hazard_type} · {zone.risk_level} risk · score {zone.hazard_score}/100</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-slate-200 px-5 py-3 font-bold text-slate-800">Recent recorded events</div>
        <div className="divide-y divide-slate-100">
          {events.slice(0, 8).map((event) => (
            <article key={event.id} className="p-4 flex gap-3">
              <CalendarDays className="w-4 h-4 mt-0.5 text-amber-600" />
              <div>
                <h3 className="font-semibold text-sm text-slate-900">{event.hazard_type}</h3>
                <p className="text-xs text-slate-500 mt-1 flex items-center gap-1"><MapPin className="w-3 h-3" /> {event.habitation_name} · {event.event_date}</p>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  </div>
);
