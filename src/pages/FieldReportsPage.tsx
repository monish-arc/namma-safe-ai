import React, { useState } from 'react';
import {
  FileText,
  Plus,
  CheckCircle,
  Clock,
  MapPin,
  AlertTriangle,
  Camera,
  UserCheck,
  Send,
  ExternalLink,
} from 'lucide-react';
import { FieldReport, Habitation, User } from '../types';

interface FieldReportsPageProps {
  reports: FieldReport[];
  habitations: Habitation[];
  currentUser: User;
  onSubmitReport: (report: Partial<FieldReport>) => Promise<any>;
  onVerifyReport: (reportId: string) => Promise<any>;
  onSelectHabitation: (hab: Habitation) => void;
}

export const FieldReportsPage: React.FC<FieldReportsPageProps> = ({
  reports,
  habitations,
  currentUser,
  onSubmitReport,
  onVerifyReport,
  onSelectHabitation,
}) => {
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [filterVerified, setFilterVerified] = useState<'all' | 'verified' | 'pending'>('all');

  // Form state
  const [habId, setHabId] = useState(habitations[0]?.id || 'hab-joshimath');
  const [reportType, setReportType] = useState('Ground Subsidence & Crack Widening');
  const [severity, setSeverity] = useState<'Critical' | 'High' | 'Medium' | 'Low'>('High');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [latitude, setLatitude] = useState(30.5574);
  const [longitude, setLongitude] = useState(79.5658);
  const [submitting, setSubmitting] = useState(false);

  const canVerify = ['admin', 'state_officer', 'district_officer', 'sub_district_officer', 'local_office'].includes(currentUser.role);
  const canSubmit = currentUser.role !== 'normal_citizen' && currentUser.role !== 'gis_analysis_officer';

  const filteredReports = reports.filter((r) => {
    if (filterVerified === 'verified') return r.verified;
    if (filterVerified === 'pending') return !r.verified;
    return true;
  });

  const handleHabChange = (id: string) => {
    setHabId(id);
    const hab = habitations.find((h) => h.id === id);
    if (hab) {
      setLatitude(hab.latitude);
      setLongitude(hab.longitude);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) return;
    setSubmitting(true);
    try {
      await onSubmitReport({
        habitation_id: habId,
        report_type: reportType,
        severity,
        description,
        image_url: imageUrl || undefined,
        latitude,
        longitude,
      });
      setShowSubmitModal(false);
      setDescription('');
      setImageUrl('');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div id="field-reports-view" className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-blue-600 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded">
              RAPID OBSERVATION GROUND FEED
            </span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-600" />
            <span>Field Hazard & Damage Reports</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Geo-tagged slope deformation, river surges, and fissure reports submitted by field teams
          </p>
        </div>

        {canSubmit && (
          <button
            id="open-submit-report-modal-btn"
            onClick={() => setShowSubmitModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-sm transition"
          >
            <Plus className="w-4 h-4" />
            <span>Submit Ground Report</span>
          </button>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center justify-between bg-white p-3 rounded-xl border border-slate-200 shadow-sm text-xs">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setFilterVerified('all')}
            className={`px-3 py-1.5 rounded-lg font-medium transition ${
              filterVerified === 'all'
                ? 'bg-slate-900 text-white'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            All Reports ({reports.length})
          </button>
          <button
            onClick={() => setFilterVerified('verified')}
            className={`px-3 py-1.5 rounded-lg font-medium transition ${
              filterVerified === 'verified'
                ? 'bg-emerald-600 text-white'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Verified ({reports.filter((r) => r.verified).length})
          </button>
          <button
            onClick={() => setFilterVerified('pending')}
            className={`px-3 py-1.5 rounded-lg font-medium transition ${
              filterVerified === 'pending'
                ? 'bg-amber-600 text-white'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Pending Review ({reports.filter((r) => !r.verified).length})
          </button>
        </div>

        <span className="text-slate-400 text-[11px]">
          Logged as: <strong className="text-slate-700">{currentUser.full_name}</strong> ({currentUser.role})
        </span>
      </div>

      {/* Reports Feed Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredReports.map((report) => {
          const hab = habitations.find((h) => h.id === report.habitation_id);

          return (
            <div
              key={report.id}
              id={`report-card-${report.id}`}
              className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex flex-col justify-between space-y-4"
            >
              <div className="space-y-3">
                {/* Header */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-mono text-slate-400 block uppercase">
                      {report.id}
                    </span>
                    <h3 className="text-sm font-bold text-slate-900">
                      {report.report_type}
                    </h3>
                    <p className="text-xs text-blue-600 font-medium flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3.5 h-3.5" />
                      <span>{report.habitation_name}</span>
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                        report.severity === 'Critical'
                          ? 'bg-red-50 text-red-700 border-red-200'
                          : report.severity === 'High'
                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : 'bg-slate-100 text-slate-700 border-slate-200'
                      }`}
                    >
                      {report.severity}
                    </span>

                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-medium flex items-center gap-1 border ${
                        report.verified
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-amber-50 text-amber-700 border-amber-200'
                      }`}
                    >
                      {report.verified ? (
                        <>
                          <CheckCircle className="w-3 h-3 text-emerald-600" />
                          <span>Verified</span>
                        </>
                      ) : (
                        <>
                          <Clock className="w-3 h-3 text-amber-600" />
                          <span>Pending</span>
                        </>
                      )}
                    </span>
                  </div>
                </div>

                {/* Description */}
                <p className="text-xs text-slate-700 leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-100">
                  {report.description}
                </p>

                {/* Photo Thumbnail if provided */}
                {report.image_url && (
                  <div className="rounded-lg overflow-hidden border border-slate-200 max-h-44 bg-slate-100">
                    <img
                      src={report.image_url}
                      alt="Field inspection evidence"
                      className="w-full h-44 object-cover hover:scale-105 transition duration-300"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                <div>
                  <span className="text-slate-600 font-medium block">
                    {report.officer_name}
                  </span>
                  <span>{new Date(report.reported_at).toLocaleString()}</span>
                </div>

                <div className="flex items-center gap-2">
                  {hab && (
                    <button
                      onClick={() => onSelectHabitation(hab)}
                      className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium transition"
                    >
                      Inspect Village
                    </button>
                  )}

                  {!report.verified && canVerify && (
                    <button
                      id={`verify-btn-${report.id}`}
                      onClick={() => onVerifyReport(report.id)}
                      className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-sm transition"
                    >
                      Verify
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Submit Report Modal */}
      {showSubmitModal && (
        <div
          id="submit-report-modal-backdrop"
          className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto"
          onClick={() => setShowSubmitModal(false)}
        >
          <div
            id="submit-report-modal"
            className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-lg w-full p-6 space-y-4 text-slate-800 animate-in fade-in zoom-in-95 my-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="border-b border-slate-200 pb-3">
              <h3 className="text-base font-bold text-slate-900">
                Submit Rapid Assessment Field Report
              </h3>
              <p className="text-xs text-slate-500">
                Logged under officer credential: <strong>{currentUser.full_name}</strong>
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Affected Habitation</label>
                <select
                  value={habId}
                  onChange={(e) => handleHabChange(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 focus:bg-white outline-none"
                >
                  {habitations.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.village_name} ({h.village_code})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Report Category</label>
                  <select
                    value={reportType}
                    onChange={(e) => setReportType(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 focus:bg-white outline-none"
                  >
                    <option value="Crack Formation & Settlement">Crack Formation & Settlement</option>
                    <option value="Slope Slump & Riverbank Erosion">Slope Slump & Riverbank Erosion</option>
                    <option value="Active Rockfall & Road Blockage">Active Rockfall & Road Blockage</option>
                    <option value="Debris Flow & Siltation">Debris Flow & Siltation</option>
                    <option value="Culvert or Bridge Distress">Culvert or Bridge Distress</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Observed Severity</label>
                  <select
                    value={severity}
                    onChange={(e) => setSeverity(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 focus:bg-white outline-none"
                  >
                    <option value="Critical">Critical</option>
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Damage Description</label>
                <textarea
                  required
                  rows={3}
                  placeholder="Describe crack dimensions, toe seepage, bridge scour, or residential distress..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 focus:bg-white outline-none"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Photo Evidence URL (Optional)
                </label>
                <input
                  type="url"
                  placeholder="https://..."
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 focus:bg-white outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Latitude</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={latitude}
                    onChange={(e) => setLatitude(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-mono"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Longitude</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={longitude}
                    onChange={(e) => setLongitude(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-mono"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowSubmitModal(false)}
                  className="px-4 py-2 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-100 border border-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-lg text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition disabled:opacity-50 flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{submitting ? 'Submitting...' : 'Post Report'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
