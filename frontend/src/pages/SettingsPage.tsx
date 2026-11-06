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
  X,
  AlertCircle,
  HelpCircle
} from 'lucide-react';
import { senderApi } from '../services/api';
import { Sender } from '../types';

const senderSchema = z.object({
  name: z.string().min(1, 'Sender display name is required'),
  email: z.string().email('Valid email address is required'),
  smtpHost: z.string().min(1, 'SMTP host is required'),
  smtpPort: z.coerce.number().min(1).max(65535),
  smtpUser: z.string().min(1, 'SMTP username is required'),
  smtpPassword: z.string().min(1, 'SMTP password is required'),
  skipVerification: z.boolean().optional().default(false)
});

type SenderFormData = z.infer<typeof senderSchema>;

export const SettingsPage: React.FC = () => {
  const [senders, setSenders] = useState<Sender[]>([]);
  const [loading, setLoading] = useState(true);
  const [creatingEthereal, setCreatingEthereal] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting }
  } = useForm<SenderFormData>({
    resolver: zodResolver(senderSchema),
    defaultValues: {
      smtpPort: 587,
      skipVerification: false
    }
  });

  const watchedHost = watch('smtpHost', '');
  const isGmail = watchedHost.toLowerCase().includes('gmail.com');

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

  const handleOpenAddModal = () => {
    setModalError(null);
    reset({
      name: '',
      email: '',
      smtpHost: '',
      smtpPort: 587,
      smtpUser: '',
      smtpPassword: '',
      skipVerification: false
    });
    setIsAddModalOpen(true);
  };

  const applyPreset = (host: string, port: number, userPlaceholder?: string) => {
    setValue('smtpHost', host, { shouldValidate: true });
    setValue('smtpPort', port, { shouldValidate: true });
    if (userPlaceholder) {
      setValue('smtpUser', userPlaceholder);
    }
    setModalError(null);
  };

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
      setModalError(null);
      const res = await senderApi.create(data);
      if (res.data.success) {
        setFeedback({ type: 'success', message: `Added sender: ${data.email}` });
        reset();
        setIsAddModalOpen(false);
        await loadSenders();
      }
    } catch (err: any) {
      const errorMsg =
        err.response?.data?.error ||
        err.message ||
        'Failed to connect to SMTP server. Check credentials or enable "Skip live connection test".';
      setModalError(errorMsg);
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
            onClick={handleOpenAddModal}
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
              Click "Instant Ethereal Account" to generate a live Ethereal test account in 1 click, or click "Add Custom SMTP".
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[#E5E7EB]">
            {senders.map((sender) => (
              <div key={sender.id} className="p-4 sm:p-5 flex items-center justify-between gap-4 hover:bg-[#F9FAFB] transition-colors">
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0">
                    <Mail className="w-5 h-5 text-[#1E3A8A]" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-xs text-[#090B10]">{sender.name}</span>
                      {sender.isEthereal && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                          Ethereal (Sandbox)
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[#6B7280] truncate font-mono mt-0.5">{sender.email}</p>
                    <p className="text-[11px] text-[#9CA3AF] mt-0.5">
                      Host: {sender.smtpHost}:{sender.smtpPort} • User: {sender.smtpUser}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleTestConnection(sender.id)}
                    disabled={testingId === sender.id}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#D1D5DB] hover:bg-[#F3F4F6] text-[#090B10] text-xs font-semibold transition-all disabled:opacity-50"
                  >
                    {testingId === sender.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Activity className="w-3.5 h-3.5 text-[#1E3A8A]" />
                    )}
                    <span>Test SMTP</span>
                  </button>

                  <button
                    onClick={() => handleDelete(sender.id)}
                    className="p-1.5 rounded-lg text-[#9CA3AF] hover:text-rose-600 hover:bg-rose-50 transition-colors"
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
          <div className="w-full max-w-lg bg-white border border-[#E5E7EB] rounded-2xl shadow-2xl p-6 text-[#090B10] max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#E5E7EB] mb-4">
              <div>
                <h3 className="text-sm font-bold text-[#090B10]">Add Custom SMTP Sender</h3>
                <p className="text-[11px] text-[#6B7280]">Configure any outbound email server with encrypted storage</p>
              </div>
              <button onClick={() => setIsAddModalOpen(false)} className="text-[#6B7280] hover:text-[#090B10]">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* In-Modal Error Banner */}
            {modalError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <span className="font-bold block text-rose-900">Connection or Verification Error:</span>
                  <p className="mt-0.5 leading-relaxed">{modalError}</p>
                </div>
              </div>
            )}

            {/* Quick Provider Presets */}
            <div className="mb-4">
              <label className="block text-[11px] font-semibold text-[#6B7280] mb-1.5 uppercase tracking-wider">
                Quick Setup Presets
              </label>
              <div className="grid grid-cols-4 gap-1.5">
                <button
                  type="button"
                  onClick={() => applyPreset('smtp.gmail.com', 587)}
                  className="px-2.5 py-1.5 rounded-lg border border-[#D1D5DB] hover:border-[#1E3A8A] hover:bg-blue-50/50 text-xs font-semibold text-[#090B10] transition-colors text-center"
                >
                  Gmail
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset('smtp.office365.com', 587)}
                  className="px-2.5 py-1.5 rounded-lg border border-[#D1D5DB] hover:border-[#1E3A8A] hover:bg-blue-50/50 text-xs font-semibold text-[#090B10] transition-colors text-center"
                >
                  Outlook
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset('smtp.mailgun.org', 587)}
                  className="px-2.5 py-1.5 rounded-lg border border-[#D1D5DB] hover:border-[#1E3A8A] hover:bg-blue-50/50 text-xs font-semibold text-[#090B10] transition-colors text-center"
                >
                  Mailgun
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset('smtp.sendgrid.net', 587, 'apikey')}
                  className="px-2.5 py-1.5 rounded-lg border border-[#D1D5DB] hover:border-[#1E3A8A] hover:bg-blue-50/50 text-xs font-semibold text-[#090B10] transition-colors text-center"
                >
                  SendGrid
                </button>
              </div>
            </div>

            {/* Gmail Notice Banner if Gmail is selected */}
            {isGmail && (
              <div className="mb-4 p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-2.5">
                <HelpCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <span className="font-bold block">Important Note for Gmail:</span>
                  <p className="leading-relaxed">
                    Google disables login using your normal Gmail password. You must generate a 16-character{' '}
                    <strong>Google App Password</strong>:
                  </p>
                  <ol className="list-decimal pl-4 space-y-0.5 text-[11px]">
                    <li>Enable 2-Step Verification on your Google Account.</li>
                    <li>Go to <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noreferrer" className="underline font-semibold text-blue-700">myaccount.google.com/apppasswords</a></li>
                    <li>Create an app named "ReachInbox" and paste the 16 letters into the SMTP Password field below.</li>
                  </ol>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit(onAddSubmit)} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-[#090B10] mb-1">Sender Display Name</label>
                <input
                  type="text"
                  placeholder="e.g. Sales Outreach Team"
                  {...register('name')}
                  className="w-full bg-white border border-[#D1D5DB] rounded-lg px-3 py-2 text-xs text-[#090B10] placeholder-[#9CA3AF] focus:outline-none focus:border-[#1E3A8A]"
                />
                {errors.name && <p className="text-[10px] text-rose-600 mt-0.5">{errors.name.message}</p>}
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#090B10] mb-1">Sender Email Address</label>
                <input
                  type="email"
                  placeholder="your-name@gmail.com"
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
                    placeholder="smtp.gmail.com"
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
                <label className="block text-xs font-semibold text-[#090B10] mb-1">SMTP Username / Login</label>
                <input
                  type="text"
                  placeholder="your-name@gmail.com"
                  {...register('smtpUser')}
                  className="w-full bg-white border border-[#D1D5DB] rounded-lg px-3 py-2 text-xs text-[#090B10] placeholder-[#9CA3AF] focus:outline-none focus:border-[#1E3A8A]"
                />
                {errors.smtpUser && <p className="text-[10px] text-rose-600 mt-0.5">{errors.smtpUser.message}</p>}
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#090B10] mb-1">
                  SMTP Password {isGmail ? '(16-character Google App Password)' : ''}
                </label>
                <input
                  type="password"
                  placeholder={isGmail ? 'xxxx xxxx xxxx xxxx' : '••••••••••••'}
                  {...register('smtpPassword')}
                  className="w-full bg-white border border-[#D1D5DB] rounded-lg px-3 py-2 text-xs text-[#090B10] placeholder-[#9CA3AF] focus:outline-none focus:border-[#1E3A8A]"
                />
                {errors.smtpPassword && <p className="text-[10px] text-rose-600 mt-0.5">{errors.smtpPassword.message}</p>}
              </div>

              {/* Skip verification toggle */}
              <div className="pt-1">
                <label className="flex items-center gap-2 cursor-pointer text-xs text-[#4B5563] select-none">
                  <input
                    type="checkbox"
                    {...register('skipVerification')}
                    className="rounded border-[#D1D5DB] text-[#1E3A8A] focus:ring-[#1E3A8A]"
                  />
                  <span>Skip live connection handshake test (save credentials directly)</span>
                </label>
                <p className="text-[10px] text-[#9CA3AF] pl-5 mt-0.5">
                  Check this if your local network or firewall blocks port 587/465 or you want to verify later.
                </p>
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
                  className="px-4 py-1.5 rounded-lg bg-[#1E3A8A] hover:bg-[#172554] text-white text-xs font-semibold shadow-sm flex items-center gap-2"
                >
                  {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{isSubmitting ? 'Verifying & Saving...' : 'Save Sender'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
