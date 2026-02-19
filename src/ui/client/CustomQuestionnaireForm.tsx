import Button from '@mui/joy/Button';
import Sheet from '@mui/joy/Sheet';
import Stack from '@mui/joy/Stack';
import Typography from '@mui/joy/Typography';
import type { QuestionnaireAssignment, QuestionnaireTemplate } from '../../questionnaires/types';

interface CustomQuestionnaireFormProps {
  template: QuestionnaireTemplate;
  assignment: QuestionnaireAssignment;
  answers: Record<string, string>;
  onChangeAnswer: (questionId: string, value: string) => void;
  onSubmitAssignment: () => void;
  onBackToDashboard: () => void;
}

export function CustomQuestionnaireForm({
  template,
  assignment,
  onSubmitAssignment,
  onBackToDashboard,
}: CustomQuestionnaireFormProps) {
  const version = template.versions.find((item) => item.version === assignment.templateVersion);
  const nodeCount = version?.graph.nodes.length ?? 0;

  return (
    <Sheet variant="plain" className="custom-questionnaire">
      <Stack spacing={1.25}>
        <Sheet variant="soft" sx={{ p: 1.25, borderRadius: 'lg' }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <div>
              <Typography level="title-lg">{assignment.title}</Typography>
              <Typography level="body-sm" sx={{ color: 'text.tertiary' }}>
                {template.description}
              </Typography>
            </div>
            <Button size="sm" variant="soft" onClick={onBackToDashboard}>
              Back to dashboard
            </Button>
          </Stack>
        </Sheet>

        <Sheet variant="outlined" sx={{ p: 1.25, borderRadius: 'lg' }}>
          <Stack spacing={1}>
            {nodeCount === 0 ? (
              <Typography level="body-sm" sx={{ color: 'text.tertiary' }}>
                This questionnaire version does not include any workflow nodes yet.
              </Typography>
            ) : (
              <Typography level="body-sm" sx={{ color: 'text.tertiary' }}>
                This legacy form is retained as a compatibility shim. Open the assignment through
                the new assignment runner for full branching, file uploads, and skip-with-reason flow.
              </Typography>
            )}
            <Button
              onClick={onSubmitAssignment}
              disabled={nodeCount === 0}
            >
              Submit assignment
            </Button>
          </Stack>
        </Sheet>
      </Stack>
    </Sheet>
  );
}
