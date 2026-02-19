import { memo } from 'react';
import type { NodeProps } from '@xyflow/react';
import { BaseNodeCard } from './BaseNodeCard';

function DocRequestNodeBase({ data, selected }: NodeProps) {
  const required = data.required ? 'required' : 'optional';
  const showHandles = data.showHandles !== false;
  return (
    <BaseNodeCard
      title={String(data.title ?? 'Document request')}
      subtitle={`${required} • ${(data.labels as string[])?.join(', ') || 'documents'}`}
      badge="DOC"
      leadingIcon="D"
      color="success"
      showHandles={showHandles}
      selected={Boolean(selected)}
    />
  );
}

export const DocRequestNode = memo(DocRequestNodeBase);
DocRequestNode.displayName = 'DocRequestNode';
