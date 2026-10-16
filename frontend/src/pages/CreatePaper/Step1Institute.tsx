import React from 'react';
import { Building2, BookOpen, GraduationCap, Calendar, FileText } from 'lucide-react';

interface Step1Props {
  formData: {
    instituteName: string;
    departmentName: string;
    courseName: string;
    subjectName: string;
    subjectCode: string;
    semester: string;
    academicYear: string;
    examinationName: string;
    coDefinitions: string;
  };
  onChange: (field: string, value: string) => void;
  onNext: () => void;
  savedSubjects: any[];
  onSelectExistingSubject: (subject: any) => void;
}

export const Step1Institute: React.FC<Step1Props> = ({
  formData,
  onChange,
  onNext,
  savedSubjects,
  onSelectExistingSubject,
}) => {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.instituteName || !formData.courseName || !formData.subjectName) {
      alert('Please fill in Institute Name, Course/Program Name, and Subject Name.');
      return;
    }
    onNext();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {savedSubjects.length > 0 && (
        <div className="bg-indigo-50/70 border border-indigo-100 rounded-2xl p-4 mb-4">
          <p className="text-xs font-bold text-indigo-900 mb-2">
            Quick Fill from Saved Course Plans:
          </p>
          <div className="flex flex-wrap gap-2">
            {savedSubjects.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => onSelectExistingSubject(s)}
                className="px-3 py-1.5 bg-white border border-indigo-200 text-indigo-700 hover:bg-indigo-100/60 rounded-xl text-xs font-semibold shadow-2xs transition"
              >
                {s.subject_name} ({s.course_name})
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
            Institute Name <span className="text-rose-500">*</span>
          </label>
          <div className="relative">
            <Building2 className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              required
              placeholder="e.g. Presidency University / IIT Delhi"
              value={formData.instituteName}
              onChange={(e) => onChange('instituteName', e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
            Department Name <span className="text-rose-500">*</span>
          </label>
          <div className="relative">
            <GraduationCap className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              required
              placeholder="e.g. Department of Computer Science & Engineering"
              value={formData.departmentName}
              onChange={(e) => onChange('departmentName', e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
            Course / Program Name <span className="text-rose-500">*</span>
          </label>
          <div className="relative">
            <BookOpen className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              required
              placeholder="e.g. B.Tech Computer Science & Engineering"
              value={formData.courseName}
              onChange={(e) => onChange('courseName', e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
            Subject Name <span className="text-rose-500">*</span>
          </label>
          <div className="relative">
            <FileText className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              required
              placeholder="e.g. Database Management Systems"
              value={formData.subjectName}
              onChange={(e) => onChange('subjectName', e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
            Subject Code <span className="text-slate-400 text-[10px] font-normal">(Optional)</span>
          </label>
          <input
            type="text"
            placeholder="e.g. CSE3012 / CS401"
            value={formData.subjectCode}
            onChange={(e) => onChange('subjectCode', e.target.value)}
            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
          />
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
            Examination Name <span className="text-slate-400 text-[10px] font-normal">(Optional)</span>
          </label>
          <input
            type="text"
            placeholder="e.g. End Semester Examination / Mid Term 2026"
            value={formData.examinationName}
            onChange={(e) => onChange('examinationName', e.target.value)}
            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
          />
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
            Semester <span className="text-slate-400 text-[10px] font-normal">(Optional)</span>
          </label>
          <input
            type="text"
            placeholder="e.g. 5th Semester / Autumn 2026"
            value={formData.semester}
            onChange={(e) => onChange('semester', e.target.value)}
            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
          />
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
            Academic Year <span className="text-slate-400 text-[10px] font-normal">(Optional)</span>
          </label>
          <div className="relative">
            <Calendar className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="e.g. 2026–2027"
              value={formData.academicYear}
              onChange={(e) => onChange('academicYear', e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
            />
          </div>
        </div>
      </div>

      <div>
        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
          Official Course Outcomes (COs) <span className="text-slate-400 text-[10px] font-normal">(Optional Syllabus Definitions)</span>
        </label>
        <textarea
          rows={3}
          placeholder="CO1: Understand relational schema concepts and integrity constraints.&#10;CO2: Apply SQL queries and relational algebra operations.&#10;CO3: Evaluate normalization normal forms up to BCNF."
          value={formData.coDefinitions}
          onChange={(e) => onChange('coDefinitions', e.target.value)}
          className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
        />
        <p className="text-[11px] text-slate-500 mt-1">
          If your institute has official Course Outcome mappings, enter them above. SmartQP will align generated questions to these exact CO definitions.
        </p>
      </div>

      <div className="flex justify-end pt-4 border-t border-slate-100">
        <button
          type="submit"
          className="px-6 py-2.5 rounded-xl font-bold text-sm text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm transition"
        >
          Next: Upload Modules →
        </button>
      </div>
    </form>
  );
};
