import React, { useState } from 'react';
import { Module } from '../../types';
import { apiClient } from '../../api/client';
import {
  Upload,
  Plus,
  Trash2,
  FileText,
  CheckCircle,
  AlertTriangle,
  Loader2,
  Eye,
  Edit3,
  Sparkles
} from 'lucide-react';

export interface LocalModule {
  id?: number;
  module_number: number;
  module_name: string;
  original_filename?: string;
  extracted_text: string;
  is_included: boolean;
  file?: File;
  isExtracting?: boolean;
  error?: string;
}

interface Step2Props {
  modules: LocalModule[];
  setModules: React.Dispatch<React.SetStateAction<LocalModule[]>>;
  subjectId: number | null;
  onNext: () => void;
  onBack: () => void;
}

export const Step2Modules: React.FC<Step2Props> = ({
  modules,
  setModules,
  subjectId,
  onNext,
  onBack,
}) => {
  const [activeReviewIdx, setActiveReviewIdx] = useState<number | null>(null);

  const handleAddModule = () => {
    const nextNum = modules.length > 0 ? Math.max(...modules.map((m) => m.module_number)) + 1 : 1;
    setModules((prev) => [
      ...prev,
      {
        module_number: nextNum,
        module_name: `Module ${nextNum} – Title`,
        extracted_text: '',
        is_included: true,
      },
    ]);
  };

  const handleRemoveModule = (index: number) => {
    setModules((prev) => prev.filter((_, i) => i !== index));
    if (activeReviewIdx === index) setActiveReviewIdx(null);
  };

  const handleUpdateField = (index: number, field: keyof LocalModule, value: any) => {
    setModules((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const handleFileUpload = async (index: number, file: File) => {
    handleUpdateField(index, 'isExtracting', true);
    handleUpdateField(index, 'error', undefined);
    handleUpdateField(index, 'original_filename', file.name);

    if (subjectId) {
      // Direct server extraction & storage
      const formData = new FormData();
      formData.append('module_number', String(modules[index].module_number));
      formData.append('module_name', modules[index].module_name);
      formData.append('file', file);

      try {
        const res = await apiClient.uploadModuleFile(subjectId, formData);
        handleUpdateField(index, 'id', res.data.id);
        handleUpdateField(index, 'extracted_text', res.data.extracted_text);
        handleUpdateField(index, 'isExtracting', false);
      } catch (err: any) {
        handleUpdateField(
          index,
          'error',
          err.response?.data?.detail || 'Failed to extract text from document.'
        );
        handleUpdateField(index, 'isExtracting', false);
      }
    } else {
      // If subject not yet created on backend, read text locally if text, or store file
      if (file.name.endsWith('.txt') || file.name.endsWith('.md')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          handleUpdateField(index, 'extracted_text', e.target?.result as string);
          handleUpdateField(index, 'isExtracting', false);
        };
        reader.readAsText(file);
      } else {
        handleUpdateField(index, 'file', file);
        handleUpdateField(index, 'extracted_text', `Uploaded file: ${file.name}. Content will be extracted upon proceeding.`);
        handleUpdateField(index, 'isExtracting', false);
      }
    }
  };

  const loadSampleDBMSModules = () => {
    setModules([
      {
        module_number: 1,
        module_name: "Module 1 – Introduction to DBMS & Relational Model",
        original_filename: "Module1_DBMS_Intro.docx",
        extracted_text: "Database system concepts and architecture; Data models, schemas, and instances; Three-schema architecture and data independence; Entity-Relationship (ER) model: entities, attributes, relationships, cardinality ratios, and ER-to-relational mapping; Relational Model constraints: domain constraints, key constraints, entity integrity, and referential integrity.",
        is_included: true
      },
      {
        module_number: 2,
        module_name: "Module 2 – SQL & Relational Algebra",
        original_filename: "Module2_SQL.docx",
        extracted_text: "Relational algebra operations: select, project, join, set operations, division; SQL: DDL, DML, DCL commands, complex queries, nested subqueries, views, triggers, and assertion constraints; Aggregate functions, group by and having clauses.",
        is_included: true
      },
      {
        module_number: 3,
        module_name: "Module 3 – Normalization & Schema Refinement",
        original_filename: "Module3_Normalization.pdf",
        extracted_text: "Functional dependencies and inference rules (Armstrong axioms); Normal forms based on primary keys: 1NF, 2NF, 3NF; Boyce-Codd Normal Form (BCNF); Multivalued dependencies and 4NF; Lossless-join decomposition and dependency preservation properties.",
        is_included: true
      },
      {
        module_number: 4,
        module_name: "Module 4 – Transaction Management & Concurrency Control",
        original_filename: "Module4_Transactions.pdf",
        extracted_text: "Transaction concepts, ACID properties, transaction state diagram; Serializability: conflict serializability and view serializability; Concurrency control protocols: two-phase locking (2PL) protocol, strict 2PL, timestamp ordering protocol; Deadlock detection, prevention, and recovery mechanisms.",
        is_included: true
      },
      {
        module_number: 5,
        module_name: "Module 5 – Storage, Indexing & Query Processing",
        original_filename: "Module5_Indexing.docx",
        extracted_text: "File organization, ordered indices, primary and secondary indices; B-Tree and B+ Tree index structures; Hashing techniques: static and dynamic hashing; Query evaluation steps, cost estimation, and basic query optimization heuristics.",
        is_included: true
      }
    ]);
  };

  const handleProceed = () => {
    const included = modules.filter((m) => m.is_included);
    if (included.length === 0) {
      alert('Please include at least one module in the question paper.');
      return;
    }
    const emptyModules = included.filter((m) => !m.extracted_text.trim() && !m.file);
    if (emptyModules.length > 0) {
      alert(
        `Please provide syllabus text or upload a document for ${emptyModules[0].module_name}.`
      );
      return;
    }
    onNext();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
        <div>
          <h3 className="text-sm font-bold text-slate-800">Course Plan Syllabus Modules</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Upload files (PDF, DOCX, DOC) or enter syllabus content for each course module.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={loadSampleDBMSModules}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 transition"
            title="Load ready 5-module DBMS syllabus"
          >
            <Sparkles className="w-3.5 h-3.5" /> Load Sample DBMS Syllabus
          </button>
          <button
            type="button"
            onClick={handleAddModule}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700 shadow-xs transition"
          >
            <Plus className="w-3.5 h-3.5" /> Add Module
          </button>
        </div>
      </div>

      {modules.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-3xl p-6">
          <FileText className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <p className="text-sm font-bold text-slate-700">No course modules added yet</p>
          <p className="text-xs text-slate-500 mt-1">
            Click 'Add Module' or 'Load Sample DBMS Syllabus' to get started.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {modules.map((mod, idx) => (
            <div
              key={idx}
              className={`rounded-2xl border transition-all ${
                mod.is_included
                  ? 'border-slate-200 bg-white shadow-xs'
                  : 'border-slate-200 bg-slate-50/70 opacity-60'
              }`}
            >
              <div className="p-4 sm:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex items-center gap-3 w-full md:w-auto">
                  <input
                    type="checkbox"
                    checked={mod.is_included}
                    onChange={(e) => handleUpdateField(idx, 'is_included', e.target.checked)}
                    className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                    title="Include in Question Paper"
                  />
                  <div className="flex-1 md:w-80">
                    <input
                      type="text"
                      value={mod.module_name}
                      onChange={(e) => handleUpdateField(idx, 'module_name', e.target.value)}
                      className="w-full px-3 py-1.5 font-bold text-sm text-slate-900 border border-transparent hover:border-slate-300 focus:border-indigo-500 rounded-lg focus:bg-white bg-transparent transition"
                      placeholder="e.g. Module 1 – Relational Model"
                    />
                  </div>
                </div>

                {/* Upload or status */}
                <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end">
                  {mod.isExtracting ? (
                    <span className="inline-flex items-center gap-1.5 text-xs text-indigo-600 font-medium">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" /> Extracting syllabus...
                    </span>
                  ) : mod.extracted_text.trim() ? (
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                        <CheckCircle className="w-3 h-3" />
                        {mod.extracted_text.split(/\s+/).length} words extracted
                      </span>
                      <button
                        type="button"
                        onClick={() => setActiveReviewIdx(activeReviewIdx === idx ? null : idx)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition"
                      >
                        <Eye className="w-3.5 h-3.5" /> Review Text
                      </button>
                    </div>
                  ) : null}

                  {/* File Upload Input */}
                  <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition">
                    <Upload className="w-3.5 h-3.5" />
                    <span>{mod.original_filename ? 'Replace File' : 'Upload File'}</span>
                    <input
                      type="file"
                      accept=".pdf,.docx,.doc,.txt"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleFileUpload(idx, file);
                      }}
                    />
                  </label>

                  {/* Delete button */}
                  <button
                    type="button"
                    onClick={() => handleRemoveModule(idx)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                    title="Remove module"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Error message */}
              {mod.error && (
                <div className="px-5 pb-3">
                  <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-semibold flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>{mod.error}</span>
                  </div>
                </div>
              )}

              {/* Extracted text review collapsible */}
              {activeReviewIdx === idx && (
                <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-100 rounded-b-2xl">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      <Edit3 className="w-3.5 h-3.5 text-indigo-600" />
                      Extracted Syllabus Content (Editable for Review):
                    </label>
                    <span className="text-[11px] text-slate-400">
                      {mod.original_filename || 'Manual Entry'}
                    </span>
                  </div>
                  <textarea
                    rows={4}
                    value={mod.extracted_text}
                    onChange={(e) => handleUpdateField(idx, 'extracted_text', e.target.value)}
                    className="w-full p-3 bg-white border border-slate-200 rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Enter or refine topics for this module..."
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    SmartQP will ground all questions for this module strictly on the content above.
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between pt-4 border-t border-slate-100">
        <button
          type="button"
          onClick={onBack}
          className="px-5 py-2.5 rounded-xl font-semibold text-sm text-slate-600 hover:bg-slate-100 transition"
        >
          ← Back
        </button>
        <button
          type="button"
          onClick={handleProceed}
          className="px-6 py-2.5 rounded-xl font-bold text-sm text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm transition"
        >
          Next: Configure Sets & Total Marks →
        </button>
      </div>
    </div>
  );
};
