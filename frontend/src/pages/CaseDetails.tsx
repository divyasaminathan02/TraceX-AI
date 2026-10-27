import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Briefcase,
  Plus,
  Send,
  Sparkles,
  CheckCircle,
  AlertTriangle,
  History,
  FileText,
  UserCheck,
  ChevronRight,
  ShieldAlert,
  Clock,
  X,
} from 'lucide-react';
import { api } from '../services/api';
import { InvestigationCase, PaginatedResult } from '../types';
import { RiskBadge } from '../components/RiskBadge';
import { TableSkeleton } from '../components/LoadingSkeleton';
import { EmptyState } from '../components/EmptyState';

export const CaseDetails: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const createForTx = searchParams.get('createForTx');
  const createForAlert = searchParams.get('createForAlert');

  const [cases, setCases] = useState<PaginatedResult<InvestigationCase> | null>(null);
  const [selectedCase, setSelectedCase] = useState<InvestigationCase | null>(null);
  const [loading, setLoading] = useState(true);

  // New Note state
  const [newNote, setNewNote] = useState('');
  const [submittingNote, setSubmittingNote] = useState(false);

  // Status Change state
  const [changingStatus, setChangingStatus] = useState(false);
  const [statusComment, setStatusComment] = useState('');
  const [targetStatus, setTargetStatus] = useState('');

  // Create Case Modal
  const [showCreateModal, setShowCreateModal] = useState(!!createForTx);
  const [createForm, setCreateForm] = useState({
    title: createForTx ? `Investigation into Suspicious Transaction` : '',
    description: 'Initiated for evidence verification and customer out-of-band validation.',
    priority: 'HIGH',
    transaction_id: createForTx || '',
    alert_id: createForAlert || '',
  });

  useEffect(() => {
    fetchCases();
  }, []);

  const fetchCases = async () => {
    setLoading(true);
    try {
      const data = await api.getCases({ page: 1, page_size: 20 });
      setCases(data);
      if (data.items.length > 0 && !selectedCase) {
        setSelectedCase(data.items[0]);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCase = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.createCase({
        title: createForm.title,
        description: createForm.description,
        priority: createForm.priority,
        transaction_id: createForm.transaction_id || undefined,
        alert_id: createForm.alert_id || undefined,
      });
      setShowCreateModal(false);
      setSearchParams({});
      fetchCases();
      setSelectedCase(res);
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCase || !newNote.trim()) return;

    setSubmittingNote(true);
    try {
      await api.addCaseNote(selectedCase.id, newNote.trim());
      setNewNote('');
      const updated = await api.getCase(selectedCase.id);
      setSelectedCase(updated);
    } catch (e) {
      console.error(e);
    } finally {
      setSubmittingNote(false);
    }
  };

  const handleStatusUpdate = async (status: string) => {
    if (!selectedCase) return;
    try {
      const updated = await api.updateCase(selectedCase.id, {
        status,
        comment: statusComment || `Status updated to ${status}`,
      });
      setSelectedCase(updated);
      setChangingStatus(false);
      setStatusComment('');
      fetchCases();
    } catch (e) {
      console.error(e);
    }
  };

  const handleGenerateAiBrief = async () => {
    if (!selectedCase) return;
    try {
      const updated = await api.triggerAiCaseBrief(selectedCase.id);
      setSelectedCase(updated);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800/80">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-brand-cyan" />
            <span>Fraud Investigation Dossiers & Forensic Briefs</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Collaborative case management, deterministic evidence synthesis, and audit log tracking.
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-cyan hover:bg-cyan-400 text-navy-950 font-bold text-xs rounded-xl shadow-glow-cyan transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>New Investigation Case</span>
        </button>
      </div>

      {/* Main Grid: Cases List (Left) + Detail Dossier (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Cases List */}
        <div className="lg:col-span-4 bg-navy-900/60 border border-slate-800/80 rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <span className="text-xs font-semibold text-slate-200 uppercase tracking-wider font-mono">
              Active Cases ({cases?.total || 0})
            </span>
          </div>

          {loading ? (
            <TableSkeleton rows={4} cols={3} />
          ) : !cases || cases.items.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-8">No open cases</p>
          ) : (
            <div className="space-y-2 max-h-[75vh] overflow-y-auto pr-1">
              {cases.items.map((c) => (
                <div
                  key={c.id}
                  onClick={() => setSelectedCase(c)}
                  className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                    selectedCase?.id === c.id
                      ? 'bg-navy-850 border-brand-cyan/40 shadow-glow-cyan/20'
                      : 'bg-navy-950/40 border-slate-800/70 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-mono text-xs font-bold text-brand-cyan">
                      {c.case_number}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold ${
                        c.status === 'CLOSED_FRAUD'
                          ? 'bg-red-500/10 text-red-400 border border-red-500/30'
                          : c.status === 'CLOSED_FALSE_POSITIVE'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                          : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                      }`}
                    >
                      {c.status}
                    </span>
                  </div>
                  <div className="text-xs font-medium text-slate-200 line-clamp-1">{c.title}</div>
                  <div className="text-[11px] text-slate-400 mt-1 flex items-center justify-between font-mono">
                    <span>Priority: {c.priority}</span>
                    <span>{new Date(c.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Case Detail Dossier */}
        <div className="lg:col-span-8 bg-navy-900/60 border border-slate-800/80 rounded-2xl p-6 min-h-[600px]">
          {!selectedCase ? (
            <div className="py-24 text-center text-xs text-slate-400">
              Select an investigation case to view evidence dossier and notes.
            </div>
          ) : (
            <div className="space-y-6">
              {/* Dossier Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-xs px-2.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400 font-bold border border-cyan-500/20">
                      {selectedCase.case_number}
                    </span>
                    <span className="text-xs px-2.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                      Priority: {selectedCase.priority}
                    </span>
                  </div>
                  <h2 className="text-lg font-bold text-white">{selectedCase.title}</h2>
                  <p className="text-xs text-slate-400 mt-1">{selectedCase.description}</p>
                </div>

                {/* Status Switcher */}
                <div className="flex items-center gap-2">
                  <select
                    value={selectedCase.status}
                    onChange={(e) => handleStatusUpdate(e.target.value)}
                    className="bg-navy-950 border border-slate-700 text-xs text-slate-200 rounded-xl px-3 py-1.5 outline-none focus:border-cyan-500 font-medium"
                  >
                    <option value="OPEN">Status: OPEN</option>
                    <option value="IN_PROGRESS">Status: IN_PROGRESS</option>
                    <option value="CLOSED_FRAUD">Status: CLOSED_FRAUD (Confirmed)</option>
                    <option value="CLOSED_FALSE_POSITIVE">Status: CLOSED_FALSE_POSITIVE</option>
                  </select>
                </div>
              </div>

              {/* Transaction & Risk Signal Card */}
              {selectedCase.transaction && (
                <div className="p-4 bg-navy-950/70 border border-slate-800 rounded-xl">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider font-mono">
                      Target Financial Transfer
                    </span>
                    {selectedCase.transaction.prediction && (
                      <RiskBadge
                        level={selectedCase.transaction.prediction.risk_level}
                        score={selectedCase.transaction.prediction.fraud_probability}
                        showScore
                        size="sm"
                      />
                    )}
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
                    <div>
                      <div className="text-slate-400 text-[10px]">Reference</div>
                      <div className="text-slate-200 font-bold">{selectedCase.transaction.transaction_ref}</div>
                    </div>
                    <div>
                      <div className="text-slate-400 text-[10px]">Channel</div>
                      <div className="text-slate-200 font-bold">{selectedCase.transaction.type}</div>
                    </div>
                    <div>
                      <div className="text-slate-400 text-[10px]">Volume</div>
                      <div className="text-cyan-400 font-bold">${selectedCase.transaction.amount.toLocaleString()}</div>
                    </div>
                    <div>
                      <div className="text-slate-400 text-[10px]">Timestamp</div>
                      <div className="text-slate-200 font-bold">Hour {selectedCase.transaction.step}</div>
                    </div>
                  </div>
                </div>
              )}

              {/* AI Deterministic Evidence Brief */}
              <div className="p-5 bg-gradient-to-br from-navy-950/90 to-navy-900/90 border border-brand-cyan/20 rounded-2xl relative overflow-hidden">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-brand-cyan" />
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                      Deterministic Evidence & Forensic Synthesis Brief
                    </h3>
                  </div>
                  <button
                    onClick={handleGenerateAiBrief}
                    className="text-[11px] text-brand-cyan hover:underline font-mono"
                  >
                    Re-run Synthesis Engine
                  </button>
                </div>

                {selectedCase.ai_investigation_summary ? (
                  <div className="space-y-4 text-xs">
                    <p className="text-slate-300 leading-relaxed bg-navy-950/50 p-3 rounded-xl border border-slate-800">
                      {selectedCase.ai_investigation_summary.summary}
                    </p>

                    {/* Observed Anomalies */}
                    {selectedCase.ai_investigation_summary.observed_anomalies?.length > 0 && (
                      <div>
                        <div className="text-[11px] font-semibold text-amber-400 mb-1.5 uppercase font-mono">
                          Empirical Anomalies Detected
                        </div>
                        <div className="space-y-1.5">
                          {selectedCase.ai_investigation_summary.observed_anomalies.map((anom: any, idx: number) => (
                            <div key={idx} className="p-2.5 bg-navy-950/40 rounded-lg border border-slate-800 text-[11px]">
                              <div className="font-semibold text-slate-200">{anom.category}: {anom.finding}</div>
                              <div className="text-slate-400 mt-0.5">{anom.significance}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Actionable Next Steps */}
                    {selectedCase.ai_investigation_summary.recommended_actions?.length > 0 && (
                      <div>
                        <div className="text-[11px] font-semibold text-brand-cyan mb-1.5 uppercase font-mono">
                          Recommended Investigative Protocols
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {selectedCase.ai_investigation_summary.recommended_actions.map((act: any, idx: number) => (
                            <div key={idx} className="p-2.5 bg-navy-950/40 rounded-lg border border-slate-800 text-[11px]">
                              <div className="flex items-center justify-between font-semibold text-slate-200 mb-0.5">
                                <span>{act.step}</span>
                                <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 font-mono">
                                  {act.urgency}
                                </span>
                              </div>
                              <p className="text-slate-400 text-[10px] leading-relaxed">{act.guidance}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="text-[10px] text-slate-400 font-mono italic">
                      {selectedCase.ai_investigation_summary.disclaimer}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <p className="text-xs text-slate-400 mb-3">No forensic evidence brief compiled yet.</p>
                    <button
                      onClick={handleGenerateAiBrief}
                      className="px-3 py-1.5 bg-brand-cyan text-navy-950 font-bold text-xs rounded-lg shadow-glow-cyan"
                    >
                      Synthesize Evidence Brief
                    </button>
                  </div>
                )}
              </div>

              {/* Analyst Notes Thread */}
              <div>
                <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-3 font-mono flex items-center gap-2">
                  <FileText className="w-4 h-4 text-slate-400" />
                  <span>Analyst Notes & Activity Log ({selectedCase.notes.length})</span>
                </h3>

                <div className="space-y-3 mb-4">
                  {selectedCase.notes.length === 0 ? (
                    <p className="text-xs text-slate-400 italic py-2">No analyst notes recorded yet.</p>
                  ) : (
                    selectedCase.notes.map((note) => (
                      <div key={note.id} className="p-3 bg-navy-950/50 rounded-xl border border-slate-800 text-xs">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-semibold text-cyan-400">{note.author_name || 'Analyst'}</span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {new Date(note.created_at).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-slate-300 leading-relaxed">{note.content}</p>
                      </div>
                    ))
                  )}
                </div>

                {/* Add Note Form */}
                <form onSubmit={handleAddNote} className="flex gap-2">
                  <input
                    type="text"
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    placeholder="Enter case note, evidence verification note, or customer contact response..."
                    className="flex-1 bg-navy-950/80 border border-slate-800 focus:border-cyan-500/50 text-xs text-slate-200 rounded-xl px-4 py-2.5 outline-none"
                  />
                  <button
                    type="submit"
                    disabled={submittingNote || !newNote.trim()}
                    className="px-4 py-2.5 bg-brand-cyan hover:bg-cyan-400 text-navy-950 font-bold text-xs rounded-xl shadow-glow-cyan transition-all disabled:opacity-50 flex items-center gap-1.5"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Post Note</span>
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* New Case Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-navy-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-navy-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl relative">
            <button
              onClick={() => {
                setShowCreateModal(false);
                setSearchParams({});
              }}
              className="absolute top-5 right-5 p-1.5 text-slate-400 hover:text-white rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-base font-bold text-white mb-1">
              Initiate Fraud Investigation Case
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Formalize an incident for team investigation and SAR compliance tracking.
            </p>

            <form onSubmit={handleCreateCase} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Case Title
                </label>
                <input
                  type="text"
                  required
                  value={createForm.title}
                  onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })}
                  placeholder="e.g. Account Drain via Unauthorized Wire"
                  className="w-full bg-navy-950/70 border border-slate-800 text-xs text-slate-200 rounded-xl px-3 py-2 outline-none focus:border-cyan-500/50"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Initial Summary & Hypothesis
                </label>
                <textarea
                  rows={3}
                  required
                  value={createForm.description}
                  onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                  placeholder="Describe initial flags, transaction anomalies, and planned verification..."
                  className="w-full bg-navy-950/70 border border-slate-800 text-xs text-slate-200 rounded-xl p-3 outline-none focus:border-cyan-500/50 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Priority Tier
                  </label>
                  <select
                    value={createForm.priority}
                    onChange={(e) => setCreateForm({ ...createForm, priority: e.target.value })}
                    className="w-full bg-navy-950/70 border border-slate-800 text-xs text-slate-200 rounded-xl px-3 py-2 outline-none focus:border-cyan-500/50"
                  >
                    <option value="LOW">LOW</option>
                    <option value="MEDIUM">MEDIUM</option>
                    <option value="HIGH">HIGH</option>
                    <option value="URGENT">URGENT</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Linked Transaction UUID
                  </label>
                  <input
                    type="text"
                    value={createForm.transaction_id}
                    onChange={(e) => setCreateForm({ ...createForm, transaction_id: e.target.value })}
                    placeholder="Optional UUID"
                    className="w-full bg-navy-950/70 border border-slate-800 text-xs text-slate-200 rounded-xl px-3 py-2 outline-none focus:border-cyan-500/50 font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 bg-navy-850 text-slate-300 rounded-xl text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-xl text-xs font-bold shadow-glow-cyan"
                >
                  Create Case Dossier
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
