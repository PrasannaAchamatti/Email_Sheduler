import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { LoginPage } from '../pages/LoginPage';
import { DashboardPage } from '../pages/DashboardPage';
import { ScheduledEmailsPage } from '../pages/ScheduledEmailsPage';
import { SentEmailsPage } from '../pages/SentEmailsPage';
import { SearchEmailsPage } from '../pages/SearchEmailsPage';
import { QueueMonitorPage } from '../pages/QueueMonitorPage';
import { SlackIntegrationPage } from '../pages/SlackIntegrationPage';
import { SettingsPage } from '../pages/SettingsPage';

const ProtectedRoute: React.FC<{ children: React.ReactElement }> = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F9FAFB] flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-9 h-9 border-2 border-[#1E3A8A] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-[#4B5563]">Authenticating session...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

export const AppRoutes: React.FC = () => {
  const { user, loading } = useAuth();

  return (
    <Routes>
      <Route
        path="/login"
        element={
          !loading && user ? <Navigate to="/" replace /> : <LoginPage />
        }
      />

      <Route
        path="/"
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="scheduled" element={<ScheduledEmailsPage />} />
        <Route path="sent" element={<SentEmailsPage />} />
        <Route path="search" element={<SearchEmailsPage />} />
        <Route path="queue" element={<QueueMonitorPage />} />
        <Route path="slack" element={<SlackIntegrationPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

