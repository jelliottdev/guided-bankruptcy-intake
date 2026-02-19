import type { ReactNode } from 'react';

export function TodayTab({ children }: { children: ReactNode }) {
  return <div className="workspace-tab workspace-tab-today">{children}</div>;
}

