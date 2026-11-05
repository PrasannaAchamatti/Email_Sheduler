import React, { useState, useEffect } from 'react';
import {
  Send,
  Search,
  Filter,
  RefreshCw,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  CheckCircle2,
  XCircle,
  MailCheck
} from 'lucide-react';
import { emailApi } from '../services/api';
import { Email, Pagination } from '../types';

export const SentEmailsPage: React.FC = () => {
  const [emails, setEmails] = useState<Email[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 15,
    total: 0,
    totalPages: 1
  });

  const fetchSent = async (page = 1) => {
    try {
      setLoading(true);
      setError(null);
      const res = await emailApi.getSent({
        page,
        limit: pagination.limit,
        status: statusFilter,
        search
      });
      if (res.data.success) {
        setEmails(res.data.data);
        setPagination(res.data.pagination);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load sent emails');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSent(1);
  }, [statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchSent(1);
  };

  return (
    <div className="space-y-6">
      {/* Top Filter Bar */}
      <div className="bg-white border border-[#E5E7EB] rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
        {/* Search */}
        <form onSubmit={handleSearchSubmit} className="flex-1 max-w-md relative">
          <Search className="w-4 h-4 text-[#6B7280] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search delivered recipient or subject..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-white border border-[#D1D5DB] rounded-lg pl-9 pr-3 py-2 text-xs text-[#090B10] placeholder-[#9CA3AF] focus:outline-none focus:border-[#1E3A8A]"
          />
        </form>

        {/* Filters and Controls */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 bg-white border border-[#D1D5DB] rounded-lg px-2.5 py-1.5 text-xs">
            <Filter className="w-3.5 h-3.5 text-[#6B7280]" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-transparent text-[#090B10] focus:outline-none text-xs cursor-pointer font-medium"
            >
              <option value="all">All Dispatched</option>
              <option value="sent">Sent Successfully</option>
              <option value="failed">Delivery Failed</option>
            </select>
          </div>

          <button
            onClick={() => fetchSent(pagination.page)}
            disabled={loading}
            className="p-2 rounded-lg bg-white hover:bg-[#F3F4F6] border border-[#D1D5DB] text-[#4B5563] hover:text-[#090B10] transition-colors shadow-sm"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Table */}
      <div className="bg-white border border-[#E5E7EB] rounded-xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-8 h-8 border-2 border-[#1E3A8A] border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs text-[#4B5563]">Loading delivered messages from database...</p>
          </div>
        ) : emails.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <Send className="w-10 h-10 text-[#9CA3AF] mx-auto" />
            <p className="text-sm font-semibold text-[#090B10]">No dispatched emails found</p>
            <p className="text-xs text-[#6B7280]">
              {search || statusFilter !== 'all'
                ? 'Try adjusting your search query or filter.'
                : 'Emails will appear here as BullMQ worker jobs are processed.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F9FAFB] text-[#4B5563] border-b border-[#E5E7EB]">
                <tr>
                  <th className="py-3 px-4 font-semibold">Recipient</th>
                  <th className="py-3 px-4 font-semibold">Subject</th>
                  <th className="py-3 px-4 font-semibold">Sender</th>
                  <th className="py-3 px-4 font-semibold">Dispatched Time</th>
                  <th className="py-3 px-4 font-semibold">Status</th>
                  <th className="py-3 px-4 font-semibold">SMTP Message ID</th>
                  <th className="py-3 px-4 font-semibold text-right">Ethereal Preview</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB]">
                {emails.map((email) => (
                  <tr key={email.id} className="hover:bg-[#F3F4F6] transition-colors">
                    <td className="py-3.5 px-4 font-semibold text-[#090B10]">{email.recipient}</td>
                    <td className="py-3.5 px-4 text-[#4B5563] max-w-xs truncate">{email.subject}</td>
                    <td className="py-3.5 px-4 text-[#4B5563] font-mono text-[11px]">{email.sender?.email || 'N/A'}</td>
                    <td className="py-3.5 px-4 text-[#4B5563]">
                      {email.sentAt ? new Date(email.sentAt).toLocaleString() : new Date(email.updatedAt).toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                          email.status === 'sent'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}
                      >
                        {email.status === 'sent' ? (
                          <CheckCircle2 className="w-3 h-3" />
                        ) : (
                          <XCircle className="w-3 h-3" />
                        )}
                        <span>{email.status}</span>
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[11px] text-[#4B5563] max-w-[160px] truncate" title={email.messageId || ''}>
                      {email.messageId || '—'}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      {email.etherealPreviewUrl ? (
                        <a
                          href={email.etherealPreviewUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-[#1E3A8A] text-[11px] font-semibold transition-colors border border-blue-200 shadow-sm"
                        >
                          <MailCheck className="w-3 h-3 text-[#1E3A8A]" />
                          <span>View in Ethereal</span>
                          <ExternalLink className="w-3 h-3 opacity-70" />
                        </a>
                      ) : (
                        <span className="text-[11px] text-[#9CA3AF]">No preview</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        {pagination.totalPages > 1 && (
          <div className="px-6 py-3 border-t border-[#E5E7EB] flex items-center justify-between text-xs text-[#4B5563] bg-[#F9FAFB]">
            <span>
              Showing {emails.length} of {pagination.total} dispatched emails
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => fetchSent(pagination.page - 1)}
                disabled={pagination.page <= 1 || loading}
                className="p-1.5 rounded bg-white border border-[#D1D5DB] hover:bg-[#F3F4F6] disabled:opacity-40 transition-colors text-[#090B10] shadow-sm"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <span className="font-medium text-[#090B10]">
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <button
                onClick={() => fetchSent(pagination.page + 1)}
                disabled={pagination.page >= pagination.totalPages || loading}
                className="p-1.5 rounded bg-white border border-[#D1D5DB] hover:bg-[#F3F4F6] disabled:opacity-40 transition-colors text-[#090B10] shadow-sm"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
