import React from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[ErrorBoundary caught error]:', error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[50vh] flex items-center justify-center p-6 bg-[#F8F9FA]">
          <div className="bg-white rounded-card max-w-md w-full p-8 border border-[#DADCE0] shadow-card text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-[#FCE8E6] text-[#D93025] flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-medium font-heading text-[#202124]">
              Something went wrong
            </h2>
            <p className="text-sm text-[#5F6368] leading-relaxed">
              An unexpected issue occurred while rendering this civic view. Your reports and account data are intact.
            </p>
            {this.state.error?.message && (
              <p className="text-xs font-mono-numbers text-[#5F6368] bg-[#F1F3F4] p-2.5 rounded-lg border border-[#DADCE0] text-left overflow-x-auto max-h-24">
                {this.state.error.message}
              </p>
            )}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={this.handleReload}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-control text-sm font-medium text-white bg-[#188038] hover:bg-[#137333] transition-colors focus:ring-2 focus:ring-[#188038] focus:ring-offset-2"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Reload</span>
              </button>
              <a
                href="/"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-control text-sm font-medium text-[#202124] bg-white border border-[#DADCE0] hover:bg-[#F8F9FA] transition-colors"
              >
                <Home className="w-4 h-4 text-[#5F6368]" />
                <span>Go to Home</span>
              </a>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
