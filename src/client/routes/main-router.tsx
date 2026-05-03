import { Suspense, useEffect, useState } from 'react';
import NotesApp from '../features/notes/components/notes-app';
import { useAuth } from '../context/AuthContext';
import { ProtectedRoute } from '../components/auth/protected-route';
import Login from '../pages/Login';
import Register from '../pages/Register';
import Landing from '../pages/Landing';

export function MainRouter() {
  const [path, setPath] = useState(window.location.pathname);
  const { user, isLoading } = useAuth();

  useEffect(() => {
    const handlePopState = () => setPath(window.location.pathname);
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  if (isLoading) {
    return (
      <div className="flex bg-neutral-900 justify-center items-center h-screen w-full text-white">
        Loading...
      </div>
    );
  }

  // Handle core routes
  if (path === '/login') return <Login />;
  if (path === '/register') return <Register />;

  // Public landing page if not logged in
  if (!user && path === '/') {
    return <Landing />;
  }

  // All other routes are protected and lead to the main NotesApp
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
