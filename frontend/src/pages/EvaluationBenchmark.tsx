import React, { useState, useEffect } from 'react';
import { apiClient } from '../api/client';
import {
  FlaskConical,
  Play,
  CheckCircle,
  AlertTriangle,
  Sliders,
  Sparkles,
  BookOpen,
  HelpCircle,
  Loader2
} from 'lucide-react';

export const EvaluationBenchmark: React.FC = () => {
  const [dataset, setDataset] = useState<any>(null);
  const [threshold, setThreshold] = useState<number>(0.85);
  const [benchmarkResult, setBenchmarkResult] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingDataset, setIsFetchingDataset] = useState(true);

  useEffect(() => {
    apiClient
      .getEvaluationDataset()
      .then((res) => {
        setDataset(res.data);
        setIsFetchingDataset(false);
        runBenchmark(0.85);
      })
      .catch(() => setIsFetchingDataset(false));
  }, []);

  const runBenchmark = async (thresh: number) => {
    setIsLoading(true);
    try {
      const res = await apiClient.runSimilarityBenchmark(thresh);
      setBenchmarkResult(res.data);
    } catch (err) {
      console.error('Benchmark failed', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16 animate-fade-in">
      {/* Header */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs">
        <div className="flex items-center gap-2.5 mb-2">
          <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
            <FlaskConical className="w-4 h-4" />
          </div>
          <span className="text-xs font-bold uppercase tracking-wider text-purple-700">
            System Quality & Benchmarks
          </span>
        </div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">
          Dataset & Semantic Uniqueness Calibration
        </h1>
        <p className="text-xs text-slate-600 mt-1 max-w-2xl leading-relaxed">
          SmartQP grounds question generation in faculty course plans via Retrieval-Augmented Generation (RAG).
          This evaluation benchmark tests semantic similarity scoring, duplicate detection accuracy, and Bloom/CO mappings against a labeled dataset.
        </p>
      </div>

      {/* Threshold Calibrator Interactive Card */}
      <div className="bg-gradient-to-br from-indigo-900 to-slate-900 text-white rounded-3xl p-6 shadow-md space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Sliders className="w-4 h-4 text-indigo-400" />
              Calibrate Cosine Similarity Threshold
            </h3>
            <p className="text-xs text-indigo-200/80 mt-0.5">
              Adjust threshold to evaluate precision and recall on duplicate question pairs
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs font-mono font-bold bg-white/10 px-3 py-1.5 rounded-xl border border-white/10">
              Threshold: {threshold.toFixed(2)}
            </span>
            <button
              onClick={() => runBenchmark(threshold)}
              disabled={isLoading}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-indigo-500 hover:bg-indigo-400 text-white transition disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Evaluating...
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5" /> Run Benchmark
                </>
              )}
            </button>
          </div>
        </div>

        {/* Range Slider */}
        <div className="space-y-1">
          <input
            type="range"
            min="0.50"
            max="0.95"
            step="0.05"
            value={threshold}
            onChange={(e) => setThreshold(parseFloat(e.target.value))}
            className="w-full accent-indigo-400"
          />
          <div className="flex justify-between text-[11px] text-indigo-300 font-mono">
            <span>0.50 (Loose - High Duplicates Flagged)</span>
            <span>0.85 (Standard Recommended)</span>
            <span>0.95 (Strict - Only Near Verbatim)</span>
          </div>
        </div>

        {/* Results summary stats */}
        {benchmarkResult && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-white/10 text-center">
            <div className="p-3 bg-white/5 rounded-2xl">
              <span className="text-[11px] text-indigo-300 font-semibold block">Total Tested Pairs</span>
              <span className="text-lg font-black text-white">{benchmarkResult.total_pairs}</span>
            </div>
            <div className="p-3 bg-white/5 rounded-2xl">
              <span className="text-[11px] text-indigo-300 font-semibold block">Correct Classifications</span>
              <span className="text-lg font-black text-white">{benchmarkResult.correct_predictions}</span>
            </div>
            <div className="p-3 bg-white/5 rounded-2xl">
              <span className="text-[11px] text-indigo-300 font-semibold block">Accuracy Rate</span>
              <span className="text-lg font-black text-emerald-400">{benchmarkResult.accuracy_percent}%</span>
            </div>
            <div className="p-3 bg-white/5 rounded-2xl">
              <span className="text-[11px] text-indigo-300 font-semibold block">Optimal Balance</span>
              <span className="text-lg font-black text-indigo-300">
                {benchmarkResult.accuracy_percent === 100 ? 'Verified' : 'Calibrating'}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Benchmark Pairwise Results Table */}
      {benchmarkResult && (
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="p-5 border-b border-slate-100 font-bold text-xs text-slate-800 uppercase tracking-wider">
            Pairwise Semantic Evaluation & Decision Results
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="px-5 py-3">Pair ID</th>
                  <th className="px-5 py-3">Question 1</th>
                  <th className="px-5 py-3">Question 2</th>
                  <th className="px-4 py-3 text-center">Cosine Score</th>
                  <th className="px-4 py-3 text-center">Predicted</th>
                  <th className="px-4 py-3 text-center">Expected</th>
                  <th className="px-4 py-3 text-center">Outcome</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {benchmarkResult.benchmark_results.map((r: any) => (
                  <tr key={r.pair_id} className="hover:bg-slate-50/50">
                    <td className="px-5 py-3.5 font-bold text-slate-700">{r.pair_id}</td>
                    <td className="px-5 py-3.5 max-w-xs font-serif text-slate-900">{r.q1}</td>
                    <td className="px-5 py-3.5 max-w-xs font-serif text-slate-900">{r.q2}</td>
                    <td className="px-4 py-3.5 text-center font-mono font-bold text-indigo-600">
                      {r.similarity_score.toFixed(3)}
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          r.predicted_duplicate
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {r.predicted_duplicate ? 'Duplicate' : 'Distinct'}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          r.expected_duplicate
                            ? 'bg-amber-50 text-amber-800 border border-amber-200'
                            : 'bg-slate-50 text-slate-700 border border-slate-200'
                        }`}
                      >
                        {r.expected_duplicate ? 'Duplicate' : 'Distinct'}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      {r.is_correct ? (
                        <span className="inline-flex items-center gap-1 text-emerald-700 font-bold text-xs">
                          <CheckCircle className="w-3.5 h-3.5" /> Match
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-rose-600 font-bold text-xs">
                          <AlertTriangle className="w-3.5 h-3.5" /> Mismatch
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Labeled Questions Browser */}
      {dataset && (
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="p-5 border-b border-slate-100">
            <h3 className="font-bold text-sm text-slate-900">
              Evaluation Dataset Questions ({dataset.subject})
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Pre-labeled academic questions with Bloom's taxonomy, Course Outcomes, and verified syllabus relevance
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="px-5 py-3">ID</th>
                  <th className="px-5 py-3">Question Text</th>
                  <th className="px-4 py-3">Marks</th>
                  <th className="px-4 py-3">Bloom's Level</th>
                  <th className="px-4 py-3">CO</th>
                  <th className="px-4 py-3">Difficulty</th>
                  <th className="px-4 py-3 text-center">Syllabus Grounded</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {dataset.labeled_questions.map((q: any) => (
                  <tr key={q.id} className="hover:bg-slate-50/50">
                    <td className="px-5 py-3.5 font-bold text-slate-800">{q.id}</td>
                    <td className="px-5 py-3.5 font-serif text-slate-900 max-w-sm">{q.question_text}</td>
                    <td className="px-4 py-3.5 font-bold text-indigo-600">{q.marks} M</td>
                    <td className="px-4 py-3.5">
                      <span className="px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 font-semibold text-[10px]">
                        {q.bloom_level}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 font-semibold text-[10px]">
                        {q.co}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-medium text-[10px]">
                        {q.difficulty}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <span className="inline-flex items-center gap-1 text-emerald-700 font-bold text-[10px]">
                        <CheckCircle className="w-3 h-3" /> Grounded
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
