import Box from '@mui/joy/Box';
import Button from '@mui/joy/Button';
import Chip from '@mui/joy/Chip';
import Stack from '@mui/joy/Stack';
import Typography from '@mui/joy/Typography';
import List from '@mui/joy/List';
import ListItem from '@mui/joy/ListItem';
import type { ThreadMessageVM, ThreadVM } from './types';
import { AttorneyMessageInput } from './AttorneyMessageInput';
import { labelForGlobalStatus, toneForGlobalStatus } from '../../shared/globalStatus';
import { EmptyState } from '../../shared/EmptyState';

interface AttorneyMessagesPaneProps {
  thread: ThreadVM | null;
  messages: ThreadMessageVM[];
  composerValue: string;
  onComposerChange: (value: string) => void;
  onSend: () => void;
  onOpenContext?: (fieldId: string) => void;
}

export function AttorneyMessagesPane({
  thread,
  messages,
  composerValue,
  onComposerChange,
  onSend,
  onOpenContext,
}: AttorneyMessagesPaneProps) {
  if (!thread) {
    return (
      <Box sx={{ p: 2 }}>
        <Typography level="title-md">Select a thread</Typography>
        <Typography level="body-sm" sx={{ color: 'text.tertiary' }}>
          Pick a thread from the left to review context and respond.
        </Typography>
      </Box>
    );
  }

  const tone = toneForGlobalStatus(thread.status);

  return (
    <Box
      sx={{
        minWidth: 0,
        minHeight: 0,
        height: '100%',
        pl: { xs: 0, md: 1.5 },
        display: 'grid',
        gridTemplateRows: 'auto minmax(0, 1fr) auto',
      }}
    >
      <Box sx={{ pb: 1, boxShadow: 'sm', zIndex: 1, bgcolor: 'background.surface' }}>
        <Stack direction="row" spacing={1} alignItems="flex-start" justifyContent="space-between">
          <Box sx={{ minWidth: 0 }}>
            <Typography level="title-md" sx={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {thread.title}
            </Typography>
            {thread.context ? (
              <Typography level="body-xs" sx={{ color: 'text.tertiary', mt: 0.3 }}>
                {thread.context}
              </Typography>
            ) : null}
          </Box>
          <Stack direction="row" spacing={0.75} alignItems="center" sx={{ flex: '0 0 auto' }}>
            {thread.linkedFieldId && onOpenContext ? (
              <Button
                size="sm"
                variant="soft"
                onClick={() => onOpenContext(thread.linkedFieldId as string)}
              >
                Open in intake
              </Button>
            ) : null}
            <Chip
              size="sm"
              variant={tone.variant}
              color={tone.color}
              sx={{ fontWeight: 700 }}
            >
              {labelForGlobalStatus(thread.status)}
            </Chip>
          </Stack>
        </Stack>
      </Box>
      <List sx={{ overflow: 'auto', py: 1, gap: 1, minHeight: 0 }}>
        {messages.length === 0 ? (
          <EmptyState
            title="No messages"
            description="Start a conversation with the client."
            icon={
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            }
          />
        ) : (
          messages.map((message) => (
            <ListItem key={message.id}>
              <Box
                sx={{
                  width: '100%',
                  p: 1.5,
                  borderRadius: 'xl',
                  borderTopLeftRadius: message.author === 'attorney' ? 'xl' : 'sm',
                  borderTopRightRadius: message.author === 'attorney' ? 'sm' : 'xl',
                  bgcolor: message.author === 'attorney' ? 'primary.50' : 'background.level1',
                  boxShadow: 'sm',
                  border: '1px solid',
                  borderColor: message.author === 'attorney' ? 'primary.100' : 'transparent',
                }}
              >
                <Typography level="body-xs" sx={{ color: 'text.tertiary', mb: 0.25 }}>
                  {message.author} · {new Date(message.createdAt).toLocaleString()}
                </Typography>
                <Typography level="body-sm" textColor={message.author === 'attorney' ? 'text.primary' : 'text.secondary'}>
                  {message.text}
                </Typography>
              </Box>
            </ListItem>
          ))
        )}
      </List>
      <AttorneyMessageInput
        value={composerValue}
        onChange={onComposerChange}
        disabled={!composerValue.trim()}
        onSend={onSend}
      />
    </Box>
  );
}
