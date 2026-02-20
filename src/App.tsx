import { Suspense } from 'react';
import NotesApp from './client/features/notes/components/notes-app';
import { ErrorBoundary } from './client/components/error-boundary';

function App() {
  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-background">
        <Suspense fallback={<div className="flex items-center justify-center h-screen">Loading...</div>}>
          <NotesApp />
        </Suspense>
      </div>
    </ErrorBoundary>
  );
}

export default App;