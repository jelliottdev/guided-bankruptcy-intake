import { useEffect, useMemo, useRef, useState } from 'react';
import Box from '@mui/joy/Box';
import Button from '@mui/joy/Button';
import Drawer from '@mui/joy/Drawer';
import FormControl from '@mui/joy/FormControl';
import FormLabel from '@mui/joy/FormLabel';
import Input from '@mui/joy/Input';
import LinearProgress from '@mui/joy/LinearProgress';
import List from '@mui/joy/List';
import ListDivider from '@mui/joy/ListDivider';
import ListItem from '@mui/joy/ListItem';
import ListItemButton from '@mui/joy/ListItemButton';
import ListItemContent from '@mui/joy/ListItemContent';
import Modal from '@mui/joy/Modal';
import ModalClose from '@mui/joy/ModalClose';
import ModalDialog from '@mui/joy/ModalDialog';
import Option from '@mui/joy/Option';
import Select from '@mui/joy/Select';
import Sheet from '@mui/joy/Sheet';
import Stack from '@mui/joy/Stack';
import Table from '@mui/joy/Table';
import Textarea from '@mui/joy/Textarea';
import Typography from '@mui/joy/Typography';
import Tooltip from '@mui/joy/Tooltip';
import type { NodeResponse, QuestionnaireAssignment, QuestionnaireNode, QuestionnaireTemplate, ResponseValue } from '../../questionnaires/types';
import { projectGraphToSections } from '../workspace/questionnaire-builder/graphProjection';
import { buildLegacyAnswersFromResponses, evaluateNodeVisibility } from '../../questionnaires/runtime/evaluateVisibility';
import { deriveAssignmentProgress } from '../../questionnaires/runtime/stage';
import { getFilesFromValue, withAppendedFiles, type ResponseFileMeta } from '../../questionnaires/runtime/filesValue';
import { putBlob } from '../../files/blobStore';
import { upsertOcrResult } from '../../ocr/store';
import { enqueueOcr } from '../../ocr/queue';
import { CreditorInput } from './CreditorInput';
import { DocumentUploadWithOcr } from '../fields/DocumentUploadWithOcr';
import { getOcrConfig, shouldUseOcr } from '../../config/documentOcrConfig';

