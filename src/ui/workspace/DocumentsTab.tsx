import type { ReactNode } from 'react';

export function DocumentsTab({ children }: { children: ReactNode }) {
  return <div className="workspace-tab workspace-tab-documents">{children}</div>;
}

