import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Slack,
  CheckCircle2,
  XCircle,
  BellRing,
  Info,
  Link2,
  Loader2,
  Copy,
  ExternalLink,
  ShieldCheck,
  Zap
} from 'lucide-react';
import { slackApi } from '../services/api';
import { SlackStatus } from '../types';

export const SlackIntegrationPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<SlackStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [testingAlert, setTestingAlert] = useState(false);
  const [savingWebhook, setSavingWebhook] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState('');
  const [channelName, setChannelName] = useState('');
  const [activeTab, setActiveTab] = useState<'webhook' | 'oauth'>('webhook');
  const [copiedCallback, setCopiedCallback] = useState(false);
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

  const handleSaveWebhook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!webhookUrl.trim().startsWith('https://hooks.slack.com/')) {
      setFeedback({
        type: 'error',
        message: 'Please enter a valid Slack Webhook URL starting with https://hooks.slack.com/'
      });
      return;
    }

    try {
      setSavingWebhook(true);
      setFeedback(null);
      const res = await slackApi.saveWebhook({
        webhookUrl: webhookUrl.trim(),
        channelName: channelName.trim() || undefined
      });
      if (res.data.success) {
        setFeedback({
          type: 'success',
          message: 'Slack Incoming Webhook connected and verified! A test card was posted to your Slack channel.'
        });
        setWebhookUrl('');
        setChannelName('');
        await fetchStatus();
      }
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.response?.data?.error || err.message || 'Failed to verify and save Slack webhook.'
      });
    } finally {
      setSavingWebhook(false);
    }
  };

  const handleConnectOAuth = async () => {
    try {
      setFeedback(null);
      const res = await slackApi.getConnectUrl();
      if (res.data.success && res.data.data.url) {
        window.location.href = res.data.data.url;
      }
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message:
          err.response?.data?.error ||
          'Failed to initialize Slack OAuth. Try using the Instant Incoming Webhook above!'
      });
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
          message: 'Real rate limit Block Kit alert successfully dispatched to your Slack channel!'
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

  const backendHost = window.location.origin;
  const inferredCallbackUrl = `${backendHost.replace(/:\d+$/, ':5000')}/api/slack/callback`;

  const copyCallbackUrl = () => {
    navigator.clipboard.writeText(inferredCallbackUrl);
    setCopiedCallback(true);
    setTimeout(() => setCopiedCallback(false), 2000);
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

      {/* Main Slack Card */}
      <div className="bg-white border border-[#E5E7EB] rounded-2xl p-6 sm:p-8 shadow-sm">
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

        {/* If Connected */}
        {status?.connected ? (
          <div className="py-6 border-b border-[#E5E7EB] space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl bg-[#F9FAFB] border border-[#E5E7EB] text-xs">
              <div>
                <span className="text-[#6B7280] block mb-0.5 font-medium">Integration Mode:</span>
                <span className="text-[#090B10] font-bold flex items-center gap-1.5">
                  {status.type === 'webhook' ? (
                    <>
                      <Zap className="w-3.5 h-3.5 text-amber-600" />
                      <span>Incoming Webhook</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                      <span>OAuth 2.0 Bot</span>
                    </>
                  )}
                </span>
              </div>
              <div>
                <span className="text-[#6B7280] block mb-0.5 font-medium">Target Channel:</span>
                <span className="text-[#090B10] font-mono font-medium">
                  {status.channelName?.startsWith('#') ? status.channelName : `#${status.channelName || 'general'}`}
                </span>
              </div>
              <div>
                <span className="text-[#6B7280] block mb-0.5 font-medium">Workspace / Team:</span>
                <span className="text-[#090B10] font-bold">{status.teamName || 'Slack Team'}</span>
              </div>
              <div>
                <span className="text-[#6B7280] block mb-0.5 font-medium">Status / Last Verified:</span>
                <span className="text-[#090B10]">
                  {status.connectedAt ? new Date(status.connectedAt).toLocaleString() : 'Active'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              <button
                onClick={handleSendTestAlert}
                disabled={testingAlert}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#1E3A8A] hover:bg-[#172554] text-white text-xs font-semibold transition-all shadow-sm disabled:opacity-50"
              >
                {testingAlert ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <BellRing className="w-3.5 h-3.5" />}
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
          /* If Not Connected: Connection Tabs */
          <div className="py-6 border-b border-[#E5E7EB] space-y-6">
            <div className="flex items-center gap-3 border-b border-[#E5E7EB] pb-3">
              <button
                onClick={() => setActiveTab('webhook')}
                className={`flex items-center gap-2 pb-2 text-xs font-bold transition-colors border-b-2 -mb-3 ${
                  activeTab === 'webhook'
                    ? 'border-[#1E3A8A] text-[#1E3A8A]'
                    : 'border-transparent text-[#6B7280] hover:text-[#090B10]'
                }`}
              >
                <Zap className="w-4 h-4 text-amber-500" />
                <span>Instant Webhook (1-Click & Recommended)</span>
              </button>
              <button
                onClick={() => setActiveTab('oauth')}
                className={`flex items-center gap-2 pb-2 text-xs font-bold transition-colors border-b-2 -mb-3 ${
                  activeTab === 'oauth'
                    ? 'border-[#1E3A8A] text-[#1E3A8A]'
                    : 'border-transparent text-[#6B7280] hover:text-[#090B10]'
                }`}
              >
                <Slack className="w-4 h-4 text-[#4A154B]" />
                <span>Slack OAuth 2.0</span>
              </button>
            </div>

            {/* TAB 1: Webhook Form */}
            {activeTab === 'webhook' && (
              <div className="space-y-4">
                <p className="text-xs text-[#4B5563] leading-relaxed">
                  Paste a Slack Incoming Webhook URL to start receiving rate-limit warnings immediately. No OAuth app setup or approval required!
                </p>

                <form onSubmit={handleSaveWebhook} className="space-y-3.5 max-w-xl">
                  <div>
                    <label className="block text-xs font-semibold text-[#090B10] mb-1">
                      Slack Incoming Webhook URL <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="url"
                      placeholder="https://hooks.slack.com/services/..."
                      value={webhookUrl}
                      onChange={(e) => setWebhookUrl(e.target.value)}
                      required
                      className="w-full bg-white border border-[#D1D5DB] rounded-lg px-3 py-2 text-xs text-[#090B10] placeholder-[#9CA3AF] focus:outline-none focus:border-[#1E3A8A]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#090B10] mb-1">
                      Channel Display Name (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="#email-rate-limits"
                      value={channelName}
                      onChange={(e) => setChannelName(e.target.value)}
                      className="w-full bg-white border border-[#D1D5DB] rounded-lg px-3 py-2 text-xs text-[#090B10] placeholder-[#9CA3AF] focus:outline-none focus:border-[#1E3A8A]"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={savingWebhook || !webhookUrl}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#1E3A8A] hover:bg-[#172554] text-white text-xs font-semibold transition-all shadow-md active:scale-95 disabled:opacity-50"
                  >
                    {savingWebhook ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                    <span>{savingWebhook ? 'Verifying & Saving...' : 'Save & Verify Webhook'}</span>
                  </button>
                </form>

                {/* 30-Second Webhook Setup Instructions */}
                <div className="mt-4 p-4 rounded-xl bg-[#F9FAFB] border border-[#E5E7EB] text-xs text-[#4B5563] space-y-2">
                  <span className="font-bold text-[#090B10] block">How to get a Slack Webhook in 30 seconds:</span>
                  <ol className="list-decimal pl-5 space-y-1 text-[11px] leading-relaxed">
                    <li>
                      Visit <a href="https://api.slack.com/apps" target="_blank" rel="noreferrer" className="underline font-semibold text-[#1E3A8A] inline-flex items-center gap-0.5">Slack App Directory <ExternalLink className="w-2.5 h-2.5" /></a> or your channel settings in Slack.
                    </li>
                    <li>Click <strong>Create New App</strong> &gt; <strong>From scratch</strong> (name it "ReachInbox Alerts").</li>
                    <li>Enable <strong>Incoming Webhooks</strong> and click <strong>Add New Webhook to Workspace</strong>.</li>
                    <li>Select your desired channel (e.g. <code>#general</code>) and copy the Webhook URL above!</li>
                  </ol>
                </div>
              </div>
            )}

            {/* TAB 2: OAuth 2.0 Flow */}
            {activeTab === 'oauth' && (
              <div className="space-y-4">
                <p className="text-xs text-[#4B5563] leading-relaxed">
                  Connect using standard Slack OAuth 2.0. Requires <code>SLACK_CLIENT_ID</code> and <code>SLACK_CLIENT_SECRET</code> configured in your environment.
                </p>

                <div className="p-3.5 rounded-xl bg-gray-50 border border-[#E5E7EB] text-xs space-y-1.5">
                  <span className="font-semibold text-[#090B10] block">OAuth Redirect / Callback URL:</span>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={inferredCallbackUrl}
                      className="w-full bg-white border border-[#D1D5DB] rounded px-2.5 py-1 text-[11px] font-mono text-[#090B10]"
                    />
                    <button
                      onClick={copyCallbackUrl}
                      className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#E5E7EB] hover:bg-[#D1D5DB] text-xs font-medium text-[#090B10] shrink-0"
                    >
                      <Copy className="w-3 h-3" />
                      <span>{copiedCallback ? 'Copied!' : 'Copy'}</span>
                    </button>
                  </div>
                  <p className="text-[10px] text-[#6B7280]">
                    Add this exact URL under <strong>OAuth &amp; Permissions &gt; Redirect URLs</strong> in your Slack App Console.
                  </p>
                </div>

                <button
                  onClick={handleConnectOAuth}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#4A154B] hover:bg-[#3f1240] text-white text-xs font-semibold transition-all shadow-md active:scale-95"
                >
                  <Slack className="w-4 h-4" />
                  <span>Connect Slack with OAuth 2.0</span>
                </button>
              </div>
            )}
          </div>
        )}

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
