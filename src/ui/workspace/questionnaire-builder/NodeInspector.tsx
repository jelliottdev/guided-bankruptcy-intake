import { useEffect, useState } from 'react';
import Button from '@mui/joy/Button';
import Checkbox from '@mui/joy/Checkbox';
import Chip from '@mui/joy/Chip';
import FormControl from '@mui/joy/FormControl';
import FormLabel from '@mui/joy/FormLabel';
import IconButton from '@mui/joy/IconButton';
import Input from '@mui/joy/Input';
import Option from '@mui/joy/Option';
import Select from '@mui/joy/Select';
import Sheet from '@mui/joy/Sheet';
import Stack from '@mui/joy/Stack';
import Textarea from '@mui/joy/Textarea';
import Typography from '@mui/joy/Typography';
import { FILING_LABEL_OPTIONS } from '../../../questionnaires/labels';
import type { QuestionInputType, QuestionnaireGraph, QuestionnaireNode } from '../../../questionnaires/types';

const INPUT_TYPES: Array<{ id: QuestionInputType; label: string }> = [
  { id: 'text', label: 'Text' },
  { id: 'textarea', label: 'Textarea' },
  { id: 'email', label: 'Email' },
  { id: 'number', label: 'Number' },
  { id: 'date', label: 'Date' },
  { id: 'yes_no', label: 'Yes / No' },
  { id: 'single_select', label: 'Single select' },
  { id: 'multi_select', label: 'Multi select' },
  { id: 'grid', label: 'Grid table' },
  { id: 'file_upload', label: 'File upload' },
];

interface NodeInspectorProps {
  graph: QuestionnaireGraph;
  selectedNodeId: string | null;
  onGraphChange: (next: QuestionnaireGraph) => void;
  onSelectNode?: (nodeId: string) => void;
}

