import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { apiClient } from '../api/client';
import { QuestionPaper, PaperSet, Question, ValidationReport } from '../types';
import { ValidationBadge } from '../components/ValidationBadge';
import { Modal } from '../components/Modal';
import {
  Download,
  CheckCircle,
  FileText,
  Clock,
  Sparkles,
  RefreshCw,
  Edit2,
  Trash2,
  AlertTriangle,
  Eye,
  Layers,
  CheckCircle2,
  Printer,
  ChevronDown,
  Loader2,
  Upload,
  Sliders,
  Copy,
  Check,
  Filter,
  ListOrdered,
  BookOpen,
  GraduationCap
} from 'lucide-react';

export const PaperReview: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [paper, setPaper] = useState<QuestionPaper | null>(null);
  const [activeSetIdx, setActiveSetIdx] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [includeTagsExport, setIncludeTagsExport] = useState(false);

  // Marks Filtering & Question Bank State
  const [selectedMarksFilter, setSelectedMarksFilter] = useState<number | 'all'>('all');
  const [showMarksModal, setShowMarksModal] = useState(false);
  const [marksModalTab, setMarksModalTab] = useState<number | 'all'>('all');
  const [marksModalScope, setMarksModalScope] = useState<'active_set' | 'all_sets'>('active_set');
  const [copiedMarksToast, setCopiedMarksToast] = useState<string | null>(null);

  // Institute Templates State
  const [templates, setTemplates] = useState<any[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('autonomous_obe');
  const [isUploadingTemplate, setIsUploadingTemplate] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [templateForm, setTemplateForm] = useState({
    name: 'Custom Institute Template',
    header_title: '',
    header_subtitle: 'AUTONOMOUS SEMESTER END EXAMINATIONS',
    show_usn_box: true,
    show_obe_columns: true,
    instructions: '1. Answer all questions.\n2. Figures to the right indicate full marks.\n3. Assume suitable data if necessary.',
    sign_off_blocks: 'Course Coordinator, Module Lead, Head of Department (HOD)',
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Edit question modal state
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [editForm, setEditForm] = useState({
    question_text: '',
    marks: 5,
    module_name: '',
    co_level: '',
    bloom_level: '',
    difficulty: 'Medium',
  });
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [isRegeneratingId, setIsRegeneratingId] = useState<number | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [showValidationReportModal, setShowValidationReportModal] = useState(false);

  const fetchPaper = async () => {
    if (!id) return;
    setIsLoading(true);
    try {
      const res = await apiClient.getPaper(parseInt(id));
      setPaper(res.data);
      if (res.data.subject?.institute_name) {
        setTemplateForm((prev) => ({
          ...prev,
          header_title: res.data.subject?.institute_name || '',
        }));
      }
    } catch (err) {
      console.error('Failed to load paper', err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchTemplates = async () => {
    try {
      const res = await apiClient.listTemplates();
      setTemplates(res.data);
    } catch (err) {
      console.error('Failed to fetch templates', err);
    }
  };

  useEffect(() => {
    fetchPaper();
    fetchTemplates();
  }, [id]);

  const activeTemplate = templates.find((t) => t.id === selectedTemplateId) || {
    id: 'autonomous_obe',
    name: 'Autonomous College – NBA / NAAC Outcome-Based Education (OBE) Format',
    header_title: paper?.subject?.institute_name || 'OFFICE OF THE CONTROLLER OF EXAMINATIONS',
    header_subtitle: 'AUTONOMOUS END SEMESTER EXAMINATIONS',
    show_usn_box: true,
    show_obe_columns: true,
    instructions: paper?.instructions || '1. Answer ALL questions.\n2. Part A carries 2 marks each; Part B carries comprehensive evaluation.\n3. Mention Course Outcomes (CO) and Bloom\'s Taxonomy Levels (BTL) appropriately.',
    sign_off_blocks: ['Course Coordinator', 'Module Lead', 'Head of the Department (HOD)']
  };

  const handleUpdateStatus = async (status: 'draft' | 'approved') => {
    if (!paper) return;
    try {
      await apiClient.updatePaperStatus(paper.id, status);
      setPaper({ ...paper, status });
    } catch (err) {
      alert('Failed to update status');
    }
  };

  const handleStartEdit = (q: Question) => {
    setEditingQuestion(q);
    setEditForm({
      question_text: q.question_text,
      marks: q.marks,
      module_name: q.module_name,
      co_level: q.co_level || '',
      bloom_level: q.bloom_level || '',
      difficulty: q.difficulty || 'Medium',
    });
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingQuestion) return;

    setIsSavingEdit(true);
    try {
      const res = await apiClient.editQuestion(editingQuestion.id, editForm);
      setPaper((prev) => {
        if (!prev) return prev;
        const copy = { ...prev };
        copy.sets = copy.sets.map((s) => ({
          ...s,
          questions: s.questions.map((q) => (q.id === editingQuestion.id ? res.data : q)),
        }));
        return copy;
      });
      setEditingQuestion(null);
    } catch (err) {
      alert('Failed to update question');
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleDeleteQuestion = async (qId: number) => {
    if (!window.confirm('Are you sure you want to delete this question?')) return;
    try {
      await apiClient.deleteQuestion(qId);
      fetchPaper();
    } catch (err) {
      alert('Failed to delete question');
    }
  };

  const handleRegenerateQuestion = async (qId: number) => {
    setIsRegeneratingId(qId);
    try {
      const res = await apiClient.regenerateQuestion(qId);
      setPaper((prev) => {
        if (!prev) return prev;
        const copy = { ...prev };
        copy.sets = copy.sets.map((s) => ({
          ...s,
          questions: s.questions.map((q) => (q.id === qId ? res.data : q)),
        }));
        return copy;
      });
    } catch (err) {
      alert('Failed to regenerate question. Please try again.');
    } finally {
      setIsRegeneratingId(null);
    }
  };

  const handleRevalidate = async () => {
    if (!paper) return;
    setIsValidating(true);
    try {
      await apiClient.revalidatePaper(paper.id);
      fetchPaper();
      setShowValidationReportModal(true);
    } catch (err) {
      alert('Failed to revalidate paper');
    } finally {
      setIsValidating(false);
    }
  };

  const handleTemplateFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingTemplate(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await apiClient.uploadTemplate(formData);
      const newTpl = res.data.template;
      setTemplates((prev) => [newTpl, ...prev.filter((t) => t.id !== newTpl.id)]);
      setSelectedTemplateId(newTpl.id);
      alert(`Institute template '${newTpl.name}' uploaded and applied successfully!`);
    } catch (err) {
      alert('Failed to upload template. Please ensure it is a valid .docx Word or .txt file.');
    } finally {
      setIsUploadingTemplate(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSaveCustomTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const signBlocks = templateForm.sign_off_blocks
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

      const res = await apiClient.createCustomTemplate({
        name: templateForm.name,
        header_title: templateForm.header_title,
        header_subtitle: templateForm.header_subtitle,
        show_usn_box: templateForm.show_usn_box,
        show_obe_columns: templateForm.show_obe_columns,
        instructions: templateForm.instructions,
        sign_off_blocks: signBlocks,
      });

      const newTpl = res.data.template;
      setTemplates((prev) => [newTpl, ...prev.filter((t) => t.id !== newTpl.id)]);
      setSelectedTemplateId(newTpl.id);
      setShowTemplateModal(false);
      alert('Custom institute template saved and applied!');
    } catch (err) {
      alert('Failed to save custom template');
    }
  };

  if (isLoading) {
    return (
      <div className="py-24 text-center">
        <Loader2 className="w-10 h-10 animate-spin mx-auto text-indigo-600 mb-3" />
        <p className="text-xs font-bold text-slate-600">Loading Question Paper...</p>
      </div>
    );
  }

  if (!paper) {
    return (
      <div className="py-16 text-center">
        <p className="text-sm font-bold text-slate-700">Question Paper Not Found</p>
        <Link to="/papers" className="mt-3 inline-block text-xs font-bold text-indigo-600 hover:underline">
          ← Back to Papers
        </Link>
      </div>
    );
  }

  const activeSet = paper.sets[activeSetIdx] || paper.sets[0];
  const passedLogs = paper.validation_logs.filter((l) => l.status === 'passed');
  const warningLogs = paper.validation_logs.filter((l) => l.status === 'warning');
  const failedLogs = paper.validation_logs.filter((l) => l.status === 'failed');

  // Collect distinct marks values across all sets
  const allPaperQuestions = paper.sets.flatMap((s) => s.questions.map((q) => ({ ...q, set_label: s.set_label })));
  const distinctMarks: number[] = Array.from(
    new Set(allPaperQuestions.map((q) => q.marks))
  ).sort((a, b) => a - b);

  // Filter questions for the main exam view
  const displayedQuestions = (activeSet?.questions || []).filter((q) => {
    if (selectedMarksFilter === 'all') return true;
    return q.marks === selectedMarksFilter;
  });

  // Filter questions for the Marks-wise Question Bank Modal
  const modalQuestions = (marksModalScope === 'active_set' ? activeSet.questions : allPaperQuestions).filter((q) => {
    if (marksModalTab === 'all') return true;
    return q.marks === marksModalTab;
  });

  const handleCopyMarksQuestions = (marksValue: number | 'all') => {
    const listToCopy = modalQuestions.filter((q) => (marksValue === 'all' ? true : q.marks === marksValue));
    const title = marksValue === 'all' ? 'All Questions' : `All ${marksValue}-Mark Questions`;
    const header = `=== ${paper.subject?.subject_name || 'SmartQP'} - ${title} (${marksModalScope === 'active_set' ? activeSet.set_label : 'All Sets'}) ===\n\n`;
    
    const formattedText = header + listToCopy
      .map((q, idx) => {
        const setInfo = marksModalScope === 'all_sets' && (q as any).set_label ? `[${(q as any).set_label}] ` : '';
        return `${idx + 1}. ${setInfo}${q.question_text} [${q.marks} Marks | CO: ${q.co_level || 'CO1'} | BL: ${q.bloom_level || 'Understand'} | Module: ${q.module_name}]`;
      })
      .join('\n\n');

    navigator.clipboard.writeText(formattedText);
    setCopiedMarksToast(`Copied ${listToCopy.length} questions to clipboard!`);
    setTimeout(() => setCopiedMarksToast(null), 3000);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16 animate-fade-in">
      {/* Hidden File Input for Institute Template Upload */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleTemplateFileUpload}
        accept=".docx,.doc,.txt"
        className="hidden"
      />

      {/* Top Banner & Control Bar */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2.5 mb-1.5">
            <ValidationBadge status={paper.status} size="md" />
            <span className="text-xs font-semibold text-slate-500">•</span>
            <span className="text-xs font-bold text-indigo-700">
              {paper.num_sets} {paper.num_sets === 1 ? 'Set' : 'Sets'}
            </span>
            <span className="text-xs font-semibold text-slate-500">•</span>
            <span className="text-xs font-bold text-slate-700">{paper.total_marks} Marks</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">{paper.title}</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {paper.subject?.institute_name} • {paper.subject?.department_name} • {paper.subject?.course_name}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Marks-wise Question Bank Button */}
          <button
            onClick={() => setShowMarksModal(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 shadow-xs transition"
          >
            <ListOrdered className="w-4 h-4 text-amber-600" />
            <span>Questions by Marks</span>
          </button>

          <button
            onClick={() => setShowValidationReportModal(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600" />
            <span>Validation ({passedLogs.length} Passed)</span>
          </button>

          {paper.num_sets > 1 && (
            <Link
              to={`/papers/${paper.id}/compare`}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
            >
              <Layers className="w-3.5 h-3.5 text-indigo-600" /> Compare Sets
            </Link>
          )}

          <button
            onClick={handleRevalidate}
            disabled={isValidating}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isValidating ? 'animate-spin' : ''}`} />
            <span>Re-validate</span>
          </button>

          {paper.status !== 'approved' ? (
            <button
              onClick={() => handleUpdateStatus('approved')}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-xs transition"
            >
              <CheckCircle className="w-3.5 h-3.5" /> Approve Paper
            </button>
          ) : (
            <button
              onClick={() => handleUpdateStatus('draft')}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition"
            >
              Revert to Draft
            </button>
          )}

          {/* Export Dropdown Trigger / Group */}
          <div className="relative inline-flex items-center gap-1.5">
            <a
              href={apiClient.getExportUrl(paper.id, activeSet.id, 'pdf', includeTagsExport, selectedTemplateId)}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-xs transition"
            >
              <Download className="w-3.5 h-3.5" /> Export PDF
            </a>
            <a
              href={apiClient.getExportUrl(paper.id, activeSet.id, 'docx', includeTagsExport, selectedTemplateId)}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 transition"
              title="Download editable Word document in chosen template format"
            >
              DOCX
            </a>
            {paper.num_sets > 1 && (
              <a
                href={apiClient.getBundleUrl(paper.id, 'pdf', includeTagsExport, selectedTemplateId)}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition"
                title="Download All Sets in a ZIP bundle"
              >
                All Sets (ZIP)
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Institute Template Customization Bar */}
      <div className="bg-gradient-to-r from-indigo-50/70 via-white to-slate-50 p-4 rounded-2xl border border-indigo-100 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-sm">
            <GraduationCap className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-indigo-950 uppercase tracking-wider">Institute Template:</span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-indigo-100/70 text-indigo-800">
                {activeTemplate?.name?.split('–')[0]?.trim() || activeTemplate?.name}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              The exam layout, USN box, OBE columns, and instructions reflect this institutional template.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Template Selector Dropdown */}
          <select
            value={selectedTemplateId}
            onChange={(e) => setSelectedTemplateId(e.target.value)}
            className="text-xs font-semibold px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {templates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>

          {/* Upload Institute Template Button */}
          <button
            type="button"
            disabled={isUploadingTemplate}
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-indigo-700 bg-white border border-indigo-200 hover:bg-indigo-50 shadow-xs transition"
            title="Upload your institute's question paper template (.docx / .txt)"
          >
            {isUploadingTemplate ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
            <span>Upload Template</span>
          </button>

          {/* Customize / Edit Template Details Button */}
          <button
            type="button"
            onClick={() => setShowTemplateModal(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 transition"
            title="Edit template headers, USN, OBE columns, and sign-off blocks"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Customize</span>
          </button>
        </div>
      </div>

      {/* Set Switcher Tabs & Quick Marks Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs">
        {/* Set selector tabs */}
        <div className="flex items-center gap-2 overflow-x-auto">
          {paper.sets.map((s, idx) => (
            <button
              key={s.id}
              onClick={() => setActiveSetIdx(idx)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                activeSetIdx === idx
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-700'
              }`}
            >
              {s.set_label} ({s.questions.length} Qs • {s.total_marks}M)
            </button>
          ))}
        </div>

        {/* Marks Filter Buttons & Tag Export Toggle */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-xl border border-slate-200">
            <span className="text-[11px] font-bold text-slate-500 px-2 flex items-center gap-1">
              <Filter className="w-3 h-3" /> Marks:
            </span>
            <button
              onClick={() => setSelectedMarksFilter('all')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                selectedMarksFilter === 'all'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All
            </button>
            {distinctMarks.map((m) => {
              const countInSet = activeSet.questions.filter((q) => q.marks === m).length;
              return (
                <button
                  key={m}
                  onClick={() => setSelectedMarksFilter(m)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                    selectedMarksFilter === m
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-200/50'
                  }`}
                >
                  <span>{m}M</span>
                  <span className={`text-[10px] px-1 rounded-full ${selectedMarksFilter === m ? 'bg-indigo-500 text-white' : 'bg-slate-200 text-slate-600'}`}>
                    {countInSet}
                  </span>
                </button>
              );
            })}
          </div>

          <label className="flex items-center gap-2 text-xs font-semibold text-slate-600 cursor-pointer px-1">
            <input
              type="checkbox"
              checked={includeTagsExport}
              onChange={(e) => setIncludeTagsExport(e.target.checked)}
              className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
            />
            <span>Include CO & Bloom columns</span>
          </label>
        </div>
      </div>

      {/* Notice if filter active */}
      {selectedMarksFilter !== 'all' && (
        <div className="bg-amber-50 border border-amber-200 text-amber-900 px-4 py-2 rounded-xl text-xs flex items-center justify-between">
          <span className="font-semibold">
            Filtering active set by <b>{selectedMarksFilter} Marks</b>: Showing {displayedQuestions.length} of {activeSet.questions.length} questions.
          </span>
          <button
            onClick={() => setSelectedMarksFilter('all')}
            className="text-amber-700 font-bold hover:underline"
          >
            Show All Questions
          </button>
        </div>
      )}

      {/* Exam Paper Sheet Layout */}
      <div className="exam-sheet bg-white rounded-3xl border border-slate-200 p-8 sm:p-12 shadow-sm max-w-4xl mx-auto">
        {/* USN / Register Number Grid (if configured in Institute Template) */}
        {(activeTemplate?.show_usn_box ?? true) && (
          <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-end gap-2 text-xs">
            <span className="font-bold text-slate-700">USN / Roll No:</span>
            <div className="inline-flex border-2 border-slate-800 rounded">
              {Array.from({ length: 10 }).map((_, i) => (
                <div
                  key={i}
                  className="w-7 h-7 border-r border-slate-300 last:border-r-0 flex items-center justify-center font-mono font-bold bg-slate-50/50"
                >
                  &nbsp;
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Institute Header */}
        <div className="text-center space-y-1 border-b-2 border-slate-900 pb-5 mb-6">
          <h2 className="text-xl sm:text-2xl font-bold uppercase tracking-wider text-slate-950 font-serif">
            {activeTemplate?.header_title || paper.subject?.institute_name || 'INSTITUTION OF HIGHER EDUCATION'}
          </h2>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-800">
            {paper.subject?.department_name || 'DEPARTMENT'}
          </h3>
          <p className="text-base font-bold text-indigo-900 pt-1 font-sans">
            {paper.examination_name || activeTemplate?.header_subtitle || 'SEMESTER EXAMINATION 2026'}
          </p>
          <div className="pt-2">
            <span className="inline-block px-4 py-1 rounded-md bg-indigo-50 text-indigo-800 border border-indigo-200 font-bold text-xs uppercase tracking-widest font-sans">
              {activeSet.set_label}
            </span>
          </div>
        </div>

        {/* Exam Metadata Grid */}
        <div className="grid grid-cols-2 text-xs border border-slate-300 rounded-xl p-4 bg-slate-50/50 mb-6 gap-y-2 font-sans">
          <div>
            <span className="font-bold text-slate-600">Course / Program:</span>{' '}
            <span className="text-slate-900 font-semibold">{paper.subject?.course_name}</span>
          </div>
          <div className="text-right">
            <span className="font-bold text-slate-600">Duration:</span>{' '}
            <span className="text-slate-900 font-semibold">{paper.duration_minutes || 180} Minutes</span>
          </div>
          <div>
            <span className="font-bold text-slate-600">Subject:</span>{' '}
            <span className="text-slate-900 font-semibold">
              {paper.subject?.subject_name} ({paper.subject?.subject_code || ''})
            </span>
          </div>
          <div className="text-right">
            <span className="font-bold text-slate-600">Max. Marks:</span>{' '}
            <span className="text-slate-900 font-black text-sm">{activeSet.total_marks}</span>
          </div>
          <div>
            <span className="font-bold text-slate-600">Semester / Year:</span>{' '}
            <span className="text-slate-900 font-semibold">
              {paper.subject?.semester || ''} {paper.subject?.academic_year || ''}
            </span>
          </div>
          <div className="text-right">
            <span className="font-bold text-slate-600">Total Questions:</span>{' '}
            <span className="text-slate-900 font-semibold">{activeSet.questions.length}</span>
          </div>
        </div>

        {/* Instructions */}
        <div className="text-xs text-slate-700 italic mb-6 border-b border-slate-200 pb-4 font-serif whitespace-pre-line">
          <span className="font-bold font-sans not-italic">Instructions: </span>
          {activeTemplate?.instructions || paper.instructions || '1. Answer all questions. 2. Figures to the right indicate full marks.'}
        </div>

        {/* Questions Table */}
        <div className="space-y-5">
          {displayedQuestions.map((q) => (
            <div
              key={q.id}
              className={`group p-4 rounded-2xl border transition-all ${
                q.is_flagged
                  ? 'border-amber-300 bg-amber-50/40'
                  : 'border-slate-100 hover:border-slate-300 bg-white hover:bg-slate-50/30'
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 flex-1">
                  <span className="font-bold text-sm text-slate-900 font-sans shrink-0 pt-0.5">
                    Q{q.question_number}.
                  </span>
                  <div className="space-y-2 flex-1">
                    <p className="text-sm text-slate-900 leading-relaxed font-serif">
                      {q.question_text}
                    </p>

                    {/* Metadata Tags */}
                    <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[11px] font-sans">
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-medium">
                        {q.module_name}
                      </span>
                      {q.co_level && (
                        <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 font-semibold">
                          {q.co_level}
                        </span>
                      )}
                      {q.bloom_level && (
                        <span className="px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 font-semibold">
                          {q.bloom_level}
                        </span>
                      )}
                      {q.difficulty && (
                        <span
                          className={`px-2 py-0.5 rounded-md font-semibold ${
                            q.difficulty === 'Easy'
                              ? 'bg-emerald-50 text-emerald-700'
                              : q.difficulty === 'Medium'
                              ? 'bg-blue-50 text-blue-700'
                              : 'bg-amber-50 text-amber-700'
                          }`}
                        >
                          {q.difficulty}
                        </span>
                      )}
                      {q.is_flagged && (
                        <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 font-bold flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" /> Flagged (Cross-Set Similarity)
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Marks Column & Action buttons */}
                <div className="flex flex-col items-end gap-2 shrink-0">
                  <span className="font-black text-sm text-slate-900 font-sans">
                    [{q.marks} M]
                  </span>
                  <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition">
                    <button
                      type="button"
                      onClick={() => handleStartEdit(q)}
                      className="p-1 text-slate-400 hover:text-indigo-600 rounded-lg hover:bg-slate-100"
                      title="Edit question text and parameters"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={isRegeneratingId === q.id}
                      onClick={() => handleRegenerateQuestion(q.id)}
                      className="p-1 text-slate-400 hover:text-indigo-600 rounded-lg hover:bg-slate-100"
                      title="Regenerate question from syllabus"
                    >
                      <RefreshCw
                        className={`w-3.5 h-3.5 ${isRegeneratingId === q.id ? 'animate-spin text-indigo-600' : ''}`}
                      />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteQuestion(q.id)}
                      className="p-1 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50"
                      title="Delete question"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Sign-off Blocks from Template */}
        {activeTemplate?.sign_off_blocks && activeTemplate.sign_off_blocks.length > 0 && (
          <div className="mt-16 pt-8 border-t border-slate-200 grid grid-cols-2 sm:grid-cols-3 gap-6 text-center text-xs font-sans">
            {activeTemplate.sign_off_blocks.map((block: string, idx: number) => (
              <div key={idx} className="space-y-6">
                <div className="w-32 mx-auto border-b border-slate-400 pt-6" />
                <p className="font-bold text-slate-700">{block}</p>
              </div>
            ))}
          </div>
        )}

        <div className="text-center text-xs text-slate-400 pt-12 pb-4 font-sans uppercase tracking-widest">
          --- End of Examination Paper ---
        </div>
      </div>

      {/* Marks-Wise Question Bank Modal ("give the list of all 2 marks or 5 marks") */}
      <Modal
        isOpen={showMarksModal}
        onClose={() => setShowMarksModal(false)}
        title="Question Bank by Marks"
      >
        <div className="space-y-5">
          {/* Controls: Scope Switcher and Tabs */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
            {/* Scope: Current Set vs All Sets */}
            <div className="inline-flex p-1 bg-slate-100 rounded-xl text-xs font-bold text-slate-600">
              <button
                onClick={() => setMarksModalScope('active_set')}
                className={`px-3 py-1.5 rounded-lg transition ${
                  marksModalScope === 'active_set' ? 'bg-white text-indigo-700 shadow-xs' : 'hover:text-slate-900'
                }`}
              >
                {activeSet.set_label} Only
              </button>
              <button
                onClick={() => setMarksModalScope('all_sets')}
                className={`px-3 py-1.5 rounded-lg transition ${
                  marksModalScope === 'all_sets' ? 'bg-white text-indigo-700 shadow-xs' : 'hover:text-slate-900'
                }`}
              >
                All Sets (Across Sets A–{String.fromCharCode(64 + paper.num_sets)})
              </button>
            </div>

            {/* Copy button */}
            <button
              onClick={() => handleCopyMarksQuestions(marksModalTab)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-xs transition"
            >
              {copiedMarksToast ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
              <span>{marksModalTab === 'all' ? 'Copy All Questions' : `Copy All ${marksModalTab}-Mark Questions`}</span>
            </button>
          </div>

          {copiedMarksToast && (
            <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2 animate-fade-in">
              <CheckCircle className="w-4 h-4 text-emerald-600" />
              {copiedMarksToast}
            </div>
          )}

          {/* Marks Category Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            <button
              onClick={() => setMarksModalTab('all')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                marksModalTab === 'all'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              All Marks ({marksModalScope === 'active_set' ? activeSet.questions.length : allPaperQuestions.length})
            </button>
            {distinctMarks.map((m) => {
              const count = (marksModalScope === 'active_set' ? activeSet.questions : allPaperQuestions).filter(
                (q) => q.marks === m
              ).length;
              return (
                <button
                  key={m}
                  onClick={() => setMarksModalTab(m)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap flex items-center gap-1.5 ${
                    marksModalTab === m
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200'
                  }`}
                >
                  <span>{m}-Mark Questions</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                    marksModalTab === m ? 'bg-indigo-500 text-white' : 'bg-indigo-200 text-indigo-800'
                  }`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Questions List */}
          <div className="max-h-[55vh] overflow-y-auto space-y-3 pr-1">
            {modalQuestions.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-500">
                No questions found for the selected marks filter.
              </div>
            ) : (
              modalQuestions.map((q, idx) => (
                <div
                  key={q.id}
                  className="p-4 rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition space-y-2 text-xs"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2.5 flex-1">
                      <span className="font-black text-indigo-700 font-sans shrink-0 pt-0.5">
                        #{idx + 1}
                      </span>
                      <p className="font-serif text-slate-900 text-sm leading-relaxed">
                        {q.question_text}
                      </p>
                    </div>
                    <span className="font-black text-xs px-2.5 py-1 rounded-md bg-slate-100 text-slate-800 shrink-0">
                      {q.marks} Marks
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 pt-1 font-sans text-[11px]">
                    {marksModalScope === 'all_sets' && (q as any).set_label && (
                      <span className="px-2 py-0.5 rounded bg-indigo-100 text-indigo-800 font-bold">
                        {(q as any).set_label}
                      </span>
                    )}
                    <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                      Module: {q.module_name}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-purple-50 text-purple-700 font-semibold">
                      CO: {q.co_level || 'CO1'}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-semibold">
                      Bloom: {q.bloom_level || 'Understand'}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 font-semibold">
                      Diff: {q.difficulty || 'Medium'}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="flex justify-between items-center pt-3 border-t border-slate-100 text-xs text-slate-500">
            <span>
              Showing {modalQuestions.length} {marksModalTab === 'all' ? 'total' : `${marksModalTab}-mark`} questions
            </span>
            <button
              type="button"
              onClick={() => setShowMarksModal(false)}
              className="px-4 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
            >
              Close
            </button>
          </div>
        </div>
      </Modal>

      {/* Edit Question Modal */}
      <Modal
        isOpen={!!editingQuestion}
        onClose={() => setEditingQuestion(null)}
        title={`Edit Question Q${editingQuestion?.question_number}`}
      >
        <form onSubmit={handleSaveEdit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
              Question Text
            </label>
            <textarea
              rows={4}
              required
              value={editForm.question_text}
              onChange={(e) => setEditForm({ ...editForm, question_text: e.target.value })}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
            />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Marks</label>
              <input
                type="number"
                min="1"
                max="50"
                value={editForm.marks}
                onChange={(e) => setEditForm({ ...editForm, marks: parseInt(e.target.value) || 1 })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Bloom's Level</label>
              <select
                value={editForm.bloom_level}
                onChange={(e) => setEditForm({ ...editForm, bloom_level: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium"
              >
                <option value="Remember">Remember</option>
                <option value="Understand">Understand</option>
                <option value="Apply">Apply</option>
                <option value="Analyze">Analyze</option>
                <option value="Evaluate">Evaluate</option>
                <option value="Create">Create</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Difficulty</label>
              <select
                value={editForm.difficulty}
                onChange={(e) => setEditForm({ ...editForm, difficulty: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium"
              >
                <option value="Easy">Easy</option>
                <option value="Medium">Medium</option>
                <option value="Hard">Hard</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setEditingQuestion(null)}
              className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSavingEdit}
              className="px-5 py-2 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition"
            >
              {isSavingEdit ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Customize Institute Template Modal */}
      <Modal
        isOpen={showTemplateModal}
        onClose={() => setShowTemplateModal(false)}
        title="Customize Institute Paper Template"
      >
        <form onSubmit={handleSaveCustomTemplate} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
              Template Name
            </label>
            <input
              type="text"
              required
              value={templateForm.name}
              onChange={(e) => setTemplateForm({ ...templateForm, name: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
              Institute Header Title
            </label>
            <input
              type="text"
              required
              value={templateForm.header_title}
              onChange={(e) => setTemplateForm({ ...templateForm, header_title: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
              Examination Subtitle / Division
            </label>
            <input
              type="text"
              value={templateForm.header_subtitle}
              onChange={(e) => setTemplateForm({ ...templateForm, header_subtitle: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
            />
          </div>

          <div className="flex items-center gap-6 py-1">
            <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={templateForm.show_usn_box}
                onChange={(e) => setTemplateForm({ ...templateForm, show_usn_box: e.target.checked })}
                className="w-4 h-4 text-indigo-600 rounded"
              />
              <span>Display USN / Roll No. Grid Box</span>
            </label>

            <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={templateForm.show_obe_columns}
                onChange={(e) => setTemplateForm({ ...templateForm, show_obe_columns: e.target.checked })}
                className="w-4 h-4 text-indigo-600 rounded"
              />
              <span>Display OBE (CO & Bloom's) Columns</span>
            </label>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
              Template Instructions
            </label>
            <textarea
              rows={3}
              value={templateForm.instructions}
              onChange={(e) => setTemplateForm({ ...templateForm, instructions: e.target.value })}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
              Sign-Off Authorities (comma-separated)
            </label>
            <input
              type="text"
              value={templateForm.sign_off_blocks}
              onChange={(e) => setTemplateForm({ ...templateForm, sign_off_blocks: e.target.value })}
              placeholder="e.g. Course Coordinator, Module Lead, Head of Department"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setShowTemplateModal(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition"
            >
              Save & Apply Template
            </button>
          </div>
        </form>
      </Modal>

      {/* Validation Report Modal */}
      <Modal
        isOpen={showValidationReportModal}
        onClose={() => setShowValidationReportModal(false)}
        title="Automated Academic Validation Report"
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-200">
            <div className="flex items-center gap-3">
              <ValidationBadge status={paper.status} size="lg" />
              <div>
                <p className="text-xs font-bold text-slate-800">
                  Overall Status: {paper.status.toUpperCase()}
                </p>
                <p className="text-[11px] text-slate-500">
                  {passedLogs.length} Passed • {warningLogs.length} Warnings • {failedLogs.length} Failures
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
            {paper.validation_logs.map((log) => (
              <div
                key={log.id}
                className="p-3.5 rounded-xl border border-slate-200 bg-white flex items-start justify-between gap-3 text-xs"
              >
                <div>
                  <p className="font-bold text-slate-800">{log.rule_name}</p>
                  <p className="text-slate-600 mt-0.5">{log.message}</p>
                </div>
                <ValidationBadge status={log.status} size="sm" />
              </div>
            ))}
          </div>

          <div className="flex justify-end pt-3">
            <button
              type="button"
              onClick={() => setShowValidationReportModal(false)}
              className="px-4 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
            >
              Close
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
