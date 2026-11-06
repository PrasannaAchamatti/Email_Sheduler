import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { LogOut, ChevronDown } from 'lucide-react';

interface HeaderProps {
  title: string;
  subtitle?: string;
}

export const Header: React.FC<HeaderProps> = ({ title, subtitle }) => {
  const { user, logout } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  return (
    <header className="h-16 bg-white border-b border-[#E5E7EB] px-8 flex items-center justify-between sticky top-0 z-20 shadow-sm">
      <div>
        <h1 className="text-lg font-bold text-[#090B10] tracking-tight">{title}</h1>
        {subtitle && <p className="text-xs text-[#4B5563] mt-0.5">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-4">
        {/* User Profile Pill & Dropdown */}
        <div className="relative">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-3 p-1.5 pr-3 rounded-lg hover:bg-[#F3F4F6] transition-colors border border-transparent hover:border-[#E5E7EB]"
          >
            {user?.avatar ? (
              <img
                src={user.avatar}
                alt={user.name}
                className="w-8 h-8 rounded-full object-cover ring-2 ring-[#1E3A8A]/30"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-[#1E3A8A] flex items-center justify-center text-white text-xs font-semibold">
                {user?.name ? user.name.slice(0, 2).toUpperCase() : 'RI'}
              </div>
            )}
            <div className="text-left hidden md:block">
              <span className="block text-xs font-semibold text-[#090B10] leading-tight">{user?.name || 'Evaluator'}</span>
              <span className="block text-[10px] text-[#4B5563] leading-tight truncate max-w-[140px]">
                {user?.email || 'user@reachinbox.test'}
              </span>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-[#4B5563]" />
          </button>

          {dropdownOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setDropdownOpen(false)}
              />
              <div className="absolute right-0 mt-2 w-56 rounded-xl bg-white border border-[#E5E7EB] shadow-xl py-1 z-50">
                <div className="px-4 py-2.5 border-b border-[#E5E7EB]">
                  <p className="text-xs font-semibold text-[#090B10]">{user?.name}</p>
                  <p className="text-[11px] text-[#4B5563] truncate">{user?.email}</p>
                </div>
                <button
                  onClick={() => {
                    setDropdownOpen(false);
                    logout();
                  }}
                  className="w-full flex items-center gap-2 px-4 py-2.5 text-xs text-rose-600 hover:bg-rose-50 font-medium transition-colors cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
};
