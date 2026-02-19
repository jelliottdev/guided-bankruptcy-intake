import { useRef, useEffect } from 'react';

interface ProgressProps {
  currentStepIndex: number;
  totalSteps: number;
}

/** Progress bar never animates backward when visible steps shrink (e.g. joint → alone). */
export function Progress({ currentStepIndex, totalSteps }: ProgressProps) {
  const stepNum = currentStepIndex + 1;
  const pct = totalSteps > 0 ? (stepNum / totalSteps) * 100 : 0;
  const maxPctRef = useRef(pct);
  useEffect(() => {
    if (currentStepIndex === 0) maxPctRef.current = pct;
    else if (pct > maxPctRef.current) maxPctRef.current = pct;
  }, [currentStepIndex, pct]);
  const displayPct = Math.max(pct, maxPctRef.current);

  return (
    <div className="progress-block">
      <p className="progress-step-counter">
        Section {stepNum} of {totalSteps}
      </p>
      <div className="progress-bar" style={{ height: '2px', background: 'rgba(0,0,0,0.05)', borderRadius: '999px', overflow: 'hidden' }}>
        <div
          className="progress-fill"
          style={{
            width: `${displayPct}%`,
            height: '100%',
            background: 'linear-gradient(90deg, #3b82f6, #60a5fa)',
            boxShadow: '0 0 8px rgba(59, 130, 246, 0.5)',
            transition: 'width 0.6s cubic-bezier(0.4, 0, 0.2, 1)'
          }}
        />
      </div>
    </div>
  );
}
