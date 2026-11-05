import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  X,
  Upload,
  AlertCircle,
  CheckCircle2,
  Send,
  Users,
  Sparkles,
  Loader2
} from 'lucide-react';
import { emailApi, senderApi } from '../../services/api';
import { Sender, RecipientParseResult } from '../../types';

const composeSchema = z.object({
  subject: z.string().min(1, 'Subject is required'),
  body: z.string().min(1, 'Email body is required'),
  startDate: z.string().min(1, 'Start date is required'),
  startTime: z.string().min(1, 'Start time is required'),
  delayBetweenEmails: z.coerce.number().min(500, 'Minimum delay is 500ms').default(2000),
  hourlyLimit: z.coerce.number().min(1, 'Minimum hourly limit is 1').default(200),
  senderId: z.string().min(1, 'Please select an email sender')
});

type ComposeFormData = z.infer<typeof composeSchema>;

interface ComposeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const ComposeModal: React.FC<ComposeModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [senders, setSenders] = useState<Sender[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [parseResult, setParseResult] = useState<RecipientParseResult | null>(null);
  const [manualRecipients, setManualRecipients] = useState('');
  const [activeTab, setActiveTab] = useState<'upload' | 'manual'>('upload');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  const nextHour = `${String((now.getHours() + 1) % 24).padStart(2, '0')}:00`;

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors }
  } = useForm<ComposeFormData>({
    resolver: zodResolver(composeSchema),
    defaultValues: {
      startDate: todayStr,
      startTime: nextHour,
      delayBetweenEmails: 2000,
      hourlyLimit: 200
    }
  });

  useEffect(() => {
    if (isOpen) {
      loadSenders();
      setErrorMessage(null);
      setSuccessMessage(null);
    }
  }, [isOpen]);

  const loadSenders = async () => {
    try {
      const res = await senderApi.getAll();
      if (res.data.success) {
        setSenders(res.data.data);
        if (res.data.data.length > 0) {
          setValue('senderId', res.data.data[0].id);
        }
      }
    } catch (err: any) {
      setErrorMessage('Failed to load senders list');
    }
  };

  const handleQuickCreateEtherealSender = async () => {
    try {
      setIsSubmitting(true);
      const res = await senderApi.createEthereal('ReachInbox Ethereal Test Sender');
      if (res.data.success) {
        await loadSenders();
        setValue('senderId', res.data.data.id);
      }
    } catch (err: any) {
      setErrorMessage('Failed to generate Ethereal test account');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      setErrorMessage(null);
      const res = await emailApi.uploadRecipients(file);
      if (res.data.success) {
        setParseResult(res.data.data);
      }
    } catch (err: any) {
      setErrorMessage(err.response?.data?.error || 'Failed to parse file');
    } finally {
      setIsUploading(false);
    }
  };

  const getCombinedRecipients = (): string[] => {
    if (activeTab === 'upload' && parseResult) {
      return parseResult.validEmails;
    }
    if (activeTab === 'manual') {
      const parts = manualRecipients.split(/[,;\n\r\t]+/).map((s) => s.trim().toLowerCase());
      return Array.from(new Set(parts.filter((s) => s.includes('@'))));
    }
    return [];
  };

  const onSubmit = async (data: ComposeFormData) => {
    setErrorMessage(null);
    const recipients = getCombinedRecipients();

    if (recipients.length === 0) {
      setErrorMessage('Please provide at least one valid recipient email address (via file upload or manual input).');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await emailApi.schedule({
        subject: data.subject,
        body: data.body,
        recipients,
        startDate: data.startDate,
        startTime: data.startTime,
        delayBetweenEmails: data.delayBetweenEmails,
        hourlyLimit: data.hourlyLimit,
        senderId: data.senderId
      });

      if (res.data.success) {
        setSuccessMessage(`Successfully scheduled campaign with ${recipients.length} recipients!`);
        setTimeout(() => {
          reset();
          setParseResult(null);
          setManualRecipients('');
          onSuccess();
          onClose();
        }, 1200);
      }
    } catch (err: any) {
      setErrorMessage(err.response?.data?.error || 'Failed to schedule campaign');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const validRecipients = getCombinedRecipients();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-white border border-[#E5E7EB] rounded-2xl shadow-2xl my-8 overflow-hidden text-[#090B10]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#E5E7EB] flex items-center justify-between bg-blue-50/50">
          <div>
            <h2 className="text-base font-bold text-[#090B10]">Compose New Email Campaign</h2>
            <p className="text-xs text-[#4B5563]">Configure schedule, inter-send spacing, and lead list</p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-[#6B7280] hover:text-[#090B10] hover:bg-[#E5E7EB]/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-5">
          {errorMessage && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 flex items-start gap-2.5 text-xs text-rose-700">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 flex items-start gap-2.5 text-xs text-emerald-700">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Sender Selection */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-[#090B10]">Email Sender</label>
              <button
                type="button"
                onClick={handleQuickCreateEtherealSender}
                className="text-xs text-[#1E3A8A] hover:underline inline-flex items-center gap-1 font-medium"
              >
                <Sparkles className="w-3.5 h-3.5 text-[#1E3A8A]" />
                <span>Quick Ethereal Account</span>
              </button>
            </div>
            {senders.length === 0 ? (
              <div className="p-3 rounded-lg bg-[#F9FAFB] border border-[#E5E7EB] text-xs text-[#4B5563] flex items-center justify-between">
                <span>No senders configured yet.</span>
                <button
                  type="button"
                  onClick={handleQuickCreateEtherealSender}
                  className="px-2.5 py-1 rounded bg-[#1E3A8A] text-white hover:bg-[#172554] text-xs font-medium"
                >
                  Create Instant Ethereal Sender
                </button>
              </div>
            ) : (
              <select
                {...register('senderId')}
                className="w-full bg-white border border-[#D1D5DB] rounded-lg px-3 py-2 text-xs text-[#090B10] focus:outline-none focus:border-[#1E3A8A]"
              >
                {senders.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.email}) {s.isEthereal ? '• Ethereal SMTP' : ''}
                  </option>
                ))}
              </select>
            )}
            {errors.senderId && <p className="text-[11px] text-rose-600 mt-1">{errors.senderId.message}</p>}
          </div>

          {/* Subject */}
          <div>
            <label className="block text-xs font-semibold text-[#090B10] mb-1.5">Email Subject</label>
            <input
              type="text"
              placeholder="e.g. Scaling enterprise outbound workflows with ReachInbox"
              {...register('subject')}
              className="w-full bg-white border border-[#D1D5DB] rounded-lg px-3 py-2 text-xs text-[#090B10] placeholder-[#9CA3AF] focus:outline-none focus:border-[#1E3A8A]"
            />
            {errors.subject && <p className="text-[11px] text-rose-600 mt-1">{errors.subject.message}</p>}
          </div>

          {/* Body */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-[#090B10]">Email Body</label>
              <span className="text-[11px] text-[#6B7280]">Supports plain text & HTML</span>
            </div>
            <textarea
              rows={5}
              placeholder="Hi there,&#10;&#10;I wanted to introduce our high-throughput email scheduling engine..."
              {...register('body')}
              className="w-full bg-white border border-[#D1D5DB] rounded-lg p-3 text-xs text-[#090B10] placeholder-[#9CA3AF] focus:outline-none focus:border-[#1E3A8A] font-sans"
            />
            {errors.body && <p className="text-[11px] text-rose-600 mt-1">{errors.body.message}</p>}
          </div>

          {/* Recipients Section */}
          <div className="border border-[#E5E7EB] rounded-xl p-4 bg-[#F9FAFB]">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-[#1E3A8A]" />
                <span className="text-xs font-semibold text-[#090B10]">Recipients ({validRecipients.length} valid)</span>
              </div>
              <div className="flex items-center bg-white rounded-md p-0.5 border border-[#D1D5DB] text-xs">
                <button
                  type="button"
                  onClick={() => setActiveTab('upload')}
                  className={`px-2.5 py-1 rounded text-xs transition-colors ${
                    activeTab === 'upload' ? 'bg-[#1E3A8A] text-white font-medium' : 'text-[#4B5563]'
                  }`}
                >
                  Upload CSV/TXT
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('manual')}
                  className={`px-2.5 py-1 rounded text-xs transition-colors ${
                    activeTab === 'manual' ? 'bg-[#1E3A8A] text-white font-medium' : 'text-[#4B5563]'
                  }`}
                >
                  Manual Paste
                </button>
              </div>
            </div>

            {activeTab === 'upload' ? (
              <div>
                <label className="border-2 border-dashed border-[#D1D5DB] hover:border-[#1E3A8A] rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer transition-colors bg-white">
                  <Upload className="w-6 h-6 text-[#6B7280] mb-1.5" />
                  <span className="text-xs text-[#090B10] font-semibold">Click or drag CSV or TXT lead file</span>
                  <span className="text-[11px] text-[#6B7280] mt-0.5">Supports comma, tab, newline separated lists</span>
                  <input
                    type="file"
                    accept=".csv,.txt"
                    onChange={handleFileUpload}
                    className="hidden"
                    disabled={isUploading}
                  />
                </label>

                {isUploading && (
                  <div className="flex items-center justify-center gap-2 text-xs text-[#4B5563] mt-2">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Parsing and validating recipients...</span>
                  </div>
                )}

                {parseResult && (
                  <div className="mt-3 p-3 rounded-lg bg-white border border-[#E5E7EB] text-xs space-y-1.5 shadow-sm">
                    <div className="flex items-center justify-between text-[#090B10] font-semibold">
                      <span>Detected Valid Emails:</span>
                      <span className="text-emerald-700 font-bold">{parseResult.validEmails.length}</span>
                    </div>
                    <div className="flex items-center justify-between text-[#4B5563]">
                      <span>Duplicates Filtered:</span>
                      <span>{parseResult.duplicateCount}</span>
                    </div>
                    <div className="flex items-center justify-between text-[#4B5563]">
                      <span>Invalid Filtered:</span>
                      <span>{parseResult.invalidCount}</span>
                    </div>
                    {parseResult.preview.length > 0 && (
                      <div className="pt-2 border-t border-[#E5E7EB]">
                        <span className="text-[11px] text-[#4B5563] block mb-1">Preview (first {parseResult.preview.length}):</span>
                        <div className="flex flex-wrap gap-1">
                          {parseResult.preview.map((em, idx) => (
                            <span key={idx} className="px-2 py-0.5 rounded bg-blue-50 border border-blue-200 text-[11px] text-[#1E3A8A] font-medium">
                              {em}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div>
                <textarea
                  rows={3}
                  value={manualRecipients}
                  onChange={(e) => setManualRecipients(e.target.value)}
                  placeholder="alex@company.com, sarah@startup.io, john@enterprise.org"
                  className="w-full bg-white border border-[#D1D5DB] rounded-lg p-2.5 text-xs text-[#090B10] placeholder-[#9CA3AF] focus:outline-none focus:border-[#1E3A8A]"
                />
                <span className="text-[11px] text-[#6B7280] mt-1 block">
                  Paste comma or newline separated email addresses. Duplicates will be removed.
                </span>
              </div>
            )}
          </div>

          {/* Schedule Configuration Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#090B10] mb-1">Start Date</label>
              <input
                type="date"
                {...register('startDate')}
                className="w-full bg-white border border-[#D1D5DB] rounded-lg px-2.5 py-2 text-xs text-[#090B10] focus:outline-none focus:border-[#1E3A8A]"
              />
              {errors.startDate && <p className="text-[10px] text-rose-600 mt-0.5">{errors.startDate.message}</p>}
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#090B10] mb-1">Start Time</label>
              <input
                type="time"
                {...register('startTime')}
                className="w-full bg-white border border-[#D1D5DB] rounded-lg px-2.5 py-2 text-xs text-[#090B10] focus:outline-none focus:border-[#1E3A8A]"
              />
              {errors.startTime && <p className="text-[10px] text-rose-600 mt-0.5">{errors.startTime.message}</p>}
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#090B10] mb-1">Spacing (ms)</label>
              <input
                type="number"
                step="500"
                min="500"
                {...register('delayBetweenEmails')}
                className="w-full bg-white border border-[#D1D5DB] rounded-lg px-2.5 py-2 text-xs text-[#090B10] focus:outline-none focus:border-[#1E3A8A]"
              />
              {errors.delayBetweenEmails && <p className="text-[10px] text-rose-600 mt-0.5">{errors.delayBetweenEmails.message}</p>}
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#090B10] mb-1">Hourly Limit</label>
              <input
                type="number"
                min="1"
                {...register('hourlyLimit')}
                className="w-full bg-white border border-[#D1D5DB] rounded-lg px-2.5 py-2 text-xs text-[#090B10] focus:outline-none focus:border-[#1E3A8A]"
              />
              {errors.hourlyLimit && <p className="text-[10px] text-rose-600 mt-0.5">{errors.hourlyLimit.message}</p>}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-[#E5E7EB] flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-xs font-medium text-[#4B5563] hover:text-[#090B10] hover:bg-[#F3F4F6] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || validRecipients.length === 0}
              className="flex items-center gap-2 px-5 py-2 rounded-lg bg-[#1E3A8A] hover:bg-[#172554] disabled:opacity-50 text-white font-semibold text-xs transition-all shadow-md active:scale-[0.99]"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Enqueuing BullMQ Jobs...</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>Schedule {validRecipients.length > 0 ? `(${validRecipients.length} Emails)` : 'Campaign'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
