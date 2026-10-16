import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { apiClient } from '../api/client';
import { QuestionPaperListItem } from '../types';
import { ValidationBadge } from '../components/ValidationBadge';
import {
  Files,
  FilePlus,
  Eye,
  Layers,
  Trash2,
  Download,
  Search,
  Filter,
  Loader2
} from 'lucide-react';

export const SavedPapers: React.FC = () => {
  const [papers, setPapers] = useState<QuestionPaperListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const fetchPapers = async () => {
    setIsLoading(true);
    try {
      const res = await apiClient.listPapers();
      setPapers(res.data);
    } catch (err) {
      console.error('Failed to load papers', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPapers();
  }, []);

  const handleDelete = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this question paper?')) {
      try {
        await apiClient.deletePaper(id);
        setPapers((prev) => prev.filter((p) => p.id !== id));
      } catch (err) {
        alert('Failed to delete paper');
      }
    }
  };

  const filtered = papers.filter((p) => {
    const matchesSearch =
      p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.subject_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.course_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">My Question Papers</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            View, review, download, and manage all your generated examination papers
          </p>
        </div>
        <Link
          to="/create-paper"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm transition"
        >
          <FilePlus className="w-4 h-4" /> Create New Paper
        </Link>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search by subject, title, or program..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-slate-400 hidden sm:block" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full sm:w-auto px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">All Statuses ({papers.length})</option>
            <option value="approved">Approved</option>
            <option value="validated">Validated</option>
            <option value="draft">Draft</option>
          </select>
        </div>
      </div>

      {/* Papers Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="py-20 text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-indigo-600 mb-2" />
            <p className="text-xs text-slate-500">Loading Question Papers...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-20 text-center px-4">
            <Files className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-sm font-bold text-slate-700">No question papers match your filters</p>
            <p className="text-xs text-slate-400 mt-1">Try adjusting your search or create a new paper.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50/75 border-b border-slate-100 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-6 py-4">Title & Subject</th>
                  <th className="px-4 py-4">Sets</th>
                  <th className="px-4 py-4">Marks</th>
                  <th className="px-4 py-4">Status</th>
                  <th className="px-4 py-4">Created Date</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((paper) => (
                  <tr key={paper.id} className="hover:bg-slate-50/50 transition">
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-900">{paper.title}</div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        {paper.subject_name} • {paper.course_name}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-lg text-xs font-bold bg-indigo-50 text-indigo-700">
                        {paper.num_sets} Sets
                      </span>
                    </td>
                    <td className="px-4 py-4 font-black text-slate-800">
                      {paper.total_marks} M
                    </td>
                    <td className="px-4 py-4">
                      <ValidationBadge status={paper.status} size="sm" />
                    </td>
                    <td className="px-4 py-4 text-xs text-slate-500">
                      {new Date(paper.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          to={`/papers/${paper.id}`}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 transition"
                        >
                          <Eye className="w-3.5 h-3.5" /> Review
                        </Link>
                        {paper.num_sets > 1 && (
                          <Link
                            to={`/papers/${paper.id}/compare`}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition"
                          >
                            <Layers className="w-3.5 h-3.5" /> Compare
                          </Link>
                        )}
                        <button
                          onClick={() => handleDelete(paper.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition"
                          title="Delete paper"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
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
