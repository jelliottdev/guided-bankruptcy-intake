import type { ReactNode } from 'react';
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
}

export function Layout({ children, email, phone, onReset }: LayoutProps) {
  const identityLine =
    email != null && phone != null
      ? `${maskEmail(email)} | ${maskPhone(phone)}`
      : 'Demo Mode';

  return (
    <div className="card">
      <header>
        <h1>Bankruptcy Intake Questionnaire (Guided)</h1>
        <p className="header-subtext">
          Answer what applies. You can save and return anytime. Estimates are OK.
        </p>
        <p className="identity-line">{identityLine}</p>
      </header>
      <main style={{ flex: 1, minHeight: 0 }}>{children}</main>
      <footer className="app-footer">
        <button type="button" className="reset-demo" onClick={onReset}>
          Reset demo
        </button>
        <span className="build-version" title={__BUILD_TIME__}>
          {formatBuildVersion(__BUILD_TIME__)}
        </span>
      </footer>
    </div>
  );
}
