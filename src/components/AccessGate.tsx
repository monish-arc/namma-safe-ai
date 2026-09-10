import React, { useMemo, useState } from 'react';
import { MapPinned, ShieldCheck } from 'lucide-react';
import { AdministrativeScope, User } from '../types';

interface AccessGateProps {
  users: User[];
  onEnter: (user: User, scope: AdministrativeScope) => void;
}

const PILOT_SCOPE: AdministrativeScope = {
  state_id: 'uk',
  district_id: 'chamoli',
  sub_district_id: 'joshimath',
  area_id: 'joshimath-central',
};

const roleLabel = (role: User['role']) => role.replaceAll('_', ' ');

export const AccessGate: React.FC<AccessGateProps> = ({ users, onEnter }) => {
  const [selectedUserId, setSelectedUserId] = useState(users[0]?.id ?? '');
  const [scope, setScope] = useState<AdministrativeScope>(PILOT_SCOPE);
  const selectedUser = useMemo(
    () => users.find((user) => user.id === selectedUserId),
    [selectedUserId, users]
  );
  const requiresScope = selectedUser?.role !== 'admin';

  const enterPortal = () => {
    if (selectedUser) onEnter(selectedUser, scope);
  };

  return (
    <main className="min-h-screen bg-slate-950 p-4 flex items-center justify-center text-slate-900">
      <section className="w-full max-w-xl rounded-2xl bg-white shadow-2xl overflow-hidden">
        <div className="bg-slate-900 text-white p-7">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-500 flex items-center justify-center">
              <MapPinned className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold">NammaSafe AI</h1>
              <p className="text-xs text-slate-400">Chamoli risk intelligence portal</p>
            </div>
          </div>
        </div>

        <div className="p-7 space-y-5">
          <div>
            <h2 className="font-bold text-lg">Choose your access context</h2>
            <p className="text-sm text-slate-500 mt-1">
              Location selection is required before non-administrator portal access.
            </p>
          </div>

          <label className="block text-sm font-semibold text-slate-700">
            Portal access role
            <select
              value={selectedUserId}
              onChange={(event) => setSelectedUserId(event.target.value)}
              className="mt-1.5 w-full rounded-lg border border-slate-300 bg-slate-50 p-2.5 text-sm"
            >
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.full_name} — {roleLabel(user.role)}
                </option>
              ))}
            </select>
          </label>

          {requiresScope && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                ['state_id', 'State', 'Uttarakhand'],
                ['district_id', 'District', 'Chamoli'],
                ['sub_district_id', 'Sub-district', 'Joshimath'],
                ['area_id', 'Area / Division', 'Joshimath Central Division'],
              ].map(([key, label, value]) => (
                <label key={key} className="text-xs font-semibold text-slate-700">
                  {label}
                  <select
                    required
                    value={scope[key as keyof AdministrativeScope]}
                    onChange={(event) => setScope((current) => ({ ...current, [key]: event.target.value }))}
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-slate-50 p-2 text-sm font-normal"
                  >
                    <option value={PILOT_SCOPE[key as keyof AdministrativeScope]}>{value}</option>
                  </select>
                </label>
              ))}
            </div>
          )}

          <button
            type="button"
            onClick={enterPortal}
            className="w-full rounded-lg bg-blue-600 py-2.5 text-sm font-bold text-white hover:bg-blue-700 transition flex items-center justify-center gap-2"
          >
            <ShieldCheck className="w-4 h-4" />
            Enter portal
          </button>
        </div>
      </section>
    </main>
  );
};
