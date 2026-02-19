import { Component, StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { CssVarsProvider } from '@mui/joy/styles';
import CssBaseline from '@mui/joy/CssBaseline';
import '@fontsource/inter';
import '@xyflow/react/dist/style.css';
import App from './App';
import { IntakeProvider } from './state/IntakeProvider';
import { IssuesProvider } from './issues/IssuesProvider';
import { WorkflowProvider } from './workflow/WorkflowProvider';
import { attorneyTheme } from './theme/attorneyTheme';
import './index.css';

class ErrorBoundary extends Component<{ children: React.ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  reset = () => this.setState({ error: null });
  render() {
    if (this.state.error) {
      return (
        <div style={{ minHeight: '100vh', padding: '2rem', fontFamily: 'Inter, system-ui, sans-serif', background: '#f8fafc', color: '#0f172a' }}>
          <h1 style={{ marginTop: 0, marginBottom: '1rem' }}>Something went wrong</h1>
          <pre style={{ overflow: 'auto', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 8, padding: '1rem', color: '#334155' }}>
            {this.state.error.message}
          </pre>
          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
            <button type="button" onClick={this.reset} style={{ background: '#1d4ed8', color: '#fff', border: 0, borderRadius: 8, padding: '0.55rem 0.9rem', fontWeight: 600 }}>
              Try again
            </button>
            <button type="button" onClick={() => window.location.reload()} style={{ background: '#fff', color: '#0f172a', border: '1px solid #cbd5e1', borderRadius: 8, padding: '0.55rem 0.9rem', fontWeight: 600 }}>
              Reload page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const root = document.getElementById('root');
if (!root) throw new Error('Root element #root not found');

createRoot(root).render(
  <StrictMode>
    <CssVarsProvider theme={attorneyTheme} defaultMode="system">
      <CssBaseline />
      <IntakeProvider>
        <IssuesProvider>
          <WorkflowProvider>
            <ErrorBoundary>
              <App />
            </ErrorBoundary>
          </WorkflowProvider>
        </IssuesProvider>
      </IntakeProvider>
    </CssVarsProvider>
  </StrictMode>
);
