import React, { Suspense } from 'react';
import NotesApp from './components/notes-app';
import ErrorBoundary from './components/error-boundary';

function App() {
  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-white dark:bg-zinc-950">
        <Suspense fallback={<div className="flex items-center justify-center h-screen">Loading...</div>}>
          <NotesApp />
        </Suspense>
      </div>
    </ErrorBoundary>
  );
}

export default App; 