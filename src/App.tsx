import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { MainLayout } from './components/Layout/MainLayout';
import { LoginPage } from './components/Auth/LoginPage';
import { SharedPlaybookViewer } from './components/Shared/SharedPlaybookViewer';
import { useAuthStore } from './store/authStore';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading, isConfigured } = useAuthStore();

  // If Supabase is not configured, allow access without auth
  if (!isConfigured) return <>{children}</>;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-green-900">
        <div className="text-white text-lg">Loading...</div>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  return <>{children}</>;
}

function App() {
  const initialize = useAuthStore((state) => state.initialize);
  const isConfigured = useAuthStore((state) => state.isConfigured);

  useEffect(() => {
    initialize();
  }, [initialize]);

  return (
    <BrowserRouter>
      <Routes>
        {isConfigured && (
          <Route path="/login" element={<LoginPage />} />
        )}
        <Route path="/shared/:token" element={<SharedPlaybookViewer />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <MainLayout />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
