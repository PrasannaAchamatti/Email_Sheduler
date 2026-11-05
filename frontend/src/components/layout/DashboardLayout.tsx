import React, { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { ComposeModal } from '../forms/ComposeModal';

export const DashboardLayout: React.FC = () => {
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const location = useLocation();

  const getPageInfo = () => {
    switch (location.pathname) {
      case '/':
        return { title: 'Dashboard Overview', subtitle: 'Real-time email queue metrics, distributed rate-limit status, and scheduled jobs' };
      case '/scheduled':
        return { title: 'Scheduled Emails', subtitle: 'Manage upcoming and queued email jobs with deterministic BullMQ delays' };
      case '/sent':
        return { title: 'Sent Emails', subtitle: 'Inspect delivered messages, SMTP message IDs, and live Ethereal email previews' };
      case '/search':
        return { title: 'Search Emails', subtitle: 'Elasticsearch-powered high-speed full-text search across recipients, subjects, and bodies' };
      case '/queue':
        return { title: 'BullMQ Queue Monitor', subtitle: 'Inspect active, waiting, delayed, and failed worker jobs in real-time' };
      case '/slack':
        return { title: 'Slack OAuth Integration', subtitle: 'Connect workspace for automated distributed rate-limit notifications' };
      case '/settings':
        return { title: 'Senders & SMTP Configuration', subtitle: 'Configure multiple email senders and instant Ethereal test accounts' };
      default:
        return { title: 'ReachInbox Dashboard', subtitle: 'Production Email Job Scheduler' };
    }
  };

  const { title, subtitle } = getPageInfo();

  return (
    <div className="min-h-screen bg-[#F9FAFB] text-[#090B10] flex">
      {/* Sidebar */}
      <Sidebar onOpenCompose={() => setIsComposeOpen(true)} />

      {/* Main Content Area */}
      <div className="flex-1 ml-64 flex flex-col min-h-screen">
        <Header title={title} subtitle={subtitle} />
        <main className="flex-1 p-8 overflow-y-auto">
          <Outlet context={{ openCompose: () => setIsComposeOpen(true) }} />
        </main>
      </div>

      {/* Global Compose Modal */}
      <ComposeModal
        isOpen={isComposeOpen}
        onClose={() => setIsComposeOpen(false)}
        onSuccess={() => {
          window.dispatchEvent(new CustomEvent('reachinbox:refresh'));
        }}
      />
    </div>
  );
};
