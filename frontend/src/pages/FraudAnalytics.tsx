import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  Cpu,
  ShieldCheck,
  TrendingUp,
  AlertTriangle,
  Info,
  CheckCircle2,
  Layers,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { api } from '../services/api';
import { ModelMetadata } from '../types';
import { CardSkeleton } from '../components/LoadingSkeleton';

export const FraudAnalytics: React.FC = () => {
  const [model, setModel] = useState<ModelMetadata | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchActiveModel();
  }, []);

  const fetchActiveModel = async () => {
    setLoading(true);
    try {
      const data = await api.getActiveModel();
      setModel(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-4 gap-4">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
      </div>
    );
  }

  const metrics = model?.metrics?.test_metrics || model?.metrics;
  const cm = metrics?.confusion_matrix || { tn: 0, fp: 0, fn: 0, tp: 0 };
  const fraudMetrics = metrics?.fraud_class_metrics || {
    fraud_count: 0,
    detected_frauds: 0,
    missed_frauds: 0,
    false_alarms: 0,
  };

  // Format Feature Importance for Chart
  const featureData = Object.entries(model?.metrics?.feature_importance || {}).map(
    ([feature, importance]) => ({
      feature: feature.replace(/_/g, ' '),
      importance: Number((importance * 100).toFixed(1)),
    })
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800/80">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-brand-cyan" />
            <span>Fraud Analytics & ML Model Evaluation</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Empirical validation results on holdout benchmark test partitions.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs px-3 py-1 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-mono font-medium">
            Active: {model?.name} ({model?.version})
          </span>
        </div>
      </div>

      {/* Synthetic Dataset Reality & Governance Notice */}
      <div className="p-4 bg-navy-900/80 border border-amber-500/30 rounded-2xl flex items-start gap-3 text-xs leading-relaxed">
        <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold text-amber-300">Model Governance & Synthetic Data Transparency: </span>
          <span className="text-slate-300">
            {model?.metrics?.synthetic_data_disclaimer ||
              'Evaluation reflects simulated PaySim transaction dynamics. In production environments, synthetic validation results must be supplemented with continuous operational monitoring to prevent model drift against evolving adversary tactics.'}
          </span>
        </div>
      </div>

      {/* Primary Performance Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="p-4 bg-navy-900/60 border border-slate-800 rounded-xl">
          <div className="text-xs text-slate-400">PR-AUC (Precision-Recall)</div>
          <div className="text-2xl font-bold text-cyan-400 font-mono mt-1">
            {metrics?.pr_auc !== undefined ? metrics.pr_auc.toFixed(4) : 'N/A'}
          </div>
          <div className="text-[10px] text-slate-400 mt-1">Gold standard for imbalanced fraud</div>
        </div>

        <div className="p-4 bg-navy-900/60 border border-slate-800 rounded-xl">
          <div className="text-xs text-slate-400">ROC-AUC Score</div>
          <div className="text-2xl font-bold text-emerald-400 font-mono mt-1">
            {metrics?.roc_auc !== undefined ? metrics.roc_auc.toFixed(4) : 'N/A'}
          </div>
          <div className="text-[10px] text-slate-400 mt-1">Discriminative threshold capacity</div>
        </div>

        <div className="p-4 bg-navy-900/60 border border-slate-800 rounded-xl">
          <div className="text-xs text-slate-400">Fraud Recall / Sensitivity</div>
          <div className="text-2xl font-bold text-white font-mono mt-1">
            {metrics?.recall !== undefined ? (metrics.recall * 100).toFixed(1) : 0}%
          </div>
          <div className="text-[10px] text-slate-400 mt-1">Actual fraud captured</div>
        </div>

        <div className="p-4 bg-navy-900/60 border border-slate-800 rounded-xl">
          <div className="text-xs text-slate-400">Precision (Fraud Class)</div>
          <div className="text-2xl font-bold text-white font-mono mt-1">
            {metrics?.precision !== undefined ? (metrics.precision * 100).toFixed(1) : 0}%
          </div>
          <div className="text-[10px] text-slate-400 mt-1">True frauds / All flags</div>
        </div>

        <div className="p-4 bg-navy-900/60 border border-slate-800 rounded-xl">
          <div className="text-xs text-slate-400">F1-Score Harmonized</div>
          <div className="text-2xl font-bold text-cyan-400 font-mono mt-1">
            {metrics?.f1 !== undefined ? metrics.f1.toFixed(4) : 'N/A'}
          </div>
          <div className="text-[10px] text-slate-400 mt-1">Precision & Recall balance</div>
        </div>
      </div>

      {/* Confusion Matrix and Feature Importance */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Confusion Matrix Breakdown */}
        <div className="lg:col-span-5 bg-navy-900/60 border border-slate-800/80 rounded-2xl p-6">
          <h2 className="text-sm font-semibold text-slate-200 mb-1">
            Holdout Test Confusion Matrix
          </h2>
          <p className="text-xs text-slate-400 mb-6">
            Empirical classification yields across holdout test set
          </p>

          <div className="grid grid-cols-2 gap-3 text-center">
            {/* True Negative */}
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
              <span className="text-[10px] font-mono uppercase text-emerald-400">True Negatives (TN)</span>
              <div className="text-xl font-bold text-white font-mono mt-1">{cm.tn?.toLocaleString()}</div>
              <span className="text-[10px] text-slate-400">Legitimate cleared</span>
            </div>

            {/* False Positive */}
            <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl">
              <span className="text-[10px] font-mono uppercase text-amber-400">False Positives (FP)</span>
              <div className="text-xl font-bold text-amber-300 font-mono mt-1">{cm.fp?.toLocaleString()}</div>
              <span className="text-[10px] text-slate-400">False alarms</span>
            </div>

            {/* False Negative */}
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
              <span className="text-[10px] font-mono uppercase text-red-400">False Negatives (FN)</span>
              <div className="text-xl font-bold text-red-300 font-mono mt-1">{cm.fn?.toLocaleString()}</div>
              <span className="text-[10px] text-slate-400">Missed fraud</span>
            </div>

            {/* True Positive */}
            <div className="p-4 bg-cyan-500/10 border border-cyan-500/20 rounded-xl">
              <span className="text-[10px] font-mono uppercase text-cyan-400">True Positives (TP)</span>
              <div className="text-xl font-bold text-cyan-300 font-mono mt-1">{cm.tp?.toLocaleString()}</div>
              <span className="text-[10px] text-slate-400">Confirmed fraud captured</span>
            </div>
          </div>

          <div className="mt-6 p-3 bg-navy-950/60 rounded-xl border border-slate-800 text-xs space-y-1.5 font-mono text-[11px]">
            <div className="flex justify-between text-slate-400">
              <span>Total Frauds in Holdout:</span>
              <span className="text-slate-200 font-bold">{fraudMetrics.fraud_count}</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Captured Fraud Cases:</span>
              <span className="text-emerald-400 font-bold">{fraudMetrics.detected_frauds}</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Missed Escapes:</span>
              <span className="text-red-400 font-bold">{fraudMetrics.missed_frauds}</span>
            </div>
          </div>
        </div>

        {/* Feature Importance Bar Chart */}
        <div className="lg:col-span-7 bg-navy-900/60 border border-slate-800/80 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-sm font-semibold text-slate-200">
              Feature Importance & Signal Contribution
            </h2>
            <span className="text-[10px] font-mono text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
              Gini Importance %
            </span>
          </div>
          <p className="text-xs text-slate-400 mb-4">
            Relative weight of engineered features in decision tree splits
          </p>

          <div className="h-64 w-full">
            {featureData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={featureData} layout="vertical" margin={{ left: 40, right: 20 }}>
                  <XAxis type="number" stroke="#64748B" fontSize={10} tickFormatter={(v) => `${v}%`} />
                  <YAxis type="category" dataKey="feature" stroke="#64748B" fontSize={10} width={110} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0D1527', borderColor: '#1E293B', borderRadius: '0.75rem', fontSize: '11px' }}
                    formatter={(val: any) => [`${val}%`, 'Contribution']}
                  />
                  <Bar dataKey="importance" fill="#06B6D4" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-xs text-slate-400 text-center py-12">Feature importances not available</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
