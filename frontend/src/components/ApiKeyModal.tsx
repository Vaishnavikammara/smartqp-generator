import React, { useState, useEffect } from 'react';
import { Modal } from './Modal';
import { apiClient } from '../api/client';
import { Key, Sparkles, CheckCircle, AlertCircle, Loader2, ExternalLink } from 'lucide-react';

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const ApiKeyModal: React.FC<ApiKeyModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState('gemini-2.5-flash');
  const [isLoading, setIsLoading] = useState(false);
  const [statusResult, setStatusResult] = useState<{
    status?: string;
    message?: string;
    configured?: boolean;
    model?: string;
  } | null>(null);

  useEffect(() => {
    if (isOpen) {
      apiClient.getApiKeyStatus().then((res) => {
        setStatusResult(res.data);
        if (res.data.model) setModel(res.data.model);
      }).catch(() => {});
    }
  }, [isOpen]);

  const handleSaveAndTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKey.trim()) return;

    setIsLoading(true);
    setStatusResult(null);

    try {
      const res = await apiClient.updateApiKey({
        gemini_api_key: apiKey.trim(),
        gemini_model: model,
      });
      setStatusResult(res.data);
      if (res.data.status === 'success') {
        if (onSuccess) onSuccess();
      }
    } catch (err: any) {
      setStatusResult({
        status: 'error',
        message: err.response?.data?.detail || 'Failed to connect to Gemini API',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Google Gemini API Settings">
      <div className="space-y-5">
        <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 text-sm text-indigo-900 flex items-start gap-3">
          <Sparkles className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-indigo-950">Gemini Flash Integration</p>
            <p className="text-indigo-800 text-xs mt-1">
              SmartQP uses Google Gemini Flash models for syllabus-grounded question synthesis. You can generate an API key from Google AI Studio.
            </p>
            <a
              href="https://aistudio.google.com/app/apikey"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-xs text-indigo-600 font-semibold hover:underline mt-2"
            >
              Get Free Gemini API Key <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>

        <form onSubmit={handleSaveAndTest} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">
              Select Gemini Flash Model
            </label>
            <select
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
            >
              <option value="gemini-2.5-flash">Gemini 2.5 Flash (Recommended - Fast & Accurate)</option>
              <option value="gemini-2.0-flash">Gemini 2.0 Flash</option>
              <option value="gemini-1.5-flash">Gemini 1.5 Flash</option>
              <option value="gemini-3.8-flash">Gemini 3.8 Flash</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">
              Gemini API Key
            </label>
            <div className="relative">
              <Key className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="password"
                placeholder="AIzaSy..."
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                required
              />
            </div>
            <p className="text-xs text-slate-500 mt-1">
              The key is stored securely in environment session and never exposed to other faculty members.
            </p>
          </div>

          {statusResult && (
            <div
              className={`p-3.5 rounded-xl border text-xs flex items-start gap-2.5 ${
                statusResult.status === 'success'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : statusResult.status === 'warning'
                  ? 'bg-amber-50 border-amber-200 text-amber-800'
                  : 'bg-rose-50 border-rose-200 text-rose-800'
              }`}
            >
              {statusResult.status === 'success' ? (
                <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              )}
              <div>
                <p className="font-semibold">{statusResult.message}</p>
              </div>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || !apiKey.trim()}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-xl shadow-sm transition"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Testing Connection...
                </>
              ) : (
                'Test & Save Key'
              )}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
};
