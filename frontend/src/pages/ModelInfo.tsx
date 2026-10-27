import React, { useState, useEffect } from 'react';
import {
  Cpu,
  Layers,
  CheckCircle2,
  AlertTriangle,
  Play,
  RotateCcw,
  Sparkles,
  GitBranch,
} from 'lucide-react';
import { api } from '../services/api';
import { ModelMetadata } from '../types';
import { TableSkeleton } from '../components/LoadingSkeleton';

export const ModelInfo: React.FC = () => {
  const [models, setModels] = useState<ModelMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [activating, setActivating] = useState<string | null>(null);

  useEffect(() => {
    fetchModels();
  }, []);

  const fetchModels = async () => {
    setLoading(true);
    try {
      const data = await api.getModels();
      setModels(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleActivate = async (id: string) => {
    setActivating(id);
    try {
      await api.activateModel(id);
      fetchModels();
    } catch (e) {
      console.error(e);
    } finally {
      setActivating(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800/80">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <Cpu className="w-5 h-5 text-brand-cyan" />
            <span>Machine Learning Model Registry & Architecture</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Registered model versions, algorithmic parameters, feature spaces, and activation switches.
          </p>
        </div>
      </div>

      {loading ? (
        <TableSkeleton rows={4} cols={5} />
      ) : (
        <div className="space-y-6">
          {models.map((m) => (
            <div
              key={m.id}
              className={`p-6 bg-navy-900/60 border rounded-2xl relative overflow-hidden transition-all ${
                m.is_active
                  ? 'border-brand-cyan/40 shadow-glow-cyan/20'
                  : 'border-slate-800/80 opacity-80'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-xs px-2.5 py-0.5 rounded bg-cyan-500/10 text-brand-cyan font-bold border border-cyan-500/20">
                      {m.version}
                    </span>
                    {m.is_active ? (
                      <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Active Production Model</span>
                      </span>
                    ) : (
                      <span className="text-[11px] text-slate-400 font-mono">Standby</span>
                    )}
                  </div>
                  <h3 className="text-base font-bold text-white">{m.name}</h3>
                  <p className="text-xs text-slate-400 mt-0.5 font-mono">
                    Algorithm: <span className="text-slate-200">{m.algorithm}</span> &bull; Trained on {m.training_dataset_size.toLocaleString()} samples
                  </p>
                </div>

                {!m.is_active && (
                  <button
                    onClick={() => handleActivate(m.id)}
                    disabled={activating === m.id}
                    className="px-4 py-2 bg-navy-850 hover:bg-brand-cyan hover:text-navy-950 text-slate-200 font-semibold text-xs rounded-xl border border-slate-700 transition-all shadow-subtle disabled:opacity-50"
                  >
                    {activating === m.id ? 'Activating...' : 'Activate for Scoring'}
                  </button>
                )}
              </div>

              {/* Algorithm Comparison Details */}
              {m.metrics?.comparison && (
                <div className="my-4 p-4 bg-navy-950/70 rounded-xl border border-slate-800">
                  <div className="text-xs font-semibold text-slate-300 font-mono uppercase tracking-wider mb-2">
                    Candidate Algorithm Tournament (Validation Set)
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div className="p-3 bg-navy-900/40 rounded-lg border border-slate-800/80">
                      <div className="font-semibold text-slate-200">{m.metrics.comparison.baseline_lr?.model_name}</div>
                      <div className="font-mono text-[11px] text-slate-400 mt-1">
                        PR-AUC: <span className="text-slate-200 font-bold">{m.metrics.comparison.baseline_lr?.pr_auc}</span> &bull; F1: <span className="text-slate-200 font-bold">{m.metrics.comparison.baseline_lr?.f1}</span>
                      </div>
                    </div>
                    <div className="p-3 bg-navy-900/40 rounded-lg border border-cyan-500/30">
                      <div className="font-semibold text-cyan-400 flex items-center justify-between">
                        <span>{m.metrics.comparison.tree_rf?.model_name}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300">Selected Champion</span>
                      </div>
                      <div className="font-mono text-[11px] text-slate-400 mt-1">
                        PR-AUC: <span className="text-white font-bold">{m.metrics.comparison.tree_rf?.pr_auc}</span> &bull; F1: <span className="text-white font-bold">{m.metrics.comparison.tree_rf?.f1}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Feature Space Tags */}
              <div>
                <span className="text-xs font-semibold text-slate-400 font-mono block mb-2">
                  Engineered Feature Vector Space ({m.feature_names?.length || 0} Dimensions):
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {m.feature_names?.map((feat, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 rounded text-[10px] font-mono bg-navy-950 border border-slate-800 text-slate-300"
                    >
                      {feat}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
