import React, { useState, useEffect } from 'react';
import {
  CalendarClock,
  Search,
  Filter,
  RefreshCw,
  Ban,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Eye
} from 'lucide-react';
import { emailApi } from '../services/api';
import { Email, Pagination } from '../types';

export const ScheduledEmailsPage: React.FC = () => {
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
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);

  const fetchScheduled = async (page = 1) => {
    try {
      setLoading(true);
      setError(null);
      const res = await emailApi.getScheduled({
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
      setError(err.response?.data?.error || 'Failed to load scheduled emails');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchScheduled(1);
  }, [statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchScheduled(1);
  };

  const handleCancelEmail = async (id: string) => {
    if (!window.confirm('Are you sure you want to cancel this scheduled email?')) return;
    try {
      setCancellingId(id);
      await emailApi.cancel(id);
      await fetchScheduled(pagination.page);
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to cancel email');
    } finally {
      setCancellingId(null);
    }
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
            placeholder="Search by recipient or subject..."
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
              <option value="all">All Pending</option>
              <option value="scheduled">Scheduled</option>
              <option value="waiting">Waiting (Rescheduled)</option>
              <option value="processing">Processing</option>
            </select>
          </div>

          <button
            onClick={() => fetchScheduled(pagination.page)}
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
            <p className="text-xs text-[#4B5563]">Loading scheduled emails from database...</p>
          </div>
        ) : emails.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <CalendarClock className="w-10 h-10 text-[#9CA3AF] mx-auto" />
            <p className="text-sm font-semibold text-[#090B10]">No scheduled emails found</p>
            <p className="text-xs text-[#6B7280]">
              {search || statusFilter !== 'all'
                ? 'Try adjusting your search query or status filter.'
                : 'Compose a new email campaign to schedule emails with delayed BullMQ jobs.'}
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
                  <th className="py-3 px-4 font-semibold">Scheduled Time</th>
                  <th className="py-3 px-4 font-semibold">Status</th>
                  <th className="py-3 px-4 font-semibold">Campaign</th>
                  <th className="py-3 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB]">
                {emails.map((email) => (
                  <tr key={email.id} className="hover:bg-[#F3F4F6] transition-colors">
                    <td className="py-3.5 px-4 font-semibold text-[#090B10]">{email.recipient}</td>
                    <td className="py-3.5 px-4 text-[#4B5563] max-w-xs truncate">{email.subject}</td>
                    <td className="py-3.5 px-4 text-[#4B5563] font-mono text-[11px]">{email.sender?.email || 'N/A'}</td>
                    <td className="py-3.5 px-4 text-[#4B5563]">
                      {new Date(email.scheduledAt).toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                          email.status === 'processing'
                            ? 'bg-sky-50 text-sky-700 border border-sky-200'
                            : email.status === 'waiting'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                        }`}
                      >
                        {email.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-[#4B5563] max-w-[120px] truncate">
                      {email.campaign?.subject || 'Direct'}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setSelectedEmail(email)}
                          className="p-1 rounded text-[#4B5563] hover:text-[#090B10] hover:bg-[#E5E7EB] transition-colors"
                          title="View Details"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleCancelEmail(email.id)}
                          disabled={cancellingId === email.id}
                          className="p-1 rounded text-rose-600 hover:text-rose-700 hover:bg-rose-50 transition-colors disabled:opacity-50"
                          title="Cancel Job"
                        >
                          <Ban className="w-3.5 h-3.5" />
                        </button>
                      </div>
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
              Showing {emails.length} of {pagination.total} scheduled emails
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => fetchScheduled(pagination.page - 1)}
                disabled={pagination.page <= 1 || loading}
                className="p-1.5 rounded bg-white border border-[#D1D5DB] hover:bg-[#F3F4F6] disabled:opacity-40 transition-colors text-[#090B10] shadow-sm"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <span className="font-medium text-[#090B10]">
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <button
                onClick={() => fetchScheduled(pagination.page + 1)}
                disabled={pagination.page >= pagination.totalPages || loading}
                className="p-1.5 rounded bg-white border border-[#D1D5DB] hover:bg-[#F3F4F6] disabled:opacity-40 transition-colors text-[#090B10] shadow-sm"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Email Details Modal */}
      {selectedEmail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-white border border-[#E5E7EB] rounded-2xl p-6 shadow-2xl text-[#090B10]">
            <div className="flex items-center justify-between mb-4 border-b border-[#E5E7EB] pb-3">
              <h3 className="text-sm font-bold text-[#090B10]">Scheduled Email Details</h3>
              <button
                onClick={() => setSelectedEmail(null)}
                className="text-xs text-[#6B7280] hover:text-[#090B10]"
              >
                Close
              </button>
            </div>
            <div className="space-y-3 text-xs">
              <div>
                <span className="text-[#6B7280] block mb-0.5 font-medium">Recipient:</span>
                <span className="text-[#090B10] font-semibold">{selectedEmail.recipient}</span>
              </div>
              <div>
                <span className="text-[#6B7280] block mb-0.5 font-medium">Subject:</span>
                <span className="text-[#090B10]">{selectedEmail.subject}</span>
              </div>
              <div>
                <span className="text-[#6B7280] block mb-0.5 font-medium">Scheduled For:</span>
                <span className="text-[#090B10] font-mono">{new Date(selectedEmail.scheduledAt).toISOString()}</span>
              </div>
              <div>
                <span className="text-[#6B7280] block mb-0.5 font-medium">Sender:</span>
                <span className="text-[#090B10] font-mono">{selectedEmail.sender?.email}</span>
              </div>
              <div>
                <span className="text-[#6B7280] block mb-0.5 font-medium">Status:</span>
                <span className="font-bold uppercase tracking-wider text-indigo-700">{selectedEmail.status}</span>
              </div>
              {selectedEmail.errorMessage && (
                <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-800">
                  <span className="font-semibold block mb-0.5">Note:</span>
                  <span>{selectedEmail.errorMessage}</span>
                </div>
              )}
              <div>
                <span className="text-[#6B7280] block mb-0.5 font-medium">Message Body Preview:</span>
                <div className="p-3 rounded-lg bg-[#F9FAFB] border border-[#E5E7EB] text-[#090B10] font-mono text-[11px] whitespace-pre-wrap max-h-40 overflow-y-auto">
                  {selectedEmail.body}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
