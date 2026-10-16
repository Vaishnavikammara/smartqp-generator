import React from 'react';
import { Layers, Award, Clock, FileText, Sliders } from 'lucide-react';

interface Step3Props {
  numSets: number;
  setNumSets: (val: number) => void;
  totalMarks: number;
  setTotalMarks: (val: number) => void;
  durationMinutes: number;
  setDurationMinutes: (val: number) => void;
  instructions: string;
  setInstructions: (val: string) => void;
  similarityThreshold: number;
  setSimilarityThreshold: (val: number) => void;
  onNext: () => void;
  onBack: () => void;
}

export const Step3Sets: React.FC<Step3Props> = ({
  numSets,
  setNumSets,
  totalMarks,
  setTotalMarks,
  durationMinutes,
  setDurationMinutes,
  instructions,
  setInstructions,
  similarityThreshold,
  setSimilarityThreshold,
  onNext,
  onBack,
}) => {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (totalMarks <= 0) {
      alert('Total marks must be a positive integer.');
      return;
    }
    onNext();
  };

  const setBadges = Array.from({ length: numSets }, (_, i) => `Set ${String.fromCharCode(65 + i)}`);

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-indigo-50/60 border border-indigo-100 rounded-2xl p-5">
        <div className="flex items-center gap-2 text-indigo-900 font-bold text-sm mb-1">
          <Layers className="w-4 h-4 text-indigo-600" />
          <span>Multi-Set Configuration & Paper Bounds</span>
        </div>
        <p className="text-xs text-indigo-800">
          All generated sets will strictly enforce the same marks pattern and module coverage,
          while ensuring 100% semantic uniqueness without repetition.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Number of sets */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
            Number of Question Paper Sets
          </label>
          <div className="flex items-center gap-3">
            {[1, 2, 3, 4].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setNumSets(n)}
                className={`flex-1 py-3 px-4 rounded-xl text-sm font-extrabold border transition ${
                  numSets === n
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                {n} {n === 1 ? 'Set' : 'Sets'}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2 mt-3">
            {setBadges.map((badge) => (
              <span
                key={badge}
                className="px-2.5 py-1 rounded-lg text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-100"
              >
                • {badge}
              </span>
            ))}
          </div>
        </div>

        {/* Total Marks per Set */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
            Maximum Marks per Set <span className="text-rose-500">*</span>
          </label>
          <div className="relative">
            <Award className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
            <input
              type="number"
              min="5"
              max="200"
              required
              value={totalMarks}
              onChange={(e) => setTotalMarks(parseInt(e.target.value) || 0)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
            />
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            Standard totals: 100 Marks (End Sem), 50 Marks (Mid Sem), or 25/30 Marks (Class Test).
          </p>
        </div>

        {/* Examination Duration */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
            Examination Duration (Minutes)
          </label>
          <div className="relative">
            <Clock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
            <input
              type="number"
              min="30"
              max="360"
              value={durationMinutes}
              onChange={(e) => setDurationMinutes(parseInt(e.target.value) || 180)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
            />
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            Common values: 180 mins (3 Hours), 120 mins (2 Hours), 90 mins (1.5 Hours).
          </p>
        </div>

        {/* Cosine Similarity Threshold */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
              Uniqueness Cosine Threshold
            </label>
            <span className="text-xs font-mono font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">
              {similarityThreshold.toFixed(2)}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Sliders className="w-4 h-4 text-slate-400" />
            <input
              type="range"
              min="0.60"
              max="0.95"
              step="0.05"
              value={similarityThreshold}
              onChange={(e) => setSimilarityThreshold(parseFloat(e.target.value))}
              className="w-full accent-indigo-600"
            />
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            Initial standard: 0.85. If cross-set questions exceed this threshold, automatic regeneration triggers.
          </p>
        </div>
      </div>

      {/* Instructions */}
      <div>
        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
          General Examination Instructions
        </label>
        <textarea
          rows={3}
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
          className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
          placeholder="1. Answer all questions. 2. Figures to the right indicate full marks."
        />
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-slate-100">
        <button
          type="button"
          onClick={onBack}
          className="px-5 py-2.5 rounded-xl font-semibold text-sm text-slate-600 hover:bg-slate-100 transition"
        >
          ← Back
        </button>
        <button
          type="submit"
          className="px-6 py-2.5 rounded-xl font-bold text-sm text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm transition"
        >
          Next: Custom Question & Marks Distribution →
        </button>
      </div>
    </form>
  );
};
