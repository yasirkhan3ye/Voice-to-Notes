import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

class ErrorBoundary extends React.Component<any, any> {
  constructor(props: any) {
    super(props);
    (this as any).state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  render() {
    const self = this as any;
    if (self.state.hasError) {
      return (
        <div className="min-h-screen bg-[#050505] flex items-center justify-center p-6">
          <div className="max-w-md w-full glass p-8 rounded-[32px] border-white/10 flex flex-col items-center text-center">
            <div className="size-16 rounded-2xl bg-red-500/20 flex items-center justify-center mb-6">
              <AlertTriangle className="size-8 text-red-500" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Something went wrong</h1>
            <p className="text-slate-400 mb-8">
              An unexpected error occurred. We've been notified and are looking into it.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-full font-bold hover:bg-primary/90 transition-all active:scale-95"
            >
              <RefreshCw className="size-5" />
              Reload Application
            </button>
            {self.state.error && (
              <div className="mt-8 p-4 bg-black/40 rounded-xl border border-white/5 w-full text-left overflow-auto max-h-40">
                <p className="text-xs font-mono text-red-400 break-words">
                  {self.state.error.toString()}
                </p>
              </div>
            )}
          </div>
        </div>
      );
    }

    return self.props.children;
  }
}

export default ErrorBoundary;
