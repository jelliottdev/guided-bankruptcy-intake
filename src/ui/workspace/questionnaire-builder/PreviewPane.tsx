import Divider from '@mui/joy/Divider';
import LinearProgress from '@mui/joy/LinearProgress';
import List from '@mui/joy/List';
import ListItem from '@mui/joy/ListItem';
import Sheet from '@mui/joy/Sheet';
import Stack from '@mui/joy/Stack';
import Typography from '@mui/joy/Typography';
import { filingLabelText } from '../../../questionnaires/labels';
import type { QuestionnaireGraph } from '../../../questionnaires/types';
import { projectGraphToSections } from './graphProjection';

interface PreviewPaneProps {
  graph: QuestionnaireGraph;
  mode?: 'preview' | 'client';
}

export function PreviewPane({ graph, mode = 'preview' }: PreviewPaneProps) {
  const sections = projectGraphToSections(graph);
  const clientView = mode === 'client';
  const totalQuestions = sections.reduce((sum, bucket) => sum + bucket.nodes.length, 0);
  const totalRequired = sections.reduce(
    (sum, bucket) => sum + bucket.nodes.filter((node) => node.required).length,
    0
  );
  const progressValue = totalQuestions > 0 ? Math.round((totalRequired / totalQuestions) * 100) : 0;
  const headerSummary = `${sections.length} sections · ${totalQuestions} questions · ${totalRequired} required`;

  return (
    <Sheet variant="soft" className="assignment-preview-pane" sx={{ p: 1.5, borderRadius: 'lg', height: '100%', overflow: 'auto' }}>
      <Typography level="title-md" sx={{ mb: 0.25 }}>
        {clientView ? 'Client assignment preview' : 'Assignment preview'}
      </Typography>
      <Typography level="body-sm" sx={{ color: 'text.tertiary', mb: 1 }}>
        {clientView
          ? 'This is the same sequence a client sees when completing this assignment.'
          : 'Review section flow, question tone, and required coverage before publishing.'}
      </Typography>
      <Typography level="body-xs" sx={{ color: 'text.tertiary', mb: 0.7 }}>
        {headerSummary}
      </Typography>
      <LinearProgress determinate value={progressValue} size="sm" sx={{ mb: 1.4 }} />
      <Stack spacing={1.25}>
        {sections.length === 0 ? (
          <Typography level="body-sm" sx={{ color: 'text.tertiary' }}>
            No client-visible nodes in this template.
          </Typography>
        ) : (
          sections.map((bucket, idx) => (
            <Sheet
              key={bucket.section?.id ?? `unassigned-${idx}`}
              variant="outlined"
              sx={{
                p: 1.1,
                borderRadius: 'lg',
                borderColor: 'neutral.outlinedBorder',
                bgcolor: idx % 2 === 0 ? 'background.surface' : 'background.level1',
              }}
            >
              <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={0.75}>
                <Typography level="title-sm">{bucket.section?.title ?? 'Unassigned questions'}</Typography>
                <Typography level="body-xs" sx={{ color: 'text.tertiary' }}>
                  {bucket.nodes.length} questions
                </Typography>
              </Stack>
              {bucket.section?.helpText ? (
                <Typography level="body-xs" sx={{ color: 'text.tertiary', mt: 0.35 }}>
                  {bucket.section.helpText}
                </Typography>
              ) : null}
              {bucket.nodes.length === 0 ? (
                <Typography level="body-xs" sx={{ color: 'text.tertiary', mt: 0.5 }}>
                  No question nodes in this section.
                </Typography>
              ) : (
                <List size="sm" sx={{ mt: 0.5 }}>
                  {bucket.nodes.map((node, nodeIndex) => (
                    <ListItem key={node.id} sx={{ p: 0, mb: 0.75 }}>
                      <Stack spacing={0.35} sx={{ width: '100%' }}>
                        <Stack direction="row" spacing={0.55} alignItems="center" useFlexGap sx={{ flexWrap: 'wrap' }}>
                          <Typography level="body-xs" sx={{ color: 'text.tertiary', minWidth: 16 }}>
                            {nodeIndex + 1}.
                          </Typography>
                          <Typography level="body-sm" sx={{ fontWeight: 'md' }}>
                            {node.title}
                          </Typography>
                        </Stack>
                        {node.helpText ? (
                          <Typography level="body-xs" sx={{ color: 'text.tertiary' }}>
                            {node.helpText}
                          </Typography>
                        ) : null}
                        <Stack direction="row" spacing={0.4} useFlexGap sx={{ flexWrap: 'wrap' }}>
                          <Typography level="body-xs" sx={{ color: node.required ? 'warning.600' : 'text.tertiary' }}>
                            {node.required ? 'Required' : 'Optional'}
                          </Typography>
                          {node.labels.slice(0, 2).map((label) => (
                            <Typography key={label} level="body-xs" sx={{ color: 'text.tertiary' }}>
                              {filingLabelText(label)}
                            </Typography>
                          ))}
                        </Stack>
                      </Stack>
                    </ListItem>
                  ))}
                </List>
              )}
              {clientView ? (
                <Typography level="body-xs" sx={{ color: 'text.tertiary', mt: 0.5 }}>
                  Client sees this section as a guided step in sequence.
                </Typography>
              ) : null}
              {idx < sections.length - 1 ? <Divider sx={{ mt: 1 }} /> : null}
            </Sheet>
          ))
        )}
      </Stack>
    </Sheet>
  );
}
