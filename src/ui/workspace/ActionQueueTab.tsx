import type { ReactNode } from 'react';

export function ActionQueueTab({ children }: { children: ReactNode }) {
  return <div className="workspace-tab workspace-tab-action-queue">{children}</div>;
}

