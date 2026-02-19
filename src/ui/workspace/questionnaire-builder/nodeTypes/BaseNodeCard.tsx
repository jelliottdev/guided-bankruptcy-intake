import type { ReactNode } from 'react';
import Box from '@mui/joy/Box';
import Chip from '@mui/joy/Chip';
import Sheet from '@mui/joy/Sheet';
import Typography from '@mui/joy/Typography';
import { Handle, Position } from '@xyflow/react';

interface BaseNodeCardProps {
  title: string;
  subtitle?: string;
  badge: string;
  leadingIcon?: string;
  prominent?: boolean;
  simpleBand?: 'odd' | 'even';
  showHandles?: boolean;
  selected: boolean;
  color?: 'primary' | 'success' | 'warning' | 'neutral';
  incoming?: boolean;
  outgoing?: boolean;
  outgoingHandleId?: string;
  children?: ReactNode;
}

export function BaseNodeCard({
  title,
  subtitle,
  badge,
  leadingIcon,
  prominent = false,
  simpleBand,
  showHandles = true,
  selected,
  color = 'neutral',
  incoming = true,
  outgoing = true,
  outgoingHandleId,
  children,
}: BaseNodeCardProps) {
  const handleStyle = {
    width: 10,
    height: 10,
    borderRadius: 999,
    border: '2px solid #ffffff',
    background: '#2563eb',
    boxShadow: '0 0 0 1px rgba(37,99,235,0.65)',
  } as const;
  const baseBorderByColor: Record<NonNullable<BaseNodeCardProps['color']>, string> = {
    primary: '#c7d6ea',
    success: '#b9e7d3',
    warning: '#f8ddb1',
    neutral: '#d3dcea',
  };
  const accentByColor: Record<NonNullable<BaseNodeCardProps['color']>, string> = {
    primary: '#3b82f6',
    success: '#22c55e',
    warning: '#f59e0b',
    neutral: '#94a3b8',
  };

  return (
    <Sheet
      variant="outlined"
      className="questionnaire-node-card"
      sx={{
        minWidth: prominent ? 500 : 210,
        maxWidth: prominent ? 650 : 260,
        p: prominent ? 1.35 : 0.85,
        borderRadius: 'lg',
        borderWidth: selected ? 2 : 1,
        borderColor: selected ? 'primary.500' : baseBorderByColor[color],
        borderLeftWidth: prominent ? 6 : selected ? 2 : 1,
        borderLeftColor: prominent ? accentByColor[color] : selected ? '#3b82f6' : baseBorderByColor[color],
        boxShadow: selected ? '0 8px 16px rgba(37,99,235,0.16)' : '0 2px 6px rgba(15,23,42,0.06)',
        bgcolor:
          prominent && simpleBand === 'odd'
            ? '#f8fbff'
            : prominent && simpleBand === 'even'
              ? '#ffffff'
              : 'background.surface',
      }}
    >
      {showHandles && incoming ? <Handle type="target" position={Position.Left} style={handleStyle} /> : null}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.65, minWidth: 0 }}>
          {leadingIcon ? (
            <Typography level="body-sm" sx={{ lineHeight: 1 }}>
              {leadingIcon}
            </Typography>
          ) : null}
          <Typography level={prominent ? 'title-lg' : 'title-sm'} sx={{ lineHeight: 1.25, pr: 0.5 }}>
            {title}
          </Typography>
        </Box>
        <Chip
          size={prominent ? 'md' : 'sm'}
          color={color}
          variant="soft"
          sx={prominent ? { fontWeight: 700, borderRadius: 'md' } : undefined}
        >
          {badge}
        </Chip>
      </Box>
      {subtitle ? (
        <Typography
          level={prominent ? 'body-sm' : 'body-xs'}
          sx={{ color: 'text.tertiary', mt: 0.65, whiteSpace: 'pre-line', lineHeight: 1.45 }}
        >
          {subtitle}
        </Typography>
      ) : null}
      {children}
      {showHandles && outgoing ? (
        <Handle id={outgoingHandleId} type="source" position={Position.Right} style={handleStyle} />
      ) : null}
    </Sheet>
  );
}