function newFileId(): string {
  try {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  } catch {
    // ignore
  }
  return `file-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

interface AssignmentRunnerProps {
  template: QuestionnaireTemplate;
  assignment: QuestionnaireAssignment;
  responses: NodeResponse[];
  onChangeResponse: (nodeId: string, value: ResponseValue) => void;
  onSkipNode: (nodeId: string, reason: string) => void;
  onSubmit: () => void;
  onBackToDashboard: () => void;
  initialSectionId?: string;
  focusNodeId?: string;
}

export function AssignmentRunner({
  template,
  assignment,
  responses,
  onChangeResponse,
  onSkipNode,
  onSubmit,
  onBackToDashboard,
  initialSectionId,
  focusNodeId,
}: AssignmentRunnerProps) {
  const version = template.versions.find((item) => item.version === assignment.templateVersion);
  const graph = version?.graph;

  const responseByNode = useMemo(
    () => new Map(responses.map((item) => [item.nodeId, item])),
    [responses]
  );

  // Compute answers for OCR context
  const answers = useMemo(
    () => (graph ? buildLegacyAnswersFromResponses(graph, responseByNode) : {}),
    [graph, responseByNode]
  );

  const sections = useMemo(() => {
    if (!graph) return [];
    const answers = buildLegacyAnswersFromResponses(graph, responseByNode);
    const projected = projectGraphToSections(graph);
    return projected
      .map((bucket) => ({
        ...bucket,
        nodes: bucket.nodes.filter((node) => evaluateNodeVisibility(node, graph, responseByNode, answers)),
      }))
      .filter((bucket) => bucket.nodes.length > 0);
  }, [graph, responseByNode]);

  const progress = useMemo(
    () => deriveAssignmentProgress(assignment, template, responses),
    [assignment, template, responses]
  );

  const missingRequired = useMemo(() => {
    const list: QuestionnaireNode[] = [];
    for (const bucket of sections) {
      for (const node of bucket.nodes) {
        if (!node.required) continue;
        const response = responseByNode.get(node.id);
        if (hasResponse(response?.value) || response?.skipped) continue;
        list.push(node);
      }
    }
    return list;
  }, [sections, responseByNode]);

  const totalVisibleQuestions = useMemo(
    () => sections.reduce((sum, bucket) => sum + bucket.nodes.length, 0),
    [sections]
  );

  const answeredCount = useMemo(() => {
    let answered = 0;
    for (const bucket of sections) {
      for (const node of bucket.nodes) {
        const response = responseByNode.get(node.id);
        if (response?.skipped) continue;
        if (hasResponse(response?.value)) answered += 1;
      }
    }
    return answered;
  }, [responseByNode, sections]);

  const deferredCount = useMemo(() => {
    let deferred = 0;
    for (const bucket of sections) {
      for (const node of bucket.nodes) {
        const response = responseByNode.get(node.id);
        if (response?.skipped?.by === 'client') deferred += 1;
      }
    }
    return deferred;
  }, [responseByNode, sections]);

  const deferredRequiredCount = useMemo(() => {
    let deferred = 0;
    for (const bucket of sections) {
      for (const node of bucket.nodes) {
        if (!node.required) continue;
        const response = responseByNode.get(node.id);
        if (response?.skipped?.by === 'client') deferred += 1;
      }
    }
    return deferred;
  }, [responseByNode, sections]);

  const [activeSectionIndex, setActiveSectionIndex] = useState(0);
  const [sectionsDrawerOpen, setSectionsDrawerOpen] = useState(false);
  const [deferTarget, setDeferTarget] = useState<{ nodeId: string; title: string } | null>(null);
  const [deferReason, setDeferReason] = useState('');
  const lastFocusedRef = useRef('');
  const lastAssignmentResetRef = useRef('');

  useEffect(() => {
    setActiveSectionIndex((current) => {
      if (sections.length === 0) return 0;
      return Math.min(current, sections.length - 1);
    });
  }, [sections.length]);

  useEffect(() => {
    if (!assignment?.id) return;
    if (lastAssignmentResetRef.current === assignment.id) return;
    lastAssignmentResetRef.current = assignment.id;
    setActiveSectionIndex(() => {
      if (sections.length === 0) return 0;
      if (!initialSectionId) return 0;
      const idx = sections.findIndex((bucket) => bucket.section?.id === initialSectionId);
      return idx >= 0 ? idx : 0;
    });
  }, [assignment?.id, initialSectionId, sections]);

  useEffect(() => {
    if (!initialSectionId) return;
    const idx = sections.findIndex((bucket) => bucket.section?.id === initialSectionId);
    if (idx >= 0) setActiveSectionIndex(idx);
  }, [initialSectionId, sections]);

  useEffect(() => {
    if (!focusNodeId) {
      lastFocusedRef.current = '';
      return;
    }
    if (!assignment?.id) return;
    const focusKey = `${assignment.id}:${focusNodeId}`;
    if (lastFocusedRef.current === focusKey) return;

    const timer = window.setTimeout(() => {
      const container = document.getElementById(`assignment-node-${focusNodeId}`);
      if (!container) return;
      container.scrollIntoView({ behavior: 'smooth', block: 'center' });
      const focusable =
        (container.querySelector('[data-assignment-focus]') as HTMLElement | null) ??
        (container.querySelector('input, textarea, button, [tabindex]') as HTMLElement | null);
      focusable?.focus?.();
      lastFocusedRef.current = focusKey;
    }, 60);

    return () => window.clearTimeout(timer);
  }, [activeSectionIndex, assignment?.id, focusNodeId, sections.length]);

  const activeBucket = sections[activeSectionIndex] ?? null;
  const activeSectionRequiredMissing = useMemo(() => {
    if (!activeBucket) return 0;
    let count = 0;
    for (const node of activeBucket.nodes) {
      if (!node.required) continue;
      const response = responseByNode.get(node.id);
      if (hasResponse(response?.value) || response?.skipped) continue;
      count += 1;
    }
    return count;
  }, [activeBucket, responseByNode]);

  const sectionRows = useMemo(() => {
    return sections.map((bucket, idx) => {
      const total = bucket.nodes.length;
      let answered = 0;
      let missingRequiredCount = 0;
      for (const node of bucket.nodes) {
        const response = responseByNode.get(node.id);
        const has = hasResponse(response?.value) || Boolean(response?.skipped);
        if (has) answered += 1;
        if (node.required && !has) missingRequiredCount += 1;
      }
      const percent = total > 0 ? Math.round((answered / total) * 100) : 0;
      return {
        idx,
        id: bucket.section?.id ?? `section-${idx}`,
        title: bucket.section?.title ?? `Section ${idx + 1}`,
        total,
        answered,
        percent,
        missingRequiredCount,
      };
    });
  }, [responseByNode, sections]);

  if (!graph) {
    return (
      <Sheet variant="soft" sx={{ p: 1.25, borderRadius: 'lg' }}>
        <Typography level="title-md">Assignment unavailable</Typography>
        <Typography level="body-sm" sx={{ color: 'text.tertiary', mb: 1 }}>
          This assignment references a template version that no longer exists.
        </Typography>
        <Button size="sm" variant="soft" onClick={onBackToDashboard}>
          Back to dashboard
        </Button>
      </Sheet>
    );
  }

  return (
    <Sheet variant="plain" className="custom-questionnaire">
      <Stack spacing={1.25}>
        <Sheet variant="soft" sx={{ p: 1.25, borderRadius: 'lg' }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
            <div>
              <Typography level="title-lg">{assignment.title}</Typography>
              <Typography level="body-sm" sx={{ color: 'text.tertiary' }}>
                {template.description}
              </Typography>
              <Stack direction="row" spacing={0.75} useFlexGap sx={{ flexWrap: 'wrap', mt: 0.4 }}>
                <Typography level="body-xs" sx={{ color: 'text.tertiary' }}>
                  Answered {answeredCount}/{totalVisibleQuestions}
                </Typography>
                <Typography level="body-xs" sx={{ color: 'text.tertiary' }}>
                  Required unanswered: {missingRequired.length}
                </Typography>
                <Typography level="body-xs" sx={{ color: 'text.tertiary' }}>
                  Deferred: {deferredCount}
                </Typography>
              </Stack>
            </div>
            <Stack direction="row" spacing={0.6} alignItems="center">
              {sections.length > 1 ? (
                <Button size="sm" variant="soft" onClick={() => setSectionsDrawerOpen(true)}>
                  Sections
                </Button>
              ) : null}
              <Button size="sm" variant="soft" onClick={onBackToDashboard}>
                Back to dashboard
              </Button>
            </Stack>
          </Stack>
          <LinearProgress
            determinate
            value={progress.percent}
            thickness={6}
            sx={{
              mt: 1.5,
              borderRadius: 'sm',
              color: 'primary.500',
              bgcolor: 'background.level3',
              boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.08)',
            }}
          />
        </Sheet>

        <Drawer open={sectionsDrawerOpen} onClose={() => setSectionsDrawerOpen(false)}>
          <ModalClose />
          <Box sx={{ p: 1.5 }}>
            <Typography level="title-md">Sections</Typography>
            <Typography level="body-sm" sx={{ color: 'text.tertiary', mt: 0.25 }}>
              Jump to a different section if needed.
            </Typography>
          </Box>
          <ListDivider />
          <Box sx={{ p: 1.25, pt: 1, overflow: 'auto' }}>
            <List size="sm" sx={{ '--List-gap': '0.35rem' }}>
              {sectionRows.map((row) => (
                <ListItem key={row.id} sx={{ p: 0 }}>
                  <ListItemButton
                    onClick={() => {
                      setActiveSectionIndex(row.idx);
                      setSectionsDrawerOpen(false);
                    }}
                    sx={{
                      borderRadius: 'md',
                      border: '1px solid',
                      borderColor: row.idx === activeSectionIndex ? 'primary.300' : 'divider',
                      bgcolor: 'background.surface',
                      alignItems: 'flex-start',
                      display: 'grid',
                      gap: 0.45,
                    }}
                  >
                    <ListItemContent>
                      <Typography level="body-sm" sx={{ fontWeight: 800 }}>
                        {row.idx + 1}. {row.title}
                      </Typography>
                      <Typography level="body-xs" sx={{ color: 'text.tertiary' }}>
                        {row.answered}/{row.total} answered
                        {row.missingRequiredCount > 0 ? ` · ${row.missingRequiredCount} required remaining` : ''}
                      </Typography>
                      <LinearProgress
                        determinate
                        value={row.percent}
                        thickness={4}
                        sx={{ mt: 0.6, bgcolor: 'background.level2', color: 'primary.400' }}
                      />
                    </ListItemContent>
                  </ListItemButton>
                </ListItem>
              ))}
            </List>
          </Box>
        </Drawer>

        <Modal
          open={Boolean(deferTarget)}
          onClose={() => {
            setDeferTarget(null);
            setDeferReason('');
          }}
        >
          <ModalDialog variant="outlined" sx={{ width: 'min(560px, calc(100vw - 24px))' }}>
            <ModalClose />
            <Typography level="title-md">Defer this item</Typography>
            <Typography level="body-sm" sx={{ color: 'text.tertiary', mt: 0.25 }}>
              Tell us why you can’t provide this right now. Your attorney will follow up.
            </Typography>

            <Sheet variant="soft" sx={{ p: 0.85, borderRadius: 'md', mt: 1 }}>
              <Typography level="body-sm" sx={{ fontWeight: 700 }}>
                {deferTarget?.title ?? 'Prompt'}
              </Typography>
            </Sheet>

            <FormControl sx={{ mt: 1 }}>
              <FormLabel>Reason</FormLabel>
              <Textarea
                minRows={3}
                value={deferReason}
                onChange={(e) => setDeferReason(e.target.value)}
                placeholder="e.g. I don’t have access to this document yet."
                slotProps={{ textarea: { 'data-assignment-focus': 'true' } }}
              />
            </FormControl>

            <Stack direction="row" justifyContent="flex-end" spacing={0.75} sx={{ mt: 1.25 }}>
              <Button
                variant="soft"
                onClick={() => {
                  setDeferTarget(null);
                  setDeferReason('');
                }}
              >
                Cancel
              </Button>
              <Button
                variant="solid"
                disabled={deferReason.trim().length < 8 || !deferTarget}
                onClick={() => {
                  if (!deferTarget) return;
                  const reason = deferReason.trim();
                  if (reason.length < 8) return;
                  onSkipNode(deferTarget.nodeId, reason);
                  setDeferTarget(null);
                  setDeferReason('');
                }}
              >
                Defer
              </Button>
            </Stack>
          </ModalDialog>
        </Modal>

        {activeBucket ? (
          <Sheet variant="outlined" sx={{ p: 1.25, borderRadius: 'lg' }}>
            <Stack direction="row" spacing={1} alignItems="flex-start" justifyContent="space-between">
              <Box sx={{ minWidth: 0 }}>
                <Typography level="title-md">{activeBucket.section?.title ?? 'Questions'}</Typography>
                <Typography level="body-xs" sx={{ color: 'text.tertiary', mt: 0.2 }}>
                  Section {activeSectionIndex + 1} of {sections.length}
                  {activeSectionRequiredMissing > 0
                    ? ` · ${activeSectionRequiredMissing} required remaining in this section`
                    : ''}
                </Typography>
              </Box>
            </Stack>
            <Stack spacing={1} sx={{ mt: 1 }}>
              {activeBucket.nodes.map((node) => {
                const response = responseByNode.get(node.id);
                const value = response?.value;
                const canDefer = node.required === true || node.kind === 'doc_request';
                return (
                  <Sheet
                    key={node.id}
                    id={`assignment-node-${node.id}`}
                    variant="soft"
                    sx={{
                      p: 0.9,
                      borderRadius: 'md',
                      border: '1px solid',
                      borderColor: 'neutral.outlinedBorder',
                    }}
                  >
                    <FormControl size="sm" required={Boolean(node.required)}>
                      <FormLabel>
                        {node.title}
                        {node.whyWeAsk ? (
                          <Tooltip
                            title={
                              <Box sx={{ maxWidth: 280, p: 0.5 }}>
                                <Typography level="title-sm" sx={{ mb: 0.5, color: 'primary.200' }}>
                                  Why we ask
                                </Typography>
                                <Typography level="body-sm" textColor="common.white">
                                  {node.whyWeAsk}
                                </Typography>
                              </Box>
                            }
                            variant="solid"
                            color="neutral"
                            placement="top"
                            arrow
                            sx={{
                              backdropFilter: 'blur(12px)',
                              bgcolor: 'rgba(20, 20, 25, 0.85)',
                              border: '1px solid',
                              borderColor: 'rgba(255, 255, 255, 0.15)',
                              boxShadow: 'lg',
                              zIndex: 1000,
                              maxWidth: 320,
                            }}
                          >
                            <span
                              style={{
                                cursor: 'help',
                                display: 'inline-flex',
                                verticalAlign: 'middle',
                                marginLeft: '0.35rem',
                                color: 'var(--joy-palette-primary-500)',
                              }}
                            >
                              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                                <circle cx="12" cy="12" r="10" />
                                <path d="M12 16v-4M12 8h.01" />
                              </svg>
                            </span>
                          </Tooltip>
                        ) : null}
                      </FormLabel>
                      {node.helpText ? (
                        <Typography level="body-xs" sx={{ color: 'text.tertiary', mb: 0.5 }}>
                          {node.helpText}
                        </Typography>
                      ) : null}
                      {node.placeholder ? (
                        <Typography level="body-xs" sx={{ color: 'text.tertiary', mb: 0.35 }}>
                          {`Example: ${node.placeholder}`}
                        </Typography>
                      ) : null}
                      {renderInput(node, value, (next) => onChangeResponse(node.id, next), node.id, assignment.id, answers, onChangeResponse)}
                      {canDefer ? (
                        <Button
                          size="sm"
                          variant="plain"
                          sx={{ mt: 0.25, alignSelf: 'flex-start' }}
                          onClick={() => {
                            setDeferTarget({ nodeId: node.id, title: node.title });
                            setDeferReason(response?.skipped?.reason ?? '');
                          }}
                        >
                          Defer (explain)
                        </Button>
                      ) : null}
                      {response?.skipped ? (
                        <Typography level="body-xs" sx={{ color: 'warning.700', mt: 0.25 }}>
                          Deferred: {response.skipped.reason}
                        </Typography>
                      ) : null}
                    </FormControl>
                  </Sheet>
                );
              })}
            </Stack>
          </Sheet>
        ) : null}

        {sections.length > 0 ? (
          <Stack direction="row" justifyContent="space-between" spacing={0.8}>
            <Button
              variant="soft"
              disabled={activeSectionIndex <= 0}
              onClick={() => setActiveSectionIndex((current) => Math.max(0, current - 1))}
            >
              Back
            </Button>
            {activeSectionIndex < sections.length - 1 ? (
              <Button
                variant="solid"
                onClick={() =>
                  setActiveSectionIndex((current) => Math.min(sections.length - 1, current + 1))
                }
              >
                Next section
              </Button>
            ) : (
              <Button variant="solid" disabled={missingRequired.length > 0} onClick={onSubmit}>
                Submit assignment
              </Button>
            )}
          </Stack>
        ) : null}

        {missingRequired.length > 0 ? (
          <Typography level="body-sm" color="danger">
            Complete {missingRequired.length} required item{missingRequired.length === 1 ? '' : 's'} before submitting.
          </Typography>
        ) : null}

        {missingRequired.length === 0 && deferredRequiredCount > 0 ? (
          <Typography level="body-sm" sx={{ color: 'warning.700' }}>
            You deferred {deferredRequiredCount} required item{deferredRequiredCount === 1 ? '' : 's'}. Your attorney will follow up.
          </Typography>
        ) : null}
      </Stack>
    </Sheet>
  );
}

function renderInput(
  node: QuestionnaireNode,
  value: ResponseValue | undefined,
  onChange: (next: ResponseValue) => void,
  nodeId: string,
  assignmentId: string,
  answers: Record<string, any>,
  onChangeResponse: (nodeId: string, value: ResponseValue) => void
) {
  if (node.labels?.includes('debts_unsecured')) {
    return (
      <CreditorInput
        value={typeof value === 'string' ? value : ''}
        onChange={(next) => onChange(next)}
        placeholder={node.placeholder}
      />
    );
  }

  if (node.inputType === 'textarea') {
    return (
      <Textarea
        minRows={3}
        value={typeof value === 'string' ? value : ''}
        placeholder={node.placeholder}
        onChange={(event) => onChange(event.target.value)}
        slotProps={{ textarea: { 'data-assignment-focus': 'true', id: `assignment-input-${nodeId}` } }}
      />
    );
  }

  if (node.inputType === 'email') {
    return (
      <Input
        type="email"
        value={typeof value === 'string' ? value : ''}
        placeholder={node.placeholder}
        onChange={(event) => onChange(event.target.value)}
        slotProps={{ input: { 'data-assignment-focus': 'true', id: `assignment-input-${nodeId}` } }}
      />
    );
  }

  if (node.inputType === 'number') {
    return (
      <Input
        type="number"
        value={typeof value === 'number' ? String(value) : ''}
        placeholder={node.placeholder}
        onChange={(event) => onChange(event.target.value === '' ? '' : Number(event.target.value))}
        slotProps={{ input: { 'data-assignment-focus': 'true', id: `assignment-input-${nodeId}` } }}
      />
    );
  }

  if (node.inputType === 'date') {
    return (
      <Input
        type="date"
        value={typeof value === 'string' ? value : ''}
        placeholder={node.placeholder}
        onChange={(event) => onChange(event.target.value)}
        slotProps={{ input: { 'data-assignment-focus': 'true', id: `assignment-input-${nodeId}` } }}
      />
    );
  }

  if (node.inputType === 'yes_no') {
    const options = [
      { id: 'yes', label: 'Yes' },
      { id: 'no', label: 'No' },
    ];
    return (
      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mb: 0 }}>
        {options.map((opt) => {
          const isSelected = value === (opt.id === 'yes');
          return (
            <Sheet
              key={opt.id}
              variant="outlined"
              onClick={() => onChange(opt.id === 'yes')}
              sx={{
                p: 2,
                borderRadius: 'lg',
                cursor: 'pointer',
                border: isSelected ? '2px solid' : '1px solid',
                borderColor: isSelected ? 'primary.500' : 'neutral.outlinedBorder',
                bgcolor: isSelected ? 'primary.50' : 'background.surface',
                boxShadow: isSelected ? 'sm' : 'none',
                transition: 'all 0.2s ease',
                '&:hover': {
                  borderColor: isSelected ? 'primary.600' : 'neutral.400',
                  transform: 'translateY(-2px)',
                  boxShadow: 'md',
                },
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <Typography fontWeight={isSelected ? 600 : 500} textColor={isSelected ? 'primary.700' : 'text.primary'}>
                {opt.label}
              </Typography>
              {isSelected && (
                <Box
                  sx={{
                    width: 20,
                    height: 20,
                    borderRadius: '50%',
                    bgcolor: 'primary.500',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </Box>
              )}
            </Sheet>
          );
        })}
      </Box>
    );
  }

  if (node.inputType === 'single_select') {
    const options = node.options ?? [];

    // Tactile cards for small option sets
    if (options.length > 0 && options.length <= 4) {
      return (
        <Box sx={{ display: 'grid', gridTemplateColumns: options.length > 2 ? '1fr 1fr' : '1fr', gap: 2, mb: 0 }}>
          {options.map((opt) => {
            const isSelected = value === opt.id;
            return (
              <Sheet
                key={opt.id}
                variant="outlined"
                onClick={() => onChange(opt.id)}
                sx={{
                  p: 2,
                  borderRadius: 'lg',
                  cursor: 'pointer',
                  border: isSelected ? '2px solid' : '1px solid',
                  borderColor: isSelected ? 'primary.500' : 'neutral.outlinedBorder',
                  bgcolor: isSelected ? 'primary.50' : 'background.surface',
                  boxShadow: isSelected ? 'sm' : 'none',
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    borderColor: isSelected ? 'primary.600' : 'neutral.400',
                    transform: 'translateY(-2px)',
                    boxShadow: 'md',
                  },
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <Typography fontWeight={isSelected ? 600 : 500} textColor={isSelected ? 'primary.700' : 'text.primary'}>
                  {opt.label}
                </Typography>
                {isSelected && (
                  <Box
                    sx={{
                      width: 20,
                      height: 20,
                      borderRadius: '50%',
                      bgcolor: 'primary.500',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </Box>
                )}
              </Sheet>
            );
          })}
        </Box>
      );
    }

    return (
      <Select
        value={typeof value === 'string' ? value : null}
        onChange={(_, next) => onChange(next ?? '')}
        slotProps={{ button: { 'data-assignment-focus': 'true', id: `assignment-input-${nodeId}` } }}
      >
        {options.map((option) => (
          <Option key={option.id} value={option.id}>
            {option.label}
          </Option>
        ))}
      </Select>
    );
  }

  if (node.inputType === 'multi_select') {
    const selected = Array.isArray(value) ? value : [];
    return (
      <Select
        multiple
        value={selected}
        onChange={(_, next) => {
          onChange(Array.isArray(next) ? next : []);
        }}
        slotProps={{ button: { 'data-assignment-focus': 'true', id: `assignment-input-${nodeId}` } }}
      >
        {(node.options ?? []).map((option) => (
          <Option key={option.id} value={option.id}>
            {option.label}
          </Option>
        ))}
      </Select>
    );
  }

  if (node.inputType === 'file_upload') {
    const files = getFilesFromValue(value);
    const accept = node.fileRules?.allowedMime?.join(',');

    // Normalize node ID for OCR config lookup (remove 'node-' prefix if present)
    const normalizedId = nodeId.replace(/^node-/, '');

    if (shouldUseOcr(normalizedId)) {
      const ocrConfig = getOcrConfig(normalizedId);
      return (
        <DocumentUploadWithOcr
          fieldId={normalizedId}
          documentType={ocrConfig?.documentType || 'generic'}
          caseAnswers={answers}
          onFilesSelected={(fileArray: File[]) => {
            // Existing logic to handle file persistence
            const incoming = fileArray;
            if (incoming.length === 0) return;
            const uploadedAt = new Date().toISOString();
            const metas: ResponseFileMeta[] = incoming.map((file) => {
              const id = newFileId();
              return {
                id,
                name: file.name,
                uploadedAt,
                mimeType: file.type || undefined,
                sizeBytes: Number.isFinite(file.size) ? file.size : undefined,
                blobKey: id,
              };
            });

            // Persist response metadata immediately
            onChange(withAppendedFiles(value, metas));

            metas.forEach((meta, idx) => {
              const file = incoming[idx];
              void putBlob(meta.id, file, {
                name: meta.name,
                mimeType: meta.mimeType,
                sizeBytes: meta.sizeBytes,
                createdAt: meta.uploadedAt,
              }).catch(() => {
                // If blob storage fails
              });

              // NOTE: We do NOT enqueueOcr here because DocumentUploadWithOcr handles the extraction flow.
              // However, we still might want to enqueue safely in background if client-side check fails?
              // For now, let's rely on DocumentUploadWithOcr for the "smart" part.
              // We can still enqueue for basic text extraction if needed, but let's avoid double-processing.
            });
          }}
          onUpload={(fileNames) => {
            console.log('[AssignmentRunner] OCR complete/files uploaded for', nodeId, fileNames);
          }}
          onExtractedData={(data, confidence, ownership) => {
            console.log('[AssignmentRunner] Extracted data:', data);

            // Determine the prefix used by the current node (e.g., 'node-')
            const prefix = nodeId.startsWith('node-') ? 'node-' : '';

            // 1. Handle Field Mappings (Auto-fill)
            if (ocrConfig?.fieldMappings) {
              Object.entries(ocrConfig.fieldMappings).forEach(([ocrField, formFieldId]) => {
                const value = data[ocrField];
                if (value !== undefined && value !== null && value !== '') {
                  const targetNodeId = prefix + formFieldId;
                  console.log(`[Auto-fill] Mapping ${ocrField} -> ${targetNodeId} = ${value}`);
                  onChangeResponse(targetNodeId, String(value));
                }
              });
            }

            // 2. Handle Ownership Mapping (if applicable for this node)
            // If the node ID implies an entity (e.g. vehicle_1_doc) and we have an ownership question (vehicle_1_ownership)
            // we can try to auto-fill that too.
            if (ownership) {
              // Construct the ownership field ID based on the doc upload ID
              // e.g. vehicle_1_doc -> vehicle_1_ownership
              const ownershipFieldId = normalizedId.replace('_doc', '_ownership');
              const targetOwnershipNodeId = prefix + ownershipFieldId;

              // We need to check if this field actually exists in the current step/graph? 
              // onChangeResponse is generic so it should work if the ID allows it.
              // We capitalize the value to match the Options (Debtor, Spouse, Joint)
              const mappedOwnership =
                ownership === 'debtor' ? 'Debtor' :
                  ownership === 'spouse' ? 'Spouse' :
                    ownership === 'joint' ? 'Joint' : null;

              if (mappedOwnership) {
                console.log(`[Auto-fill] Setting ownership for ${targetOwnershipNodeId} = ${mappedOwnership}`);
                onChangeResponse(targetOwnershipNodeId, mappedOwnership);
              }
            }
          }}
          renderContent={(inputProps) => (
            <Stack spacing={0.65}>
              <Input
                {...inputProps}
                slotProps={{
                  input: {
                    multiple: true,
                    accept: accept || undefined,
                    'data-assignment-focus': 'true',
                    id: `assignment-input-${nodeId}`,
                  }
                }}
              />
              {files.length > 0 ? (
                <Sheet variant="soft" sx={{ p: 0.75, borderRadius: 'sm' }}>
                  <Typography level="body-xs" sx={{ color: 'text.tertiary' }}>
                    Uploaded: {files.map((file) => file.name).join(', ')}
                  </Typography>
                </Sheet>
              ) : null}
            </Stack>
          )}
        />
      );
    }

    return (
      <Stack spacing={0.65}>
        <Input
          type="file"
          slotProps={{
            input: {
              multiple: true,
              accept: accept || undefined,
              'data-assignment-focus': 'true',
              id: `assignment-input-${nodeId}`,
            },
          }}
          onChange={(event) => {
            const target = event.target as HTMLInputElement;
            const incoming = Array.from(target.files ?? []);
            if (incoming.length === 0) return;
            const uploadedAt = new Date().toISOString();
            const metas: ResponseFileMeta[] = incoming.map((file) => {
              const id = newFileId();
              return {
                id,
                name: file.name,
                uploadedAt,
                mimeType: file.type || undefined,
                sizeBytes: Number.isFinite(file.size) ? file.size : undefined,
                blobKey: id,
              };
            });

            // Persist response metadata immediately; heavy work runs async.
            onChange(withAppendedFiles(value, metas));

            // Allow selecting the same file again.
            target.value = '';

            metas.forEach((meta, idx) => {
              const file = incoming[idx];
              void putBlob(meta.id, file, {
                name: meta.name,
                mimeType: meta.mimeType,
                sizeBytes: meta.sizeBytes,
                createdAt: meta.uploadedAt,
              }).catch(() => {
                // If blob storage fails (e.g. disabled IndexedDB), OCR will show "re-upload required".
              });
              upsertOcrResult({
                fileId: meta.id,
                assignmentId,
                nodeId,
                legacyFieldId: node.legacyFieldId,
                name: meta.name,
                uploadedAt: meta.uploadedAt,
                mimeType: meta.mimeType,
                sizeBytes: meta.sizeBytes,
                status: 'queued',
                progress: 0,
              });
              enqueueOcr(meta.id, { mode: 'auto', continuePdf: false });
            });
          }}
        />
        {files.length > 0 ? (
          <Sheet variant="soft" sx={{ p: 0.75, borderRadius: 'sm' }}>
            <Typography level="body-xs" sx={{ color: 'text.tertiary' }}>
              Uploaded: {files.map((file) => file.name).join(', ')}
            </Typography>
          </Sheet>
        ) : (
          <Typography level="body-xs" sx={{ color: 'text.tertiary' }}>
            No files uploaded yet.
          </Typography>
        )}
      </Stack>
    );
  }

  if (node.inputType === 'grid') {
    const rowDefs = node.rows ?? [];
    const columnDefs = node.columns ?? [];
    const selectedByRow =
      value && typeof value === 'object' && !Array.isArray(value) && !('files' in value)
        ? value
        : {};
    return (
      <Table
        size="sm"
        borderAxis="xBetween"
        variant="plain"
        sx={{
          '& th': { whiteSpace: 'nowrap' },
          '& td, & th': { textAlign: 'center', px: 0.5, py: 0.65 },
          '& td:first-of-type, & th:first-of-type': { textAlign: 'left' },
        }}
      >
        <thead>
          <tr>
            <th>Category</th>
            {columnDefs.map((column) => (
              <th key={column.id}>{column.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rowDefs.map((row) => (
            <tr key={row.id}>
              <td>{row.label}</td>
              {columnDefs.map((column) => {
                const checked = selectedByRow[row.id] === column.id;
                return (
                  <td key={`${row.id}-${column.id}`}>
                    <button
                      type="button"
                      onClick={() =>
                        onChange({
                          ...selectedByRow,
                          [row.id]: column.id,
                        })
                      }
                      data-assignment-focus={row.id === rowDefs[0]?.id && column.id === columnDefs[0]?.id ? 'true' : undefined}
                      style={{
                        borderRadius: 999,
                        border: checked ? '1px solid #2563eb' : '1px solid #cbd5e1',
                        background: checked ? '#dbeafe' : '#ffffff',
                        color: checked ? '#1d4ed8' : '#475569',
                        width: 22,
                        height: 22,
                        lineHeight: '20px',
                        cursor: 'pointer',
                        fontWeight: 700,
                      }}
                    >
                      {checked ? '●' : '○'}
                    </button>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </Table>
    );
  }

  return (
    <Input
      value={typeof value === 'string' ? value : ''}
      placeholder={node.placeholder}
      onChange={(event) => onChange(event.target.value)}
      slotProps={{ input: { 'data-assignment-focus': 'true', id: `assignment-input-${nodeId}` } }}
    />
  );
}

function hasResponse(value: ResponseValue | undefined): boolean {
  if (value == null) return false;
  if (typeof value === 'string') return value.trim().length > 0;
  if (typeof value === 'number') return true;
  if (typeof value === 'boolean') return true;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === 'object' && 'files' in value) return value.files.length > 0;
  if (typeof value === 'object') return Object.keys(value).length > 0;
  return false;
}
