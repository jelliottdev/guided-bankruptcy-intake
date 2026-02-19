import type { ReactNode } from 'react';

export function FinancialTab({ children }: { children: ReactNode }) {
  return <div className="workspace-tab workspace-tab-financial">{children}</div>;
}

