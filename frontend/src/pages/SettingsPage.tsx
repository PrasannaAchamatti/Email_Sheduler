import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Mail,
  Plus,
  Sparkles,
  CheckCircle2,
  XCircle,
  Trash2,
  Activity,
  Loader2,
  X
} from 'lucide-react';
import { senderApi } from '../services/api';
import { Sender } from '../types';

const senderSchema = z.object({
  name: z.string().min(1, 'Sender display name is required'),
  email: z.string().email('Valid email address is required'),
  smtpHost: z.string().min(1, 'SMTP host is required'),
  smtpPort: z.coerce.number().min(1).max(65535),
  smtpUser: z.string().min(1, 'SMTP username is required'),
  smtpPassword: z.string().min(1, 'SMTP password is required')
});

type SenderFormData = z.infer<typeof senderSchema>;

export const SettingsPage: React.FC = () => {
  const [senders, setSenders] = useState<Sender[]>([]);
  const [loading, setLoading] = useState(true);
  const [creatingEthereal, setCreatingEthereal] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting }
  } = useForm<SenderFormData>({
    resolver: zodResolver(senderSchema),
    defaultValues: {
      smtpPort: 587
    }
  });

  const loadSenders = async () => {
    try {
      setLoading(true);
      const res = await senderApi.getAll();
      if (res.data.success) {
        setSenders(res.data.data);
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: 'Failed to load email senders' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSenders();
  }, []);

  const handleCreateEthereal = async () => {
    try {
      setCreatingEthereal(true);
      setFeedback(null);
      const res = await senderApi.createEthereal('ReachInbox Ethereal Test Sender');
      if (res.data.success) {
        setFeedback({
          type: 'success',
          message: `Generated instant Ethereal SMTP test sender: ${res.data.data.email}`
        });
        await loadSenders();
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: 'Failed to generate Ethereal account' });
    } finally {
      setCreatingEthereal(false);
    }
  };

  const handleTestConnection = async (id: string) => {
    try {
      setTestingId(id);
      setFeedback(null);
      const res = await senderApi.test(id);
      if (res.data.success) {
        setFeedback({ type: 'success', message: 'SMTP connection verified successfully!' });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.response?.data?.error || 'SMTP connection verification failed' });
    } finally {
      setTestingId(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this sender configuration?')) return;
    try {
      await senderApi.delete(id);
      setFeedback({ type: 'success', message: 'Sender removed' });
      await loadSenders();
    } catch (err: any) {
      setFeedback({ type: 'error', message: 'Failed to delete sender' });
    }
  };

  const onAddSubmit = async (data: SenderFormData) => {
    try {
      setFeedback(null);
      const res = await senderApi.create(data);
      if (res.data.success) {
        setFeedback({ type: 'success', message: `Added sender: ${data.email}` });
        reset();
        setIsAddModalOpen(false);
        await loadSenders();
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.response?.data?.error || 'Failed to add sender' });
    }
  };

  return (
    <div className="space-y-6 max-w-5xl">
      {feedback && (
        <div
          className={`p-4 rounded-xl border text-xs flex items-center justify-between shadow-sm ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            ) : (
              <XCircle className="w-4 h-4 text-rose-600" />
            )}
            <span className="font-medium">{feedback.message}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="text-[#6B7280] hover:text-[#090B10]">
            Dismiss
          </button>
        </div>
      )}

      {/* Header and Action Cards */}
      <div className="bg-white border border-[#E5E7EB] rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
        <div>
          <h2 className="text-base font-bold text-[#090B10]">SMTP Email Senders</h2>
          <p className="text-xs text-[#4B5563] mt-0.5">
            Manage outbound SMTP relays with AES-256 encrypted credential storage and connection testing.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleCreateEthereal}
            disabled={creatingEthereal}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-50 hover:bg-blue-100 text-[#1E3A8A] text-xs font-semibold transition-all shadow-sm disabled:opacity-50 border border-blue-200"
          >
            {creatingEthereal ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Sparkles className="w-3.5 h-3.5 text-[#1E3A8A]" />
            )}
            <span>Instant Ethereal Account</span>
          </button>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#1E3A8A] hover:bg-[#172554] text-white text-xs font-semibold transition-all shadow-sm active:scale-95"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Custom SMTP</span>
          </button>
        </div>
      </div>

      {/* Senders List */}
      <div className="bg-white border border-[#E5E7EB] rounded-2xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-8 h-8 border-2 border-[#1E3A8A] border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs text-[#4B5563]">Loading sender accounts...</p>
          </div>
        ) : senders.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <Mail className="w-10 h-10 text-[#9CA3AF] mx-auto" />
            <p className="text-sm font-semibold text-[#090B10]">No email senders configured</p>
            <p className="text-xs text-[#6B7280]">
              Click "Instant Ethereal Account" to generate a live Ethereal test account in 1 click.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[#E5E7EB]">
            {senders.map((s) => (
              <div key={s.id} className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-[#F3F4F6] transition-colors">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-[#090B10]">{s.name}</span>
                    {s.isEthereal && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-[#1E3A8A] border border-blue-200">
                        Ethereal Sandbox
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-[#4B5563] flex items-center gap-4">
                    <span>Email: <code className="text-[#090B10] font-mono font-medium">{s.email}</code></span>
                    <span>Host: <code className="text-[#090B10] font-mono font-medium">{s.smtpHost}:{s.smtpPort}</code></span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleTestConnection(s.id)}
                    disabled={testingId === s.id}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-[#F3F4F6] border border-[#D1D5DB] text-xs font-semibold text-[#090B10] transition-colors disabled:opacity-50 shadow-sm"
                  >
                    {testingId === s.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Activity className="w-3.5 h-3.5 text-emerald-600" />
                    )}
                    <span>Test SMTP</span>
                  </button>

                  <button
                    onClick={() => handleDelete(s.id)}
                    className="p-1.5 rounded-lg border border-[#D1D5DB] hover:bg-rose-50 text-[#6B7280] hover:text-rose-600 transition-colors"
                    title="Delete Sender"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Custom SMTP Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white border border-[#E5E7EB] rounded-2xl shadow-2xl p-6 text-[#090B10]">
            <div className="flex items-center justify-between pb-3 border-b border-[#E5E7EB] mb-4">
              <h3 className="text-sm font-bold text-[#090B10]">Add Custom SMTP Sender</h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-[#6B7280] hover:text-[#090B10]">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit(onAddSubmit)} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-[#090B10] mb-1">Sender Display Name</label>
                <input
                  type="text"
                  placeholder="e.g. Acme Sales Outreach"
                  {...register('name')}
                  className="w-full bg-white border border-[#D1D5DB] rounded-lg px-3 py-2 text-xs text-[#090B10] placeholder-[#9CA3AF] focus:outline-none focus:border-[#1E3A8A]"
                />
                {errors.name && <p className="text-[10px] text-rose-600 mt-0.5">{errors.name.message}</p>}
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#090B10] mb-1">Sender Email</label>
                <input
                  type="email"
                  placeholder="sales@acme.com"
                  {...register('email')}
                  className="w-full bg-white border border-[#D1D5DB] rounded-lg px-3 py-2 text-xs text-[#090B10] placeholder-[#9CA3AF] focus:outline-none focus:border-[#1E3A8A]"
                />
                {errors.email && <p className="text-[10px] text-rose-600 mt-0.5">{errors.email.message}</p>}
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-[#090B10] mb-1">SMTP Host</label>
                  <input
                    type="text"
                    placeholder="smtp.mailgun.org"
                    {...register('smtpHost')}
                    className="w-full bg-white border border-[#D1D5DB] rounded-lg px-3 py-2 text-xs text-[#090B10] placeholder-[#9CA3AF] focus:outline-none focus:border-[#1E3A8A]"
                  />
                  {errors.smtpHost && <p className="text-[10px] text-rose-600 mt-0.5">{errors.smtpHost.message}</p>}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#090B10] mb-1">Port</label>
                  <input
                    type="number"
                    {...register('smtpPort')}
                    className="w-full bg-white border border-[#D1D5DB] rounded-lg px-3 py-2 text-xs text-[#090B10] focus:outline-none focus:border-[#1E3A8A]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#090B10] mb-1">SMTP Username / User</label>
                <input
                  type="text"
                  placeholder="smtp-user"
                  {...register('smtpUser')}
                  className="w-full bg-white border border-[#D1D5DB] rounded-lg px-3 py-2 text-xs text-[#090B10] placeholder-[#9CA3AF] focus:outline-none focus:border-[#1E3A8A]"
                />
                {errors.smtpUser && <p className="text-[10px] text-rose-600 mt-0.5">{errors.smtpUser.message}</p>}
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#090B10] mb-1">SMTP Password</label>
                <input
                  type="password"
                  placeholder="••••••••••••"
                  {...register('smtpPassword')}
                  className="w-full bg-white border border-[#D1D5DB] rounded-lg px-3 py-2 text-xs text-[#090B10] placeholder-[#9CA3AF] focus:outline-none focus:border-[#1E3A8A]"
                />
                {errors.smtpPassword && <p className="text-[10px] text-rose-600 mt-0.5">{errors.smtpPassword.message}</p>}
              </div>

              <div className="pt-3 border-t border-[#E5E7EB] flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium text-[#4B5563] hover:text-[#090B10]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-1.5 rounded-lg bg-[#1E3A8A] hover:bg-[#172554] text-white text-xs font-semibold shadow-sm"
                >
                  {isSubmitting ? 'Verifying & Saving...' : 'Save Sender'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
