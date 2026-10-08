/**
 * ErrorBoundary — catches render errors and shows a recovery UI.
 * Wraps the map and sidebar independently so one failure doesn't kill both.
 */
'use client';

import { Component, ReactNode } from 'react';

interface Props { children: ReactNode; label?: string; }
interface State { hasError: boolean; message: string; }

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-full bg-gray-900 text-gray-400 p-8 text-center">
          <div className="text-3xl mb-3">⚠️</div>
          <p className="text-sm font-semibold mb-1">{this.props.label ?? 'Component'} failed to render</p>
          <p className="text-xs text-gray-600 mb-4">{this.state.message}</p>
          <button
            onClick={() => this.setState({ hasError: false, message: '' })}
            className="text-xs bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition"
          >
            Retry
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
