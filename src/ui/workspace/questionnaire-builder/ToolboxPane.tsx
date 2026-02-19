import Box from '@mui/joy/Box';
import Button from '@mui/joy/Button';
import Input from '@mui/joy/Input';
import Divider from '@mui/joy/Divider';
import List from '@mui/joy/List';
import ListItem from '@mui/joy/ListItem';
import ListItemButton from '@mui/joy/ListItemButton';
import Sheet from '@mui/joy/Sheet';
import Typography from '@mui/joy/Typography';
import { useMemo, useState } from 'react';
import type { QuestionnaireNodeKind } from '../../../questionnaires/types';
import { clearLastDraggedQuestionnaireKind } from './dragMime';

interface ToolboxItem {
  kind: QuestionnaireNodeKind;
  title: string;
  helper: string;
}

const CORE_GROUP: { id: string; title: string; items: ToolboxItem[] } = {
  id: 'core',
  title: 'Add to section',
  items: [
    { kind: 'section', title: 'Section', helper: 'Create a new section in the assignment' },
    { kind: 'question', title: 'Question', helper: 'Collect a client answer' },
    { kind: 'doc_request', title: 'Upload request', helper: 'Request supporting files or evidence' },
  ],
};

const ADVANCED_GROUPS: Array<{ id: string; title: string; items: ToolboxItem[] }> = [
  {
    id: 'logic',
    title: 'Logic and automation',
    items: [
      { kind: 'decision', title: 'Condition', helper: 'Show follow-up based on an answer' },
      { kind: 'task', title: 'Task', helper: 'Create follow-up work item' },
      { kind: 'approval_gate', title: 'Approval gate', helper: 'Attorney checkpoint before continue' },
      { kind: 'reminder', title: 'Reminder', helper: 'Prompt before due date' },
      { kind: 'note', title: 'Internal note', helper: 'Add hidden drafting guidance' },
    ],
  },
];

const ENABLE_CONDITIONAL_TOOLS =
  import.meta.env.DEV && typeof window !== 'undefined' && localStorage.getItem('gbi:conditional-tools') === '1';

interface ToolboxPaneProps {
  onDragStart: (event: React.DragEvent, kind: QuestionnaireNodeKind) => void;
  onAddNode: (kind: QuestionnaireNodeKind) => void;
}

export function ToolboxPane({ onDragStart, onAddNode }: ToolboxPaneProps) {
  const [query, setQuery] = useState('');

  const filteredGroups = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    const sourceGroups = [
      CORE_GROUP,
      ...(ENABLE_CONDITIONAL_TOOLS ? ADVANCED_GROUPS : []),
    ];
    if (!normalized) return sourceGroups;
    return sourceGroups
      .map((group) => ({
      ...group,
      items: group.items.filter((item) =>
        `${item.title} ${item.helper}`.toLowerCase().includes(normalized)
      ),
      }))
      .filter((group) => group.items.length > 0);
  }, [query]);

  return (
    <Sheet
      variant="soft"
      sx={{
        p: 1.5,
        borderRadius: 'lg',
        height: '100%',
        minHeight: 0,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <Typography level="title-sm" sx={{ mb: 1 }}>
        Insert
      </Typography>
      <Input
        size="sm"
        placeholder="Search insert items"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
      />
      <Box className="toolbox-scroll" sx={{ flex: 1, minHeight: 0, overflow: 'auto', mt: 1, pr: 0.25 }}>
        <List size="sm" sx={{ '--List-gap': '0.4rem' }}>
          {filteredGroups.map((group) => (
            <Box key={group.id} sx={{ mb: 1.1 }}>
              <Typography level="body-xs" sx={{ color: 'text.tertiary', fontWeight: 700, mb: 0.35 }}>
                {group.title}
              </Typography>
              <List size="sm" sx={{ '--List-gap': '0.4rem' }}>
                {group.items.map((item) => (
                  <ListItem key={item.kind} sx={{ p: 0 }}>
                    <ListItemButton
                      draggable
                      onDragStart={(event: React.DragEvent<HTMLDivElement>) => onDragStart(event, item.kind)}
                      onDragEnd={() => clearLastDraggedQuestionnaireKind()}
                      className="toolbox-item"
                      sx={{
                        borderRadius: 'md',
                        border: '1px solid',
                        borderColor: 'divider',
                        alignItems: 'flex-start',
                        display: 'block',
                      }}
                    >
                      <Typography level="body-sm" sx={{ fontWeight: 'lg' }}>
                        {item.title}
                      </Typography>
                      <Typography level="body-xs" sx={{ color: 'text.tertiary' }}>
                        {item.helper}
                      </Typography>
                      <Box sx={{ mt: 0.75, display: 'flex', justifyContent: 'flex-end' }}>
                        <Button
                          size="sm"
                          variant="soft"
                          color="primary"
                          sx={{ borderRadius: 999, minHeight: 26, px: 1.1, fontSize: '0.68rem', fontWeight: 700 }}
                          onClick={(event) => {
                            event.stopPropagation();
                            onAddNode(item.kind);
                          }}
                        >
                          Add
                        </Button>
                      </Box>
                    </ListItemButton>
                  </ListItem>
                ))}
              </List>
              <Divider sx={{ mt: 0.75 }} />
            </Box>
          ))}
        </List>
      </Box>
      <Box sx={{ mt: 1.25 }}>
        <Typography level="body-xs" sx={{ color: 'text.tertiary' }}>
          Tip: Build sections first, then drag questions into each section. Collapsed sections open on drag.
        </Typography>
      </Box>
    </Sheet>
  );
}
