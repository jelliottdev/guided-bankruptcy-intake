import Box from '@mui/joy/Box';
import Input from '@mui/joy/Input';
import List from '@mui/joy/List';
import Typography from '@mui/joy/Typography';
import Chip from '@mui/joy/Chip';
import Stack from '@mui/joy/Stack';
import type { ThreadVM } from './types';
import { AttorneyThreadListItem } from './AttorneyThreadListItem';

interface AttorneyChatsPaneProps {
  search: string;
  onSearchChange: (value: string) => void;
  filters: Array<{ id: string; label: string; active: boolean; onClick: () => void }>;
  threads: ThreadVM[];
  selectedThreadId: string;
  onSelectThread: (threadId: string) => void;
}

export function AttorneyChatsPane({
  search,
  onSearchChange,
  filters,
  threads,
  selectedThreadId,
  onSelectThread,
}: AttorneyChatsPaneProps) {
  return (
    <Box
      sx={{
        minWidth: 280,
        pr: { md: 1.5 },
        minHeight: 0,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <Input
        size="sm"
        placeholder="Search threads"
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        sx={{ mb: 1 }}
      />
      <Stack direction="row" spacing={0.5} useFlexGap sx={{ flexWrap: 'wrap', mb: 1 }}>
        {filters.map((filter) => (
          <Chip
            key={filter.id}
            size="sm"
            variant={filter.active ? 'solid' : 'soft'}
            onClick={filter.onClick}
            sx={{ cursor: 'pointer' }}
          >
            {filter.label}
          </Chip>
        ))}
      </Stack>
      <List sx={{ '--List-gap': '6px', overflow: 'auto', flex: 1, minHeight: 0 }}>
        {threads.length === 0 ? (
          <Typography level="body-sm" sx={{ color: 'text.tertiary', p: 1 }}>
            No threads found.
          </Typography>
        ) : (
          threads.map((thread) => (
            <AttorneyThreadListItem
              key={thread.id}
              thread={thread}
              selected={thread.id === selectedThreadId}
              onSelect={onSelectThread}
            />
          ))
        )}
      </List>
    </Box>
  );
}
