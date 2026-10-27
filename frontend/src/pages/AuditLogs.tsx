import React, { useState, useEffect } from 'react';
import {
  ScrollText,
  Filter,
  Search,
  ChevronLeft,
  ChevronRight,
  Shield,
  Eye,
  X,
} from 'lucide-react';
import { api } from '../services/api';
import { AuditLog, PaginatedResult } from '../types';
import { TableSkeleton } from '../components/LoadingSkeleton';

export const AuditLogs: React.FC = () => {
  const [data, setData] = useState<PaginatedResult<AuditLog> | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState('');
  const [page, setPage] = useState(1);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  useEffect(() => {
    fetchLogs();
  }, [page, actionFilter]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await api.getAuditLogs(page, actionFilter || undefined);
      setData(res);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="pb-2 border-b border-slate-800/80">
        <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
          <ScrollText className="w-5 h-5 text-brand-cyan" />
          <span>Immutable Security Audit Trails</span>
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Chronological record of system mutations, forensic case actions, and authentication attempts.
        </p>
      </div>

      {/* Filter Bar */}
      <div className="p-4 bg-navy-900/60 border border-slate-800/80 rounded-2xl flex items-center gap-3">
        <Filter className="w-4 h-4 text-slate-400" />
        <span className="text-xs font-semibold text-slate-300">Filter Event Action:</span>

        <select
          value={actionFilter}
          onChange={(e) => {
            setActionFilter(e.target.value);
            setPage(1);
          }}
          className="bg-navy-950/70 border border-slate-800 text-xs text-slate-300 rounded-xl px-3 py-2 outline-none focus:border-cyan-500/50"
        >
          <option value="">All Actions</option>
          <option value="LOGIN">LOGIN / AUTHENTICATION</option>
          <option value="TRANSACTION">TRANSACTION_ANALYZED</option>
          <option value="ALERT">ALERT_STATUS_UPDATED</option>
          <option value="CASE">CASE_CREATED / UPDATED</option>
          <option value="CSV">CSV_IMPORT_COMPLETED</option>
          <option value="MODEL">MODEL_ACTIVATED</option>
        </select>

        {actionFilter && (
          <button
            onClick={() => {
              setActionFilter('');
              setPage(1);
            }}
            className="text-xs text-slate-400 hover:text-white transition-colors ml-2"
          >
            Clear Filter
          </button>
        )}
      </div>

      {/* Audit Table */}
      <div className="bg-navy-900/60 border border-slate-800/80 rounded-2xl overflow-hidden shadow-subtle">
        {loading ? (
          <div className="p-6">
            <TableSkeleton rows={8} cols={5} />
          </div>
        ) : !data || data.items.length === 0 ? (
          <p className="text-xs text-slate-400 text-center py-8 font-mono">
            No audit records matching criteria.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-navy-950/80 border-b border-slate-800 text-slate-400 uppercase font-mono text-[11px]">
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Operator / Principal</th>
                  <th className="py-3 px-4">Action Type</th>
                  <th className="py-3 px-4">Target Entity</th>
                  <th className="py-3 px-4">IP Origin</th>
                  <th className="py-3 px-4 text-right">Payload</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {data.items.map((log) => (
                  <tr key={log.id} className="hover:bg-navy-850/50">
                    <td className="py-3 px-4 font-mono text-slate-400 text-[11px]">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-200">
                      {log.user_email || 'System'}
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-navy-950 border border-slate-800 text-cyan-400">
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-300">
                      {log.entity_type} {log.entity_id ? `(${log.entity_id.slice(0, 8)}...)` : ''}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-400">
                      {log.ip_address || '127.0.0.1'}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {log.details ? (
                        <button
                          onClick={() => setSelectedLog(log)}
                          className="px-2 py-1 text-xs bg-navy-850 hover:bg-navy-800 text-slate-300 rounded border border-slate-700 transition-colors inline-flex items-center gap-1"
                        >
                          <Eye className="w-3 h-3" />
                          <span>View</span>
                        </button>
                      ) : (
                        <span className="text-slate-400 text-[11px]">&mdash;</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {data && data.total_pages > 1 && (
          <div className="p-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <div>
              Page <span className="text-slate-200 font-bold">{data.page}</span> of{' '}
              <span className="text-slate-200 font-bold">{data.total_pages}</span>
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

      {/* Payload Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 bg-navy-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-navy-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl relative">
            <button
              onClick={() => setSelectedLog(null)}
              className="absolute top-5 right-5 p-1.5 text-slate-400 hover:text-white rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-sm font-bold text-white mb-1">
              Audit Event Payload Inspector
            </h3>
            <p className="text-xs text-slate-400 mb-4 font-mono">
              Action: {selectedLog.action} &bull; Timestamp: {new Date(selectedLog.created_at).toISOString()}
            </p>

            <pre className="p-4 bg-navy-950 rounded-xl border border-slate-800 text-xs font-mono text-cyan-400 overflow-x-auto max-h-80">
              {JSON.stringify(selectedLog.details, null, 2)}
            </pre>

            <div className="mt-4 text-right">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 bg-navy-850 hover:bg-navy-800 text-slate-300 rounded-xl text-xs font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
