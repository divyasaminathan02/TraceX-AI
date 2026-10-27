import React, { useState, useEffect } from 'react';
import { Bot, Activity, Clock, CheckCircle2, XCircle, Zap, BarChart3, RefreshCw, ChevronDown } from 'lucide-react';
import { api } from '../services/api';
import { AgentExecution, AgentExecutionStats, PaginatedResult } from '../types';

const AGENT_COLORS: Record<string, string> = {
  FraudDetectionAgent: 'from-red-500/20 to-red-900/10 border-red-500/30',
  TransactionInvestigationAgent: 'from-amber-500/20 to-amber-900/10 border-amber-500/30',
  ExplainabilityAgent: 'from-blue-500/20 to-blue-900/10 border-blue-500/30',
  AlertPrioritizationAgent: 'from-purple-500/20 to-purple-900/10 border-purple-500/30',
  InvestigationCopilotAgent: 'from-cyan-500/20 to-cyan-900/10 border-cyan-500/30',
};

const AGENT_ICONS: Record<string, string> = {
  FraudDetectionAgent: '🎯',
  TransactionInvestigationAgent: '🔍',
  ExplainabilityAgent: '📊',
  AlertPrioritizationAgent: '📋',
  InvestigationCopilotAgent: '🤖',
};

export const AgentActivityCenter: React.FC = () => {
  const [executions, setExecutions] = useState<PaginatedResult<AgentExecution> | null>(null);
  const [stats, setStats] = useState<AgentExecutionStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [filterAgent, setFilterAgent] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  useEffect(() => { loadData(); }, [page, filterAgent, filterStatus]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [execResult, statsResult] = await Promise.all([
        api.getAgentExecutions({ page, page_size: 15, agent_name: filterAgent || undefined, status: filterStatus || undefined }),
        api.getAgentExecutionStats(),
      ]);
      setExecutions(execResult);
      setStats(statsResult);
    } catch (err) {
      console.error('Failed to load agent data:', err);
    } finally {
      setLoading(false);
    }
  };

  const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
    const styles: Record<string, string> = {
      SUCCESS: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
      FAILED: 'bg-red-500/20 text-red-400 border-red-500/30',
      TIMED_OUT: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    };
    return (
      <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${styles[status] || 'bg-slate-500/20 text-slate-400'}`}>
        {status}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Bot className="w-7 h-7 text-cyan-400" />
            AI Agent Activity Center
          </h1>
          <p className="text-slate-400 text-sm mt-1">Monitor multi-agent execution telemetry, performance metrics, and pipeline status</p>
        </div>
        <button
          onClick={loadData}
          className="flex items-center gap-2 px-4 py-2 bg-cyan-600/20 hover:bg-cyan-600/30 border border-cyan-500/30 rounded-lg text-cyan-400 text-sm transition-all"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 border border-slate-700/50 rounded-xl p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                <Activity className="w-5 h-5 text-blue-400" />
              </div>
              <span className="text-slate-400 text-sm font-medium">Total Executions</span>
            </div>
            <div className="text-3xl font-bold text-white">{stats.total_executions.toLocaleString()}</div>
          </div>

          <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 border border-slate-700/50 rounded-xl p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              </div>
              <span className="text-slate-400 text-sm font-medium">Success Rate</span>
            </div>
            <div className="text-3xl font-bold text-emerald-400">{stats.success_rate}%</div>
          </div>

          <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 border border-slate-700/50 rounded-xl p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center">
                <XCircle className="w-5 h-5 text-red-400" />
              </div>
              <span className="text-slate-400 text-sm font-medium">Failed</span>
            </div>
            <div className="text-3xl font-bold text-red-400">{stats.failed}</div>
          </div>

          <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 border border-slate-700/50 rounded-xl p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
                <Zap className="w-5 h-5 text-amber-400" />
              </div>
              <span className="text-slate-400 text-sm font-medium">Avg Duration</span>
            </div>
            <div className="text-3xl font-bold text-amber-400">{stats.avg_duration_ms.toFixed(0)}<span className="text-sm text-slate-500 ml-1">ms</span></div>
          </div>
        </div>
      )}

      {/* Per-Agent Performance */}
      {stats && stats.by_agent.length > 0 && (
        <div className="bg-gradient-to-br from-slate-800/60 to-slate-900/60 border border-slate-700/50 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-cyan-400" />
            Agent Performance Breakdown
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {stats.by_agent.map((agent) => (
              <div
                key={agent.agent_name}
                className={`bg-gradient-to-br ${AGENT_COLORS[agent.agent_name] || 'from-slate-700/30 to-slate-800/30 border-slate-600/30'} border rounded-lg p-4`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xl">{AGENT_ICONS[agent.agent_name] || '🤖'}</span>
                  <span className="text-white font-semibold text-sm truncate">{agent.agent_name}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Executions:</span>
                  <span className="text-white font-medium">{agent.count}</span>
                </div>
                <div className="flex justify-between text-sm mt-1">
                  <span className="text-slate-400">Avg Duration:</span>
                  <span className="text-cyan-400 font-medium">{agent.avg_duration_ms.toFixed(0)}ms</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative">
          <select
            value={filterAgent}
            onChange={(e) => { setFilterAgent(e.target.value); setPage(1); }}
            className="appearance-none bg-slate-800/80 border border-slate-700/50 text-slate-300 text-sm rounded-lg px-4 py-2 pr-8 focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20"
          >
            <option value="">All Agents</option>
            <option value="FraudDetectionAgent">Fraud Detection</option>
            <option value="TransactionInvestigationAgent">Investigation</option>
            <option value="ExplainabilityAgent">Explainability</option>
            <option value="AlertPrioritizationAgent">Alert Prioritization</option>
            <option value="InvestigationCopilotAgent">Copilot</option>
          </select>
          <ChevronDown className="w-4 h-4 text-slate-500 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>
        <div className="relative">
          <select
            value={filterStatus}
            onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}
            className="appearance-none bg-slate-800/80 border border-slate-700/50 text-slate-300 text-sm rounded-lg px-4 py-2 pr-8 focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20"
          >
            <option value="">All Statuses</option>
            <option value="SUCCESS">Success</option>
            <option value="FAILED">Failed</option>
            <option value="TIMED_OUT">Timed Out</option>
          </select>
          <ChevronDown className="w-4 h-4 text-slate-500 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>
      </div>

      {/* Execution Log Table */}
      <div className="bg-gradient-to-br from-slate-800/60 to-slate-900/60 border border-slate-700/50 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-slate-700/50">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Clock className="w-5 h-5 text-slate-400" />
            Execution Log
            {executions && <span className="text-sm text-slate-500 font-normal">({executions.total} total)</span>}
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-800/40">
              <tr>
                <th className="px-4 py-3 text-slate-400 font-medium">Agent</th>
                <th className="px-4 py-3 text-slate-400 font-medium">Task Type</th>
                <th className="px-4 py-3 text-slate-400 font-medium">Status</th>
                <th className="px-4 py-3 text-slate-400 font-medium">Duration</th>
                <th className="px-4 py-3 text-slate-400 font-medium">Summary</th>
                <th className="px-4 py-3 text-slate-400 font-medium">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/30">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-slate-500">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-cyan-400" />
                    Loading execution data...
                  </td>
                </tr>
              ) : executions && executions.items.length > 0 ? (
                executions.items.map((exec) => (
                  <tr key={exec.id} className="hover:bg-slate-700/20 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span>{AGENT_ICONS[exec.agent_name] || '🤖'}</span>
                        <div>
                          <div className="text-white font-medium text-xs">{exec.agent_name}</div>
                          <div className="text-slate-500 text-xs">v{exec.agent_version}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-300 text-xs font-mono">{exec.task_type}</td>
                    <td className="px-4 py-3"><StatusBadge status={exec.status} /></td>
                    <td className="px-4 py-3 text-cyan-400 font-mono text-xs">{exec.duration_ms?.toFixed(1)}ms</td>
                    <td className="px-4 py-3 text-slate-400 text-xs max-w-[300px] truncate">{exec.outcome_summary}</td>
                    <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">
                      {exec.created_at ? new Date(exec.created_at).toLocaleString() : '-'}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-slate-500">
                    <Bot className="w-8 h-8 mx-auto mb-2 text-slate-600" />
                    No agent executions recorded yet. Import transactions and run predictions to generate agent activity.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {executions && executions.total_pages > 1 && (
          <div className="p-4 border-t border-slate-700/50 flex justify-between items-center">
            <span className="text-slate-500 text-sm">
              Page {executions.page} of {executions.total_pages}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page <= 1}
                className="px-3 py-1.5 bg-slate-700/50 hover:bg-slate-600/50 rounded text-sm text-slate-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Previous
              </button>
              <button
                onClick={() => setPage(Math.min(executions.total_pages, page + 1))}
                disabled={page >= executions.total_pages}
                className="px-3 py-1.5 bg-slate-700/50 hover:bg-slate-600/50 rounded text-sm text-slate-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
