import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ShieldAlert,
  ArrowUpRight,
  TrendingUp,
  AlertTriangle,
  Briefcase,
  CheckCircle2,
  Clock,
  ArrowRight,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { api } from '../services/api';
import { DashboardStats } from '../types';
import { RiskBadge } from '../components/RiskBadge';
import { CardSkeleton, TableSkeleton } from '../components/LoadingSkeleton';
import { EmptyState } from '../components/EmptyState';

const RISK_COLORS: Record<string, string> = {
  LOW: '#10B981',
  MEDIUM: '#F59E0B',
  HIGH: '#F97316',
  CRITICAL: '#EF4444',
};

export const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getDashboardStats();
      setStats(data);
    } catch (err: any) {
      setError(err.message || 'Failed to retrieve dashboard analytics');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
        <div className="h-80 bg-navy-900/60 rounded-xl border border-slate-800 animate-pulse" />
        <TableSkeleton rows={5} />
      </div>
    );
  }

  if (error || !stats) {
    return (
      <EmptyState
        title="Telemetry Unavailable"
        description={error || "Could not connect to the database to compute risk metrics."}
        actionText="Retry Connection"
        onAction={fetchStats}
      />
    );
  }

  // Format Risk Distribution for Pie Chart
  const pieData = Object.entries(stats.risk_distribution || {}).map(([key, value]) => ({
    name: key,
    value: value,
    color: RISK_COLORS[key] || '#64748B',
  }));

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800/80">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <span>Threat Intelligence & Risk Overview</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-cyan-500/10 text-brand-cyan border border-brand-cyan/20 font-mono font-medium">
              Model {stats.model_version}
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time inference metrics synthesized across active transaction streams.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchStats}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-navy-900 hover:bg-navy-850 text-slate-300 border border-slate-800 rounded-lg text-xs font-medium transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Sync Telemetry</span>
          </button>
          <Link
            to="/prediction-test"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-cyan hover:bg-cyan-400 text-navy-950 rounded-lg text-xs font-semibold transition-all shadow-glow-cyan"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Simulate Risk</span>
          </Link>
        </div>
      </div>

      {/* KPI Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Volume */}
        <div className="p-5 bg-navy-900/60 border border-slate-800/80 rounded-2xl relative overflow-hidden card-hover-effect">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-slate-400">Total Analyzed</span>
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-white tracking-tight">
            {stats.total_transactions.toLocaleString()}
          </div>
          <p className="text-[11px] text-slate-400 mt-1 font-mono">
            {stats.flagged_transactions} rule-flagged (&gt;$200k)
          </p>
        </div>

        {/* Flagged / Predicted Fraud Rate */}
        <div className="p-5 bg-navy-900/60 border border-slate-800/80 rounded-2xl relative overflow-hidden card-hover-effect">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-slate-400">Predicted Fraud Rate</span>
            <div className="p-2 rounded-xl bg-red-500/10 text-red-400 border border-red-500/20">
              <ShieldAlert className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-red-400 tracking-tight">
            {stats.fraud_rate_percentage}%
          </div>
          <p className="text-[11px] text-slate-400 mt-1 font-mono">
            Statistical threshold &ge; 0.50
          </p>
        </div>

        {/* Active Alerts */}
        <div className="p-5 bg-navy-900/60 border border-slate-800/80 rounded-2xl relative overflow-hidden card-hover-effect">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-slate-400">Active High-Risk Alerts</span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-amber-400 tracking-tight">
            {stats.active_alerts}
          </div>
          <p className="text-[11px] text-slate-400 mt-1 font-mono">
            {stats.total_alerts} lifetime alerts generated
          </p>
        </div>

        {/* Confirmed / Open Cases */}
        <div className="p-5 bg-navy-900/60 border border-slate-800/80 rounded-2xl relative overflow-hidden card-hover-effect">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-slate-400">Investigation Dossiers</span>
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <Briefcase className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-cyan-400 tracking-tight">
            {stats.open_cases} Open
          </div>
          <p className="text-[11px] text-slate-400 mt-1 font-mono">
            {stats.confirmed_fraud_cases} analyst-confirmed frauds
          </p>
        </div>
      </div>

      {/* Analytics Visualizations */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Transaction Volume Trend Chart */}
        <div className="lg:col-span-2 p-6 bg-navy-900/60 border border-slate-800/80 rounded-2xl">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-sm font-semibold text-slate-200">
                Transaction Volume Timeline
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Aggregate capital processed across temporal review windows
              </p>
            </div>
            <span className="text-[11px] font-mono text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
              USD ($)
            </span>
          </div>

          <div className="h-64 w-full">
            {stats.volume_by_day.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats.volume_by_day}>
                  <defs>
                    <linearGradient id="colorVol" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#06B6D4" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#06B6D4" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="date" stroke="#64748B" fontSize={11} tickLine={false} />
                  <YAxis stroke="#64748B" fontSize={11} tickLine={false} tickFormatter={(val) => `$${(val / 1000).toFixed(0)}k`} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0D1527', borderColor: '#1E293B', borderRadius: '0.75rem', fontSize: '12px' }}
                    formatter={(value: any) => [`$${Number(value).toLocaleString()}`, 'Volume']}
                  />
                  <Area type="monotone" dataKey="volume" stroke="#06B6D4" strokeWidth={2} fillOpacity={1} fill="url(#colorVol)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-xs text-slate-400 font-mono">
                No temporal volume records logged in current partition.
              </div>
            )}
          </div>
        </div>

        {/* Risk Level Distribution */}
        <div className="p-6 bg-navy-900/60 border border-slate-800/80 rounded-2xl flex flex-col justify-between">
          <div>
            <h2 className="text-sm font-semibold text-slate-200 mb-1">
              Risk Tier Breakdown
            </h2>
            <p className="text-xs text-slate-400">
              Distribution of transactions by calibrated model severity
            </p>
          </div>

          <div className="h-44 w-full my-4 flex items-center justify-center">
            {stats.total_transactions > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={75}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0D1527', borderColor: '#1E293B', borderRadius: '0.75rem', fontSize: '11px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-xs text-slate-400">No predictions evaluated</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            {Object.entries(stats.risk_distribution || {}).map(([tier, count]) => (
              <div key={tier} className="p-2 bg-navy-950/60 rounded-xl border border-slate-800/60 flex items-center justify-between">
                <span className="text-[11px] font-medium text-slate-400 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: RISK_COLORS[tier] }} />
                  {tier}
                </span>
                <span className="font-mono font-semibold text-slate-200">{count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Alerts & High-Risk Transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Alerts */}
        <div className="p-6 bg-navy-900/60 border border-slate-800/80 rounded-2xl">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold text-slate-200">Active High-Priority Alerts</h2>
              <p className="text-xs text-slate-400">Requires triage and assignment</p>
            </div>
            <Link to="/alerts" className="text-xs font-semibold text-brand-cyan hover:underline flex items-center gap-1">
              <span>View All</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-3">
            {stats.recent_alerts.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-6">No unresolved risk alerts</p>
            ) : (
              stats.recent_alerts.map((alert) => (
                <div
                  key={alert.id}
                  className="p-3.5 bg-navy-950/60 rounded-xl border border-slate-800/70 flex items-center justify-between hover:border-slate-700 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <RiskBadge level={alert.severity} size="sm" />
                      <span className="font-mono text-xs font-semibold text-slate-200">
                        {alert.transaction?.transaction_ref || 'N/A'}
                      </span>
                    </div>
                    <div className="text-xs text-slate-400">
                      Channel: <span className="font-medium text-slate-300">{alert.transaction?.type}</span> &bull; ${alert.transaction?.amount?.toLocaleString()}
                    </div>
                  </div>
                  <Link
                    to={`/alerts`}
                    className="ml-3 px-2.5 py-1 text-xs bg-navy-850 hover:bg-navy-800 border border-slate-700/80 rounded-lg text-slate-200 transition-colors"
                  >
                    Investigate
                  </Link>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Analyzed Stream */}
        <div className="p-6 bg-navy-900/60 border border-slate-800/80 rounded-2xl">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold text-slate-200">Recent Analyzed Stream</h2>
              <p className="text-xs text-slate-400">Continuous scoring feed</p>
            </div>
            <Link to="/transactions" className="text-xs font-semibold text-brand-cyan hover:underline flex items-center gap-1">
              <span>Explorer</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-3">
            {stats.recent_transactions.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-6">No transactions in database</p>
            ) : (
              stats.recent_transactions.map((tx) => (
                <div
                  key={tx.id}
                  className="p-3.5 bg-navy-950/60 rounded-xl border border-slate-800/70 flex items-center justify-between hover:border-slate-700 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-300">
                        {tx.type}
                      </span>
                      <span className="font-mono text-xs text-slate-300 truncate">
                        {tx.name_orig} &rarr; {tx.name_dest}
                      </span>
                    </div>
                    <div className="text-xs font-semibold text-white">
                      ${tx.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                  {tx.prediction && (
                    <RiskBadge
                      level={tx.prediction.risk_level}
                      score={tx.prediction.fraud_probability}
                      showScore
                      size="sm"
                    />
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
