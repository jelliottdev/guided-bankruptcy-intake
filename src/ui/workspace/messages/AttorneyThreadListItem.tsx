import ListItem from '@mui/joy/ListItem';
import ListItemButton from '@mui/joy/ListItemButton';
import ListItemContent from '@mui/joy/ListItemContent';
import Chip from '@mui/joy/Chip';
import Stack from '@mui/joy/Stack';
import Typography from '@mui/joy/Typography';
import type { ThreadVM } from './types';
import { labelForGlobalStatus, toneForGlobalStatus } from '../../shared/globalStatus';

interface AttorneyThreadListItemProps {
  thread: ThreadVM;
  selected: boolean;
  onSelect: (threadId: string) => void;
}

function formatLastAt(value: string): string {
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return '';
  return dt.toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

export function AttorneyThreadListItem({ thread, selected, onSelect }: AttorneyThreadListItemProps) {
  const tone = toneForGlobalStatus(thread.status);
  return (
    <ListItem>
      <ListItemButton
        selected={selected}
        onClick={() => onSelect(thread.id)}
        variant={selected ? 'soft' : 'plain'}
        color={selected ? 'primary' : 'neutral'}
        sx={{
          borderRadius: 'lg',
          alignItems: 'flex-start',
          gap: 1,
          py: 1.25,
          px: 1.25,
          transition: 'all 0.2s ease',
          '&:hover': {
            bgcolor: selected ? 'primary.softHover' : 'background.level1',
          }
        }}
      >
        <ListItemContent>
          <Typography level="title-sm" sx={{ lineHeight: 1.2 }}>
            {thread.title}
          </Typography>
          <Typography level="body-xs" sx={{ color: 'text.tertiary' }}>
            {formatLastAt(thread.lastMessageAt)}
          </Typography>
          {thread.context ? (
            <Typography level="body-xs" sx={{ color: 'text.tertiary', mt: 0.25 }}>
              {thread.context}
            </Typography>
          ) : null}
        </ListItemContent>
        <Stack direction="column" spacing={0.5} alignItems="flex-end" sx={{ pt: '2px' }}>
          <Chip size="sm" variant={tone.variant} color={tone.color}>
            {labelForGlobalStatus(thread.status)}
          </Chip>
          {thread.unreadCount > 0 ? (
            <Chip size="sm" variant="solid" color="danger">
              {thread.unreadCount}
            </Chip>
          ) : null}
        </Stack>
      </ListItemButton>
    </ListItem>
  );
}
