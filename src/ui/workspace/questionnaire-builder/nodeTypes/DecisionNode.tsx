import { memo } from 'react';
import Box from '@mui/joy/Box';
import Typography from '@mui/joy/Typography';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { BaseNodeCard } from './BaseNodeCard';

function DecisionNodeBase({ data, selected }: NodeProps) {
  const showHandles = data.showHandles !== false;
  return (
    <BaseNodeCard
      title={String(data.title ?? 'Decision')}
      subtitle="Branching"
      badge="IF"
      leadingIcon="IF"
      color="warning"
      selected={Boolean(selected)}
      showHandles={showHandles}
      outgoing={false}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1.1, pb: 1.3 }}>
        <Typography level="body-xs" sx={{ color: 'text.tertiary' }}>
          No branch
        </Typography>
        <Typography level="body-xs" sx={{ color: 'text.tertiary' }}>
          Yes branch
        </Typography>
      </Box>
      {showHandles ? (
        <>
          <Handle
            id="no"
            type="source"
            position={Position.Bottom}
            style={{
              left: '28%',
              width: 12,
              height: 12,
              borderRadius: 999,
              border: '2px solid #fff',
              background: '#f59e0b',
              boxShadow: '0 0 0 1px rgba(245,158,11,0.6)',
            }}
          />
          <Handle
            id="yes"
            type="source"
            position={Position.Bottom}
            style={{
              left: '72%',
              width: 12,
              height: 12,
              borderRadius: 999,
              border: '2px solid #fff',
              background: '#10b981',
              boxShadow: '0 0 0 1px rgba(16,185,129,0.6)',
            }}
          />
        </>
      ) : null}
    </BaseNodeCard>
  );
}

export const DecisionNode = memo(DecisionNodeBase);
DecisionNode.displayName = 'DecisionNode';
