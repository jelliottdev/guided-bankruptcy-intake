import type { ReactNode } from 'react';
import { useIntake } from '../state/IntakeProvider';
import { maskEmail, maskPhone } from '../utils/mask';

function formatBuildVersion(iso: string): string {
  try {
    const d = new Date(iso);
    const date = d.toISOString().slice(0, 10);
    const time = d.toISOString().slice(11, 16);
    return `v ${date} ${time} UTC`;
  } catch {
    return 'v dev';
  }
}

interface LayoutProps {
  children: ReactNode;
  email?: string | null;
  phone?: string | null;
  onReset: () => void;
  onLoadDemo?: () => void;
}

export function Layout({ children, email, phone, onReset, onLoadDemo }: LayoutProps) {
  const { state, setViewMode } = useIntake();
  const isAttorney = state.viewMode === 'attorney';

  const identityLine =
    email != null && phone != null
      ? `${maskEmail(email)} | ${maskPhone(phone)}`
      : 'Demo Mode';

  return (
    <div className="card">
      <header className="app-header">
        <div className="header-row">
          <h1>Bankruptcy Intake Questionnaire (Guided)</h1>
          <button
            type="button"
            className={`modeToggle ${isAttorney ? 'on' : 'off'}`}
            onClick={() => setViewMode(isAttorney ? 'client' : 'attorney')}
            aria-pressed={isAttorney}
            aria-label={isAttorney ? 'Switch to client view' : 'Switch to attorney view'}
          >
            <span className="pill">
              <span className="knob" />
            </span>
            <span className="modeLabel">{isAttorney ? 'Client View' : 'Attorney View'}</span>
          </button>
        </div>
        <p className="header-subtext">
            Please answer what applies to you. You can save and return anytime. Estimates are OK if you don&apos;t know exact numbers. Your attorney will review everything with you.
        </p>
        <p className="identity-line">{identityLine}</p>
      </header>
      <main style={{ flex: 1, minHeight: 0 }}>{children}</main>
      <footer className="app-footer">
        <span className="footer-demo-label">Demo:</span>
        <span className="footer-demo-actions">
          <button
            type="button"
            className="load-demo-data"
            onClick={() => onLoadDemo?.()}
          >
            Load demo data
          </button>
          <button type="button" className="reset-demo" onClick={onReset}>
            Reset demo
          </button>
        </span>
        <span className="build-version" title={__BUILD_TIME__}>
          {formatBuildVersion(__BUILD_TIME__)}
        </span>
      </footer>
    </div>
  );
}
