import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { Login } from './pages/Login';
import { Signup } from './pages/Signup';
import { ForgotPassword } from './pages/ForgotPassword';
import { Dashboard } from './pages/Dashboard';
import { CreatePaperWizard } from './pages/CreatePaper/CreatePaperWizard';
import { PaperReview } from './pages/PaperReview';
import { PaperCompare } from './pages/PaperCompare';
import { SavedPapers } from './pages/SavedPapers';
import { CoursePlans } from './pages/CoursePlans';
import { Loader2 } from 'lucide-react';

const ProtectedLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mx-auto mb-2" />
          <p className="text-xs font-semibold text-slate-500">Loading SmartQP Portal...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <Navbar />
      <div className="flex flex-1">
        <Sidebar />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Authentication Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />

          {/* Protected Faculty Routes */}
          <Route
            path="/"
            element={
              <ProtectedLayout>
                <Dashboard />
              </ProtectedLayout>
            }
          />
          <Route
            path="/create-paper"
            element={
              <ProtectedLayout>
                <CreatePaperWizard />
              </ProtectedLayout>
            }
          />
          <Route
            path="/papers"
            element={
              <ProtectedLayout>
                <SavedPapers />
              </ProtectedLayout>
            }
          />
          <Route
            path="/papers/:id"
            element={
              <ProtectedLayout>
                <PaperReview />
              </ProtectedLayout>
            }
          />
          <Route
            path="/papers/:id/compare"
            element={
              <ProtectedLayout>
                <PaperCompare />
              </ProtectedLayout>
            }
          />
          <Route
            path="/course-plans"
            element={
              <ProtectedLayout>
                <CoursePlans />
              </ProtectedLayout>
            }
          />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;
