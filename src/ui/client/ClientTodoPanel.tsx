import Button from '@mui/joy/Button';
import Box from '@mui/joy/Box';
import Chip from '@mui/joy/Chip';
import List from '@mui/joy/List';
import ListItem from '@mui/joy/ListItem';
import Sheet from '@mui/joy/Sheet';
import Stack from '@mui/joy/Stack';
import Typography from '@mui/joy/Typography';
import type { Issue } from '../../issues/types';
import type { QuestionnaireAssignment, QuestionnaireTemplate } from '../../questionnaires/types';

interface ClientTodoPanelProps {
  templates: QuestionnaireTemplate[];
  assignments: QuestionnaireAssignment[];
  issues: Issue[];
  onOpenAssignment: (assignmentId: string) => void;
  onOpenIssue: (issue: Issue) => void;
}

function isOpenIssue(issue: Issue): boolean {
  return ['assigned', 'in_progress', 'needs_review'].includes(issue.status) && issue.owner === 'client';
}

export function ClientTodoPanel({
  templates,
  assignments,
  issues,
  onOpenAssignment,
  onOpenIssue,
}: ClientTodoPanelProps) {
  const templateMap = new Map(templates.map((template) => [template.id, template]));
  const openAssignments = assignments.filter(
    (assignment) => !['approved', 'closed'].includes(assignment.computedStage ?? 'assigned')
  );
  const openIssues = issues.filter(isOpenIssue);

  if (openAssignments.length === 0 && openIssues.length === 0) {
    return (
      <Sheet
        variant="soft"
        sx={{
          p: 4,
          borderRadius: 'lg',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          minHeight: 300,
          background: 'linear-gradient(145deg, var(--joy-palette-background-level1) 0%, var(--joy-palette-background-surface) 100%)',
        }}
      >
        <Box
          sx={{
            width: 80,
            height: 80,
            borderRadius: '50%',
            bgcolor: 'success.100',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            mb: 2,
            boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
          }}
        >
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--joy-palette-success-500)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </Box>
        <Typography level="h3" sx={{ mb: 1, fontWeight: 700 }}>
          All caught up!
        </Typography>
        <Typography level="body-md" sx={{ color: 'text.secondary', maxWidth: 300 }}>
          You have no pending assignments or attorney requests. We'll notify you if we need anything else.
        </Typography>
      </Sheet>
    );
  }

  return (
    <Stack spacing={1.25}>
      {openAssignments.length > 0 && (
        <Sheet variant="soft" sx={{ p: 1.25, borderRadius: 'lg' }}>
          <Typography level="title-md">Assigned work</Typography>
          <Typography level="body-sm" sx={{ color: 'text.tertiary', mb: 1 }}>
            Complete assignments and upload documents so we can prepare your packet.
          </Typography>
          <List size="sm" sx={{ p: 0, gap: 0.75 }}>
            {openAssignments.map((assignment) => {
              const template = templateMap.get(assignment.templateId);
              const stage = assignment.computedStage ?? 'assigned';
              return (
                <ListItem key={assignment.id} sx={{ p: 0 }}>
                  <Sheet variant="outlined" sx={{ width: '100%', p: 1, borderRadius: 'md' }}>
                    <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
                      <div>
                        <Typography level="body-sm" sx={{ fontWeight: 'lg' }}>
                          {assignment.title}
                        </Typography>
                        <Typography level="body-xs" sx={{ color: 'text.tertiary' }}>
                          {template?.kind === 'custom' ? 'Custom questionnaire' : 'Default intake questionnaire'}
                          {assignment.dueAt ? ` · due ${new Date(assignment.dueAt).toLocaleDateString()}` : ''}
                        </Typography>
                      </div>
                      <Stack direction="row" spacing={0.75}>
                        <Chip
                          size="sm"
                          color={stage === 'in_progress' ? 'primary' : stage === 'submitted' || stage === 'approved' ? 'success' : 'warning'}
                          variant="soft"
                        >
                          {stage.replace('_', ' ')}
                        </Chip>
                        <Button size="sm" onClick={() => onOpenAssignment(assignment.id)}>
                          Open
                        </Button>
                      </Stack>
                    </Stack>
                  </Sheet>
                </ListItem>
              );
            })}
          </List>
        </Sheet>
      )}

      {openIssues.length > 0 && (
        <Sheet variant="soft" sx={{ p: 1.25, borderRadius: 'lg' }}>
          <Typography level="title-md">Issue-based follow-ups</Typography>
          <Typography level="body-sm" sx={{ color: 'text.tertiary', mb: 1 }}>
            Messages are treated as issues and stay open until attorney resolution.
          </Typography>
          <List size="sm" sx={{ p: 0, gap: 0.75 }}>
            {openIssues.map((issue) => (
              <ListItem key={issue.id} sx={{ p: 0 }}>
                <Sheet variant="outlined" sx={{ width: '100%', p: 1, borderRadius: 'md' }}>
                  <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
                    <div>
                      <Typography level="body-sm" sx={{ fontWeight: 'md' }}>
                        {issue.title}
                      </Typography>
                      <Typography level="body-xs" sx={{ color: 'text.tertiary', textTransform: 'capitalize' }}>
                        {issue.type} · {issue.status.replace(/_/g, ' ')}
                      </Typography>
                    </div>
                    <Button size="sm" variant="soft" onClick={() => onOpenIssue(issue)}>
                      Open
                    </Button>
                  </Stack>
                </Sheet>
              </ListItem>
            ))}
          </List>
        </Sheet>
      )}
    </Stack>
  );
}
