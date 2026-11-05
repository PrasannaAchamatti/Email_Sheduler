import React, { useState } from 'react';
import {
  Search,
  Database,
  Zap,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  AlertCircle
} from 'lucide-react';
import { emailApi } from '../services/api';

export const SearchEmailsPage: React.FC = () => {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<any[]>([]);
  const [searchSource, setSearchSource] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = async (targetPage = 1) => {
    try {
      setLoading(true);
      setError(null);
      setHasSearched(true);
      const res = await emailApi.search({
        q: query,
        status,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        page: targetPage,
        limit: 15
      });

      if (res.data.success) {
        setResults(res.data.results);
        setSearchSource(res.data.source);
        setTotalCount(res.data.total);
        setTotalPages(res.data.totalPages);
        setPage(res.data.page);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Search query failed');
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSearch(1);
  };

  return (
    <div className="space-y-6">
      {/* Search Header Form */}
      <div className="bg-white border border-[#E5E7EB] rounded-2xl p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-[#090B10] flex items-center gap-2">
              <Zap className="w-4 h-4 text-[#1E3A8A]" />
              <span>Full-Text Email Search Engine</span>
            </h2>
            <p className="text-xs text-[#4B5563] mt-0.5">
              High-throughput Elasticsearch indexing with automatic MySQL ACID fallback
            </p>
          </div>
          {searchSource && (
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
                searchSource === 'elasticsearch'
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-blue-50 text-[#1E3A8A] border border-blue-200'
              }`}
            >
              <Database className="w-3 h-3" />
              <span>Engine: {searchSource === 'elasticsearch' ? 'Elasticsearch 8.x' : 'Database Search'}</span>
            </span>
          )}
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          {/* Main Search Input */}
          <div className="relative">
            <Search className="w-4 h-4 text-[#6B7280] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by recipient email, subject keywords, or body contents..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full bg-white border border-[#D1D5DB] rounded-xl pl-10 pr-28 py-3 text-xs text-[#090B10] placeholder-[#9CA3AF] focus:outline-none focus:border-[#1E3A8A]"
            />
            <button
              type="submit"
              disabled={loading}
              className="absolute right-2 top-1/2 -translate-y-1/2 px-4 py-1.5 rounded-lg bg-[#1E3A8A] hover:bg-[#172554] text-white text-xs font-semibold transition-all shadow-sm active:scale-95 disabled:opacity-50"
            >
              {loading ? 'Searching...' : 'Search'}
            </button>
          </div>

          {/* Filters Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-[#4B5563] mb-1">Filter by Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full bg-white border border-[#D1D5DB] rounded-lg px-2.5 py-1.5 text-xs text-[#090B10] focus:outline-none focus:border-[#1E3A8A]"
              >
                <option value="all">All Email Statuses</option>
                <option value="sent">Sent</option>
                <option value="scheduled">Scheduled</option>
                <option value="waiting">Waiting (Rescheduled)</option>
                <option value="processing">Processing</option>
                <option value="failed">Failed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-[#4B5563] mb-1">Scheduled From</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full bg-white border border-[#D1D5DB] rounded-lg px-2.5 py-1.5 text-xs text-[#090B10] focus:outline-none focus:border-[#1E3A8A]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-[#4B5563] mb-1">Scheduled To</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full bg-white border border-[#D1D5DB] rounded-lg px-2.5 py-1.5 text-xs text-[#090B10] focus:outline-none focus:border-[#1E3A8A]"
              />
            </div>
          </div>
        </form>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      {/* Results Section */}
      <div className="space-y-3">
        {loading ? (
          <div className="p-16 text-center space-y-3 bg-white border border-[#E5E7EB] rounded-2xl shadow-sm">
            <div className="w-8 h-8 border-2 border-[#1E3A8A] border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs text-[#4B5563]">Querying index and ranking results...</p>
          </div>
        ) : !hasSearched ? (
          <div className="p-16 text-center space-y-2 bg-white border border-[#E5E7EB] rounded-2xl shadow-sm">
            <Search className="w-10 h-10 text-[#9CA3AF] mx-auto" />
            <p className="text-sm font-semibold text-[#090B10]">Enter search keywords above</p>
            <p className="text-xs text-[#6B7280]">
              Search across recipient email addresses, campaign subjects, and full message bodies.
            </p>
          </div>
        ) : results.length === 0 ? (
          <div className="p-16 text-center space-y-2 bg-white border border-[#E5E7EB] rounded-2xl shadow-sm">
            <Search className="w-10 h-10 text-[#9CA3AF] mx-auto" />
            <p className="text-sm font-semibold text-[#090B10]">No matching emails found</p>
            <p className="text-xs text-[#6B7280]">Try refining your search term or clearing date/status filters.</p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-[#4B5563] px-1 font-medium">
              <span>Found {totalCount} matching results</span>
              <span>Page {page} of {totalPages}</span>
            </div>

            {results.map((email) => (
              <div
                key={email.id}
                className="p-5 rounded-xl bg-white border border-[#E5E7EB] hover:border-[#1E3A8A] transition-all space-y-2 shadow-sm"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-[#090B10]">{email.recipient}</span>
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                        email.status === 'sent'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : email.status === 'failed'
                          ? 'bg-rose-50 text-rose-700 border border-rose-200'
                          : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                      }`}
                    >
                      {email.status}
                    </span>
                  </div>
                  <div className="text-[11px] text-[#4B5563] flex items-center gap-3">
                    <span>Scheduled: {new Date(email.scheduledAt).toLocaleString()}</span>
                    {email.etherealPreviewUrl && (
                      <a
                        href={email.etherealPreviewUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-[#1E3A8A] hover:underline font-semibold"
                      >
                        <span>Ethereal Preview</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                </div>

                <p className="text-xs font-semibold text-[#090B10]">{email.subject}</p>
                <p className="text-xs text-[#4B5563] line-clamp-2 font-mono text-[11px]">
                  {email.body}
                </p>
              </div>
            ))}

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 pt-4">
                <button
                  onClick={() => handleSearch(page - 1)}
                  disabled={page <= 1 || loading}
                  className="p-2 rounded-lg bg-white border border-[#D1D5DB] hover:bg-[#F3F4F6] disabled:opacity-40 text-[#090B10] shadow-sm"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-xs text-[#4B5563] font-medium">
                  Page {page} of {totalPages}
                </span>
                <button
                  onClick={() => handleSearch(page + 1)}
                  disabled={page >= totalPages || loading}
                  className="p-2 rounded-lg bg-white border border-[#D1D5DB] hover:bg-[#F3F4F6] disabled:opacity-40 text-[#090B10] shadow-sm"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
