import { Component } from 'react';
import type { ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface State { hasError: boolean; error: Error | null; }

export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error) {
    console.error('AeroSense render error:', error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="grid min-h-screen place-items-center bg-[#0a1020] p-6 text-white">
          <div className="max-w-md text-center">
            <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-red-500/15">
              <AlertTriangle className="h-7 w-7 text-red-400" />
            </div>
            <h2 className="text-lg font-bold">Something went wrong</h2>
            <p className="mt-1.5 text-sm text-white/60">
              The app hit a render error. Reloading usually fixes it.
            </p>
            <pre className="mt-4 max-h-32 overflow-auto rounded-xl border border-white/10 bg-white/5 p-3 text-left text-[11px] text-white/70">
              {this.state.error?.message ?? 'Unknown error'}
            </pre>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#123A8F] px-4 py-2.5 text-sm font-semibold hover:bg-[#0d2b6b]"
            >
              <RefreshCw className="h-4 w-4" /> Reload
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