export function NodeInspector({
  graph,
  selectedNodeId,
  onGraphChange,
  onSelectNode,
}: NodeInspectorProps) {
  const node = graph.nodes.find((item) => item.id === selectedNodeId) ?? null;
  const summary = {
    sections: graph.nodes.filter((item) => item.kind === 'section').length,
    questions: graph.nodes.filter((item) => item.kind === 'question').length,
    decisions: graph.nodes.filter((item) => item.kind === 'decision').length,
    docs: graph.nodes.filter((item) => item.kind === 'doc_request').length,
    edges: graph.edges.length,
  };
  const [draftTitle, setDraftTitle] = useState(node?.title ?? '');
  const [draftHelpText, setDraftHelpText] = useState(node?.helpText ?? '');
  const [draftPlaceholder, setDraftPlaceholder] = useState(node?.placeholder ?? '');
  const [draftTagsText, setDraftTagsText] = useState(node?.customTags?.join(', ') ?? '');
  const nodeKindLabel = node ? formatNodeKind(node.kind) : '';

  useEffect(() => {
    setDraftTitle(node?.title ?? '');
    setDraftHelpText(node?.helpText ?? '');
    setDraftPlaceholder(node?.placeholder ?? '');
    setDraftTagsText(node?.customTags?.join(', ') ?? '');
  }, [node?.id, node?.title, node?.helpText, node?.placeholder, node?.customTags]);

  if (!node) {
    return (
      <Sheet variant="soft" sx={{ p: 1.5, borderRadius: 'lg', height: '100%' }}>
        <Typography level="title-sm">Inspector</Typography>
        <Typography level="body-sm" sx={{ color: 'text.tertiary', mt: 0.5 }}>
          Select a journey step to edit wording, response setup, and workflow behavior.
        </Typography>
        <Typography level="title-sm" sx={{ mt: 1.1 }}>
          Journey summary
        </Typography>
        <Stack spacing={0.45} sx={{ mt: 0.5 }}>
          <Typography level="body-sm">• {summary.sections} chapters</Typography>
          <Typography level="body-sm">• {summary.questions} questions</Typography>
          <Typography level="body-sm">• {summary.decisions} conditional paths</Typography>
          <Typography level="body-sm">• {summary.docs} document requests</Typography>
          <Typography level="body-sm">• {summary.edges} flow rules</Typography>
        </Stack>
      </Sheet>
    );
  }

  const sectionNodes = graph.nodes.filter((item) => item.kind === 'section');
  const canEditOptions =
    node?.kind === 'decision' ||
    ((node?.kind === 'question' || node?.kind === 'doc_request') &&
      (node.inputType === 'single_select' || node.inputType === 'multi_select'));
  const canEditPlaceholder = ['text', 'textarea', 'email', 'number', 'date'].includes(
    node.inputType ?? ''
  );
  const canEditGrid = node.inputType === 'grid';
  const isSystemBoundaryNode = node.kind === 'start' || node.kind === 'end';
  const sectionQuestions =
    node.kind === 'section'
      ? graph.nodes
          .filter(
            (item) =>
              item.sectionId === node.id &&
              (item.kind === 'question' || item.kind === 'doc_request' || item.kind === 'decision')
          )
          .sort((a, b) => a.title.localeCompare(b.title))
      : [];

  const updateNode = (patch: Partial<QuestionnaireNode>) => {
    onGraphChange({
      ...graph,
      nodes: graph.nodes.map((item) => (item.id === node.id ? { ...item, ...patch } : item)),
    });
  };

  const deleteNode = () => {
    if (isSystemBoundaryNode) return;
    onGraphChange({
      ...graph,
      nodes: graph.nodes.filter((item) => item.id !== node.id),
      edges: graph.edges.filter((edge) => edge.from !== node.id && edge.to !== node.id),
    });
  };

  const optionsText = (node.options ?? []).map((option) => option.label).join('\n');
  const updateOptionLabel = (index: number, label: string) => {
    const current = [...(node.options ?? [])];
    if (!current[index]) return;
    current[index] = { ...current[index], label };
    updateNode({ options: current });
  };
  const removeOption = (index: number) => {
    const current = [...(node.options ?? [])];
    current.splice(index, 1);
    updateNode({ options: current });
  };
  const addOption = () => {
    const current = [...(node.options ?? [])];
    current.push({ id: `opt-${current.length + 1}`, label: `Option ${current.length + 1}` });
    updateNode({ options: current });
  };
  const moveOption = (index: number, direction: 'up' | 'down') => {
    const current = [...(node.options ?? [])];
    if (!current[index]) return;
    const target = direction === 'up' ? index - 1 : index + 1;
    if (target < 0 || target >= current.length) return;
    const swap = current[target];
    current[target] = current[index];
    current[index] = swap;
    updateNode({ options: current });
  };
  const updateInputType = (next: QuestionInputType | undefined) => {
    const patch: Partial<QuestionnaireNode> = { inputType: next };
    if (next === 'single_select' || next === 'multi_select') {
      if (!node.options || node.options.length < 2) {
        patch.options = [
          { id: 'opt-1', label: 'Option 1' },
          { id: 'opt-2', label: 'Option 2' },
        ];
      }
    } else if (next === 'yes_no') {
      patch.options = undefined;
    } else if (next === 'file_upload') {
      patch.fileRules = node.fileRules ?? { minFiles: 1 };
      patch.labels = node.labels.length > 0 ? node.labels : ['documents'];
      patch.required = true;
      patch.rows = undefined;
      patch.columns = undefined;
    } else if (next === 'grid') {
      patch.rows =
        node.rows && node.rows.length > 0
          ? node.rows
          : [
              { id: 'row_1', label: 'Row 1' },
              { id: 'row_2', label: 'Row 2' },
            ];
      patch.columns =
        node.columns && node.columns.length > 0
          ? node.columns
          : [
              { id: 'column_1', label: 'Column 1' },
              { id: 'column_2', label: 'Column 2' },
            ];
      patch.options = undefined;
    } else if (node.kind === 'question' || node.kind === 'doc_request') {
      patch.options = undefined;
      patch.rows = undefined;
      patch.columns = undefined;
    }
    updateNode(patch);
  };
  const updateGridRows = (text: string) => {
    const rows = text
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((label, index) => ({
        id: `row_${index + 1}`,
        label,
      }));
    updateNode({ rows });
  };
  const updateGridColumns = (text: string) => {
    const columns = text
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((label, index) => ({
        id: `column_${index + 1}`,
        label,
      }));
    updateNode({ columns });
  };
  const commitTags = () => {
    const next = draftTagsText
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean);
    updateNode({ customTags: next.length > 0 ? next : undefined });
  };

  return (
    <Sheet variant="soft" sx={{ p: 1.5, borderRadius: 'lg', height: '100%', overflow: 'auto' }}>
      <Stack spacing={1.1}>
        <Typography level="title-sm">Step inspector</Typography>
        <Chip size="sm" variant="soft" color="neutral" sx={{ alignSelf: 'flex-start' }}>
          {nodeKindLabel}
        </Chip>

        <Typography level="body-xs" sx={{ color: 'text.secondary', fontWeight: 700 }}>
          Overview
        </Typography>

        <FormControl size="sm">
          <FormLabel>Title</FormLabel>
          <Input
            value={draftTitle}
            onChange={(event) => setDraftTitle(event.target.value)}
            onBlur={() => {
              if (draftTitle !== node.title) updateNode({ title: draftTitle.trim() || 'Untitled' });
            }}
          />
        </FormControl>

        <FormControl size="sm">
          <FormLabel>Help text</FormLabel>
          <Textarea
            minRows={2}
            value={draftHelpText}
            onChange={(event) => setDraftHelpText(event.target.value)}
            onBlur={() => {
              const next = draftHelpText.trim();
              if (next !== (node.helpText ?? '')) updateNode({ helpText: next || undefined });
            }}
          />
        </FormControl>

        {node.kind === 'section' ? (
          <Typography level="body-xs" sx={{ color: 'text.tertiary' }}>
            This chapter groups related prompts into one client step.
          </Typography>
        ) : null}

        <Typography level="body-xs" sx={{ color: 'text.secondary', fontWeight: 700 }}>
          Response setup
        </Typography>

        {canEditPlaceholder ? (
          <FormControl size="sm">
            <FormLabel>Placeholder / example</FormLabel>
            <Input
              value={draftPlaceholder}
              onChange={(event) => setDraftPlaceholder(event.target.value)}
              onBlur={() => {
                const next = draftPlaceholder.trim();
                if (next !== (node.placeholder ?? '')) updateNode({ placeholder: next || undefined });
              }}
              placeholder="Shown as input hint"
            />
          </FormControl>
        ) : null}

        {(node.kind === 'question' || node.kind === 'decision' || node.kind === 'doc_request') && (
          <FormControl size="sm">
            <FormLabel>Input type</FormLabel>
            <Select
              value={node.inputType ?? null}
              onChange={(_, next) => updateInputType((next ?? undefined) as QuestionInputType | undefined)}
            >
              {INPUT_TYPES.map((item) => (
                <Option key={item.id} value={item.id}>
                  {item.label}
                </Option>
              ))}
            </Select>
          </FormControl>
        )}

        {(node.kind === 'question' || node.kind === 'doc_request' || node.kind === 'decision') && (
          <>
            <FormControl size="sm">
              <FormLabel>Labels</FormLabel>
              <Stack direction="row" spacing={0.5} useFlexGap sx={{ flexWrap: 'wrap' }}>
                {FILING_LABEL_OPTIONS.map((label) => {
                  const selected = node.labels.includes(label.id);
                  return (
                    <Chip
                      key={label.id}
                      size="sm"
                      variant={selected ? 'solid' : 'soft'}
                      color={selected ? 'primary' : 'neutral'}
                      sx={{ cursor: 'pointer' }}
                      onClick={() => {
                        if (selected && node.labels.length === 1) return;
                        const next = selected
                          ? node.labels.filter((item) => item !== label.id)
                          : [...node.labels, label.id];
                        updateNode({ labels: next });
                      }}
                    >
                      {label.label}
                    </Chip>
                  );
                })}
              </Stack>
              <Typography level="body-xs" sx={{ color: 'text.tertiary', mt: 0.4 }}>
                At least one label is required for question/doc/decision nodes.
              </Typography>
            </FormControl>

            {canEditOptions ? (
              <FormControl size="sm">
                <FormLabel>Options</FormLabel>
                <Stack spacing={0.6}>
                  {(node.options ?? []).map((option, idx) => (
                    <Stack key={option.id} direction="row" spacing={0.5}>
                      <Input
                        value={option.label}
                        onChange={(event) => updateOptionLabel(idx, event.target.value)}
                      />
                      <IconButton
                        variant="soft"
                        color="neutral"
                        onClick={() => moveOption(idx, 'up')}
                        aria-label="Move option up"
                        disabled={idx === 0}
                      >
                        ↑
                      </IconButton>
                      <IconButton
                        variant="soft"
                        color="neutral"
                        onClick={() => moveOption(idx, 'down')}
                        aria-label="Move option down"
                        disabled={idx === (node.options?.length ?? 0) - 1}
                      >
                        ↓
                      </IconButton>
                      <IconButton
                        variant="soft"
                        color="danger"
                        onClick={() => removeOption(idx)}
                        aria-label="Remove option"
                      >
                        −
                      </IconButton>
                    </Stack>
                  ))}
                  <Button size="sm" variant="soft" onClick={addOption}>
                    Add option
                  </Button>
                </Stack>
                {optionsText.trim().length === 0 ? (
                  <Typography level="body-xs" sx={{ color: 'text.tertiary', mt: 0.4 }}>
                    Add at least two options for branching/select fields.
                  </Typography>
                ) : null}
              </FormControl>
            ) : null}
          </>
        )}

        {node.kind === 'section' ? (
          <FormControl size="sm">
            <FormLabel>Questions in this section</FormLabel>
            {sectionQuestions.length === 0 ? (
              <Typography level="body-xs" sx={{ color: 'text.tertiary' }}>
                No questions are currently assigned to this section.
              </Typography>
            ) : (
              <Stack spacing={0.45}>
                {sectionQuestions.map((item) => (
                  <Stack
                    key={item.id}
                    direction="row"
                    spacing={0.5}
                    alignItems="center"
                    justifyContent="space-between"
                    sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 'sm', p: 0.45 }}
                  >
                    <Stack spacing={0.1} sx={{ minWidth: 0 }}>
                      <Typography level="body-xs" sx={{ fontWeight: 700 }} noWrap>
                        {item.title}
                      </Typography>
                      <Typography level="body-xs" sx={{ color: 'text.tertiary' }}>
                        {item.kind.replace(/_/g, ' ')}
                      </Typography>
                    </Stack>
                    <Button
                      size="sm"
                      variant="soft"
                      onClick={() => onSelectNode?.(item.id)}
                      disabled={!onSelectNode}
                    >
                      Edit
                    </Button>
                  </Stack>
                ))}
              </Stack>
            )}
          </FormControl>
        ) : null}

        {(node.kind === 'question' || node.kind === 'doc_request') && node.inputType === 'file_upload' ? (
          <Stack spacing={0.75}>
            <Typography level="body-xs" sx={{ fontWeight: 700, color: 'text.secondary' }}>
              File upload rules
            </Typography>
            <Stack direction="row" spacing={0.75}>
              <FormControl size="sm" sx={{ flex: 1 }}>
                <FormLabel>Min files</FormLabel>
                <Input
                  type="number"
                  value={String(node.fileRules?.minFiles ?? 1)}
                  onChange={(event) => {
                    const parsed = Number.parseInt(event.target.value || '1', 10);
                    updateNode({
                      fileRules: {
                        ...(node.fileRules ?? {}),
                        minFiles: Number.isFinite(parsed) && parsed > 0 ? parsed : 1,
                      },
                    });
                  }}
                />
              </FormControl>
              <FormControl size="sm" sx={{ flex: 1 }}>
                <FormLabel>Max size (MB)</FormLabel>
                <Input
                  type="number"
                  value={String(node.fileRules?.maxSizeMb ?? 25)}
                  onChange={(event) => {
                    const parsed = Number.parseInt(event.target.value || '25', 10);
                    updateNode({
                      fileRules: {
                        ...(node.fileRules ?? {}),
                        maxSizeMb: Number.isFinite(parsed) && parsed > 0 ? parsed : 25,
                      },
                    });
                  }}
                />
              </FormControl>
            </Stack>
            <FormControl size="sm">
              <FormLabel>Accepted MIME types (comma separated)</FormLabel>
              <Input
                value={(node.fileRules?.allowedMime ?? []).join(', ')}
                placeholder="application/pdf, image/jpeg"
                onChange={(event) => {
                  const values = event.target.value
                    .split(',')
                    .map((value) => value.trim())
                    .filter(Boolean);
                  updateNode({
                    fileRules: {
                      ...(node.fileRules ?? {}),
                      allowedMime: values.length > 0 ? values : undefined,
                    },
                  });
                }}
              />
            </FormControl>
          </Stack>
        ) : null}

        {canEditGrid ? (
          <Stack spacing={0.75}>
            <Typography level="body-xs" sx={{ fontWeight: 700, color: 'text.secondary' }}>
              Grid rows and columns
            </Typography>
            <FormControl size="sm">
              <FormLabel>Rows (one per line)</FormLabel>
              <Textarea
                minRows={3}
                value={(node.rows ?? []).map((row) => row.label).join('\n')}
                onChange={(event) => updateGridRows(event.target.value)}
              />
            </FormControl>
            <FormControl size="sm">
              <FormLabel>Columns (one per line)</FormLabel>
              <Textarea
                minRows={3}
                value={(node.columns ?? []).map((column) => column.label).join('\n')}
                onChange={(event) => updateGridColumns(event.target.value)}
              />
            </FormControl>
          </Stack>
        ) : null}

        <FormControl size="sm">
          <FormLabel>Custom tags</FormLabel>
          <Input
            value={draftTagsText}
            placeholder="foreclosure, payroll, trustee"
            onChange={(event) => setDraftTagsText(event.target.value)}
            onBlur={commitTags}
          />
        </FormControl>

        <Typography level="body-xs" sx={{ color: 'text.secondary', fontWeight: 700 }}>
          Workflow behavior
        </Typography>

        {(node.kind === 'question' || node.kind === 'doc_request' || node.kind === 'decision') && (
          <Stack direction="row" spacing={1}>
            <Checkbox
              label="Required"
              checked={Boolean(node.required)}
              onChange={(event) => updateNode({ required: event.target.checked })}
            />
            <Checkbox
              label="Blocks workflow"
              checked={Boolean(node.blocksWorkflow)}
              onChange={(event) => updateNode({ blocksWorkflow: event.target.checked })}
            />
          </Stack>
        )}

        <Checkbox
          label="Client visible"
          checked={Boolean(node.clientVisible)}
          onChange={(event) => updateNode({ clientVisible: event.target.checked })}
        />

        <FormControl size="sm">
          <FormLabel>Section</FormLabel>
          <Select
            value={node.sectionId ?? null}
            onChange={(_, next) => updateNode({ sectionId: (next ?? undefined) as string | undefined })}
          >
            <Option value={null}>No section</Option>
            {sectionNodes.map((section) => (
              <Option key={section.id} value={section.id}>
                {section.title}
              </Option>
            ))}
          </Select>
        </FormControl>

        <Typography level="body-xs" sx={{ color: 'text.secondary', fontWeight: 700 }}>
          Danger zone
        </Typography>
        <Button color="danger" variant="soft" onClick={deleteNode} disabled={isSystemBoundaryNode}>
          Delete node
        </Button>
        {isSystemBoundaryNode ? (
          <Typography level="body-xs" sx={{ color: 'text.tertiary' }}>
            Start and End nodes are protected.
          </Typography>
        ) : null}
      </Stack>
    </Sheet>
  );
}

function formatNodeKind(kind: QuestionnaireNode['kind']): string {
  switch (kind) {
    case 'doc_request':
      return 'Document request';
    case 'approval_gate':
      return 'Approval gate';
    default:
      return kind.replace(/_/g, ' ');
  }
}
