export interface User {
  id: number;
  email: string;
  full_name: string;
  institute_name: string;
  department?: string;
  created_at: string;
}

export interface Module {
  id: number;
  subject_id: number;
  module_number: number;
  module_name: string;
  original_filename?: string;
  file_path?: string;
  extracted_text: string;
  is_included: boolean;
  created_at: string;
}

export interface SubjectCoursePlan {
  id: number;
  institute_name: string;
  department_name: string;
  course_name: string;
  subject_name: string;
  subject_code?: string;
  semester?: string;
  academic_year?: string;
  examination_name?: string;
  co_definitions?: string;
  created_at: string;
  modules: Module[];
}

export interface MarksCategoryConfig {
  category_id: string;
  name: string;
  question_type: string;
  marks_per_question: number;
  num_questions: number;
  module_distribution: Record<string, number>;
  difficulty?: 'Easy' | 'Medium' | 'Hard' | 'Balanced';
  bloom_level?: string;
  co_level?: string;
}

export interface Question {
  id: number;
  set_id: number;
  question_number: number;
  question_type: string;
  marks: number;
  module_id?: number;
  module_name: string;
  question_text: string;
  co_level?: string;
  bloom_level?: string;
  difficulty?: string;
  syllabus_reference?: string;
  is_flagged: boolean;
  created_at: string;
}

export interface PaperSet {
  id: number;
  paper_id: number;
  set_label: string;
  total_marks: number;
  created_at: string;
  questions: Question[];
}

export interface ValidationLog {
  id: number;
  paper_id: number;
  rule_name: string;
  status: 'passed' | 'warning' | 'failed';
  message: string;
  details_json?: string;
  created_at: string;
}

export interface QuestionPaper {
  id: number;
  user_id: number;
  subject_id: number;
  title: string;
  examination_name?: string;
  total_marks: number;
  duration_minutes?: number;
  num_sets: number;
  instructions?: string;
  status: 'draft' | 'validated' | 'approved';
  created_at: string;
  updated_at: string;
  subject?: SubjectCoursePlan;
  sets: PaperSet[];
  validation_logs: ValidationLog[];
}

export interface QuestionPaperListItem {
  id: number;
  title: string;
  subject_name: string;
  course_name: string;
  institute_name: string;
  total_marks: number;
  num_sets: number;
  status: 'draft' | 'validated' | 'approved';
  created_at: string;
  sets_count: number;
}

export interface ValidationReport {
  paper_id: number;
  overall_status: 'passed' | 'warning' | 'failed';
  passed_count: number;
  warning_count: number;
  failed_count: number;
  logs: ValidationLog[];
}
