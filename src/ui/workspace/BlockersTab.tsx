import type { ReactNode } from 'react';

export function BlockersTab({ children }: { children: ReactNode }) {
  return <div className="workspace-tab workspace-tab-blockers">{children}</div>;
}

