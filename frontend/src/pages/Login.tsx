import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, Lock, Mail, ArrowRight, AlertCircle, KeyRound } from 'lucide-react';
import { api } from '../services/api';
import { User } from '../types';

interface LoginProps {
  onLoginSuccess: (user: User) => void;
}

export const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('admin@tracex.ai');
  const [password, setPassword] = useState('AdminSecurePass123!');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const data = await api.login(email, password);
      onLoginSuccess(data.user);
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoAccount = (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
  };

  return (
    <div className="min-h-screen bg-navy-950 flex flex-col justify-center items-center px-4 relative overflow-hidden">
      {/* Background Decorative Gradient Orbs */}
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-cyan-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Login Card */}
      <div className="w-full max-w-md bg-navy-900/90 border border-slate-800/90 rounded-2xl p-8 backdrop-blur-xl shadow-2xl relative z-10">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center mx-auto mb-4 shadow-glow-cyan">
            <ShieldAlert className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            TraceX <span className="text-brand-cyan">AI</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1 uppercase tracking-widest font-mono">
            Financial Fraud Intelligence
          </p>
        </div>

        {error && (
          <div className="mb-6 p-3.5 bg-red-500/10 border border-red-500/30 rounded-xl flex items-start gap-3 text-red-400 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <div className="leading-relaxed">{error}</div>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Operator Email
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="analyst@tracex.ai"
                className="w-full bg-navy-950/70 border border-slate-800 focus:border-brand-cyan/60 focus:ring-1 focus:ring-brand-cyan/40 text-sm text-slate-200 rounded-xl pl-10 pr-4 py-2.5 outline-none transition-all placeholder:text-slate-400"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Security Credential
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full bg-navy-950/70 border border-slate-800 focus:border-brand-cyan/60 focus:ring-1 focus:ring-brand-cyan/40 text-sm text-slate-200 rounded-xl pl-10 pr-4 py-2.5 outline-none transition-all placeholder:text-slate-400"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3 px-4 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-medium text-sm rounded-xl shadow-glow-cyan transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? (
              <span className="inline-block w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <span>Sign In to Operation Console</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Demo Fast Login Buttons */}
        <div className="mt-8 pt-6 border-t border-slate-800/80">
          <p className="text-[11px] font-mono uppercase tracking-wider text-slate-400 text-center mb-3">
            Quick Sandbox Roles
          </p>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => handleDemoAccount('admin@tracex.ai', 'AdminSecurePass123!')}
              className="px-2 py-1.5 bg-navy-950 border border-slate-800 hover:border-cyan-500/40 rounded-lg text-center transition-colors"
            >
              <div className="text-[11px] font-bold text-slate-200">Admin</div>
              <div className="text-[9px] text-cyan-400">Full Access</div>
            </button>
            <button
              type="button"
              onClick={() => handleDemoAccount('analyst@tracex.ai', 'AnalystSecurePass123!')}
              className="px-2 py-1.5 bg-navy-950 border border-slate-800 hover:border-cyan-500/40 rounded-lg text-center transition-colors"
            >
              <div className="text-[11px] font-bold text-slate-200">Analyst</div>
              <div className="text-[9px] text-amber-400">Investigations</div>
            </button>
            <button
              type="button"
              onClick={() => handleDemoAccount('viewer@tracex.ai', 'ViewerSecurePass123!')}
              className="px-2 py-1.5 bg-navy-950 border border-slate-800 hover:border-cyan-500/40 rounded-lg text-center transition-colors"
            >
              <div className="text-[11px] font-bold text-slate-200">Viewer</div>
              <div className="text-[9px] text-emerald-400">Read-Only</div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
