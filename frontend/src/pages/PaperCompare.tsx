import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { apiClient } from '../api/client';
import { QuestionPaper, PaperSet } from '../types';
import { Layers, ArrowLeft, CheckCircle2, Award, BookOpen, Loader2 } from 'lucide-react';

export const PaperCompare: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [paper, setPaper] = useState<QuestionPaper | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    apiClient.getPaper(parseInt(id)).then((res) => {
      setPaper(res.data);
      setIsLoading(false);
    }).catch(() => setIsLoading(false));
  }, [id]);

  if (isLoading) {
    return (
      <div className="py-24 text-center">
        <Loader2 className="w-8 h-8 animate-spin mx-auto text-indigo-600 mb-2" />
        <p className="text-xs font-semibold text-slate-500">Loading Question Paper Sets...</p>
      </div>
    );
  }

  if (!paper || paper.sets.length === 0) {
    return (
      <div className="py-16 text-center">
        <p className="text-sm font-bold text-slate-700">Question Paper Not Found</p>
        <Link to="/papers" className="mt-2 inline-block text-xs font-bold text-indigo-600">
          ← Back to Papers
        </Link>
      </div>
    );
  }

  const maxQuestions = Math.max(...paper.sets.map((s) => s.questions.length));

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs">
        <div>
          <Link
            to={`/papers/${paper.id}`}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:underline mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Paper Review
          </Link>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Cross-Set Comparative Inspection
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {paper.title} • {paper.sets.length} Sets • Side-by-side uniqueness & structural parity
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-3.5 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Multi-Set Non-Repetition Enforced</span>
          </div>
        </div>
      </div>

      {/* Cross-Set Parity Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 text-center">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Total Marks Parity
          </span>
          <p className="text-lg font-black text-indigo-600 mt-1">
            {paper.sets.map((s) => `${s.set_label}: ${s.total_marks}M`).join(' | ')}
          </p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 text-center">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Question Count Equivalence
          </span>
          <p className="text-lg font-black text-slate-800 mt-1">
            {paper.sets.map((s) => `${s.set_label}: ${s.questions.length} Qs`).join(' | ')}
          </p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 text-center">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Status & Validation
          </span>
          <p className="text-lg font-black text-emerald-600 mt-1 uppercase">
            {paper.status}
          </p>
        </div>
      </div>

      {/* Side-by-Side Sets Matrix */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200 font-bold text-xs text-slate-700 uppercase tracking-wider">
          Side-By-Side Question Comparison Across All Sets
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100/70 border-b border-slate-200">
                <th className="p-3.5 w-16 text-center font-bold text-slate-500 uppercase tracking-wider">
                  Q.No
                </th>
                {paper.sets.map((s) => (
                  <th key={s.id} className="p-3.5 font-black text-slate-900 border-l border-slate-200">
                    <span className="px-2.5 py-1 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200 font-extrabold">
                      {s.set_label}
                    </span>
                    <span className="ml-2 text-slate-500 font-normal">
                      ({s.total_marks} Marks)
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {Array.from({ length: maxQuestions }, (_, qIdx) => {
                const qNum = qIdx + 1;
                return (
                  <tr key={qNum} className="hover:bg-slate-50/50">
                    <td className="p-3.5 text-center font-bold text-slate-500 bg-slate-50/30">
                      Q{qNum}
                    </td>
                    {paper.sets.map((s) => {
                      const q = s.questions.find((x) => x.question_number === qNum);
                      return (
                        <td
                          key={s.id}
                          className="p-3.5 border-l border-slate-100 align-top max-w-xs sm:max-w-md"
                        >
                          {q ? (
                            <div className="space-y-1.5">
                              <p className="text-xs text-slate-900 leading-relaxed font-serif font-medium">
                                {q.question_text}
                              </p>
                              <div className="flex flex-wrap items-center gap-1 text-[10px]">
                                <span className="font-black text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">
                                  {q.marks}M
                                </span>
                                <span className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">
                                  {q.module_name}
                                </span>
                                {q.bloom_level && (
                                  <span className="bg-purple-50 text-purple-700 px-1.5 py-0.5 rounded font-medium">
                                    {q.bloom_level}
                                  </span>
                                )}
                                {q.co_level && (
                                  <span className="bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded font-medium">
                                    {q.co_level}
                                  </span>
                                )}
                              </div>
                            </div>
                          ) : (
                            <span className="text-slate-300 italic">None</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
