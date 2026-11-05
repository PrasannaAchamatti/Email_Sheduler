import React, { useState, useEffect } from 'react';
import { useOutletContext, Link } from 'react-router-dom';
import {
  Mail,
  CalendarClock,
  CheckCircle2,
  XCircle,
  Clock,
  Cpu,
  RefreshCw,
  Send,
  ExternalLink,
  ShieldAlert,
  ArrowRight
} from 'lucide-react';
import { dashboardApi } from '../services/api';
import { Email, QueueMetrics, RateLimitUsage } from '../types';

export const DashboardPage: React.FC = () => {
  const { openCompose } = useOutletContext<{ openCompose: () => void }>();
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState({
    totalEmails: 0,
    scheduledEmails: 0,
    sentEmails: 0,
    failedEmails: 0,
    pendingEmails: 0,
    activeQueueJobs: 0,
    waitingQueueJobs: 0,
    delayedQueueJobs: 0
  });
  const [queue, setQueue] = useState<QueueMetrics | null>(null);
  const [rateLimits, setRateLimits] = useState<RateLimitUsage[]>([]);
  const [recentEmails, setRecentEmails] = useState<Email[]>([]);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const res = await dashboardApi.getStats();
      if (res.data.success) {
        setMetrics(res.data.data.metrics);
        setQueue(res.data.data.queue);
        setRateLimits(res.data.data.rateLimits);
        setRecentEmails(res.data.data.recentEmails);
      }
    } catch (err) {
      console.error('Failed to load dashboard statistics', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    const handleRefresh = () => fetchStats();
    window.addEventListener('reachinbox:refresh', handleRefresh);
    return () => window.removeEventListener('reachinbox:refresh', handleRefresh);
  }, []);

  return (
    <div className="space-y-6">
      {/* Top Banner Action */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-xl bg-gradient-to-r from-blue-50/80 via-white to-white border border-[#E5E7EB] shadow-sm">
        <div>
          <h2 className="text-lg font-bold text-[#090B10] tracking-tight">Email Delivery Operations Center</h2>
          <p className="text-xs text-[#4B5563] mt-0.5">
            Distributed BullMQ queues with sliding-window sender rate limiting and automatic Slack notifications.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchStats}
            disabled={loading}
            className="p-2 rounded-lg bg-white hover:bg-[#F3F4F6] border border-[#D1D5DB] text-[#4B5563] hover:text-[#090B10] transition-colors shadow-sm"
            title="Refresh Metrics"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={openCompose}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#1E3A8A] hover:bg-[#172554] text-white font-semibold text-xs transition-all shadow-md active:scale-[0.99]"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Compose New Email</span>
          </button>
        </div>
      </div>

      {/* Overview Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
        <div className="bg-white border border-[#E5E7EB] rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-[#4B5563] mb-2">
            <span className="text-xs font-semibold">Total Emails</span>
            <Mail className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-2xl font-bold text-[#090B10]">{metrics.totalEmails}</p>
          <span className="text-[10px] text-[#6B7280] mt-1 block">All campaigns</span>
        </div>

        <div className="bg-white border border-[#E5E7EB] rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-[#4B5563] mb-2">
            <span className="text-xs font-semibold">Scheduled</span>
            <CalendarClock className="w-4 h-4 text-indigo-600" />
          </div>
          <p className="text-2xl font-bold text-indigo-700">{metrics.scheduledEmails}</p>
          <span className="text-[10px] text-[#6B7280] mt-1 block">Future delayed jobs</span>
        </div>

        <div className="bg-white border border-[#E5E7EB] rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-[#4B5563] mb-2">
            <span className="text-xs font-semibold">Sent Emails</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-bold text-emerald-700">{metrics.sentEmails}</p>
          <span className="text-[10px] text-[#6B7280] mt-1 block">Delivered via SMTP</span>
        </div>

        <div className="bg-white border border-[#E5E7EB] rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-[#4B5563] mb-2">
            <span className="text-xs font-semibold">Failed</span>
            <XCircle className="w-4 h-4 text-rose-600" />
          </div>
          <p className="text-2xl font-bold text-rose-700">{metrics.failedEmails}</p>
          <span className="text-[10px] text-[#6B7280] mt-1 block">Max retries exceeded</span>
        </div>

        <div className="bg-white border border-[#E5E7EB] rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-[#4B5563] mb-2">
            <span className="text-xs font-semibold">Pending</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-2xl font-bold text-amber-700">{metrics.pendingEmails}</p>
          <span className="text-[10px] text-[#6B7280] mt-1 block">Queued & waiting</span>
        </div>

        <div className="bg-white border border-[#E5E7EB] rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-[#4B5563] mb-2">
            <span className="text-xs font-semibold">Active Jobs</span>
            <Cpu className="w-4 h-4 text-sky-600" />
          </div>
          <p className="text-2xl font-bold text-sky-700">{metrics.activeQueueJobs}</p>
          <span className="text-[10px] text-[#6B7280] mt-1 block">Worker execution</span>
        </div>
      </div>

      {/* Middle Section: Rate Limit Information & Queue Status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Rate Limit Information Card (2 cols) */}
        <div className="lg:col-span-2 bg-white border border-[#E5E7EB] rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-[#090B10] flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-[#1E3A8A]" />
                <span>Distributed Sender Rate Limit Status</span>
              </h3>
              <p className="text-xs text-[#4B5563]">
                Redis-backed hourly limit tracker with automatic rescheduling and Slack alerting
              </p>
            </div>
            <Link to="/settings" className="text-xs text-[#1E3A8A] hover:underline flex items-center gap-1 font-semibold">
              <span>Manage Senders</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {rateLimits.length === 0 ? (
            <div className="p-8 text-center border border-dashed border-[#D1D5DB] rounded-lg text-xs text-[#4B5563] bg-[#F9FAFB]">
              <span>No active senders found. Configure a sender in Settings to start monitoring.</span>
            </div>
          ) : (
            <div className="space-y-4">
              {rateLimits.map((rl) => (
                <div key={rl.senderId} className="p-4 rounded-lg bg-[#F9FAFB] border border-[#E5E7EB]">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <span className="text-xs font-bold text-[#090B10]">{rl.senderName}</span>
                      <span className="text-[11px] text-[#4B5563] ml-2 font-mono">({rl.senderEmail})</span>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-bold text-[#090B10]">
                        {rl.currentCount} / {rl.maxLimit}
                      </span>
                      <span className="text-[11px] text-[#4B5563] ml-1">emails/hr</span>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full bg-[#E5E7EB] h-2 rounded-full overflow-hidden border border-[#D1D5DB]">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        rl.percentUsed >= 90
                          ? 'bg-rose-600'
                          : rl.percentUsed >= 70
                          ? 'bg-amber-500'
                          : 'bg-[#1E3A8A]'
                      }`}
                      style={{ width: `${Math.min(100, rl.percentUsed)}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-[#4B5563] mt-2">
                    <span>Hour Window: <code className="text-[#090B10] font-mono font-medium">{rl.hourWindow}</code></span>
                    <span>Resets at: {new Date(rl.resetsAt).toLocaleTimeString()}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Live BullMQ Queue Status Card (1 col) */}
        <div className="bg-white border border-[#E5E7EB] rounded-xl p-6 flex flex-col justify-between shadow-sm">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-[#090B10] flex items-center gap-2">
                <Cpu className="w-4 h-4 text-emerald-600" />
                <span>BullMQ Queue Status</span>
              </h3>
              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                Live
              </span>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between py-2 border-b border-[#E5E7EB] text-xs">
                <span className="text-[#4B5563]">Delayed (Future)</span>
                <span className="font-bold text-indigo-700">{queue?.delayed ?? 0}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-[#E5E7EB] text-xs">
                <span className="text-[#4B5563]">Waiting (Ready)</span>
                <span className="font-bold text-amber-700">{queue?.waiting ?? 0}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-[#E5E7EB] text-xs">
                <span className="text-[#4B5563]">Active (Workers)</span>
                <span className="font-bold text-sky-700">{queue?.active ?? 0}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-[#E5E7EB] text-xs">
                <span className="text-[#4B5563]">Completed (24h)</span>
                <span className="font-bold text-emerald-700">{queue?.completed ?? 0}</span>
              </div>
              <div className="flex items-center justify-between py-2 text-xs">
                <span className="text-[#4B5563]">Failed</span>
                <span className="font-bold text-rose-700">{queue?.failed ?? 0}</span>
              </div>
            </div>
          </div>

          <div className="pt-4 mt-4 border-t border-[#E5E7EB]">
            <Link
              to="/queue"
              className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-[#172554] hover:bg-[#1E3A8A] text-white text-xs font-semibold transition-colors shadow-sm"
            >
              <Cpu className="w-3.5 h-3.5" />
              <span>Open Queue Monitor & Bull Board</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Recent Email Activity Section */}
      <div className="bg-white border border-[#E5E7EB] rounded-xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-[#090B10]">Recent Email Activity</h3>
            <p className="text-xs text-[#4B5563]">Latest emails registered and processed across your campaigns</p>
          </div>
          <Link to="/scheduled" className="text-xs text-[#1E3A8A] hover:underline flex items-center gap-1 font-semibold">
            <span>View All Scheduled</span>
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        {recentEmails.length === 0 ? (
          <div className="p-8 text-center border border-dashed border-[#D1D5DB] rounded-lg text-xs text-[#4B5563] bg-[#F9FAFB]">
            <span>No email activity yet. Click "Compose New Email" to schedule your first campaign.</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F9FAFB] text-[#4B5563] border-b border-[#E5E7EB]">
                <tr>
                  <th className="py-2.5 px-4 font-semibold">Recipient</th>
                  <th className="py-2.5 px-4 font-semibold">Subject</th>
                  <th className="py-2.5 px-4 font-semibold">Sender</th>
                  <th className="py-2.5 px-4 font-semibold">Scheduled Time</th>
                  <th className="py-2.5 px-4 font-semibold">Status</th>
                  <th className="py-2.5 px-4 font-semibold text-right">Ethereal Preview</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB]">
                {recentEmails.map((email) => (
                  <tr key={email.id} className="hover:bg-[#F3F4F6] transition-colors">
                    <td className="py-3 px-4 font-semibold text-[#090B10]">{email.recipient}</td>
                    <td className="py-3 px-4 text-[#4B5563] max-w-xs truncate">{email.subject}</td>
                    <td className="py-3 px-4 text-[#4B5563] font-mono text-[11px]">{email.sender?.email || 'N/A'}</td>
                    <td className="py-3 px-4 text-[#4B5563]">
                      {new Date(email.scheduledAt).toLocaleString()}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                          email.status === 'sent'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : email.status === 'failed'
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : email.status === 'processing'
                            ? 'bg-sky-50 text-sky-700 border border-sky-200'
                            : email.status === 'waiting'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                        }`}
                      >
                        {email.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      {email.etherealPreviewUrl ? (
                        <a
                          href={email.etherealPreviewUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] text-[#1E3A8A] hover:underline font-semibold"
                        >
                          <span>View Preview</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      ) : (
                        <span className="text-[11px] text-[#9CA3AF]">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
