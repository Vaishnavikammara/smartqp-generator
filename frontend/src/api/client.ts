import axios from 'axios';
import {
  User, SubjectCoursePlan, Module, QuestionPaper,
  QuestionPaperListItem, Question, ValidationReport
} from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
});

// Interceptor to attach JWT token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('smartqp_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Interceptor to handle unauthorized
api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401 && !window.location.pathname.includes('/login')) {
      localStorage.removeItem('smartqp_token');
      localStorage.removeItem('smartqp_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const apiClient = {
  // Auth
  register: (data: any) => api.post<{ access_token: string; user: User }>('/auth/register', data),
  login: (data: any) => api.post<{ access_token: string; user: User }>('/auth/login', data),
  forgotPassword: (data: any) => api.post<{ message: string }>('/auth/forgot-password', data),
  getMe: () => api.get<User>('/auth/me'),
  updateApiKey: (data: { gemini_api_key: string; gemini_model?: string }) => api.post('/auth/api-key', data),
  getApiKeyStatus: () => api.get('/auth/api-key/status'),

  // Subjects & Modules
  createSubject: (data: any) => api.post<SubjectCoursePlan>('/subjects', data),
  listSubjects: () => api.get<SubjectCoursePlan[]>('/subjects'),
  getSubject: (id: number) => api.get<SubjectCoursePlan>(`/subjects/${id}`),
  deleteSubject: (id: number) => api.delete(`/subjects/${id}`),
  
  uploadModuleFile: (subjectId: number, formData: FormData) =>
    api.post<Module>(`/subjects/${subjectId}/modules/upload`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  createModuleManual: (subjectId: number, formData: FormData) =>
    api.post<Module>(`/subjects/${subjectId}/modules/manual`, formData),
  updateModule: (moduleId: number, data: { module_name?: string; extracted_text?: string; is_included?: boolean }) =>
    api.put<Module>(`/subjects/modules/${moduleId}`, data),
  deleteModule: (moduleId: number) => api.delete(`/subjects/modules/${moduleId}`),

  // Papers & Generation
  generatePaper: (data: any) => api.post<QuestionPaper>('/papers/generate', data),
  listPapers: (status?: string) => api.get<QuestionPaperListItem[]>('/papers', { params: { status } }),
  getPaper: (id: number) => api.get<QuestionPaper>(`/papers/${id}`),
  updatePaperStatus: (id: number, status: 'draft' | 'validated' | 'approved') =>
    api.patch(`/papers/${id}/status`, null, { params: { status } }),
  deletePaper: (id: number) => api.delete(`/papers/${id}`),

  // Questions
  editQuestion: (id: number, data: any) => api.put<Question>(`/papers/questions/${id}`, data),
  deleteQuestion: (id: number) => api.delete(`/papers/questions/${id}`),
  regenerateQuestion: (id: number) => api.post<Question>(`/papers/questions/${id}/regenerate`),
  revalidatePaper: (paperId: number) => api.post<ValidationReport>(`/papers/${paperId}/revalidate`),

  // Exports
  getExportUrl: (paperId: number, setId: number, format: 'pdf' | 'docx', includeTags: boolean = false, templateId: string = 'autonomous_obe') =>
    `${API_BASE_URL}/export/${paperId}/set/${setId}/${format}?include_tags=${includeTags}&template_id=${templateId}`,
  getBundleUrl: (paperId: number, format: 'pdf' | 'docx', includeTags: boolean = false, templateId: string = 'autonomous_obe') =>
    `${API_BASE_URL}/export/${paperId}/bundle?format=${format}&include_tags=${includeTags}&template_id=${templateId}`,

  // Institute Templates
  listTemplates: () => api.get<any[]>('/templates'),
  uploadTemplate: (formData: FormData) =>
    api.post<{ message: string; template: any }>('/templates/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  createCustomTemplate: (data: any) => api.post<{ message: string; template: any }>('/templates/custom', data),
  getTemplate: (id: string) => api.get<any>(`/templates/${id}`),

  // Evaluation Benchmarks
  getEvaluationDataset: () => api.get('/evaluation/dataset'),
  runSimilarityBenchmark: (threshold: number) => api.get('/evaluation/run-similarity-benchmark', { params: { threshold } }),
};

export default api;
