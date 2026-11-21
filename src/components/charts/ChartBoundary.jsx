import React from 'react';

/**
 * ChartBoundary
 * Catches rendering and data parsing errors within chart components
 * without breaking the surrounding layout.
 */
export class ChartBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[ChartBoundary Error Caught]:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
    if (typeof this.props.onRetry === 'function') {
      this.props.onRetry();
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          role="region"
          aria-label={this.props.title || 'Chart unavailable'}
          className={`bg-white border border-[#DADCE0] rounded-xl p-5 flex flex-col items-center justify-center text-center shadow-xs my-2 ${
            this.props.className || ''
          }`}
          style={{ minHeight: this.props.minHeight || 160 }}
        >
          <div className="w-10 h-10 rounded-full bg-[#FCE8E6] flex items-center justify-center text-[#D93025] mb-2">
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h4 className="text-sm font-semibold text-[#202124]">
            {this.props.title ? `${this.props.title} - ` : ''}Chart unavailable
          </h4>
          <p className="text-xs text-[#5F6368] mt-1 max-w-sm">
            Unable to render visualization at this time.
          </p>
          <button
            type="button"
            onClick={this.handleRetry}
            className="mt-3 px-3 py-1.5 text-xs font-medium text-[#188038] bg-[#E6F4EA] hover:bg-[#CEEAD6] rounded-md transition-colors focus:outline-hidden focus:ring-2 focus:ring-[#188038]"
          >
            Retry
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ChartBoundary;
