import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Slack,
  CheckCircle2,
  XCircle,
  BellRing,
  Info
} from 'lucide-react';
import { slackApi } from '../services/api';
import { SlackStatus } from '../types';

export const SlackIntegrationPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<SlackStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [testingAlert, setTestingAlert] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    if (searchParams.get('success') === 'true') {
      setFeedback({ type: 'success', message: 'Slack workspace connected successfully via OAuth 2.0!' });
    } else if (searchParams.get('error')) {
      setFeedback({ type: 'error', message: `Slack connection error: ${searchParams.get('error')}` });
    }
  }, [searchParams]);

  const fetchStatus = async () => {
    try {
      setLoading(true);
      const res = await slackApi.getStatus();
      if (res.data.success) {
        setStatus(res.data.data);
      }
    } catch (err: any) {
      console.error('Failed to load Slack status', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const handleConnect = async () => {
    try {
      const res = await slackApi.getConnectUrl();
      if (res.data.success && res.data.data.url) {
        window.location.href = res.data.data.url;
      }
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to initialize Slack OAuth flow');
    }
  };

  const handleDisconnect = async () => {
    if (!window.confirm('Are you sure you want to disconnect this Slack workspace?')) return;
    try {
      setLoading(true);
      await slackApi.disconnect();
      setFeedback({ type: 'success', message: 'Slack workspace disconnected' });
      await fetchStatus();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to disconnect');
    } finally {
      setLoading(false);
    }
  };

  const handleSendTestAlert = async () => {
    try {
      setTestingAlert(true);
      setFeedback(null);
      const res = await slackApi.sendTestAlert();
      if (res.data.success) {
        setFeedback({
          type: 'success',
          message: 'Rate limit alert message successfully dispatched to your Slack channel!'
        });
      }
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.response?.data?.error || 'Failed to dispatch Slack alert'
      });
    } finally {
      setTestingAlert(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
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

      {/* Main Slack Integration Card */}
      <div className="bg-white border border-[#E5E7EB] rounded-2xl p-8 shadow-sm">
        <div className="flex items-start justify-between gap-6 pb-6 border-b border-[#E5E7EB]">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-[#4A154B]/10 border border-[#4A154B]/20 flex items-center justify-center shrink-0">
              <Slack className="w-6 h-6 text-[#4A154B]" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#090B10]">Slack Distributed Alerting</h2>
              <p className="text-xs text-[#4B5563] mt-1 max-w-xl leading-relaxed">
                Receive real-time Block Kit notifications in your team's Slack channels whenever an email sender hits its hourly threshold.
              </p>
            </div>
          </div>

          <div>
            {status?.connected ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Connected</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 text-[#4B5563] border border-[#D1D5DB]">
                <XCircle className="w-3.5 h-3.5" />
                <span>Not Connected</span>
              </span>
            )}
          </div>
        </div>

        {/* Connection Details or Action */}
        <div className="py-6 border-b border-[#E5E7EB]">
          {status?.connected ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 p-4 rounded-xl bg-[#F9FAFB] border border-[#E5E7EB] text-xs">
                <div>
                  <span className="text-[#6B7280] block mb-0.5 font-medium">Connected Workspace:</span>
                  <span className="text-[#090B10] font-bold">{status.teamName || 'Slack Team'}</span>
                </div>
                <div>
                  <span className="text-[#6B7280] block mb-0.5 font-medium">Target Notification Channel:</span>
                  <span className="text-[#090B10] font-mono font-medium">{status.channelName ? `#${status.channelName}` : '#general'}</span>
                </div>
                <div>
                  <span className="text-[#6B7280] block mb-0.5 font-medium">Workspace ID:</span>
                  <span className="text-[#090B10] font-mono text-[11px]">{status.teamId}</span>
                </div>
                <div>
                  <span className="text-[#6B7280] block mb-0.5 font-medium">Connected At:</span>
                  <span className="text-[#090B10]">{status.connectedAt ? new Date(status.connectedAt).toLocaleString() : 'Active'}</span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={handleSendTestAlert}
                  disabled={testingAlert}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#1E3A8A] hover:bg-[#172554] text-white text-xs font-semibold transition-all shadow-sm disabled:opacity-50"
                >
                  <BellRing className="w-3.5 h-3.5" />
                  <span>{testingAlert ? 'Delivering to Slack...' : 'Send Test Rate Limit Alert'}</span>
                </button>
                <button
                  onClick={handleDisconnect}
                  className="px-4 py-2 rounded-lg border border-rose-300 hover:bg-rose-50 text-rose-700 text-xs font-semibold transition-colors"
                >
                  Disconnect Slack
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-xs text-[#4B5563] leading-relaxed">
                Connect your team's Slack workspace using OAuth 2.0. When an hourly email sending limit is reached:
              </p>
              <ul className="text-xs text-[#4B5563] space-y-1.5 list-disc pl-5">
                <li>Immediate Slack notification with sender email, limit, and current window.</li>
                <li>Clear indication of the exact time email sending will automatically resume.</li>
                <li>Zero message loss: excess jobs are queued without dropping or failing.</li>
              </ul>
              <button
                onClick={handleConnect}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#4A154B] hover:bg-[#3f1240] text-white text-xs font-semibold transition-all shadow-md active:scale-95"
              >
                <Slack className="w-4 h-4" />
                <span>Connect Slack Workspace</span>
              </button>
            </div>
          )}
        </div>

        {/* Architectural Context */}
        <div className="pt-6">
          <div className="flex items-start gap-2.5 p-4 rounded-xl bg-blue-50/60 border border-blue-200 text-xs text-[#4B5563]">
            <Info className="w-4 h-4 text-[#1E3A8A] shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="text-[#090B10] font-bold block">How Rate Limiting Alerts Work:</span>
              <p>
                Each worker process updates an atomic Redis sliding counter. If a sender hits their configured limit (e.g. 200/hr),
                an atomic Redis alert guard guarantees that exactly one notification is delivered to Slack for that hour window,
                preventing message spam across high-concurrency worker threads.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
