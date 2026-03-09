import { Suspense, useEffect, useState } from 'react';
import NotesApp from './client/features/notes/components/notes-app';
import { ErrorBoundary } from './client/components/error-boundary';
import { ThemeProvider } from './client/components/theme-provider';
import { AuthProvider, useAuth } from './client/context/AuthContext';
import { LanguageProvider } from './client/context/LanguageContext';
import Login from './client/pages/Login';
import Register from './client/pages/Register';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <div className="flex bg-neutral-900 justify-center items-center h-screen w-full text-white">Loading...</div>;
  }

  if (!user) {
    window.location.href = '/login';
    return null;
  }

  return <>{children}</>;
}

function MainRouter() {
  const [path, setPath] = useState(window.location.pathname);

  useEffect(() => {
    const handlePopState = () => setPath(window.location.pathname);
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  if (path === '/login') return <Login />;
  if (path === '/register') return <Register />;

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background">
        <Suspense fallback={<div className="flex items-center justify-center h-screen">Loading...</div>}>
          <NotesApp />
        </Suspense>
      </div>
    </ProtectedRoute>
  );
}

function App() {
  return (
    <ThemeProvider defaultTheme="system" storageKey="note-app-theme">
      <LanguageProvider>
        <ErrorBoundary>
          <AuthProvider>
            <MainRouter />
          </AuthProvider>
        </ErrorBoundary>
      </LanguageProvider>
    </ThemeProvider>
  );
}

export default App;