import { useEffect, useMemo, useState } from 'react';
import Box from '@mui/joy/Box';
import Button from '@mui/joy/Button';
import Chip from '@mui/joy/Chip';
import Divider from '@mui/joy/Divider';
import Input from '@mui/joy/Input';
import List from '@mui/joy/List';
import ListItem from '@mui/joy/ListItem';
import ListItemButton from '@mui/joy/ListItemButton';
import Sheet from '@mui/joy/Sheet';
import Stack from '@mui/joy/Stack';
import Textarea from '@mui/joy/Textarea';
import Typography from '@mui/joy/Typography';
import type { Issue } from '../../issues/types';

interface MessagesPanelProps {
  issues: Issue[];
  onCreateGeneralIssue: (title: string, text: string) => void;
  onAddComment: (issueId: string, text: string) => void;
  onMarkNeedsReview: (issueId: string) => void;
}

export function MessagesPanel({
  issues,
  onCreateGeneralIssue,
  onAddComment,
  onMarkNeedsReview,
}: MessagesPanelProps) {
  const [selectedIssueId, setSelectedIssueId] = useState<string>('');
  const [messageText, setMessageText] = useState('');
  const [newThreadTitle, setNewThreadTitle] = useState('');
  const [newThreadText, setNewThreadText] = useState('');
  const [search, setSearch] = useState('');

  const threadIssues = useMemo(
    () =>
      issues
        .filter((i) => i.comments.length > 0 || ['assigned', 'in_progress', 'needs_review'].includes(i.status))
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    [issues]
  );

  const visibleThreads = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return threadIssues;
    return threadIssues.filter((issue) => {
      const haystack = `${issue.title} ${issue.description} ${issue.status}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [search, threadIssues]);

  useEffect(() => {
    if (selectedIssueId && visibleThreads.some((i) => i.id === selectedIssueId)) return;
    setSelectedIssueId(visibleThreads[0]?.id ?? '');
  }, [selectedIssueId, visibleThreads]);

  const selectedIssue = threadIssues.find((i) => i.id === selectedIssueId) ?? null;

  return (
    <Sheet className="messages-panel joy-messages-panel" variant="plain">
      <Stack spacing={1.25}>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Typography level="title-md">Messages</Typography>
          <Chip size="sm" color="primary" variant="soft">
            {visibleThreads.length}
          </Chip>
        </Stack>

        <Sheet variant="soft" sx={{ p: 1, borderRadius: 'md' }}>
          <Stack spacing={0.75}>
            <Typography level="body-xs" sx={{ fontWeight: 'lg' }}>
              New thread
            </Typography>
            <Input
              size="sm"
              value={newThreadTitle}
              placeholder="Subject"
              onChange={(e) => setNewThreadTitle(e.target.value)}
            />
            <Textarea
              size="sm"
              minRows={2}
              value={newThreadText}
              placeholder="Write your question or update..."
              onChange={(e) => setNewThreadText(e.target.value)}
            />
            <Button
              size="sm"
              disabled={!newThreadTitle.trim() || !newThreadText.trim()}
              onClick={() => {
                onCreateGeneralIssue(newThreadTitle.trim(), newThreadText.trim());
                setNewThreadTitle('');
                setNewThreadText('');
              }}
            >
              Start thread
            </Button>
          </Stack>
        </Sheet>

        <Input size="sm" value={search} placeholder="Search threads" onChange={(e) => setSearch(e.target.value)} />

        <Sheet variant="soft" sx={{ borderRadius: 'md', maxHeight: 168, overflow: 'auto' }}>
          <List size="sm" sx={{ '--ListItem-paddingY': '0.45rem', '--ListItem-paddingX': '0.5rem' }}>
            {visibleThreads.length === 0 ? (
              <ListItem>
                <Typography level="body-sm" sx={{ color: 'text.tertiary' }}>
                  No matching threads.
                </Typography>
              </ListItem>
            ) : (
              visibleThreads.map((issue) => (
                <ListItem key={issue.id}>
                  <ListItemButton
                    selected={issue.id === selectedIssueId}
                    onClick={() => setSelectedIssueId(issue.id)}
                    sx={{ borderRadius: 'sm', alignItems: 'flex-start' }}
                  >
                    <Stack spacing={0.25} sx={{ width: '100%' }}>
                      <Typography level="body-sm" sx={{ fontWeight: 'md' }}>
                        {issue.title}
                      </Typography>
                      <Typography level="body-xs" sx={{ color: 'text.tertiary', textTransform: 'capitalize' }}>
                        {issue.status.replace(/_/g, ' ')}
                      </Typography>
                    </Stack>
                  </ListItemButton>
                </ListItem>
              ))
            )}
          </List>
        </Sheet>

        {selectedIssue ? (
          <Sheet variant="outlined" sx={{ borderRadius: 'md', p: 1 }}>
            <Stack spacing={0.75}>
              <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={0.75}>
                <Typography level="body-sm" sx={{ fontWeight: 'lg' }}>
                  {selectedIssue.title}
                </Typography>
                <Chip size="sm" variant="soft" color={selectedIssue.status === 'needs_review' ? 'warning' : 'neutral'}>
                  {selectedIssue.status.replace(/_/g, ' ')}
                </Chip>
              </Stack>
              <Divider />
              <Box sx={{ maxHeight: 186, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 0.75, py: 0.25 }}>
                {selectedIssue.comments.length === 0 ? (
                  <Typography level="body-sm" sx={{ color: 'text.tertiary' }}>
                    No messages yet.
                  </Typography>
                ) : (
                  selectedIssue.comments.map((comment) => {
                    const fromClient = comment.author === 'client';
                    return (
                      <Box key={comment.id} sx={{ alignSelf: fromClient ? 'flex-end' : 'flex-start', maxWidth: '90%' }}>
                        <Sheet
                          variant={fromClient ? 'solid' : 'soft'}
                          color={fromClient ? 'primary' : 'neutral'}
                          sx={{ p: 1, borderRadius: 'md' }}
                        >
                          <Typography level="body-sm">{comment.text}</Typography>
                        </Sheet>
                        <Typography level="body-xs" sx={{ color: 'text.tertiary', mt: 0.25, textAlign: fromClient ? 'right' : 'left' }}>
                          {comment.author} · {new Date(comment.createdAt).toLocaleString()}
                        </Typography>
                      </Box>
                    );
                  })
                )}
              </Box>
              <Textarea
                size="sm"
                minRows={2}
                value={messageText}
                placeholder="Type a message..."
                onChange={(e) => setMessageText(e.target.value)}
              />
              <Button
                size="sm"
                disabled={!messageText.trim()}
                onClick={() => {
                  onAddComment(selectedIssue.id, messageText.trim());
                  onMarkNeedsReview(selectedIssue.id);
                  setMessageText('');
                }}
              >
                Send
              </Button>
            </Stack>
          </Sheet>
        ) : (
          <Sheet variant="soft" sx={{ borderRadius: 'md', p: 1 }}>
            <Typography level="body-sm" sx={{ color: 'text.tertiary' }}>
              Pick a thread to view messages.
            </Typography>
          </Sheet>
        )}
      </Stack>
    </Sheet>
  );
}
