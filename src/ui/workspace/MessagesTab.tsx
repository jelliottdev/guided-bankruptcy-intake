import type { ReactNode } from 'react';

export function MessagesTab({ children }: { children: ReactNode }) {
  return <div className="workspace-tab workspace-tab-messages">{children}</div>;
}

