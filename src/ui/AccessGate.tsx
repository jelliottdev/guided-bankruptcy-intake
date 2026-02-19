import { useMemo, useState } from 'react';
import { grantAccess, hasGrantedAccess, getExpectedAccessCode } from '../auth/access';
import { getClientScopeId } from '../state/clientScope';

interface AccessGateProps {
  children: React.ReactNode;
}

export function AccessGate({ children }: AccessGateProps) {
  const [input, setInput] = useState('');
  const [granted, setGranted] = useState(() => hasGrantedAccess());
  const [error, setError] = useState('');
  const clientScope = useMemo(() => getClientScopeId(), []);

  if (granted) return <>{children}</>;

  return (
    <div className="access-gate-wrap">
      <div className="access-gate-card">
        <h1>Client Access Required</h1>
        <p>
          Enter access code to open this intake{clientScope ? ` for client ${clientScope}` : ''}.
        </p>
        <input
          type="password"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Access code"
        />
        {error && <p className="access-gate-error">{error}</p>}
        <button
          type="button"
          onClick={() => {
            if (input.trim() === getExpectedAccessCode()) {
              grantAccess();
              setGranted(true);
              setError('');
            } else {
              setError('Invalid code');
            }
          }}
        >
          Continue
        </button>
      </div>
    </div>
  );
}
