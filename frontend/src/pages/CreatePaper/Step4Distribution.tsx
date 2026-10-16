import React, { useEffect } from 'react';
import { MarksCategoryConfig } from '../../types';
import { LocalModule } from './Step2Modules';
import {
  Plus,
  Trash2,
  AlertTriangle,
  CheckCircle,
  HelpCircle,
  Sparkles,
  Calculator
} from 'lucide-react';

interface Step4Props {
  categories: MarksCategoryConfig[];
  setCategories: React.Dispatch<React.SetStateAction<MarksCategoryConfig[]>>;
  modules: LocalModule[];
  targetTotalMarks: number;
  onGenerate: () => void;
  onBack: () => void;
}

export const Step4Distribution: React.FC<Step4Props> = ({
  categories,
  setCategories,
  modules,
  targetTotalMarks,
  onGenerate,
  onBack,
}) => {
  const includedModules = modules.filter((m) => m.is_included);

  // Initialize module distribution keys if not present
  useEffect(() => {
    setCategories((prev) =>
      prev.map((cat) => {
        const modDist = { ...cat.module_distribution };
        includedModules.forEach((m) => {
          const key = String(m.id || m.module_number);
          if (modDist[key] === undefined) {
            modDist[key] = 0;
          }
        });
        return { ...cat, module_distribution: modDist };
      })
    );
  }, [includedModules.length]);

  const handleAddCategory = () => {
    const newId = `cat_${Date.now()}`;
    const defaultModDist: Record<string, number> = {};
    includedModules.forEach((m) => {
      defaultModDist[String(m.id || m.module_number)] = 1;
    });

    setCategories((prev) => [
      ...prev,
      {
        category_id: newId,
        name: 'Custom Questions',
        question_type: 'descriptive',
        marks_per_question: 5,
        num_questions: includedModules.length,
        module_distribution: defaultModDist,
        difficulty: 'Medium',
        bloom_level: 'Understand',
        co_level: '',
      },
    ]);
  };

  const handleRemoveCategory = (index: number) => {
    if (categories.length === 1) {
      alert('You must have at least one marks category.');
      return;
    }
    setCategories((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpdateCategory = (index: number, field: keyof MarksCategoryConfig, value: any) => {
    setCategories((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const handleMatrixCellChange = (catIdx: number, moduleKey: string, val: number) => {
    setCategories((prev) => {
      const copy = [...prev];
      const modDist = { ...copy[catIdx].module_distribution, [moduleKey]: Math.max(0, val) };
      // Auto update total questions for this category
      const newTotal = Object.values(modDist).reduce((a, b) => a + b, 0);
      copy[catIdx] = {
        ...copy[catIdx],
        module_distribution: modDist,
        num_questions: newTotal,
      };
      return copy;
    });
  };

  const autoBalanceDistribution = () => {
    // Distribute questions evenly to reach targetTotalMarks
    if (includedModules.length === 0) return;

    if (categories.length === 1) {
      const marksPerQ = categories[0].marks_per_question || 5;
      const totalQ = Math.round(targetTotalMarks / marksPerQ);
      const perMod = Math.floor(totalQ / includedModules.length);
      const remainder = totalQ % includedModules.length;

      const modDist: Record<string, number> = {};
      includedModules.forEach((m, idx) => {
        const key = String(m.id || m.module_number);
        modDist[key] = perMod + (idx < remainder ? 1 : 0);
      });

      setCategories([
        {
          ...categories[0],
          num_questions: totalQ,
          module_distribution: modDist,
        },
      ]);
    } else {
      // Standard academic preset: 2-Marks, 5-Marks, 10-Marks
      const modDist2: Record<string, number> = {};
      const modDist5: Record<string, number> = {};
      const modDist10: Record<string, number> = {};

      includedModules.forEach((m) => {
        const key = String(m.id || m.module_number);
        modDist2[key] = 2; // 2 * 2m = 4m per mod
        modDist5[key] = 2; // 2 * 5m = 10m per mod
        modDist10[key] = 1; // 1 * 10m = 10m per mod
      });

      const total2 = includedModules.length * 2;
      const total5 = includedModules.length * 2;
      const total10 = includedModules.length * 1;

      setCategories([
        {
          category_id: 'cat_2m',
          name: 'Part A (Short Answer)',
          question_type: 'short answer',
          marks_per_question: 2,
          num_questions: total2,
          module_distribution: modDist2,
          difficulty: 'Easy',
          bloom_level: 'Remember',
        },
        {
          category_id: 'cat_5m',
          name: 'Part B (Conceptual / Analytical)',
          question_type: 'descriptive',
          marks_per_question: 5,
          num_questions: total5,
          module_distribution: modDist5,
          difficulty: 'Medium',
          bloom_level: 'Understand',
        },
        {
          category_id: 'cat_10m',
          name: 'Part C (Application & Design)',
          question_type: 'application-based',
          marks_per_question: 10,
          num_questions: total10,
          module_distribution: modDist10,
          difficulty: 'Hard',
          bloom_level: 'Apply',
        },
      ]);
    }
  };

  // Calculate live total marks
  const calculatedTotalMarks = categories.reduce(
    (sum, cat) => sum + cat.num_questions * cat.marks_per_question,
    0
  );
  const totalQuestionsSum = categories.reduce((sum, cat) => sum + cat.num_questions, 0);
  const isMarksMatching = calculatedTotalMarks === targetTotalMarks;
  const marksDifference = calculatedTotalMarks - targetTotalMarks;

  return (
    <div className="space-y-6">
      {/* Top Header & Preset Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200">
        <div>
          <h3 className="text-sm font-bold text-slate-800">
            Define Custom Question & Marks Distribution Pattern
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure question types, marks per question, and module allocations.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={autoBalanceDistribution}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 transition"
          >
            <Sparkles className="w-3.5 h-3.5" /> Auto-Load Standard Exam Pattern
          </button>
          <button
            type="button"
            onClick={handleAddCategory}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700 shadow-xs transition"
          >
            <Plus className="w-3.5 h-3.5" /> Add Question Type
          </button>
        </div>
      </div>

      {/* Marks Comparison Card */}
      <div
        className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
          isMarksMatching
            ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
            : 'bg-amber-50/70 border-amber-200 text-amber-900'
        }`}
      >
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
              isMarksMatching ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
            }`}
          >
            <Calculator className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-sm">
                Calculated Total: {calculatedTotalMarks} Marks
              </span>
              <span className="text-xs font-medium text-slate-500">
                (Target: {targetTotalMarks} Marks)
              </span>
            </div>
            <p className="text-xs mt-0.5">
              {isMarksMatching ? (
                <span className="text-emerald-700 font-semibold flex items-center gap-1">
                  <CheckCircle className="w-3.5 h-3.5" /> Calculated pattern strictly matches the paper's target total marks!
                </span>
              ) : (
                <span className="text-amber-800 font-semibold flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  {marksDifference > 0
                    ? `Excess of +${marksDifference} marks. Please reduce questions or marks per question.`
                    : `Shortfall of ${Math.abs(marksDifference)} marks. Please add questions or increase marks.`}
                </span>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 sm:text-right border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-200/50">
          <div>
            <span className="text-[11px] uppercase tracking-wider font-bold text-slate-400 block">
              Total Questions
            </span>
            <span className="font-extrabold text-base text-slate-800">{totalQuestionsSum}</span>
          </div>
          <div className="pl-3 border-l border-slate-200">
            <span className="text-[11px] uppercase tracking-wider font-bold text-slate-400 block">
              Categories
            </span>
            <span className="font-extrabold text-base text-slate-800">{categories.length}</span>
          </div>
        </div>
      </div>

      {/* Categories Cards */}
      <div className="space-y-4">
        {categories.map((cat, idx) => (
          <div
            key={cat.category_id || idx}
            className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-3">
                <span className="w-6 h-6 rounded-lg bg-indigo-50 text-indigo-700 text-xs font-extrabold flex items-center justify-center">
                  {idx + 1}
                </span>
                <input
                  type="text"
                  value={cat.name}
                  onChange={(e) => handleUpdateCategory(idx, 'name', e.target.value)}
                  className="font-bold text-sm text-slate-800 border-b border-transparent hover:border-slate-300 focus:border-indigo-500 focus:outline-none"
                  placeholder="Category Name (e.g. Part A)"
                />
              </div>
              <button
                type="button"
                onClick={() => handleRemoveCategory(idx)}
                className="text-slate-400 hover:text-rose-600 p-1 rounded-lg transition"
                title="Remove category"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            {/* Fields grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Question Type
                </label>
                <select
                  value={cat.question_type}
                  onChange={(e) => handleUpdateCategory(idx, 'question_type', e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="short answer">Short Answer</option>
                  <option value="descriptive">Descriptive</option>
                  <option value="numerical">Numerical</option>
                  <option value="application-based">Application-Based</option>
                  <option value="case-based">Case-Based</option>
                  <option value="custom">Custom</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Marks per Q
                </label>
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={cat.marks_per_question}
                  onChange={(e) =>
                    handleUpdateCategory(idx, 'marks_per_question', parseInt(e.target.value) || 1)
                  }
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Difficulty
                </label>
                <select
                  value={cat.difficulty || 'Medium'}
                  onChange={(e) => handleUpdateCategory(idx, 'difficulty', e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="Easy">Easy</option>
                  <option value="Medium">Medium</option>
                  <option value="Hard">Hard</option>
                  <option value="Balanced">Balanced</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Bloom's Level
                </label>
                <select
                  value={cat.bloom_level || ''}
                  onChange={(e) => handleUpdateCategory(idx, 'bloom_level', e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="">Any / Balanced</option>
                  <option value="Remember">Remember (L1)</option>
                  <option value="Understand">Understand (L2)</option>
                  <option value="Apply">Apply (L3)</option>
                  <option value="Analyze">Analyze (L4)</option>
                  <option value="Evaluate">Evaluate (L5)</option>
                  <option value="Create">Create (L6)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Target CO (Opt.)
                </label>
                <input
                  type="text"
                  placeholder="e.g. CO1"
                  value={cat.co_level || ''}
                  onChange={(e) => handleUpdateCategory(idx, 'co_level', e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="bg-slate-50 p-2 rounded-lg text-right">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Subtotal</span>
                <span className="text-sm font-extrabold text-indigo-700">
                  {cat.num_questions * cat.marks_per_question} M
                </span>
                <span className="text-[10px] text-slate-500 block">
                  ({cat.num_questions} × {cat.marks_per_question}M)
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Dynamic Module x Marks Distribution Matrix Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="p-4 bg-slate-50/80 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Module-Wise Question Distribution Matrix
            </h4>
            <p className="text-[11px] text-slate-500">
              Specify the number of questions required from each module for every question type.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-100 text-slate-600 font-bold uppercase text-[10px] tracking-wider">
              <tr>
                <th className="px-4 py-3">Module Name</th>
                {categories.map((c, idx) => (
                  <th key={idx} className="px-4 py-3 text-center">
                    {c.name} ({c.marks_per_question}M)
                  </th>
                ))}
                <th className="px-4 py-3 text-right">Module Total Qs</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {includedModules.map((m) => {
                const modKey = String(m.id || m.module_number);
                const rowTotalQs = categories.reduce(
                  (sum, cat) => sum + (cat.module_distribution?.[modKey] || 0),
                  0
                );

                return (
                  <tr key={modKey} className="hover:bg-slate-50/50">
                    <td className="px-4 py-3 font-semibold text-slate-800">
                      {m.module_name}
                    </td>
                    {categories.map((cat, catIdx) => {
                      const count = cat.module_distribution?.[modKey] || 0;
                      return (
                        <td key={catIdx} className="px-4 py-2 text-center">
                          <input
                            type="number"
                            min="0"
                            max="20"
                            value={count}
                            onChange={(e) =>
                              handleMatrixCellChange(
                                catIdx,
                                modKey,
                                parseInt(e.target.value) || 0
                              )
                            }
                            className="w-16 px-2 py-1 text-center font-bold text-slate-800 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          />
                        </td>
                      );
                    })}
                    <td className="px-4 py-3 text-right font-extrabold text-slate-700">
                      {rowTotalQs} Qs
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="bg-slate-50/90 font-bold text-slate-800 border-t border-slate-200">
              <tr>
                <td className="px-4 py-3 uppercase text-[11px] tracking-wider">
                  Category Total Questions:
                </td>
                {categories.map((cat, idx) => (
                  <td key={idx} className="px-4 py-3 text-center font-extrabold text-indigo-700">
                    {cat.num_questions} Qs
                  </td>
                ))}
                <td className="px-4 py-3 text-right text-indigo-700 font-extrabold">
                  {totalQuestionsSum} Qs
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Action Footer */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-100">
        <button
          type="button"
          onClick={onBack}
          className="px-5 py-2.5 rounded-xl font-semibold text-sm text-slate-600 hover:bg-slate-100 transition"
        >
          ← Back
        </button>

        <div className="flex items-center gap-3">
          {!isMarksMatching && (
            <p className="text-xs text-rose-600 font-semibold">
              Fix marks discrepancy ({calculatedTotalMarks}/{targetTotalMarks} M) to proceed.
            </p>
          )}
          <button
            type="button"
            disabled={!isMarksMatching || totalQuestionsSum === 0}
            onClick={onGenerate}
            className="px-7 py-3 rounded-xl font-bold text-sm text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 shadow-md shadow-indigo-200 transition flex items-center gap-2"
          >
            <Sparkles className="w-4 h-4" />
            Generate Multi-Set Question Papers
          </button>
        </div>
      </div>
    </div>
  );
};
