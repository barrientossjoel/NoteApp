import { ErrorBoundary } from './client/components/error-boundary';
import { ThemeProvider } from './client/components/theme-provider';
import { AuthProvider } from './client/context/AuthContext';
import { LanguageProvider } from './client/context/LanguageContext';
import { MainRouter } from './client/routes/main-router';

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