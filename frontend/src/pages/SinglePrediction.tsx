import React, { useState } from 'react';
import {
  Sparkles,
  ShieldAlert,
  CheckCircle,
  AlertTriangle,
  Play,
  RotateCcw,
  Save,
  Info,
} from 'lucide-react';
import { api } from '../services/api';
import { RiskBadge } from '../components/RiskBadge';

export const SinglePrediction: React.FC = () => {
  const [formData, setFormData] = useState({
    step: 14,
    type: 'TRANSFER',
    amount: 175000.0,
    name_orig: 'C104928172',
    oldbalance_org: 175000.0,
    newbalance_orig: 0.0,
    name_dest: 'C892183921',
    oldbalance_dest: 0.0,
    newbalance_dest: 175000.0,
  });

  const [persist, setPersist] = useState(true);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  const presets = [
    {
      title: 'High-Risk Account Drain (Fraud Vector)',
      desc: 'Originator completely drained to $0 via TRANSFER into fresh empty account',
      data: {
        step: 22,
        type: 'TRANSFER',
        amount: 250000.0,
        name_orig: 'C991204910',
        oldbalance_org: 250000.0,
        newbalance_orig: 0.0,
        name_dest: 'C339182910',
        oldbalance_dest: 0.0,
        newbalance_dest: 250000.0,
      },
    },
    {
      title: 'Routine Merchant POS Payment (Legitimate)',
      desc: 'Small typical everyday retail payment to merchant entity M...',
      data: {
        step: 34,
        type: 'PAYMENT',
        amount: 84.50,
        name_orig: 'C449102910',
        oldbalance_org: 1850.0,
        newbalance_orig: 1765.50,
        name_dest: 'M992102919',
        oldbalance_dest: 35000.0,
        newbalance_dest: 35084.50,
      },
    },
    {
      title: 'Cash Out Anomaly',
      desc: 'Large volume cash withdrawal emptying entire balance',
      data: {
        step: 50,
        type: 'CASH_OUT',
        amount: 145000.0,
        name_orig: 'C123891029',
        oldbalance_org: 145000.0,
        newbalance_orig: 0.0,
        name_dest: 'C981290312',
        oldbalance_dest: 0.0,
        newbalance_dest: 0.0,
      },
    },
  ];

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: ['step', 'amount', 'oldbalance_org', 'newbalance_orig', 'oldbalance_dest', 'newbalance_dest'].includes(name)
        ? parseFloat(value) || 0
        : value,
    }));
  };

  const handlePredict = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      if (persist) {
        const tx = await api.submitTransaction(formData);
        setResult({
          ...tx.prediction,
          transaction_ref: tx.transaction_ref,
          persisted: true,
        });
      } else {
        const sim = await api.simulatePrediction(formData);
        setResult({
          ...sim,
          persisted: false,
        });
      }
    } catch (err: any) {
      setError(err.message || 'Prediction execution failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="pb-2 border-b border-slate-800/80">
        <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-brand-cyan" />
          <span>Single-Transaction Fraud Scoring & What-If Simulation</span>
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Evaluate isolated transaction payloads against the active machine learning risk model.
        </p>
      </div>

      {/* Preset Scenarios */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {presets.map((p, idx) => (
          <div
            key={idx}
            onClick={() => setFormData(p.data)}
            className="p-3.5 bg-navy-900/60 border border-slate-800/80 hover:border-brand-cyan/40 rounded-xl cursor-pointer transition-all card-hover-effect"
          >
            <div className="text-xs font-semibold text-slate-200">{p.title}</div>
            <div className="text-[11px] text-slate-400 mt-1">{p.desc}</div>
          </div>
        ))}
      </div>

      {/* Form and Results Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Form Panel */}
        <div className="lg:col-span-7 bg-navy-900/60 border border-slate-800/80 rounded-2xl p-6">
          <form onSubmit={handlePredict} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Temporal Step (Hour 1..744)
                </label>
                <input
                  type="number"
                  name="step"
                  min="1"
                  max="744"
                  value={formData.step}
                  onChange={handleInputChange}
                  className="w-full bg-navy-950/70 border border-slate-800 text-xs text-slate-200 rounded-xl px-3 py-2 outline-none focus:border-cyan-500/50"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Transaction Type / Channel
                </label>
                <select
                  name="type"
                  value={formData.type}
                  onChange={handleInputChange}
                  className="w-full bg-navy-950/70 border border-slate-800 text-xs text-slate-200 rounded-xl px-3 py-2 outline-none focus:border-cyan-500/50"
                  required
                >
                  <option value="TRANSFER">TRANSFER (High Risk Channel)</option>
                  <option value="CASH_OUT">CASH_OUT (High Risk Channel)</option>
                  <option value="PAYMENT">PAYMENT</option>
                  <option value="CASH_IN">CASH_IN</option>
                  <option value="DEBIT">DEBIT</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Monetary Amount ($ USD)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  name="amount"
                  value={formData.amount}
                  onChange={handleInputChange}
                  className="w-full bg-navy-950/70 border border-slate-800 text-sm font-mono font-bold text-cyan-400 rounded-xl px-3 py-2 outline-none focus:border-cyan-500/50"
                  required
                />
              </div>

              {/* Originator Section */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Originator Account Ref
                </label>
                <input
                  type="text"
                  name="name_orig"
                  value={formData.name_orig}
                  onChange={handleInputChange}
                  placeholder="C104928172"
                  className="w-full bg-navy-950/70 border border-slate-800 text-xs text-slate-200 rounded-xl px-3 py-2 outline-none focus:border-cyan-500/50"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Originator Pre-Balance ($)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  name="oldbalance_org"
                  value={formData.oldbalance_org}
                  onChange={handleInputChange}
                  className="w-full bg-navy-950/70 border border-slate-800 text-xs text-slate-200 rounded-xl px-3 py-2 outline-none focus:border-cyan-500/50"
                  required
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Originator Post-Balance ($)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  name="newbalance_orig"
                  value={formData.newbalance_orig}
                  onChange={handleInputChange}
                  className="w-full bg-navy-950/70 border border-slate-800 text-xs text-slate-200 rounded-xl px-3 py-2 outline-none focus:border-cyan-500/50"
                  required
                />
              </div>

              {/* Beneficiary Section */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Beneficiary Account Ref
                </label>
                <input
                  type="text"
                  name="name_dest"
                  value={formData.name_dest}
                  onChange={handleInputChange}
                  placeholder="C892183921"
                  className="w-full bg-navy-950/70 border border-slate-800 text-xs text-slate-200 rounded-xl px-3 py-2 outline-none focus:border-cyan-500/50"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Beneficiary Pre-Balance ($)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  name="oldbalance_dest"
                  value={formData.oldbalance_dest}
                  onChange={handleInputChange}
                  className="w-full bg-navy-950/70 border border-slate-800 text-xs text-slate-200 rounded-xl px-3 py-2 outline-none focus:border-cyan-500/50"
                  required
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Beneficiary Post-Balance ($)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  name="newbalance_dest"
                  value={formData.newbalance_dest}
                  onChange={handleInputChange}
                  className="w-full bg-navy-950/70 border border-slate-800 text-xs text-slate-200 rounded-xl px-3 py-2 outline-none focus:border-cyan-500/50"
                  required
                />
              </div>
            </div>

            {/* Persistence Toggle */}
            <div className="pt-2 flex items-center justify-between border-t border-slate-800">
              <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
                <input
                  type="checkbox"
                  checked={persist}
                  onChange={(e) => setPersist(e.target.checked)}
                  className="w-4 h-4 rounded text-brand-cyan bg-navy-950 border-slate-700"
                />
                <span>Persist record to PostgreSQL & trigger alerts if risk threshold is breached</span>
              </label>

              <button
                type="submit"
                disabled={loading}
                className="px-5 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-xs rounded-xl shadow-glow-cyan transition-all flex items-center gap-2 disabled:opacity-50"
              >
                {loading ? (
                  <span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5" />
                    <span>Run Model Inference</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Inference Results Panel */}
        <div className="lg:col-span-5 bg-navy-900/60 border border-slate-800/80 rounded-2xl p-6 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-semibold text-slate-200 mb-1">
              Model Inference Output
            </h3>
            <p className="text-xs text-slate-400">
              Instantaneous risk score & explanation from scikit-learn pipeline
            </p>

            {error && (
              <div className="mt-4 p-3.5 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-xs">
                {error}
              </div>
            )}

            {!result && !error && (
              <div className="py-16 text-center text-xs text-slate-400 font-mono">
                Submit form or select a preset to compute statistical risk.
              </div>
            )}

            {result && (
              <div className="mt-4 space-y-4">
                {/* Score Card */}
                <div className="p-4 bg-navy-950/80 rounded-xl border border-slate-800">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-slate-400">Probability of Fraud</span>
                    <span className="text-xs font-mono text-cyan-400">{result.model_version}</span>
                  </div>
                  <div className="flex items-baseline gap-3">
                    <span className="text-3xl font-extrabold text-white font-mono">
                      {(result.fraud_probability * 100).toFixed(1)}%
                    </span>
                    <RiskBadge level={result.risk_level} size="md" />
                  </div>

                  {/* Visual gauge bar */}
                  <div className="w-full bg-slate-800 h-2 rounded-full mt-3 overflow-hidden">
                    <div
                      className={`h-full transition-all duration-500 ${
                        result.risk_level === 'CRITICAL'
                          ? 'bg-red-500'
                          : result.risk_level === 'HIGH'
                          ? 'bg-orange-500'
                          : result.risk_level === 'MEDIUM'
                          ? 'bg-amber-500'
                          : 'bg-emerald-500'
                      }`}
                      style={{ width: `${Math.min(100, result.fraud_probability * 100)}%` }}
                    />
                  </div>
                </div>

                {/* Behavioral Explanations */}
                {result.explanation?.risk_factors && (
                  <div>
                    <span className="text-xs font-semibold text-slate-300 font-mono uppercase tracking-wider block mb-2">
                      Key Risk Factors Identified
                    </span>
                    <div className="space-y-2">
                      {result.explanation.risk_factors.map((rf: any, i: number) => (
                        <div
                          key={i}
                          className="p-2.5 bg-navy-950/50 border border-slate-800/80 rounded-lg text-xs"
                        >
                          <div className="font-semibold text-slate-200">{rf.factor}</div>
                          <div className="text-slate-400 text-[11px] mt-0.5">{rf.description}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Engineered Indicators */}
                {result.explanation?.engineered_indicators && (
                  <div className="p-3 bg-navy-950/50 border border-slate-800/60 rounded-xl text-xs space-y-1 font-mono text-[11px]">
                    <div className="flex justify-between text-slate-400">
                      <span>Drain Ratio:</span>
                      <span className="text-slate-200">
                        {(result.explanation.engineered_indicators.orig_drain_ratio * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Origin Balance Delta:</span>
                      <span className="text-slate-200">
                        ${result.explanation.engineered_indicators.orig_balance_diff.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Diurnal Hour:</span>
                      <span className="text-slate-200">
                        Hour {result.explanation.engineered_indicators.hour_of_day}:00
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {result && (
            <div className="mt-4 p-3 bg-slate-900/50 rounded-xl border border-slate-800/80 text-[11px] text-slate-400 font-mono">
              {result.prediction_notice}
              {result.persisted && (
                <div className="mt-1 text-cyan-400">
                  &bull; Stored in database as {result.transaction_ref}.
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
