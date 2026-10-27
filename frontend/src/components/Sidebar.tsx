import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  ArrowLeftRight,
  Sparkles,
  UploadCloud,
  AlertTriangle,
  Briefcase,
  BarChart3,
  Cpu,
  Users,
  ScrollText,
  Settings,
  ShieldAlert,
  ChevronLeft,
  ChevronRight,
  LogOut,
} from 'lucide-react';
import { User } from '../types';

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  currentUser: User | null;
  onLogout: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  collapsed,
  onToggle,
  currentUser,
  onLogout,
}) => {
  const isAdmin = currentUser?.role === 'admin';
  const isAnalyst = currentUser?.role === 'analyst' || isAdmin;

  const navItems = [
    { label: 'Overview', section: true },
    { to: '/', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/transactions', label: 'Transaction Explorer', icon: ArrowLeftRight },
    { to: '/prediction-test', label: 'Single Prediction', icon: Sparkles },
    { to: '/batch-import', label: 'Batch Import (CSV)', icon: UploadCloud },
    
    { label: 'Operations', section: true },
    { to: '/alerts', label: 'Alerts Center', icon: AlertTriangle },
    { to: '/cases', label: 'Investigation Cases', icon: Briefcase },
    
    { label: 'Machine Learning', section: true },
    { to: '/analytics', label: 'Fraud Analytics', icon: BarChart3 },
    { to: '/models', label: 'ML Models & Registry', icon: Cpu },

    ...(isAdmin
      ? [
          { label: 'Governance & Admin', section: true },
          { to: '/users', label: 'User & Roles', icon: Users },
          { to: '/audit-logs', label: 'Audit Logs', icon: ScrollText },
        ]
      : []),

    { label: 'System', section: true },
    { to: '/settings', label: 'Settings', icon: Settings },
  ];

  return (
    <aside
      className={`fixed top-0 left-0 bottom-0 z-40 bg-navy-950/95 backdrop-blur-md border-r border-slate-800/80 transition-all duration-300 flex flex-col ${
        collapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Brand Header */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-slate-800/80">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-glow-cyan shrink-0">
            <ShieldAlert className="w-6 h-6 text-white" />
          </div>
          {!collapsed && (
            <div className="flex flex-col">
              <span className="font-bold text-base tracking-wider bg-gradient-to-r from-white via-slate-200 to-cyan-400 bg-clip-text text-transparent">
                TRACEX<span className="text-brand-cyan">.AI</span>
              </span>
              <span className="text-[10px] text-slate-400 tracking-widest uppercase font-mono">
                Risk Engine
              </span>
            </div>
          )}
        </div>
        <button
          onClick={onToggle}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-navy-850 transition-colors"
          title={collapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {navItems.map((item, idx) => {
          if (item.section) {
            if (collapsed) return <div key={idx} className="my-2 border-t border-slate-800/50" />;
            return (
              <div
                key={idx}
                className="px-3 pt-4 pb-1 text-[11px] font-semibold text-slate-400 uppercase tracking-wider font-mono"
              >
                {item.label}
              </div>
            );
          }

          const Icon = item.icon!;
          return (
            <NavLink
              key={item.to}
              to={item.to!}
              end={item.to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-cyan-500/10 text-brand-cyan border border-brand-cyan/20 shadow-glow-cyan/50 font-semibold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-navy-900/60'
                } ${collapsed ? 'justify-center px-0' : ''}`
              }
              title={collapsed ? item.label : undefined}
            >
              <Icon className="w-5 h-5 shrink-0" />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </NavLink>
          );
        })}
      </nav>

      {/* User Info & Logout Footer */}
      <div className="p-3 border-t border-slate-800/80 bg-navy-900/30">
        <div className={`flex items-center gap-3 ${collapsed ? 'justify-center' : ''}`}>
          <div className="w-9 h-9 rounded-lg bg-navy-800 border border-slate-700/60 flex items-center justify-center font-bold text-sm text-cyan-400 shrink-0">
            {currentUser?.full_name?.charAt(0) || 'U'}
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-slate-200 truncate">
                {currentUser?.full_name || 'Operator'}
              </p>
              <p className="text-[10px] text-cyan-400 font-mono capitalize">
                {currentUser?.role || 'viewer'}
              </p>
            </div>
          )}
          {!collapsed && (
            <button
              onClick={onLogout}
              className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </aside>
  );
};
