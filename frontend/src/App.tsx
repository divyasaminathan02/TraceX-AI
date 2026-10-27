import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { api } from './services/api';
import { User } from './types';

import { Layout } from './components/Layout';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { TransactionExplorer } from './pages/TransactionExplorer';
import { SinglePrediction } from './pages/SinglePrediction';
import { BatchImport } from './pages/BatchImport';
import { AlertsCenter } from './pages/AlertsCenter';
import { CaseDetails } from './pages/CaseDetails';
import { FraudAnalytics } from './pages/FraudAnalytics';
import { ModelInfo } from './pages/ModelInfo';
import { UserManagement } from './pages/UserManagement';
import { AuditLogs } from './pages/AuditLogs';
import { Settings } from './pages/Settings';

export const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(api.getCurrentUserStored());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const user = await api.getMe();
      setCurrentUser(user);
    } catch {
      setCurrentUser(null);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await api.logout();
    setCurrentUser(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-navy-950 flex flex-col items-center justify-center text-slate-400 font-mono text-xs">
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center animate-pulse mb-3 shadow-glow-cyan" />
        <div>Authenticating Secure Session...</div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/login"
          element={
            currentUser ? (
              <Navigate to="/" replace />
            ) : (
              <Login onLoginSuccess={(u) => setCurrentUser(u)} />
            )
          }
        />

        {/* Protected App Shell */}
        {currentUser ? (
          <Route element={<Layout currentUser={currentUser} onLogout={handleLogout} />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/transactions" element={<TransactionExplorer />} />
            <Route path="/prediction-test" element={<SinglePrediction />} />
            <Route path="/batch-import" element={<BatchImport />} />
            <Route path="/alerts" element={<AlertsCenter />} />
            <Route path="/cases" element={<CaseDetails />} />
            <Route path="/analytics" element={<FraudAnalytics />} />
            <Route path="/models" element={<ModelInfo />} />
            {currentUser.role === 'admin' && (
              <>
                <Route path="/users" element={<UserManagement />} />
                <Route path="/audit-logs" element={<AuditLogs />} />
              </>
            )}
            <Route path="/settings" element={<Settings currentUser={currentUser} />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        ) : (
          <Route path="*" element={<Navigate to="/login" replace />} />
        )}
      </Routes>
    </BrowserRouter>
  );
};

export default App;
