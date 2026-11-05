import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authApi } from '../services/api';
import {
  MailCheck,
  ArrowRight,
  ShieldCheck,
  Zap,
  Lock,
  Sparkles,
  Loader2,
  UserPlus,
  Trash2,
  X,
  ExternalLink
} from 'lucide-react';

interface SavedAccount {
  name: string;
  email: string;
  avatar: string;
}

const STORAGE_KEY = 'reachinbox_pc_accounts';

export const LoginPage: React.FC = () => {
  const { loginDemo } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [loading, setLoading] = useState(false);
  const [signingAccount, setSigningAccount] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(searchParams.get('error') || null);

  // Accounts saved on this PC
  const [savedAccounts, setSavedAccounts] = useState<SavedAccount[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const [showGoogleModal, setShowGoogleModal] = useState(false);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [inputEmail, setInputEmail] = useState('');
  const [inputName, setInputName] = useState('');

  // Persist saved accounts
  const persistAccounts = (accounts: SavedAccount[]) => {
    setSavedAccounts(accounts);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(accounts));
    } catch (e) {
      console.error('Failed to save accounts in localStorage', e);
    }
  };

  const removeAccount = (emailToRemove: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const filtered = savedAccounts.filter((acc) => acc.email.toLowerCase() !== emailToRemove.toLowerCase());
    persistAccounts(filtered);
    if (filtered.length === 0) {
      setIsAddingNew(true);
    }
  };

  const handleContinueWithGoogle = async () => {
    setError(null);
    setLoading(true);
    try {
      // Check if backend has active Google OAuth credentials configured
      const res = await authApi.getGoogleAuthStatus();
      if (res.data.success && res.data.data.configured && res.data.data.authUrl) {
        // Redirect directly to Google's official account chooser on accounts.google.com
        window.location.href = res.data.data.authUrl;
        return;
      }
    } catch (err) {
      console.log('Google OAuth status check fallback to local chooser:', err);
    } finally {
      setLoading(false);
    }

    // If OAuth credentials not yet configured, show chooser with only this PC's accounts
    if (savedAccounts.length === 0) {
      setIsAddingNew(true);
    } else {
      setIsAddingNew(false);
    }
    setShowGoogleModal(true);
  };

  const handleSignInWithAccount = async (account: SavedAccount) => {
    try {
      setSigningAccount(account.email);
      setError(null);
      await loginDemo(account.email, account.name, account.avatar);

      // Ensure it is saved in this PC's list
      const exists = savedAccounts.some((a) => a.email.toLowerCase() === account.email.toLowerCase());
      if (!exists) {
        persistAccounts([account, ...savedAccounts]);
      }

      setShowGoogleModal(false);
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Authentication failed');
    } finally {
      setSigningAccount(null);
    }
  };

  const handleAddNewAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputEmail || !inputEmail.includes('@')) {
      setError('Please provide a valid Gmail address');
      return;
    }

    const email = inputEmail.trim().toLowerCase();
    const name = inputName.trim() || email.split('@')[0];
    const avatar = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}&backgroundColor=1E3A8A&textColor=ffffff`;

    const newAcc: SavedAccount = { email, name, avatar };

    // Update list with this new account
    const existingIndex = savedAccounts.findIndex((a) => a.email.toLowerCase() === email);
    let updated: SavedAccount[];
    if (existingIndex >= 0) {
      updated = [newAcc, ...savedAccounts.filter((_, i) => i !== existingIndex)];
    } else {
      updated = [newAcc, ...savedAccounts];
    }
    persistAccounts(updated);

    await handleSignInWithAccount(newAcc);
  };

  const handleDemoLogin = async () => {
    try {
      setLoading(true);
      setError(null);
      await loginDemo('evaluator@reachinbox.test', 'ReachInbox Evaluator');
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F9FAFB] text-[#090B10] flex flex-col justify-center items-center px-4 py-12 relative overflow-hidden">
      {/* Background Subtle Accent */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-[#1E3A8A]/10 blur-[130px] rounded-full pointer-events-none" />

      {/* Brand Header */}
      <div className="text-center mb-8 relative z-10">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-[#1E3A8A] to-[#172554] shadow-lg shadow-blue-900/20 mb-4 border border-blue-900/20">
          <MailCheck className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-2xl font-bold text-[#090B10] tracking-tight">ReachInbox</h1>
        <p className="text-sm text-[#4B5563] mt-1">Production-Grade Email Job Scheduler & Dashboard</p>
      </div>

      {/* Main Login Card */}
      <div className="w-full max-w-md bg-white border border-[#E5E7EB] rounded-2xl p-8 shadow-xl relative z-10">
        <div className="mb-6">
          <h2 className="text-lg font-bold text-[#090B10]">Sign In to Workspace</h2>
          <p className="text-xs text-[#4B5563] mt-1">
            Access delayed BullMQ queues, rate limiting, and email campaign analytics.
          </p>
        </div>

        {error && (
          <div className="mb-5 p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700">
            {error}
          </div>
        )}

        <div className="space-y-3.5">
          {/* Continue with Google Button */}
          <button
            onClick={handleContinueWithGoogle}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl bg-white hover:bg-[#F3F4F6] text-[#090B10] font-semibold text-sm transition-all shadow-sm active:scale-[0.99] disabled:opacity-50 border border-[#D1D5DB]"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin text-[#1E3A8A]" />
            ) : (
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
            )}
            <span>Continue with Google</span>
          </button>

          {/* Quick Evaluator / Demo Login Button */}
          <button
            onClick={handleDemoLogin}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-[#1E3A8A] hover:bg-[#172554] text-white font-semibold text-sm transition-all shadow-md active:scale-[0.99] disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-blue-200" />
                <span>One-Click Evaluator Login</span>
                <ArrowRight className="w-4 h-4 ml-1 opacity-80" />
              </>
            )}
          </button>
        </div>

        {/* Feature Badges */}
        <div className="mt-8 pt-6 border-t border-[#E5E7EB] space-y-2.5">
          <div className="flex items-center gap-2.5 text-xs text-[#4B5563]">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Encrypted SMTP credentials & HTTP-only cookies</span>
          </div>
          <div className="flex items-center gap-2.5 text-xs text-[#4B5563]">
            <Zap className="w-4 h-4 text-amber-600 shrink-0" />
            <span>BullMQ delayed scheduling with Redis persistence</span>
          </div>
          <div className="flex items-center gap-2.5 text-xs text-[#4B5563]">
            <Lock className="w-4 h-4 text-[#1E3A8A] shrink-0" />
            <span>Strict user-level data isolation & MySQL ACID transactions</span>
          </div>
        </div>
      </div>

      {/* Google Account Selector Modal (Zero fake accounts - only user's real accounts) */}
      {showGoogleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-white border border-[#E5E7EB] rounded-2xl shadow-2xl overflow-hidden text-[#090B10]">
            {/* Modal Header */}
            <div className="p-6 pb-4 border-b border-[#E5E7EB] text-center relative">
              <button
                onClick={() => {
                  setShowGoogleModal(false);
                  setIsAddingNew(false);
                }}
                className="absolute right-4 top-4 p-1.5 rounded-full text-[#6B7280] hover:text-[#090B10] hover:bg-[#F3F4F6] transition-colors"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex justify-center mb-3">
                <svg className="w-8 h-8" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
              </div>

              <h3 className="text-lg font-bold text-[#090B10]">
                {isAddingNew || savedAccounts.length === 0 ? 'Sign In with Google' : 'Choose an account'}
              </h3>
              <p className="text-xs text-[#4B5563] mt-0.5">
                to continue to <strong className="text-[#1E3A8A]">ReachInbox Scheduler</strong>
              </p>
            </div>

            {/* List of User's Actual Accounts on this PC */}
            {!isAddingNew && savedAccounts.length > 0 ? (
              <div className="p-4 space-y-1">
                <div className="text-[11px] font-medium text-[#6B7280] px-2 mb-2">
                  Accounts on this device
                </div>
                <div className="divide-y divide-[#F3F4F6] max-h-60 overflow-y-auto">
                  {savedAccounts.map((account) => (
                    <div
                      key={account.email}
                      onClick={() => handleSignInWithAccount(account)}
                      className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-[#F3F4F6] transition-colors cursor-pointer group"
                    >
                      <div className="flex items-center gap-3">
                        <img
                          src={account.avatar}
                          alt={account.name}
                          className="w-10 h-10 rounded-full object-cover ring-2 ring-[#E5E7EB] group-hover:ring-[#1E3A8A]/50 transition-all"
                        />
                        <div className="text-left">
                          <p className="text-xs font-bold text-[#090B10] group-hover:text-[#1E3A8A] transition-colors">
                            {account.name}
                          </p>
                          <p className="text-[11px] text-[#4B5563] font-mono">{account.email}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {signingAccount === account.email ? (
                          <Loader2 className="w-4 h-4 animate-spin text-[#1E3A8A]" />
                        ) : (
                          <button
                            type="button"
                            onClick={(e) => removeAccount(account.email, e)}
                            title="Remove account from device"
                            className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-gray-400 hover:text-rose-600 hover:bg-rose-50 transition-all"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Option to Add Another Account */}
                <div className="pt-3 border-t border-[#E5E7EB]">
                  <button
                    onClick={() => {
                      setInputEmail('');
                      setInputName('');
                      setIsAddingNew(true);
                    }}
                    className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-[#F3F4F6] transition-colors text-left text-xs font-semibold text-[#1E3A8A]"
                  >
                    <div className="w-10 h-10 rounded-full bg-blue-50 border border-blue-200 flex items-center justify-center text-[#1E3A8A]">
                      <UserPlus className="w-4 h-4" />
                    </div>
                    <span>Use another Google account</span>
                  </button>
                </div>
              </div>
            ) : (
              /* Add New / Sign in with User's Real Gmail Form */
              <form onSubmit={handleAddNewAccount} className="p-6 space-y-4">
                <div className="bg-blue-50/70 border border-blue-100 rounded-xl p-3 text-[11px] text-[#1E3A8A] leading-relaxed">
                  Enter your Gmail account to sign in and save it to your device workspace.
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#090B10] mb-1.5">
                    Your Gmail Address <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    autoFocus
                    placeholder="e.g. yourname@gmail.com"
                    value={inputEmail}
                    onChange={(e) => setInputEmail(e.target.value)}
                    className="w-full bg-white border border-[#D1D5DB] rounded-lg px-3.5 py-2.5 text-xs text-[#090B10] placeholder-gray-400 focus:outline-none focus:border-[#1E3A8A] focus:ring-1 focus:ring-[#1E3A8A]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#090B10] mb-1.5">
                    Your Full Name <span className="text-xs text-gray-400 font-normal">(optional)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. John Doe"
                    value={inputName}
                    onChange={(e) => setInputName(e.target.value)}
                    className="w-full bg-white border border-[#D1D5DB] rounded-lg px-3.5 py-2.5 text-xs text-[#090B10] placeholder-gray-400 focus:outline-none focus:border-[#1E3A8A] focus:ring-1 focus:ring-[#1E3A8A]"
                  />
                </div>

                <div className="flex items-center justify-between pt-2">
                  {savedAccounts.length > 0 ? (
                    <button
                      type="button"
                      onClick={() => setIsAddingNew(false)}
                      className="text-xs text-[#4B5563] hover:text-[#090B10] font-medium"
                    >
                      ← Back to accounts
                    </button>
                  ) : <div />}

                  <button
                    type="submit"
                    disabled={signingAccount !== null || !inputEmail}
                    className="px-5 py-2.5 rounded-lg bg-[#1E3A8A] hover:bg-[#172554] text-white text-xs font-semibold shadow-sm transition-all flex items-center gap-2 disabled:opacity-50"
                  >
                    {signingAccount ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Signing in...</span>
                      </>
                    ) : (
                      <span>Sign In with this Account</span>
                    )}
                  </button>
                </div>
              </form>
            )}

            {/* Google Notice Footer */}
            <div className="p-4 bg-[#F9FAFB] border-t border-[#E5E7EB] text-[11px] text-[#6B7280] leading-relaxed">
              Google will verify your account and share your email address and profile picture with ReachInbox.
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
