import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/hooks/use-auth';
import { ThemeProvider, useTheme } from '@/hooks/use-theme';
import { Layout } from '@/components/Layout';
import { Dashboard } from '@/pages/Dashboard';
import { AQIExplorer } from '@/pages/AQIExplorer';
import { HCHOAnalysis } from '@/pages/HCHOAnalysis';
import { SourceAttribution } from '@/pages/SourceAttribution';
import { Alerts } from '@/pages/Alerts';
import { Reports } from '@/pages/Reports';
import { Pipeline } from '@/pages/Pipeline';
import { Settings } from '@/pages/Settings';
import { Login } from '@/pages/Login';
import { Loader2 } from 'lucide-react';
import { ErrorBoundary } from '@/components/ErrorBoundary';

function ProtectedRoutes() {
  const { user, loading } = useAuth();
  const { theme, toggleTheme } = useTheme();

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center bg-background">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <Loader2 className="h-7 w-7 animate-spin text-primary" />
          <span className="text-sm">Establishing satellite uplink…</span>
        </div>
      </div>
    );
  }

  if (!user) return <Login />;

  return (
    <Routes>
      <Route element={<Layout dark={theme === 'dark'} onToggleDark={toggleTheme} />}>
        <Route index element={<Dashboard />} />
        <Route path="/aqi-explorer" element={<AQIExplorer />} />
        <Route path="/hcho-analysis" element={<HCHOAnalysis />} />
        <Route path="/source-attribution" element={<SourceAttribution />} />
        <Route path="/alerts" element={<Alerts />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/pipeline" element={<Pipeline />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AuthProvider>
          <BrowserRouter>
            <ProtectedRoutes />
          </BrowserRouter>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
