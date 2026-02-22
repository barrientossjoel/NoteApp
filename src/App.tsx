import { Suspense } from 'react';
import NotesApp from './client/features/notes/components/notes-app';
import { ErrorBoundary } from './client/components/error-boundary';
import { ThemeProvider } from './client/components/theme-provider';

function App() {
  return (
    <ThemeProvider defaultTheme="system" storageKey="note-app-theme">
      <ErrorBoundary>
        <div className="min-h-screen bg-background">
          <Suspense fallback={<div className="flex items-center justify-center h-screen">Loading...</div>}>
            <NotesApp />
          </Suspense>
        </div>
      </ErrorBoundary>
    </ThemeProvider>
  );
}

export default App;