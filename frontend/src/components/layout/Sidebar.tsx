import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  CalendarClock,
  Send,
  Search,
  Cpu,
  Slack,
  Settings,
  MailCheck
} from 'lucide-react';

interface SidebarProps {
  onOpenCompose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ onOpenCompose }) => {
  const navItems = [
    { label: 'Dashboard', path: '/', icon: LayoutDashboard },
    { label: 'Scheduled Emails', path: '/scheduled', icon: CalendarClock },
    { label: 'Sent Emails', path: '/sent', icon: Send },
    { label: 'Search Emails', path: '/search', icon: Search },
    { label: 'Queue Monitor', path: '/queue', icon: Cpu },
    { label: 'Slack Integration', path: '/slack', icon: Slack },
    { label: 'Senders & Settings', path: '/settings', icon: Settings },
  ];

  return (
    <aside className="w-64 bg-white border-r border-[#E5E7EB] flex flex-col h-screen fixed left-0 top-0 z-30 shadow-sm">
      {/* Brand Header */}
      <div className="h-16 px-6 flex items-center gap-3 border-b border-[#E5E7EB]">
        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#1E3A8A] to-[#172554] flex items-center justify-center shadow-md">
          <MailCheck className="w-5 h-5 text-white" />
        </div>
        <div>
          <span className="font-bold text-lg text-[#090B10] tracking-tight">ReachInbox</span>
          <span className="block text-[10px] text-[#4B5563] uppercase font-semibold tracking-wider">Email Scheduler</span>
        </div>
      </div>

      {/* Primary Action Button */}
      <div className="p-4">
        <button
          onClick={onOpenCompose}
          className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-[#1E3A8A] hover:bg-[#172554] text-white font-medium text-sm transition-all shadow-sm hover:shadow active:scale-[0.99]"
        >
          <Send className="w-4 h-4" />
          <span>Compose Email</span>
        </button>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-[#172554] text-white shadow-sm font-semibold'
                    : 'text-[#4B5563] hover:text-[#090B10] hover:bg-[#F3F4F6]'
                }`
              }
            >
              <Icon className="w-4 h-4" />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* Footer Info */}
      <div className="p-4 border-t border-[#E5E7EB] text-xs text-[#4B5563]">
        <div className="flex items-center justify-between mb-1">
          <span className="font-medium text-[#090B10]">Engine Status</span>
          <span className="inline-flex items-center gap-1.5 text-emerald-600 font-semibold">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Operational
          </span>
        </div>
        <p className="text-[11px] text-[#6B7280]">BullMQ • Redis • MySQL</p>
      </div>
    </aside>
  );
};
