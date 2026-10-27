import React, { useState, useEffect } from 'react';
import {
  Users,
  UserPlus,
  Shield,
  CheckCircle,
  XCircle,
  Lock,
  Mail,
  UserCheck,
  X,
  AlertCircle,
} from 'lucide-react';
import { api } from '../services/api';
import { User, PaginatedResult } from '../types';
import { TableSkeleton } from '../components/LoadingSkeleton';

export const UserManagement: React.FC = () => {
  const [data, setData] = useState<PaginatedResult<User> | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const [newUser, setNewUser] = useState({
    email: '',
    full_name: '',
    password: '',
    role: 'analyst',
  });
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await api.getUsers(1);
      setData(res);
    } catch (e: any) {
      setError(e.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setError(null);
    try {
      await api.createUser(newUser);
      setShowCreateModal(false);
      setNewUser({ email: '', full_name: '', password: '', role: 'analyst' });
      fetchUsers();
    } catch (e: any) {
      setError(e.message || 'Failed to create user');
    } finally {
      setCreating(false);
    }
  };

  const handleToggleActive = async (user: User) => {
    try {
      await api.updateUser(user.id, { is_active: !user.is_active });
      fetchUsers();
    } catch (e) {
      console.error(e);
    }
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      await api.updateUser(userId, { role: newRole });
      fetchUsers();
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
            <Users className="w-5 h-5 text-brand-cyan" />
            <span>Role-Based Access Control & User Directory</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Enforce least-privilege security policies across administrative, analyst, and audit roles.
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-cyan hover:bg-cyan-400 text-navy-950 font-bold text-xs rounded-xl shadow-glow-cyan transition-all"
        >
          <UserPlus className="w-4 h-4" />
          <span>Provision Account</span>
        </button>
      </div>

      {/* Users Table */}
      <div className="bg-navy-900/60 border border-slate-800/80 rounded-2xl overflow-hidden shadow-subtle">
        {loading ? (
          <div className="p-6">
            <TableSkeleton rows={4} cols={5} />
          </div>
        ) : !data || data.items.length === 0 ? (
          <p className="text-xs text-slate-400 text-center py-8">No users found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-navy-950/80 border-b border-slate-800 text-slate-400 uppercase font-mono text-[11px]">
                  <th className="py-3 px-4">Operator Name</th>
                  <th className="py-3 px-4">Email Address</th>
                  <th className="py-3 px-4">Assigned Role</th>
                  <th className="py-3 px-4">Account Status</th>
                  <th className="py-3 px-4">Provisioned Date</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {data.items.map((u) => (
                  <tr key={u.id} className="hover:bg-navy-850/50">
                    <td className="py-3 px-4 font-semibold text-slate-200 flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-navy-800 border border-slate-700 flex items-center justify-center font-bold text-xs text-cyan-400">
                        {u.full_name?.charAt(0) || 'U'}
                      </div>
                      <span>{u.full_name}</span>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-400">{u.email}</td>
                    <td className="py-3 px-4">
                      <select
                        value={u.role}
                        onChange={(e) => handleRoleChange(u.id, e.target.value)}
                        className="bg-navy-950 border border-slate-800 text-xs rounded-lg px-2.5 py-1 text-slate-200 outline-none focus:border-cyan-500 font-mono capitalize"
                      >
                        <option value="admin">Admin</option>
                        <option value="analyst">Analyst</option>
                        <option value="viewer">Viewer</option>
                      </select>
                    </td>
                    <td className="py-3 px-4">
                      {u.is_active ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                          <CheckCircle className="w-3 h-3" /> Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-red-400 bg-red-500/10 px-2 py-0.5 rounded-full border border-red-500/20">
                          <XCircle className="w-3 h-3" /> Deactivated
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-400 font-mono text-[11px]">
                      {new Date(u.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => handleToggleActive(u)}
                        className={`px-2.5 py-1 text-xs rounded-lg border transition-colors ${
                          u.is_active
                            ? 'bg-red-500/10 text-red-400 border-red-500/30 hover:bg-red-500/20'
                            : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
                        }`}
                      >
                        {u.is_active ? 'Deactivate' : 'Reactivate'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Provision Account Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-navy-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-navy-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl relative">
            <button
              onClick={() => setShowCreateModal(false)}
              className="absolute top-5 right-5 p-1.5 text-slate-400 hover:text-white rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-base font-bold text-white mb-1">
              Provision New User Account
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Create an authenticated operator identity with role permissions.
            </p>

            {error && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-xs">
                {error}
              </div>
            )}

            <form onSubmit={handleCreateUser} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Full Legal / Display Name
                </label>
                <input
                  type="text"
                  required
                  value={newUser.full_name}
                  onChange={(e) => setNewUser({ ...newUser, full_name: e.target.value })}
                  placeholder="e.g. Elena Rostova"
                  className="w-full bg-navy-950/70 border border-slate-800 text-xs text-slate-200 rounded-xl px-3 py-2 outline-none focus:border-cyan-500/50"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Corporate Email
                </label>
                <input
                  type="email"
                  required
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  placeholder="elena@tracex.ai"
                  className="w-full bg-navy-950/70 border border-slate-800 text-xs text-slate-200 rounded-xl px-3 py-2 outline-none focus:border-cyan-500/50"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Initial Password (min 8 chars)
                </label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={newUser.password}
                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  placeholder="••••••••••••"
                  className="w-full bg-navy-950/70 border border-slate-800 text-xs text-slate-200 rounded-xl px-3 py-2 outline-none focus:border-cyan-500/50"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Platform Role
                </label>
                <select
                  value={newUser.role}
                  onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                  className="w-full bg-navy-950/70 border border-slate-800 text-xs text-slate-200 rounded-xl px-3 py-2 outline-none focus:border-cyan-500/50 capitalize"
                >
                  <option value="analyst">Analyst (Triage, Alert Resolution, Cases)</option>
                  <option value="viewer">Viewer (Read-only Dashboards)</option>
                  <option value="admin">Admin (User Provisioning & System Config)</option>
                </select>
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
                  disabled={creating}
                  className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-xl text-xs font-bold shadow-glow-cyan disabled:opacity-50"
                >
                  {creating ? 'Provisioning...' : 'Provision Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
