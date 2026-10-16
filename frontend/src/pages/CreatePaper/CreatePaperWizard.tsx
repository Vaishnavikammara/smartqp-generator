import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { apiClient } from '../../api/client';
import { MarksCategoryConfig, SubjectCoursePlan } from '../../types';
import { Step1Institute } from './Step1Institute';
import { Step2Modules, LocalModule } from './Step2Modules';
import { Step3Sets } from './Step3Sets';
import { Step4Distribution } from './Step4Distribution';
import { Step5Generating } from './Step5Generating';
import { Check, ChevronRight } from 'lucide-react';

export const CreatePaperWizard: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [currentStep, setCurrentStep] = useState(1);
  const [savedSubjects, setSavedSubjects] = useState<SubjectCoursePlan[]>([]);
  const [activeSubjectId, setActiveSubjectId] = useState<number | null>(null);

  // Form State
  const [instituteData, setInstituteData] = useState({
    instituteName: 'Presidency University',
    departmentName: 'Department of Computer Science & Engineering',
    courseName: 'B.Tech Computer Science & Engineering',
    subjectName: 'Database Management Systems',
    subjectCode: 'CSE3012',
    semester: '5th Semester',
    academicYear: '2026–2027',
    examinationName: 'End Semester Examination 2026',
    coDefinitions: 'CO1: Understand relational schema concepts and integrity constraints.\nCO2: Apply SQL queries and relational algebra operations.\nCO3: Evaluate normalization normal forms up to BCNF.\nCO4: Analyze transaction concurrency control and 2PL protocol.\nCO5: Design indexing structures and query optimization strategies.',
  });

  const [modules, setModules] = useState<LocalModule[]>([
    {
      module_number: 1,
      module_name: 'Module 1 – Introduction to DBMS & Relational Model',
      extracted_text: 'Database system concepts and architecture; Data models, schemas, and instances; Three-schema architecture and data independence; Entity-Relationship (ER) model: entities, attributes, relationships, cardinality ratios, and ER-to-relational mapping; Relational Model constraints: domain constraints, key constraints, entity integrity, and referential integrity.',
      is_included: true,
    },
    {
      module_number: 2,
      module_name: 'Module 2 – SQL & Relational Algebra',
      extracted_text: 'Relational algebra operations: select, project, join, set operations, division; SQL: DDL, DML, DCL commands, complex queries, nested subqueries, views, triggers, and assertion constraints; Aggregate functions, group by and having clauses.',
      is_included: true,
    },
    {
      module_number: 3,
      module_name: 'Module 3 – Normalization & Schema Refinement',
      extracted_text: 'Functional dependencies and inference rules (Armstrong axioms); Normal forms based on primary keys: 1NF, 2NF, 3NF; Boyce-Codd Normal Form (BCNF); Multivalued dependencies and 4NF; Lossless-join decomposition and dependency preservation properties.',
      is_included: true,
    },
    {
      module_number: 4,
      module_name: 'Module 4 – Transaction Management & Concurrency Control',
      extracted_text: 'Transaction concepts, ACID properties, transaction state diagram; Serializability: conflict serializability and view serializability; Concurrency control protocols: two-phase locking (2PL) protocol, strict 2PL, timestamp ordering protocol; Deadlock detection, prevention, and recovery mechanisms.',
      is_included: true,
    },
    {
      module_number: 5,
      module_name: 'Module 5 – Storage, Indexing & Query Processing',
      extracted_text: 'File organization, ordered indices, primary and secondary indices; B-Tree and B+ Tree index structures; Hashing techniques: static and dynamic hashing; Query evaluation steps, cost estimation, and basic query optimization heuristics.',
      is_included: true,
    },
  ]);

  const [numSets, setNumSets] = useState(2);
  const [totalMarks, setTotalMarks] = useState(100);
  const [durationMinutes, setDurationMinutes] = useState(180);
  const [instructions, setInstructions] = useState(
    '1. Answer all questions.\n2. Figures to the right indicate full marks.\n3. Assume suitable data if necessary and state them clearly.'
  );
  const [similarityThreshold, setSimilarityThreshold] = useState(0.85);

  const [categories, setCategories] = useState<MarksCategoryConfig[]>([
    {
      category_id: 'cat_2m',
      name: 'Part A (Short Answer)',
      question_type: 'short answer',
      marks_per_question: 2,
      num_questions: 10,
      module_distribution: { '1': 2, '2': 2, '3': 2, '4': 2, '5': 2 },
      difficulty: 'Easy',
      bloom_level: 'Remember',
    },
    {
      category_id: 'cat_5m',
      name: 'Part B (Conceptual / Analytical)',
      question_type: 'descriptive',
      marks_per_question: 5,
      num_questions: 10,
      module_distribution: { '1': 2, '2': 2, '3': 2, '4': 2, '5': 2 },
      difficulty: 'Medium',
      bloom_level: 'Understand',
    },
    {
      category_id: 'cat_10m',
      name: 'Part C (Application & Design)',
      question_type: 'application-based',
      marks_per_question: 10,
      num_questions: 3,
      module_distribution: { '1': 0, '2': 1, '3': 1, '4': 1, '5': 0 },
      difficulty: 'Hard',
      bloom_level: 'Apply',
    },
  ]);

  const [generationError, setGenerationError] = useState<string | null>(null);

  useEffect(() => {
    apiClient.listSubjects().then((res) => setSavedSubjects(res.data)).catch(() => {});
  }, []);

  const handleSelectExistingSubject = (s: SubjectCoursePlan) => {
    setActiveSubjectId(s.id);
    setInstituteData({
      instituteName: s.institute_name,
      departmentName: s.department_name,
      courseName: s.course_name,
      subjectName: s.subject_name,
      subjectCode: s.subject_code || '',
      semester: s.semester || '',
      academicYear: s.academic_year || '',
      examinationName: s.examination_name || '',
      coDefinitions: s.co_definitions || '',
    });
    if (s.modules && s.modules.length > 0) {
      setModules(
        s.modules.map((m) => ({
          id: m.id,
          module_number: m.module_number,
          module_name: m.module_name,
          original_filename: m.original_filename,
          extracted_text: m.extracted_text,
          is_included: m.is_included,
        }))
      );
    }
  };

  const handleInstituteChange = (field: string, val: string) => {
    setInstituteData((prev) => ({ ...prev, [field]: val }));
  };

  const handleExecuteGeneration = async () => {
    setCurrentStep(5);
    setGenerationError(null);

    try {
      // 1. Ensure subject is created in DB
      let subjectId = activeSubjectId;
      if (!subjectId) {
        const subjRes = await apiClient.createSubject({
          institute_name: instituteData.instituteName,
          department_name: instituteData.departmentName,
          course_name: instituteData.courseName,
          subject_name: instituteData.subjectName,
          subject_code: instituteData.subjectCode,
          semester: instituteData.semester,
          academic_year: instituteData.academicYear,
          examination_name: instituteData.examinationName,
          co_definitions: instituteData.coDefinitions,
        });
        subjectId = subjRes.data.id;
        setActiveSubjectId(subjectId);
      }

      // 2. Ensure all modules are uploaded / created in DB
      const included = modules.filter((m) => m.is_included);
      for (const m of included) {
        if (!m.id) {
          if (m.file) {
            const formData = new FormData();
            formData.append('module_number', String(m.module_number));
            formData.append('module_name', m.module_name);
            formData.append('file', m.file);
            const res = await apiClient.uploadModuleFile(subjectId, formData);
            m.id = res.data.id;
          } else {
            const formData = new FormData();
            formData.append('module_number', String(m.module_number));
            formData.append('module_name', m.module_name);
            formData.append('content_text', m.extracted_text);
            const res = await apiClient.createModuleManual(subjectId, formData);
            m.id = res.data.id;
          }
        }
      }

      // 3. Trigger Generation
      const genRes = await apiClient.generatePaper({
        subject_id: subjectId,
        examination_name: instituteData.examinationName,
        duration_minutes: durationMinutes,
        num_sets: numSets,
        target_total_marks: totalMarks,
        categories: categories,
        instructions: instructions,
        similarity_threshold: similarityThreshold,
      });

      // 4. Redirect to Review Page
      navigate(`/papers/${genRes.data.id}`);
    } catch (err: any) {
      console.error('Generation error', err);
      setGenerationError(
        err.response?.data?.detail || err.message || 'Generation failed. Please try again.'
      );
    }
  };

  const stepLabels = [
    'Institute & Subject',
    'Course Modules',
    'Sets & Marks',
    'Custom Distribution',
    'AI Generation',
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-fade-in pb-12">
      {/* Wizard Header */}
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">
          Create New Question Paper
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Step-by-step intelligent paper generator with syllabus grounding and multi-set non-repetition
        </p>
      </div>

      {/* Progress Steps Header */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center justify-between">
          {stepLabels.map((label, idx) => {
            const stepNum = idx + 1;
            const isCompleted = stepNum < currentStep;
            const isCurrent = stepNum === currentStep;

            return (
              <React.Fragment key={idx}>
                <div className="flex items-center gap-2">
                  <div
                    className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs font-black transition ${
                      isCompleted
                        ? 'bg-emerald-600 text-white'
                        : isCurrent
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-400'
                    }`}
                  >
                    {isCompleted ? <Check className="w-4 h-4" /> : stepNum}
                  </div>
                  <span
                    className={`hidden sm:inline-block text-xs font-bold ${
                      isCurrent ? 'text-indigo-900' : isCompleted ? 'text-slate-800' : 'text-slate-400'
                    }`}
                  >
                    {label}
                  </span>
                </div>
                {idx < stepLabels.length - 1 && (
                  <div className="flex-1 mx-2 sm:mx-4 h-0.5 bg-slate-100 hidden sm:block" />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Step Content Card */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-xs">
        {currentStep === 1 && (
          <Step1Institute
            formData={instituteData}
            onChange={handleInstituteChange}
            onNext={() => setCurrentStep(2)}
            savedSubjects={savedSubjects}
            onSelectExistingSubject={handleSelectExistingSubject}
          />
        )}

        {currentStep === 2 && (
          <Step2Modules
            modules={modules}
            setModules={setModules}
            subjectId={activeSubjectId}
            onNext={() => setCurrentStep(3)}
            onBack={() => setCurrentStep(1)}
          />
        )}

        {currentStep === 3 && (
          <Step3Sets
            numSets={numSets}
            setNumSets={setNumSets}
            totalMarks={totalMarks}
            setTotalMarks={setTotalMarks}
            durationMinutes={durationMinutes}
            setDurationMinutes={setDurationMinutes}
            instructions={instructions}
            setInstructions={setInstructions}
            similarityThreshold={similarityThreshold}
            setSimilarityThreshold={setSimilarityThreshold}
            onNext={() => setCurrentStep(4)}
            onBack={() => setCurrentStep(2)}
          />
        )}

        {currentStep === 4 && (
          <Step4Distribution
            categories={categories}
            setCategories={setCategories}
            modules={modules}
            targetTotalMarks={totalMarks}
            onGenerate={handleExecuteGeneration}
            onBack={() => setCurrentStep(3)}
          />
        )}

        {currentStep === 5 && (
          <Step5Generating
            numSets={numSets}
            totalMarks={totalMarks}
            subjectName={instituteData.subjectName}
            error={generationError}
            onRetry={() => setCurrentStep(4)}
          />
        )}
      </div>
    </div>
  );
};
