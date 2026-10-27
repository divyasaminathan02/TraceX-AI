import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Search,
  Filter,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  ShieldAlert,
  Sparkles,
  Briefcase,
  X,
  CheckCircle,
} from 'lucide-react';
import { api } from '../services/api';
import { Transaction, PaginatedResult } from '../types';
import { RiskBadge } from '../components/RiskBadge';
import { TableSkeleton } from '../components/LoadingSkeleton';
import { EmptyState } from '../components/EmptyState';

export const TransactionExplorer: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const [data, setData] = useState<PaginatedResult<Transaction> | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);

  // Filters
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [txType, setTxType] = useState('');
  const [riskLevel, setRiskLevel] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    fetchTransactions();
  }, [page, txType, riskLevel]);

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const res = await api.getTransactions({
        page,
        page_size: 15,
        search: search.trim() || undefined,
        tx_type: txType || undefined,
        risk_level: riskLevel || undefined,
      });
      setData(res);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchTransactions();
  };

  const handleOpenCase = (tx: Transaction) => {
    navigate(`/cases?createForTx=${tx.id}`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800/80">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white">
            Transaction Forensic Explorer
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Query, inspect, and trace financial transfers through real-time risk scores and audit trails.
          </p>
        </div>
        <button
          onClick={() => navigate('/prediction-test')}
          className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-medium text-xs rounded-xl shadow-glow-cyan transition-all"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>New Transaction Submission</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 bg-navy-900/60 border border-slate-800/80 rounded-2xl flex flex-wrap items-center gap-3">
        <form onSubmit={handleSearchSubmit} className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by TX Ref, Originator (C...), or Recipient (M.../C...)"
            className="w-full bg-navy-950/70 border border-slate-800 focus:border-cyan-500/50 text-xs text-slate-200 rounded-xl pl-10 pr-4 py-2 outline-none transition-all placeholder:text-slate-400"
          />
        </form>

        <select
          value={txType}
          onChange={(e) => {
            setTxType(e.target.value);
            setPage(1);
          }}
          className="bg-navy-950/70 border border-slate-800 text-xs text-slate-300 rounded-xl px-3 py-2 outline-none focus:border-cyan-500/50"
        >
          <option value="">All Channels / Types</option>
          <option value="PAYMENT">PAYMENT</option>
          <option value="TRANSFER">TRANSFER (High Risk)</option>
          <option value="CASH_OUT">CASH_OUT (High Risk)</option>
          <option value="CASH_IN">CASH_IN</option>
          <option value="DEBIT">DEBIT</option>
        </select>

        <select
          value={riskLevel}
          onChange={(e) => {
            setRiskLevel(e.target.value);
            setPage(1);
          }}
          className="bg-navy-950/70 border border-slate-800 text-xs text-slate-300 rounded-xl px-3 py-2 outline-none focus:border-cyan-500/50"
        >
          <option value="">All Risk Tiers</option>
          <option value="CRITICAL">CRITICAL (&ge; 85%)</option>
          <option value="HIGH">HIGH (&ge; 65%)</option>
          <option value="MEDIUM">MEDIUM (&ge; 30%)</option>
          <option value="LOW">LOW (&lt; 30%)</option>
        </select>

        <button
          type="button"
          onClick={() => {
            setSearch('');
            setTxType('');
            setRiskLevel('');
            setPage(1);
            fetchTransactions();
          }}
          className="px-3 py-2 text-xs text-slate-400 hover:text-white transition-colors"
        >
          Reset Filters
        </button>
      </div>

      {/* Main Table */}
      <div className="bg-navy-900/60 border border-slate-800/80 rounded-2xl overflow-hidden shadow-subtle">
        {loading ? (
          <div className="p-6">
            <TableSkeleton rows={8} cols={7} />
          </div>
        ) : !data || data.items.length === 0 ? (
          <EmptyState
            title="No Matching Transactions"
            description="No transactions found matching your query criteria. Adjust search parameters or submit a new transaction."
            actionText="Simulate Single Transaction"
            onAction={() => navigate('/prediction-test')}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-navy-950/80 border-b border-slate-800 text-slate-400 uppercase font-mono text-[11px] tracking-wider">
                  <th className="py-3.5 px-4">Transaction Ref</th>
                  <th className="py-3.5 px-4">Channel</th>
                  <th className="py-3.5 px-4">Monetary Amount</th>
                  <th className="py-3.5 px-4">Originator (Pre &rarr; Post)</th>
                  <th className="py-3.5 px-4">Beneficiary (Pre &rarr; Post)</th>
                  <th className="py-3.5 px-4">ML Risk Tier</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {data.items.map((tx) => (
                  <tr
                    key={tx.id}
                    className="hover:bg-navy-850/50 transition-colors cursor-pointer"
                    onClick={() => setSelectedTx(tx)}
                  >
                    <td className="py-3.5 px-4 font-mono font-semibold text-slate-200">
                      {tx.transaction_ref}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-300">
                        {tx.type}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-white">
                      ${tx.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[11px]">
                      <div className="text-slate-200">{tx.name_orig}</div>
                      <div className="text-slate-400 text-[10px]">
                        ${tx.oldbalance_org.toLocaleString()} &rarr; ${tx.newbalance_orig.toLocaleString()}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[11px]">
                      <div className="text-slate-200">{tx.name_dest}</div>
                      <div className="text-slate-400 text-[10px]">
                        ${tx.oldbalance_dest.toLocaleString()} &rarr; ${tx.newbalance_dest.toLocaleString()}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      {tx.prediction ? (
                        <RiskBadge
                          level={tx.prediction.risk_level}
                          score={tx.prediction.fraud_probability}
                          showScore
                          size="sm"
                        />
                      ) : (
                        <span className="text-slate-400">Unscored</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => setSelectedTx(tx)}
                        className="px-2.5 py-1 text-xs bg-navy-850 hover:bg-navy-800 text-slate-300 rounded-lg border border-slate-700/80 transition-colors mr-2"
                      >
                        Inspect
                      </button>
                      <button
                        onClick={() => handleOpenCase(tx)}
                        className="px-2.5 py-1 text-xs bg-cyan-500/10 hover:bg-cyan-500/20 text-brand-cyan rounded-lg border border-cyan-500/30 transition-colors"
                        title="Create Investigation Case"
                      >
                        Open Case
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
              <span className="font-semibold text-slate-200">{data.total_pages}</span> ({data.total} records)
            </div>
            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                className="p-1.5 rounded-lg bg-navy-950 border border-slate-800 hover:border-slate-700 disabled:opacity-40 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                disabled={page >= data.total_pages}
                onClick={() => setPage(page + 1)}
                className="p-1.5 rounded-lg bg-navy-950 border border-slate-800 hover:border-slate-700 disabled:opacity-40 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Forensic Inspection Modal */}
      {selectedTx && (
        <div className="fixed inset-0 z-50 bg-navy-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-navy-900 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 shadow-2xl relative">
            <button
              onClick={() => setSelectedTx(null)}
              className="absolute top-5 right-5 p-1.5 text-slate-400 hover:text-white rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-brand-cyan">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Forensic Transaction Dossier</h3>
                <p className="text-xs font-mono text-cyan-400">{selectedTx.transaction_ref}</p>
              </div>
            </div>

            {/* Risk Assessment Summary */}
            {selectedTx.prediction && (
              <div className="mb-6 p-4 bg-navy-950/70 border border-slate-800 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-400">Assigned ML Risk Assessment</span>
                  <div className="flex items-center gap-2 mt-1">
                    <RiskBadge
                      level={selectedTx.prediction.risk_level}
                      score={selectedTx.prediction.fraud_probability}
                      showScore
                      size="lg"
                    />
                    <span className="text-xs text-slate-400 font-mono">
                      (Model {selectedTx.prediction.model_version})
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs text-slate-400">Verdict</span>
                  <div className="text-sm font-bold text-white mt-1">
                    {selectedTx.prediction.is_predicted_fraud ? (
                      <span className="text-red-400 flex items-center gap-1 justify-end">
                        <ShieldAlert className="w-4 h-4" /> Flagged for Fraud Review
                      </span>
                    ) : (
                      <span className="text-emerald-400 flex items-center gap-1 justify-end">
                        <CheckCircle className="w-4 h-4" /> Legitimate Baseline
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Core Ledger Values */}
            <div className="grid grid-cols-2 gap-4 text-xs mb-6">
              <div className="p-3 bg-navy-950/50 rounded-xl border border-slate-800">
                <div className="text-slate-400">Originator Account</div>
                <div className="font-mono text-sm text-slate-200 mt-1">{selectedTx.name_orig}</div>
                <div className="mt-2 text-slate-400">
                  Pre: <span className="font-mono text-slate-200">${selectedTx.oldbalance_org.toLocaleString()}</span> &bull; Post: <span className="font-mono text-slate-200">${selectedTx.newbalance_orig.toLocaleString()}</span>
                </div>
              </div>
              <div className="p-3 bg-navy-950/50 rounded-xl border border-slate-800">
                <div className="text-slate-400">Beneficiary Account</div>
                <div className="font-mono text-sm text-slate-200 mt-1">{selectedTx.name_dest}</div>
                <div className="mt-2 text-slate-400">
                  Pre: <span className="font-mono text-slate-200">${selectedTx.oldbalance_dest.toLocaleString()}</span> &bull; Post: <span className="font-mono text-slate-200">${selectedTx.newbalance_dest.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Risk Factors Breakdown */}
            {selectedTx.prediction?.explanation?.risk_factors && (
              <div className="mb-6">
                <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2 font-mono">
                  Observed Risk Drivers & Indicators
                </h4>
                <div className="space-y-2">
                  {selectedTx.prediction.explanation.risk_factors.map((rf, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-navy-950/40 rounded-xl border border-slate-800/80 text-xs flex items-start gap-2.5"
                    >
                      <span className="w-2 h-2 rounded-full bg-amber-400 mt-1.5 shrink-0" />
                      <div>
                        <div className="font-semibold text-slate-200">{rf.factor}</div>
                        <div className="text-slate-400 mt-0.5 leading-relaxed">{rf.description}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="text-[11px] text-slate-400 font-mono mb-6 bg-slate-900/50 p-2.5 rounded-lg border border-slate-800">
              {selectedTx.prediction?.prediction_notice || "Automated statistical prediction."}
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
              <button
                onClick={() => setSelectedTx(null)}
                className="px-4 py-2 bg-navy-850 hover:bg-navy-800 text-slate-300 rounded-xl text-xs font-medium transition-colors"
              >
                Close
              </button>
              <button
                onClick={() => {
                  const txId = selectedTx.id;
                  setSelectedTx(null);
                  navigate(`/cases?createForTx=${txId}`);
                }}
                className="px-4 py-2 bg-brand-cyan hover:bg-cyan-400 text-navy-950 rounded-xl text-xs font-bold transition-all shadow-glow-cyan flex items-center gap-1.5"
              >
                <Briefcase className="w-4 h-4" />
                <span>Create Investigation Case</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
