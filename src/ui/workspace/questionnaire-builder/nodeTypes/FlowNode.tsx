import { memo } from 'react';
import type { NodeProps } from '@xyflow/react';
import { BaseNodeCard } from './BaseNodeCard';

function FlowNodeBase({ data, selected }: NodeProps) {
  const kind = String(data.kind ?? 'node');
  const simpleMode = data.canvasMode === 'smart';
  const showHandles = data.showHandles !== false;
  const badge =
    kind === 'start'
      ? 'START'
      : kind === 'end'
        ? 'END'
        : kind === 'task'
          ? 'TASK'
          : kind === 'approval_gate'
            ? 'APPROVE'
            : kind === 'reminder'
              ? 'REMIND'
              : 'NOTE';

  return (
    <BaseNodeCard
      title={
        simpleMode
          ? kind === 'start'
            ? 'Journey start'
            : kind === 'end'
              ? 'Journey end'
              : String(data.title ?? kind)
          : String(data.title ?? kind)
      }
      subtitle={kind.replace(/_/g, ' ')}
      badge={badge}
      leadingIcon={
        kind === 'start'
          ? 'S'
          : kind === 'end'
            ? 'E'
            : kind === 'task'
              ? 'T'
              : kind === 'approval_gate'
                ? 'A'
                : kind === 'reminder'
                  ? 'R'
                  : 'N'
      }
      color={
        kind === 'start'
          ? 'success'
          : kind === 'end'
            ? 'neutral'
            : kind === 'approval_gate'
              ? 'warning'
              : 'primary'
      }
      selected={Boolean(selected)}
      incoming={kind !== 'start'}
      outgoing={kind !== 'end'}
      prominent={simpleMode && (kind === 'start' || kind === 'end')}
      showHandles={showHandles}
    />
  );
}

export const FlowNode = memo(FlowNodeBase);
FlowNode.displayName = 'FlowNode';
