import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../api/client';
import { SubjectCoursePlan, Module } from '../types';
import { Modal } from '../components/Modal';
import {
  BookOpen,
  FilePlus,
  Trash2,
  Upload,
  Eye,
  Plus,
  Loader2,
  FileText,
  CheckCircle,
  Building2,
  Layers
} from 'lucide-react';

export const CoursePlans: React.FC = () => {
  const navigate = useNavigate();
  const [subjects, setSubjects] = useState<SubjectCoursePlan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedSubject, setSelectedSubject] = useState<SubjectCoursePlan | null>(null);
  const [activeModuleModal, setActiveModuleModal] = useState<Module | null>(null);

  const fetchSubjects = async () => {
    setIsLoading(true);
    try {
      const res = await apiClient.listSubjects();
      setSubjects(res.data);
    } catch (err) {
      console.error('Failed to load course plans', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSubjects();
  }, []);

  const handleDeleteSubject = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this course plan and its modules?')) {
      try {
        await apiClient.deleteSubject(id);
        setSubjects((prev) => prev.filter((s) => s.id !== id));
      } catch (err) {
        alert('Failed to delete course plan');
      }
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Saved Course Plans</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage your syllabi, uploaded module documents, and course outcomes
          </p>
        </div>
        <button
          onClick={() => navigate('/create-paper')}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm transition"
        >
          <FilePlus className="w-4 h-4" /> Add Course Plan & Generate
        </button>
      </div>

      {isLoading ? (
        <div className="py-20 text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-indigo-600 mb-2" />
          <p className="text-xs text-slate-500">Loading course plans...</p>
        </div>
      ) : subjects.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center">
          <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-slate-800">No Course Plans Saved Yet</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Upload your syllabus modules when creating a question paper, and they will be saved here for re-use.
          </p>
          <button
            onClick={() => navigate('/create-paper')}
            className="mt-4 px-4 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition"
          >
            Create First Question Paper
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {subjects.map((subj) => (
            <div
              key={subj.id}
              className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs flex flex-col justify-between space-y-4 hover:border-indigo-200 transition"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-1 rounded-lg text-[11px] font-extrabold bg-indigo-50 text-indigo-700 border border-indigo-100 uppercase tracking-wider">
                    {subj.subject_code || 'COURSE'}
                  </span>
                  <button
                    onClick={() => handleDeleteSubject(subj.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                    title="Delete course plan"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <h3 className="font-bold text-slate-900 text-base mt-2">{subj.subject_name}</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {subj.course_name} • {subj.department_name}
                </p>

                <div className="mt-4 pt-3 border-t border-slate-100 space-y-2">
                  <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block">
                    Uploaded Modules ({subj.modules?.length || 0}):
                  </span>
                  <div className="space-y-1.5 max-h-40 overflow-y-auto">
                    {subj.modules?.map((m) => (
                      <div
                        key={m.id}
                        className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-100 text-xs"
                      >
                        <span className="font-semibold text-slate-800 truncate mr-2">
                          {m.module_name}
                        </span>
                        <button
                          type="button"
                          onClick={() => setActiveModuleModal(m)}
                          className="px-2 py-0.5 rounded text-[11px] font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 transition shrink-0"
                        >
                          View Syllabus
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs text-slate-400 font-medium">
                  {subj.academic_year || 'Academic Year'}
                </span>
                <button
                  type="button"
                  onClick={() => navigate('/create-paper', { state: { preselectedSubjectId: subj.id } })}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition"
                >
                  Generate Paper from this Plan →
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Module Content Modal */}
      <Modal
        isOpen={!!activeModuleModal}
        onClose={() => setActiveModuleModal(null)}
        title={activeModuleModal?.module_name || 'Module Content'}
      >
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Original Document: {activeModuleModal?.original_filename || 'Manual Input'}</span>
            <span>{activeModuleModal?.extracted_text.split(/\s+/).length || 0} words</span>
          </div>
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl max-h-96 overflow-y-auto text-xs font-mono leading-relaxed text-slate-800 whitespace-pre-wrap">
            {activeModuleModal?.extracted_text}
          </div>
          <div className="flex justify-end pt-2">
            <button
              onClick={() => setActiveModuleModal(null)}
              className="px-4 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl"
            >
              Close
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
