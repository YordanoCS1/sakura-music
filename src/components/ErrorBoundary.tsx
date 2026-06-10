import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props { children: React.ReactNode; name?: string; }
interface State { hasError: boolean; error: Error | null; }

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error(`[ErrorBoundary${this.props.name ? `:${this.props.name}` : ''}]`, error, info.componentStack);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          padding: '60px 20px', gap: 12, minHeight: 200,
        }}>
          <div style={{
            width: 48, height: 48, borderRadius: 12,
            background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <AlertTriangle size={22} color="#f87171" />
          </div>
          <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-heading)', margin: 0 }}>
            Algo salió mal
          </p>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0, maxWidth: 300, textAlign: 'center' }}>
            {this.state.error?.message || 'Error inesperado'}
          </p>
          <button onClick={this.handleRetry}
            style={{
              marginTop: 8, padding: '8px 20px', borderRadius: 8, border: 'none',
              background: 'var(--accent-gradient)', color: 'white', cursor: 'pointer',
              fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6,
            }}>
            <RefreshCw size={13} /> Reintentar
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
