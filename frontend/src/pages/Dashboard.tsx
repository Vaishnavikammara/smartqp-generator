import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiClient } from '../api/client';
import { QuestionPaperListItem, SubjectCoursePlan } from '../types';
import { ValidationBadge } from '../components/ValidationBadge';
import {
  FilePlus,
  BookOpen,
  Files,
  CheckCircle,
  FileText,
  Clock,
  ArrowRight,
  Sparkles,
  Download,
  Eye,
  Trash2,
  Loader2,
  Calendar,
  Building2
} from 'lucide-react';

export const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [papers, setPapers] = useState<QuestionPaperListItem[]>([]);
  const [subjects, setSubjects] = useState<SubjectCoursePlan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'draft' | 'approved'>('all');

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [papersRes, subjectsRes] = await Promise.all([
        apiClient.listPapers(),
        apiClient.listSubjects(),
      ]);
      setPapers(papersRes.data);
      setSubjects(subjectsRes.data);
    } catch (err) {
      console.error('Failed to load dashboard data', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleDeletePaper = async (paperId: number) => {
    if (window.confirm('Are you sure you want to delete this question paper? This action cannot be undone.')) {
      try {
        await apiClient.deletePaper(paperId);
        setPapers((prev) => prev.filter((p) => p.id !== paperId));
      } catch (err) {
        alert('Failed to delete question paper');
      }
    }
  };

  const filteredPapers = papers.filter((p) => {
    if (filter === 'draft') return p.status === 'draft';
    if (filter === 'approved') return p.status === 'approved';
    return true;
  });

  const approvedCount = papers.filter((p) => p.status === 'approved').length;
  const draftCount = papers.filter((p) => p.status === 'draft').length;

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Welcome Hero Banner */}
      <div className="relative overflow-hidden bg-gradient-to-r from-indigo-900 via-indigo-800 to-indigo-950 rounded-3xl p-6 sm:p-8 text-white shadow-xl shadow-indigo-950/10">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-xs font-semibold text-indigo-200 border border-white/10 mb-3">
            <Sparkles className="w-3.5 h-3.5 text-indigo-300" />
            <span>SmartQP Faculty Portal</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Welcome, {user?.full_name}!
          </h1>
          <p className="mt-2 text-sm text-indigo-200/90 leading-relaxed">
            Generate balanced, syllabus-grounded multi-set examination question papers
            with automated non-repetition, Bloom's Taxonomy tagging, and one-click PDF/DOCX exports.
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Link
              to="/create-paper"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold bg-white text-indigo-900 hover:bg-indigo-50 shadow-md transition"
            >
              <FilePlus className="w-4 h-4 text-indigo-600" />
              Create New Question Paper
            </Link>
            <Link
              to="/course-plans"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-white/10 hover:bg-white/20 text-white backdrop-blur-md border border-white/15 transition"
            >
              <BookOpen className="w-4 h-4" />
              Manage Course Plans ({subjects.length})
            </Link>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Total Papers
            </span>
            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Files className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900 mt-2">{papers.length}</p>
          <p className="text-xs text-slate-500 mt-1">Generated question papers</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Approved
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-emerald-600 mt-2">{approvedCount}</p>
          <p className="text-xs text-slate-500 mt-1">Ready for examination</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Drafts
            </span>
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-amber-600 mt-2">{draftCount}</p>
          <p className="text-xs text-slate-500 mt-1">Pending review / edits</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Course Plans
            </span>
            <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <BookOpen className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-purple-600 mt-2">{subjects.length}</p>
          <p className="text-xs text-slate-500 mt-1">Syllabi with uploaded modules</p>
        </div>
      </div>

      {/* Recent Question Papers Section */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">My Question Papers</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Review, validate, compare, and download question papers
            </p>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl self-start sm:self-auto text-xs font-semibold">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1.5 rounded-lg transition ${
                filter === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All ({papers.length})
            </button>
            <button
              onClick={() => setFilter('approved')}
              className={`px-3 py-1.5 rounded-lg transition ${
                filter === 'approved' ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Approved ({approvedCount})
            </button>
            <button
              onClick={() => setFilter('draft')}
              className={`px-3 py-1.5 rounded-lg transition ${
                filter === 'draft' ? 'bg-white text-amber-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Drafts ({draftCount})
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="py-16 text-center text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-indigo-500" />
            <p className="text-xs">Loading question papers...</p>
          </div>
        ) : filteredPapers.length === 0 ? (
          <div className="py-16 text-center px-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-500 flex items-center justify-center mx-auto mb-3">
              <FileText className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-800">No question papers found</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Get started by uploading your syllabus modules and creating your first intelligent multi-set question paper.
            </p>
            <div className="mt-4">
              <Link
                to="/create-paper"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition"
              >
                <FilePlus className="w-4 h-4" /> Create Question Paper
              </Link>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50/75 border-b border-slate-100 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-6 py-3.5">Subject & Title</th>
                  <th className="px-4 py-3.5">Sets</th>
                  <th className="px-4 py-3.5">Marks</th>
                  <th className="px-4 py-3.5">Status</th>
                  <th className="px-4 py-3.5">Generated On</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredPapers.map((paper) => (
                  <tr key={paper.id} className="hover:bg-slate-50/50 transition">
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-900">{paper.title}</div>
                      <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-2">
                        <span>{paper.subject_name}</span>
                        <span>•</span>
                        <span>{paper.course_name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold bg-indigo-50 text-indigo-700">
                        {paper.num_sets} {paper.num_sets === 1 ? 'Set' : 'Sets'}
                      </span>
                    </td>
                    <td className="px-4 py-4 font-bold text-slate-800">
                      {paper.total_marks} M
                    </td>
                    <td className="px-4 py-4">
                      <ValidationBadge status={paper.status} size="sm" />
                    </td>
                    <td className="px-4 py-4 text-xs text-slate-500">
                      {new Date(paper.created_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          to={`/papers/${paper.id}`}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 transition"
                          title="Review & edit questions"
                        >
                          <Eye className="w-3.5 h-3.5" /> Review
                        </Link>
                        {paper.num_sets > 1 && (
                          <Link
                            to={`/papers/${paper.id}/compare`}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition"
                            title="Side-by-side comparison"
                          >
                            Compare
                          </Link>
                        )}
                        <button
                          onClick={() => handleDeletePaper(paper.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
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

      {/* Saved Course Plans Quick Section */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">Saved Course Plans</h2>
            <p className="text-xs text-slate-500">Re-use syllabus modules for new question paper sets</p>
          </div>
          <Link
            to="/course-plans"
            className="text-xs font-bold text-indigo-600 hover:underline flex items-center gap-1"
          >
            View all <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {subjects.length === 0 ? (
          <p className="text-xs text-slate-400 py-4 text-center">
            No course plans saved yet. Create a question paper to save course plans automatically.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {subjects.slice(0, 3).map((subj) => (
              <div
                key={subj.id}
                className="p-4 rounded-2xl border border-slate-200/70 hover:border-indigo-300 hover:shadow-xs transition bg-slate-50/50 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-indigo-600 uppercase tracking-wider">
                      {subj.subject_code || 'COURSE'}
                    </span>
                    <span className="text-[11px] font-medium text-slate-500">
                      {subj.modules?.length || 0} Modules
                    </span>
                  </div>
                  <h3 className="font-bold text-slate-900 text-sm mt-1">{subj.subject_name}</h3>
                  <p className="text-xs text-slate-500 mt-0.5">{subj.course_name} • {subj.department_name}</p>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-200/60 flex items-center justify-between">
                  <span className="text-[11px] text-slate-400">
                    {subj.academic_year || 'Academic Year'}
                  </span>
                  <button
                    onClick={() => navigate('/create-paper', { state: { preselectedSubjectId: subj.id } })}
                    className="text-xs font-bold text-indigo-600 hover:text-indigo-800"
                  >
                    Generate Paper →
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
