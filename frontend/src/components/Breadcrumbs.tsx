import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';

export const Breadcrumbs: React.FC = () => {
  const location = useLocation();
  const pathnames = location.pathname.split('/').filter((x) => x);

  const routeNameMap: Record<string, string> = {
    transactions: 'Transaction Explorer',
    'prediction-test': 'Single Prediction & Simulation',
    'batch-import': 'CSV Batch Import',
    alerts: 'Alerts Center',
    cases: 'Investigation Cases',
    analytics: 'Fraud Analytics & Evaluation',
    models: 'ML Models & Registry',
    users: 'User & Role Management',
    'audit-logs': 'Security Audit Logs',
    settings: 'Application Settings',
  };

  return (
    <nav className="flex items-center gap-1.5 text-xs text-slate-400 mb-6 font-medium">
      <Link
        to="/"
        className="flex items-center gap-1 hover:text-cyan-400 transition-colors"
      >
        <Home className="w-3.5 h-3.5" />
        <span>Platform</span>
      </Link>
      {pathnames.map((segment, index) => {
        const to = `/${pathnames.slice(0, index + 1).join('/')}`;
        const isLast = index === pathnames.length - 1;
        const displayName = routeNameMap[segment] || (segment.length > 15 ? `${segment.slice(0, 12)}...` : segment);

        return (
          <React.Fragment key={to}>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            {isLast ? (
              <span className="text-slate-200 capitalize font-semibold">{displayName}</span>
            ) : (
              <Link to={to} className="hover:text-cyan-400 transition-colors capitalize">
                {displayName}
              </Link>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
};
