import React, { useEffect, useState } from 'react';
import { Loader2, Sparkles, CheckCircle2, ShieldCheck, FileCheck, AlertCircle } from 'lucide-react';

interface Step5Props {
  numSets: number;
  totalMarks: number;
  subjectName: string;
  error?: string | null;
  onRetry: () => void;
}

export const Step5Generating: React.FC<Step5Props> = ({
  numSets,
  totalMarks,
  subjectName,
  error,
  onRetry,
}) => {
  const [currentStage, setCurrentStage] = useState(0);

  const stages = [
    { title: 'Chunking & Indexing Syllabus with RAG', desc: 'Extracting knowledge excerpts and semantic keywords' },
    { title: 'Synthesizing Academic Questions', desc: `Generating questions for ${numSets} sets adhering to Bloom's taxonomy & COs` },
    { title: 'Cross-Set Semantic Similarity & Uniqueness Audit', desc: 'Computing cosine similarity across sets (threshold: 0.85)' },
    { title: 'Running Automated Academic Rule Engine', desc: 'Verifying total marks parity, module coverage, and structural equivalence' },
  ];

  useEffect(() => {
    if (error) return;
    const interval = setInterval(() => {
      setCurrentStage((prev) => (prev < stages.length - 1 ? prev + 1 : prev));
    }, 2800);
    return () => clearInterval(interval);
  }, [error]);

  return (
    <div className="py-12 px-4 max-w-xl mx-auto text-center">
      {error ? (
        <div className="bg-rose-50 border border-rose-200 rounded-3xl p-8 text-center space-y-4 shadow-sm">
          <div className="w-14 h-14 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
            <AlertCircle className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-rose-900">Generation Halted</h3>
            <p className="text-xs text-rose-700 mt-2 leading-relaxed max-w-md mx-auto">{error}</p>
          </div>
          <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={onRetry}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 transition"
            >
              Adjust Settings & Retry
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-8">
          <div className="relative inline-flex items-center justify-center">
            <div className="w-20 h-20 rounded-3xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-lg shadow-indigo-100">
              <Sparkles className="w-10 h-10 animate-pulse" />
            </div>
          </div>

          <div>
            <h3 className="text-xl font-black text-slate-900">
              Generating {numSets} Question Paper {numSets === 1 ? 'Set' : 'Sets'}
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              {subjectName} • {totalMarks} Marks • Strictly syllabus-grounded
            </p>
          </div>

          {/* Stepper list */}
          <div className="space-y-3 text-left bg-slate-50 p-5 rounded-2xl border border-slate-200/80">
            {stages.map((stage, idx) => {
              const isPast = idx < currentStage;
              const isCurrent = idx === currentStage;

              return (
                <div key={idx} className="flex items-start gap-3">
                  <div className="mt-0.5">
                    {isPast ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    ) : isCurrent ? (
                      <Loader2 className="w-5 h-5 text-indigo-600 animate-spin" />
                    ) : (
                      <div className="w-5 h-5 rounded-full border-2 border-slate-300" />
                    )}
                  </div>
                  <div>
                    <p
                      className={`text-xs font-bold ${
                        isCurrent
                          ? 'text-indigo-900'
                          : isPast
                          ? 'text-emerald-900'
                          : 'text-slate-400'
                      }`}
                    >
                      {stage.title}
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5">{stage.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="text-xs text-slate-400 italic">
            This typically takes 8–15 seconds depending on number of sets and syllabus length.
          </div>
        </div>
      )}
    </div>
  );
};
