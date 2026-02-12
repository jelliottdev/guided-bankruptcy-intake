import type { ReactNode } from 'react';
import { maskEmail, maskPhone } from '../utils/mask';

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
          Save and return anytime. If unsure, estimate or choose Not Sure.
        </p>
        <p className="identity-line">{identityLine}</p>
      </header>
      <main style={{ flex: 1 }}>{children}</main>
      <footer style={{ marginTop: '1rem' }}>
        <button type="button" className="reset-demo" onClick={onReset}>
          Reset demo
        </button>
      </footer>
    </div>
  );
}
