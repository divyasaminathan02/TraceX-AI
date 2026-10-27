import React, { useState, useEffect } from 'react';
import {
  Bell,
  Search,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  User as UserIcon,
  LogOut,
  SlidersHorizontal,
} from 'lucide-react';
import { User, Notification } from '../types';
import { api } from '../services/api';
import { useNavigate } from 'react-router-dom';

interface NavbarProps {
  currentUser: User | null;
  onLogout: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentUser, onLogout }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifMenu, setShowNotifMenu] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    try {
      const data = await api.getNotifications();
      setNotifications(data);
    } catch (e) {
      // Non-critical background fetch
    }
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/transactions?search=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery('');
    }
  };

  const handleMarkRead = async (id: string) => {
    try {
      await api.markNotificationRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <header className="h-16 bg-navy-950/80 backdrop-blur-md border-b border-slate-800/80 sticky top-0 z-30 px-6 flex items-center justify-between">
      {/* Global Search Bar */}
      <form onSubmit={handleSearchSubmit} className="relative w-96 max-w-full">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Global search: TX-REF, account IDs (e.g. C104928172)..."
          className="w-full bg-navy-900/60 border border-slate-800 focus:border-brand-cyan/50 focus:ring-1 focus:ring-brand-cyan/30 text-xs text-slate-200 rounded-xl pl-10 pr-4 py-2 transition-all placeholder:text-slate-400 outline-none"
        />
      </form>

      {/* Right Controls */}
      <div className="flex items-center gap-3">
        {/* Environment Status Badge */}
        <div className="hidden md:flex items-center gap-2 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-xs text-emerald-400 font-medium">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Real-time ML Active</span>
        </div>

        {/* Notification Center */}
        <div className="relative">
          <button
            onClick={() => {
              setShowNotifMenu(!showNotifMenu);
              setShowProfileMenu(false);
            }}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-navy-850 border border-slate-800/60 relative transition-colors"
            title="Notifications"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </button>

          {showNotifMenu && (
            <div className="absolute right-0 mt-2 w-80 bg-navy-900 border border-slate-800 rounded-2xl shadow-2xl z-50 p-3">
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800">
                <span className="text-xs font-semibold text-slate-200">Alerts & System Feed</span>
                <span className="text-[10px] text-cyan-400 font-mono">{unreadCount} unread</span>
              </div>
              <div className="max-h-72 overflow-y-auto space-y-2">
                {notifications.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-4">No recent notifications</p>
                ) : (
                  notifications.map((notif) => (
                    <div
                      key={notif.id}
                      onClick={() => handleMarkRead(notif.id)}
                      className={`p-2.5 rounded-xl text-xs cursor-pointer transition-colors border ${
                        notif.is_read
                          ? 'bg-navy-950/40 border-slate-800/40 text-slate-400'
                          : 'bg-navy-850/80 border-cyan-500/20 text-slate-200 shadow-sm'
                      }`}
                    >
                      <div className="font-semibold text-slate-200 mb-0.5">{notif.title}</div>
                      <div className="text-[11px] leading-relaxed line-clamp-2 text-slate-400">
                        {notif.message}
                      </div>
                      <div className="mt-1 text-[9px] text-slate-400 font-mono">
                        {new Date(notif.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Profile Dropdown */}
        <div className="relative">
          <button
            onClick={() => {
              setShowProfileMenu(!showProfileMenu);
              setShowNotifMenu(false);
            }}
            className="flex items-center gap-2 p-1.5 pl-2.5 pr-2 rounded-xl bg-navy-900/60 border border-slate-800 hover:border-slate-700 transition-colors"
          >
            <div className="w-6 h-6 rounded-md bg-gradient-to-tr from-cyan-600 to-blue-600 text-white font-bold text-xs flex items-center justify-center">
              {currentUser?.full_name?.charAt(0) || 'U'}
            </div>
            <span className="text-xs font-medium text-slate-300 hidden sm:inline max-w-[100px] truncate">
              {currentUser?.full_name?.split(' ')[0]}
            </span>
          </button>

          {showProfileMenu && (
            <div className="absolute right-0 mt-2 w-56 bg-navy-900 border border-slate-800 rounded-2xl shadow-2xl z-50 p-2">
              <div className="px-3 py-2 border-b border-slate-800 mb-1">
                <p className="text-xs font-medium text-slate-200">{currentUser?.full_name}</p>
                <p className="text-[11px] text-slate-400 truncate">{currentUser?.email}</p>
                <span className="inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-mono bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 capitalize">
                  {currentUser?.role} Account
                </span>
              </div>
              <button
                onClick={() => {
                  setShowProfileMenu(false);
                  navigate('/settings');
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-300 hover:bg-navy-850 rounded-lg transition-colors"
              >
                <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400" />
                <span>Security Settings</span>
              </button>
              <button
                onClick={onLogout}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-400 hover:bg-red-500/10 rounded-lg transition-colors mt-1"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
