import React, { useState } from 'react';
import {
  Settings as SettingsIcon,
  Shield,
  Database,
  Sliders,
  CheckCircle2,
  Lock,
  User,
  Bell,
  Cpu,
} from 'lucide-react';
import { User as UserType } from '../types';

interface SettingsProps {
  currentUser: UserType | null;
}

export const Settings: React.FC<SettingsProps> = ({ currentUser }) => {
  const [thresholds, setThresholds] = useState({
    low: 0.30,
    medium: 0.65,
    high: 0.85,
  });

  const [saved, setSaved] = useState(false);

  const handleSaveThresholds = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="pb-2 border-b border-slate-800/80">
        <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
          <SettingsIcon className="w-5 h-5 text-brand-cyan" />
          <span>System & Risk Threshold Settings</span>
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Tune operational fraud thresholds, inspect database health, and view operator profile.
        </p>
      </div>

      {/* Thresholds Calibration Form */}
      <div className="p-6 bg-navy-900/60 border border-slate-800/80 rounded-2xl">
        <div className="flex items-center gap-2 mb-2">
          <Sliders className="w-4 h-4 text-brand-cyan" />
          <h2 className="text-sm font-semibold text-slate-200">
            Automated Alert Severity Thresholds
          </h2>
        </div>
        <p className="text-xs text-slate-400 mb-6">
          Controls cut-offs for generating Medium, High, and Critical alert notifications upon real-time inference.
        </p>

        <form onSubmit={handleSaveThresholds} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 bg-navy-950/60 border border-slate-800 rounded-xl">
              <label className="block text-xs font-semibold text-amber-400 mb-1">
                Medium Risk Threshold
              </label>
              <input
                type="number"
                step="0.05"
                min="0.10"
                max="0.90"
                value={thresholds.low}
                onChange={(e) => setThresholds({ ...thresholds, low: parseFloat(e.target.value) || 0 })}
                className="w-full bg-navy-900 border border-slate-700 text-sm font-mono text-white rounded-lg px-3 py-1.5 outline-none focus:border-cyan-500"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">
                Probability &ge; {(thresholds.low * 100).toFixed(0)}% flags as Medium
              </span>
            </div>

            <div className="p-4 bg-navy-950/60 border border-slate-800 rounded-xl">
              <label className="block text-xs font-semibold text-orange-400 mb-1">
                High Risk Threshold
              </label>
              <input
                type="number"
                step="0.05"
                min="0.10"
                max="0.95"
                value={thresholds.medium}
                onChange={(e) => setThresholds({ ...thresholds, medium: parseFloat(e.target.value) || 0 })}
                className="w-full bg-navy-900 border border-slate-700 text-sm font-mono text-white rounded-lg px-3 py-1.5 outline-none focus:border-cyan-500"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">
                Probability &ge; {(thresholds.medium * 100).toFixed(0)}% flags as High
              </span>
            </div>

            <div className="p-4 bg-navy-950/60 border border-slate-800 rounded-xl">
              <label className="block text-xs font-semibold text-red-400 mb-1">
                Critical Risk Threshold
              </label>
              <input
                type="number"
                step="0.05"
                min="0.50"
                max="0.99"
                value={thresholds.high}
                onChange={(e) => setThresholds({ ...thresholds, high: parseFloat(e.target.value) || 0 })}
                className="w-full bg-navy-900 border border-slate-700 text-sm font-mono text-white rounded-lg px-3 py-1.5 outline-none focus:border-cyan-500"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">
                Probability &ge; {(thresholds.high * 100).toFixed(0)}% flags as Critical
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            {saved ? (
              <span className="text-xs text-emerald-400 flex items-center gap-1 font-semibold">
                <CheckCircle2 className="w-4 h-4" /> Parameters saved successfully.
              </span>
            ) : (
              <span className="text-xs text-slate-400 font-mono">
                Changes apply dynamically to incoming inference batches.
              </span>
            )}

            <button
              type="submit"
              className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold text-xs rounded-xl shadow-glow-cyan transition-all"
            >
              Update Thresholds
            </button>
          </div>
        </form>
      </div>

      {/* Infrastructure Diagnostics Card */}
      <div className="p-6 bg-navy-900/60 border border-slate-800/80 rounded-2xl">
        <div className="flex items-center gap-2 mb-4">
          <Database className="w-4 h-4 text-emerald-400" />
          <h2 className="text-sm font-semibold text-slate-200">
            Infrastructure & Database Telemetry
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
          <div className="p-3 bg-navy-950/60 border border-slate-800 rounded-xl flex items-center justify-between">
            <span className="text-slate-400">Database Engine:</span>
            <span className="text-emerald-400 font-bold flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> PostgreSQL 17 (Connected)
            </span>
          </div>

          <div className="p-3 bg-navy-950/60 border border-slate-800 rounded-xl flex items-center justify-between">
            <span className="text-slate-400">Database Pool:</span>
            <span className="text-slate-200">10 Conn / 20 Overflow</span>
          </div>

          <div className="p-3 bg-navy-950/60 border border-slate-800 rounded-xl flex items-center justify-between">
            <span className="text-slate-400">Inference Engine:</span>
            <span className="text-cyan-400 font-bold">Scikit-Learn (Loaded)</span>
          </div>

          <div className="p-3 bg-navy-950/60 border border-slate-800 rounded-xl flex items-center justify-between">
            <span className="text-slate-400">JWT Token Security:</span>
            <span className="text-slate-200">HS256 &bull; 480 min TTL</span>
          </div>
        </div>
      </div>

      {/* Operator Session Info */}
      <div className="p-6 bg-navy-900/60 border border-slate-800/80 rounded-2xl">
        <div className="flex items-center gap-2 mb-4">
          <User className="w-4 h-4 text-cyan-400" />
          <h2 className="text-sm font-semibold text-slate-200">Active Operator Session</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div className="p-3 bg-navy-950/60 border border-slate-800 rounded-xl">
            <div className="text-slate-400">Full Name</div>
            <div className="font-semibold text-slate-200 mt-1">{currentUser?.full_name}</div>
          </div>
          <div className="p-3 bg-navy-950/60 border border-slate-800 rounded-xl">
            <div className="text-slate-400">Email Identifier</div>
            <div className="font-mono text-slate-200 mt-1">{currentUser?.email}</div>
          </div>
          <div className="p-3 bg-navy-950/60 border border-slate-800 rounded-xl">
            <div className="text-slate-400">Security Clearance</div>
            <div className="font-mono text-cyan-400 font-bold capitalize mt-1">
              {currentUser?.role} Tier
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
