import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  UserCheck,
  Briefcase,
  ChevronLeft,
  ChevronRight,
  Filter,
  X,
  MessageSquare,
} from 'lucide-react';
import { api } from '../services/api';
import { Alert, PaginatedResult } from '../types';
import { RiskBadge } from '../components/RiskBadge';
import { TableSkeleton } from '../components/LoadingSkeleton';
import { EmptyState } from '../components/EmptyState';

export const AlertsCenter: React.FC = () => {
  const [data, setData] = useState<PaginatedResult<Alert> | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [severityFilter, setSeverityFilter] = useState('');
  const [page, setPage] = useState(1);

  // Status update modal
  const [activeAlert, setActiveAlert] = useState<Alert | null>(null);
  const [newStatus, setNewStatus] = useState('UNDER_INVESTIGATION');
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [updating, setUpdating] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    fetchAlerts();
  }, [page, statusFilter, severityFilter]);

  const fetchAlerts = async () => {
    setLoading(true);
    try {
      const res = await api.getAlerts({
        page,
        page_size: 15,
        status: statusFilter || undefined,
        severity: severityFilter || undefined,
      });
      setData(res);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeAlert) return;

    setUpdating(true);
    try {
      await api.updateAlertStatus(activeAlert.id, {
        status: newStatus,
        resolution_notes: resolutionNotes,
      });
      setActiveAlert(null);
      setResolutionNotes('');
      fetchAlerts();
    } catch (e) {
      console.error(e);
    } finally {
      setUpdating(false);
    }
  };

  const handlePromoteToCase = (alert: Alert) => {
    navigate(`/cases?createForAlert=${alert.id}&createForTx=${alert.transaction_id}`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="pb-2 border-b border-slate-800/80">
        <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-amber-400" />
          <span>Real-Time Alerts Triage & Incident Command</span>
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Monitor threshold-triggered alerts, assign incidents, and coordinate rapid response workflows.
        </p>
      </div>

      {/* Filters Bar */}
      <div className="p-4 bg-navy-900/60 border border-slate-800/80 rounded-2xl flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <span className="text-xs font-semibold text-slate-300">Filter Status:</span>
        </div>

        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
          className="bg-navy-950/70 border border-slate-800 text-xs text-slate-300 rounded-xl px-3 py-2 outline-none focus:border-cyan-500/50"
        >
          <option value="">All Statuses</option>
          <option value="NEW">NEW (Requires Triage)</option>
          <option value="UNDER_INVESTIGATION">UNDER_INVESTIGATION</option>
          <option value="RESOLVED">RESOLVED</option>
          <option value="DISMISSED">DISMISSED</option>
        </select>

        <select
          value={severityFilter}
          onChange={(e) => {
            setSeverityFilter(e.target.value);
            setPage(1);
          }}
          className="bg-navy-950/70 border border-slate-800 text-xs text-slate-300 rounded-xl px-3 py-2 outline-none focus:border-cyan-500/50"
        >
          <option value="">All Severities</option>
          <option value="CRITICAL">CRITICAL</option>
          <option value="HIGH">HIGH</option>
          <option value="MEDIUM">MEDIUM</option>
          <option value="LOW">LOW</option>
        </select>

        <button
          onClick={() => {
            setStatusFilter('');
            setSeverityFilter('');
            setPage(1);
          }}
          className="text-xs text-slate-400 hover:text-white px-3 py-1.5 transition-colors"
        >
          Clear Filters
        </button>
      </div>

      {/* Alerts Table */}
      <div className="bg-navy-900/60 border border-slate-800/80 rounded-2xl overflow-hidden shadow-subtle">
        {loading ? (
          <div className="p-6">
            <TableSkeleton rows={8} cols={6} />
          </div>
        ) : !data || data.items.length === 0 ? (
          <EmptyState
            title="No Alerts Detected"
            description="There are no active alerts matching your filter criteria. The risk engine is continuously monitoring incoming streams."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-navy-950/80 border-b border-slate-800 text-slate-400 uppercase font-mono text-[11px]">
                  <th className="py-3.5 px-4">Severity Tier</th>
                  <th className="py-3.5 px-4">Transaction Ref</th>
                  <th className="py-3.5 px-4">Channel & Value</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Assigned Analyst</th>
                  <th className="py-3.5 px-4">Created</th>
                  <th className="py-3.5 px-4 text-right">Triage Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {data.items.map((alert) => (
                  <tr key={alert.id} className="hover:bg-navy-850/50 transition-colors">
                    <td className="py-3.5 px-4">
                      <RiskBadge
                        level={alert.severity}
                        score={alert.prediction?.fraud_probability}
                        showScore
                        size="sm"
                      />
                    </td>
                    <td className="py-3.5 px-4 font-mono font-semibold text-slate-200">
                      {alert.transaction?.transaction_ref || 'N/A'}
                    </td>
                    <td className="py-3.5 px-4 font-mono">
                      <div className="text-slate-200 font-semibold">
                        ${alert.transaction?.amount?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </div>
                      <div className="text-slate-400 text-[10px]">{alert.transaction?.type}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-mono font-semibold ${
                          alert.status === 'NEW'
                            ? 'bg-red-500/10 text-red-400 border border-red-500/30 animate-pulse'
                            : alert.status === 'UNDER_INVESTIGATION'
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                            : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                        }`}
                      >
                        {alert.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      {alert.assigned_to_name ? (
                        <span className="text-slate-200 font-medium">{alert.assigned_to_name}</span>
                      ) : (
                        <span className="text-slate-400 italic">Unassigned</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-slate-400 font-mono text-[11px]">
                      {new Date(alert.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => {
                          setActiveAlert(alert);
                          setNewStatus(alert.status);
                        }}
                        className="px-2.5 py-1 text-xs bg-navy-850 hover:bg-navy-800 text-slate-300 rounded-lg border border-slate-700/80 transition-colors mr-2"
                      >
                        Update
                      </button>
                      <button
                        onClick={() => handlePromoteToCase(alert)}
                        className="px-2.5 py-1 text-xs bg-cyan-500/10 hover:bg-cyan-500/20 text-brand-cyan rounded-lg border border-cyan-500/30 transition-colors"
                      >
                        Escalate to Case
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        {data && data.total_pages > 1 && (
          <div className="p-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <div>
              Showing Page <span className="font-semibold text-slate-200">{data.page}</span> of{' '}
              <span className="font-semibold text-slate-200">{data.total_pages}</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                className="p-1.5 rounded-lg bg-navy-950 border border-slate-800 disabled:opacity-40"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                disabled={page >= data.total_pages}
                onClick={() => setPage(page + 1)}
                className="p-1.5 rounded-lg bg-navy-950 border border-slate-800 disabled:opacity-40"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Update Alert Status Modal */}
      {activeAlert && (
        <div className="fixed inset-0 z-50 bg-navy-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-navy-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl relative">
            <button
              onClick={() => setActiveAlert(null)}
              className="absolute top-5 right-5 p-1.5 text-slate-400 hover:text-white rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-base font-bold text-white mb-1">
              Update Alert Resolution
            </h3>
            <p className="text-xs text-slate-400 mb-4 font-mono">
              Target: {activeAlert.transaction?.transaction_ref}
            </p>

            <form onSubmit={handleUpdateStatus} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Alert Lifecycle Status
                </label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="w-full bg-navy-950/70 border border-slate-800 text-xs text-slate-200 rounded-xl px-3 py-2 outline-none focus:border-cyan-500/50"
                >
                  <option value="NEW">NEW</option>
                  <option value="UNDER_INVESTIGATION">UNDER_INVESTIGATION</option>
                  <option value="RESOLVED">RESOLVED (Action Complete)</option>
                  <option value="DISMISSED">DISMISSED (Benign / False Alarm)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Resolution Notes / Analyst Rationale
                </label>
                <textarea
                  rows={3}
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  placeholder="Record verification details, contact history, or reason for dismissal..."
                  className="w-full bg-navy-950/70 border border-slate-800 text-xs text-slate-200 rounded-xl p-3 outline-none focus:border-cyan-500/50 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setActiveAlert(null)}
                  className="px-4 py-2 bg-navy-850 text-slate-300 rounded-xl text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updating}
                  className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-xl text-xs font-bold transition-all shadow-glow-cyan disabled:opacity-50"
                >
                  {updating ? 'Saving...' : 'Commit Status Change'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
