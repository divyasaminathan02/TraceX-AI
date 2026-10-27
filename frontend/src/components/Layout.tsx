import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Navbar } from './Navbar';
import { Breadcrumbs } from './Breadcrumbs';
import { User } from '../types';

interface LayoutProps {
  currentUser: User | null;
  onLogout: () => void;
}

export const Layout: React.FC<LayoutProps> = ({ currentUser, onLogout }) => {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="min-h-screen bg-navy-950 text-slate-100 flex">
      {/* Sidebar */}
      <Sidebar
        collapsed={collapsed}
        onToggle={() => setCollapsed(!collapsed)}
        currentUser={currentUser}
        onLogout={onLogout}
      />

      {/* Main Content Area */}
      <div
        className={`flex-1 flex flex-col transition-all duration-300 min-w-0 ${
          collapsed ? 'ml-20' : 'ml-64'
        }`}
      >
        <Navbar currentUser={currentUser} onLogout={onLogout} />
        
        <main className="flex-1 p-6 md:p-8 max-w-7xl w-full mx-auto">
          <Breadcrumbs />
          <Outlet />
        </main>

        <footer className="px-8 py-4 border-t border-slate-800/60 text-center text-xs text-slate-400 font-mono">
          TraceX AI Enterprise Fraud Detection Platform &bull; v1.0.0 &bull; Built with FastAPI, PostgreSQL & Scikit-Learn
        </footer>
      </div>
    </div>
  );
};
