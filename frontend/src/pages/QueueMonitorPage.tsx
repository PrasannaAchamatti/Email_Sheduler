import React, { useState, useEffect } from 'react';
import {
  Cpu,
  Play,
  Pause,
  RefreshCw,
  ExternalLink,
  Activity
} from 'lucide-react';
import { queueApi } from '../services/api';
import { QueueMetrics } from '../types';

export const QueueMonitorPage: React.FC = () => {
  const [metrics, setMetrics] = useState<QueueMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMetrics = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await queueApi.getStats();
      if (res.data.success) {
        setMetrics(res.data.data);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch queue statistics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
    const interval = setInterval(fetchMetrics, 5000);
    return () => clearInterval(interval);
  }, []);

  const handlePauseResume = async () => {
    if (!metrics) return;
    try {
      setActionLoading(true);
      if (metrics.isPaused) {
        await queueApi.resume();
      } else {
        await queueApi.pause();
      }
      await fetchMetrics();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Action failed');
    } finally {
      setActionLoading(false);
    }
  };

  const getBullBoardUrl = (): string => {
    const raw = (import.meta.env.VITE_API_URL || '').trim();
    if (!raw) return 'http://localhost:5000/admin/queues/';
    const clean = raw.replace(/\/+$/, '').replace(/\/api$/, '');
    return `${clean}/admin/queues/`;
  };

  const bullBoardUrl = getBullBoardUrl();

  return (
    <div className="space-y-6">
      {/* Top Controls Card */}
      <div className="bg-white border border-[#E5E7EB] rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-[#090B10]">BullMQ Worker & Engine Monitor</h2>
            <span
              className={`px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                metrics?.isPaused
                  ? 'bg-amber-50 text-amber-700 border border-amber-200'
                  : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              }`}
            >
              {metrics?.isPaused ? 'Queue Paused' : 'Active (Polling 5s)'}
            </span>
          </div>
          <p className="text-xs text-[#4B5563] mt-1 font-mono">
            Queue: {metrics?.queueName || 'reachinbox-email-queue'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchMetrics}
            disabled={loading}
            className="p-2 rounded-lg bg-white hover:bg-[#F3F4F6] border border-[#D1D5DB] text-[#4B5563] hover:text-[#090B10] transition-colors shadow-sm"
            title="Refresh Metrics"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={handlePauseResume}
            disabled={actionLoading || !metrics}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all shadow-sm ${
              metrics?.isPaused
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                : 'bg-amber-600 hover:bg-amber-700 text-white'
            }`}
          >
            {metrics?.isPaused ? (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Resume Queue</span>
              </>
            ) : (
              <>
                <Pause className="w-3.5 h-3.5 fill-current" />
                <span>Pause Queue</span>
              </>
            )}
          </button>

          <a
            href={bullBoardUrl}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#1E3A8A] hover:bg-[#172554] text-white text-xs font-semibold transition-colors shadow-sm"
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>Open Bull Board</span>
            <ExternalLink className="w-3.5 h-3.5 opacity-80" />
          </a>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700">
          {error}
        </div>
      )}

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5">
        <div className="bg-white border border-[#E5E7EB] rounded-xl p-4 shadow-sm">
          <span className="text-xs text-[#4B5563] block mb-1 font-semibold">Delayed Jobs</span>
          <p className="text-2xl font-bold text-indigo-700">{metrics?.delayed ?? 0}</p>
          <span className="text-[10px] text-[#6B7280] mt-1 block">Scheduled for future timestamps</span>
        </div>

        <div className="bg-white border border-[#E5E7EB] rounded-xl p-4 shadow-sm">
          <span className="text-xs text-[#4B5563] block mb-1 font-semibold">Waiting Jobs</span>
          <p className="text-2xl font-bold text-amber-700">{metrics?.waiting ?? 0}</p>
          <span className="text-[10px] text-[#6B7280] mt-1 block">Ready for worker pickup</span>
        </div>

        <div className="bg-white border border-[#E5E7EB] rounded-xl p-4 shadow-sm">
          <span className="text-xs text-[#4B5563] block mb-1 font-semibold">Active Jobs</span>
          <p className="text-2xl font-bold text-sky-700">{metrics?.active ?? 0}</p>
          <span className="text-[10px] text-[#6B7280] mt-1 block">In-flight SMTP sends</span>
        </div>

        <div className="bg-white border border-[#E5E7EB] rounded-xl p-4 shadow-sm">
          <span className="text-xs text-[#4B5563] block mb-1 font-semibold">Completed</span>
          <p className="text-2xl font-bold text-emerald-700">{metrics?.completed ?? 0}</p>
          <span className="text-[10px] text-[#6B7280] mt-1 block">Delivered within 24h retention</span>
        </div>

        <div className="bg-white border border-[#E5E7EB] rounded-xl p-4 shadow-sm">
          <span className="text-xs text-[#4B5563] block mb-1 font-semibold">Failed</span>
          <p className="text-2xl font-bold text-rose-700">{metrics?.failed ?? 0}</p>
          <span className="text-[10px] text-[#6B7280] mt-1 block">Max retries exceeded</span>
        </div>
      </div>

      {/* Embedded Live Bull Board Iframe */}
      <div className="bg-white border border-[#E5E7EB] rounded-2xl overflow-hidden shadow-sm">
        <div className="px-6 py-3 border-b border-[#E5E7EB] bg-[#F9FAFB] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-[#1E3A8A]" />
            <span className="text-xs font-semibold text-[#090B10]">Live Bull Board Dashboard</span>
          </div>
          <span className="text-[11px] text-[#4B5563] font-mono">
            http://localhost:5000/admin/queues
          </span>
        </div>
        <div className="w-full h-[600px] bg-white">
          <iframe
            src={bullBoardUrl}
            title="BullMQ Board"
            className="w-full h-full border-none"
          />
        </div>
      </div>
    </div>
  );
};
