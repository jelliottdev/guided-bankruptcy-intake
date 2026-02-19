import type { ReactNode } from 'react';

export function SchedulingTab({ children }: { children: ReactNode }) {
  return <div className="workspace-tab workspace-tab-scheduling">{children}</div>;
}

