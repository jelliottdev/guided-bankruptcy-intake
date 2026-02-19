import type { ReactNode } from 'react';

interface ClientShellProps {
  leftNav: ReactNode;
  main: ReactNode;
  rightRail?: ReactNode;
}

export function ClientShell({ leftNav, main, rightRail }: ClientShellProps) {
  return (
    <div className={`client-shell${rightRail ? '' : ' client-shell-no-rail'}`}>
      <aside className="client-left-rail" aria-label="Sections navigation">
        {leftNav}
      </aside>
      <section className="client-main-pane">{main}</section>
      {rightRail ? (
        <aside className="client-right-rail" aria-label="Case guidance">
          {rightRail}
        </aside>
      ) : null}
    </div>
  );
}
