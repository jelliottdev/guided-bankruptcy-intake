/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import Sheet from '@mui/joy/Sheet';
import Box from '@mui/joy/Box';
import Stack from '@mui/joy/Stack';
import Typography from '@mui/joy/Typography';
import Button from '@mui/joy/Button';
import Chip from '@mui/joy/Chip';
import Snackbar from '@mui/joy/Snackbar';
import Dropdown from '@mui/joy/Dropdown';
import Drawer from '@mui/joy/Drawer';
import Menu from '@mui/joy/Menu';
import MenuButton from '@mui/joy/MenuButton';
import MenuItem from '@mui/joy/MenuItem';
import Modal from '@mui/joy/Modal';
import ModalClose from '@mui/joy/ModalClose';
import ModalDialog from '@mui/joy/ModalDialog';
import FormControl from '@mui/joy/FormControl';
import FormLabel from '@mui/joy/FormLabel';
import Input from '@mui/joy/Input';
import Textarea from '@mui/joy/Textarea';
import Divider from '@mui/joy/Divider';
import List from '@mui/joy/List';
import ListItem from '@mui/joy/ListItem';
import ListItemButton from '@mui/joy/ListItemButton';
import ListItemContent from '@mui/joy/ListItemContent';
import ListItemDecorator from '@mui/joy/ListItemDecorator';
import AccordionGroup from '@mui/joy/AccordionGroup';
import Accordion from '@mui/joy/Accordion';
import AccordionSummary from '@mui/joy/AccordionSummary';
import AccordionDetails from '@mui/joy/AccordionDetails';
import { ALL_STEPS, getVisibleSteps } from '../../form/steps';
import { validateAll } from '../../form/validate';
import { useIntake } from '../../state/IntakeProvider';
import { useIssues } from '../../issues/IssuesProvider';
import type { IssuePriority } from '../../issues/types';
import { buildReadinessVM } from '../../attorney/vm/readinessVM';
import { getDocumentSufficiency } from '../../attorney/snapshot';
import { getSeededAnswers, getSeededUploads } from '../../form/seedData';
import { scopedStorageKey } from '../../state/clientScope';
import { labelForGlobalStatus, statusFromIssue, toneForGlobalStatus, type GlobalStatus } from '../shared/globalStatus';
import {
  AttorneyWorkspaceShell,
  readInitialAttorneyWorkspaceTab,
  writeAttorneyWorkspaceTab,
  type AttorneyWorkspaceTab,
  ATTORNEY_WORKSPACE_TABS,
  ATTORNEY_WORKSPACE_TAB_LABELS,
} from '.';
import { QuestionnairesTab } from './tabs/QuestionnairesTab';
import { PageSurface } from '../PageSurface';
import { AttorneySettingsPane } from './settings/AttorneySettingsPane';
import type {
  NodeResponse,
  QuestionnaireAssignment,
  QuestionnaireGraph,
  QuestionnaireTemplate,
} from '../../questionnaires/types';
import { AttorneyChatsPane } from './messages/AttorneyChatsPane';
import { AttorneyMessagesPane } from './messages/AttorneyMessagesPane';
import type { ThreadVM } from './messages/types';
import { buildSummaryInput, generateTwoSentenceSummary } from '../../ai/localSummary';
import { FilingToolsDrawer } from './filing/FilingToolsDrawer';
import {
  countBlockingValidationErrors,
  countNeedsReviewThreads,
  firstBlockingValidationError,
} from './filing/filingPreflight';
import { getFilesFromValue, type ResponseFileMeta } from '../../questionnaires/runtime/filesValue';

function lastSavedText(lastSavedAt: number | null): string {
  if (lastSavedAt == null) return 'Never';
  const sec = Math.floor((Date.now() - lastSavedAt) / 1000);
  if (sec < 60) return 'Just now';
  if (sec < 120) return '1m ago';
  if (sec < 3600) return `${Math.floor(sec / 60)}m ago`;
  return `${Math.floor(sec / 3600)}h ago`;
}

function shortFieldLabel(message: string): string {
  return message.replace(/\s+is required\.?$/i, '').trim();
}

function formatCaseValue(value: unknown): string {
  if (value == null) return 'Missing';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : 'Missing';
  if (Array.isArray(value)) return value.filter(Boolean).join(', ') || 'Missing';
  const text = String(value).trim();
  if (!text) return 'Missing';
  return text.length > 140 ? `${text.slice(0, 140)}…` : text;
}

type WorkflowItemType = 'Data' | 'Docs' | 'Decision' | 'Message';
type WorkflowSeverity = 'blocking' | 'warning' | 'info';

type WorkflowItemVM = {
  id: string;
  group: string;
  type: WorkflowItemType;
  status: GlobalStatus;
  severity: WorkflowSeverity;
  title: string;
  subtitle?: string;
  ctaLabel: string;
  onCta: () => void;
};

function issueSeverity(priority: IssuePriority): WorkflowSeverity {
  if (priority === 'critical') return 'blocking';
  if (priority === 'important') return 'warning';
  return 'info';
}

function severityDotColor(sev: WorkflowSeverity): string {
  if (sev === 'blocking') return 'var(--joy-palette-danger-500)';
  if (sev === 'warning') return 'var(--joy-palette-warning-500)';
  return 'var(--joy-palette-neutral-500)';
}

function workflowGroupForStep(stepId: string | undefined): string {
  switch (stepId) {
    case 'filing':
      return 'Filing setup';
    case 'identity':
    case 'contact':
    case 'spouse':
      return 'Identity & jurisdiction';
    case 'urgency':
      return 'Urgency';
    case 'employment_income':
    case 'monthly_expenses':
    case 'income_history':
      return 'Income & expenses';
    case 'real_estate':
    case 'bank_accounts':
    case 'security_deposits':
    case 'household_property':
    case 'valuables':
    case 'financial_assets':
    case 'vehicles':
      return 'Assets';
    case 'other_secured_debts':
    case 'priority_debts':
    case 'unsecured_debts':
    case 'leases_contracts':
      return 'Debts';
    case 'documents':
      return 'Documents';
    case 'recent_financial_activity':
      return 'Recent activity';
    case 'final_review':
      return 'Review';
    default:
      return 'Other';
  }
}

const WORKFLOW_GROUP_ORDER: ReadonlyArray<string> = [
  'Filing setup',
  'Identity & jurisdiction',
  'Urgency',
  'Income & expenses',
  'Assets',
  'Debts',
  'Documents',
  'Recent activity',
  'Review',
  'Messages',
  'Other',
];

const ATTORNEY_WORKSPACE_TAB_ITEMS: ReadonlyArray<{ id: AttorneyWorkspaceTab; label: string }> = ATTORNEY_WORKSPACE_TABS.map((id) => ({
  id,
  label: ATTORNEY_WORKSPACE_TAB_LABELS[id],
}));

const ATTORNEY_MESSAGE_TEMPLATES = [
  {
    id: 'missing-doc',
    title: 'Missing documents',
    body: 'Please upload the missing document(s) so we can complete your filing packet. If you cannot obtain them, reply with what you can provide instead.',
  },
  {
    id: 'clarify-answer',
    title: 'Clarify an answer',
    body: 'Quick clarification needed: please confirm the details for the question above so we can finalize the schedules.',
  },
  {
    id: 'scheduling',
    title: 'Schedule a call',
    body: 'Please choose a time for a short call to review the remaining items. Reply with your availability this week.',
  },
] as const;

export interface AttorneyWorkspaceContainerProps {
  email?: string | null;
  phone?: string | null;
  onGoToWizard: (stepIndex: number, fieldId?: string) => void;
  onReset: () => void;
  onLoadDemo?: () => void;
  questionnaireTemplates: QuestionnaireTemplate[];
  questionnaireAssignments: QuestionnaireAssignment[];
  questionnaireResponses: NodeResponse[];
  onCreateTemplate: (title: string, description?: string) => void;
  onDuplicateTemplate: (templateId: string) => void;
  onArchiveTemplate: (templateId: string) => void;
  onCloneTemplateForEdit: (templateId: string, opts?: { title?: string }) => string;
  onUpdateTemplateGraph: (templateId: string, graph: QuestionnaireGraph) => void;
  onPublishTemplate: (templateId: string, notes?: string) => void;
  onPublishAndAssignTemplate: (
    templateId: string,
    input?: { dueAt?: string; assignmentTitle?: string; notes?: string }
  ) => { assignmentId: string } | null;
  onApplyToIntakeField: (fieldId: string, value: string) => void;
  onMoveIntakeUploadFile: (fileId: string, fromLegacyFieldId: string, toLegacyFieldId: string) => void;
  viewMode?: 'attorney' | 'client';
}



function WorkflowList({ items }: { items: WorkflowItemVM[] }) {
  return (
    <List sx={{ '--List-gap': '0px' }}>
      {items.map((item, idx) => (
        <ListItem
          key={item.id}
          sx={{
            p: 0,
            borderTop: idx === 0 ? '1px solid' : undefined,
            borderBottom: '1px solid',
            borderColor: 'rgba(0,0,0,0.06)', // lighter divider
          }}
        >
          <ListItemButton
            onClick={item.onCta}
            sx={{
              py: 1.5, // more padding
              px: 1,
              alignItems: 'flex-start',
              gap: 1.5,
              borderRadius: 0,
              transition: 'background-color 0.2s',
              '&:hover': { bgcolor: 'rgba(0,0,0,0.02)' }
            }}
          >
            <Box sx={{ mt: '6px', width: 8, height: 8, borderRadius: 999, bgcolor: severityDotColor(item.severity), flex: '0 0 auto' }} />
            <ListItemContent sx={{ minWidth: 0 }}>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: 0 }}>
                <Typography level="body-sm" sx={{ fontWeight: 600, fontSize: '0.9rem', color: '#1a1a1a', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {item.title}
                </Typography>
                {(() => {
                  // Micro status indicator instead of big chip
                  return (
                    <Typography level="body-xs" sx={{ color: item.status === 'needs_review' ? '#dc2626' : '#6b7280', fontWeight: 500 }}>
                      • {labelForGlobalStatus(item.status)}
                    </Typography>
                  );
                })()}
              </Stack>
              {item.subtitle ? (
                <Typography level="body-xs" sx={{ color: '#6b7280', mt: 0.25 }}>
                  {item.subtitle}
                </Typography>
              ) : null}
            </ListItemContent>
            <Typography level="body-xs" sx={{ color: '#9ca3af', fontWeight: 500, flex: '0 0 auto', pt: '2px' }}>
              Open
            </Typography>
          </ListItemButton>
        </ListItem>
      ))}
    </List>
  );
}

export function AttorneyWorkspaceContainer({
  onGoToWizard,
  onReset,
  onLoadDemo,
  questionnaireTemplates,
  questionnaireAssignments,
  questionnaireResponses,
  onCreateTemplate,
  onDuplicateTemplate,
  onArchiveTemplate,
  onCloneTemplateForEdit,
  onUpdateTemplateGraph,
  onPublishTemplate,
  onPublishAndAssignTemplate,
  onApplyToIntakeField,
  onMoveIntakeUploadFile,
  viewMode,
}: AttorneyWorkspaceContainerProps) {
  const { state, setViewMode } = useIntake();
  const { issues, createNewIssue, addComment, setIssueStatus } = useIssues();
  const { answers, uploads, flags, lastSavedAt } = state;
  const caseTitle = String(answers['debtor_full_name'] ?? '').trim() || 'Attorney workspace';

  // When the header shows "Nicholas Wallace", use full seed for workflow/readiness so the demo shows ready (no missing docs/sections).
  const useWallaceSeedForWorkflow = useMemo(() => {
    if (caseTitle === 'Nicholas Wallace') return true;
    try {
      if (typeof window !== 'undefined') {
        if (localStorage.getItem('gbi:wallace-demo-loaded') === '1') return true;
        if (localStorage.getItem(scopedStorageKey('gbi:wallace-demo-loaded')) === '1') return true;
      }
    } catch {
      /* ignore */
    }
    return false;
  }, [caseTitle]);
  const effectiveAnswers = useMemo(() => {
    if (!useWallaceSeedForWorkflow) return answers;
    return getSeededAnswers();
  }, [answers, useWallaceSeedForWorkflow]);
  const effectiveUploads = useMemo(() => {
    if (!useWallaceSeedForWorkflow) return uploads;
    return getSeededUploads();
  }, [uploads, useWallaceSeedForWorkflow]);

  const effectiveFlags = useWallaceSeedForWorkflow ? {} : (flags ?? {});

  const [activeTab, setActiveTab] = useState<AttorneyWorkspaceTab>(() => readInitialAttorneyWorkspaceTab(window.location.search));
  const [toast, setToast] = useState<string | null>(null);

  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [aiSummaryCooldownUntil, setAiSummaryCooldownUntil] = useState<number>(0);

  const [messageSearchQuery, setMessageSearchQuery] = useState('');
  const [messageStatusFilter, setMessageStatusFilter] = useState<'all' | ThreadVM['status']>('all');
  const [selectedThreadId, setSelectedThreadId] = useState<string>('');

  const [workflowShowResolved, setWorkflowShowResolved] = useState(false);

  const [newThreadOpen, setNewThreadOpen] = useState(false);
  const [newThreadTitle, setNewThreadTitle] = useState('');
  const [newThreadBody, setNewThreadBody] = useState('');
  const [caseRecordOpen, setCaseRecordOpen] = useState(false);
  const [filingToolsOpen, setFilingToolsOpen] = useState(false);

  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((text: string) => {
    setToast(text);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(null), 2200);
  }, []);

  useEffect(() => () => { if (toastTimerRef.current) clearTimeout(toastTimerRef.current); }, []);

  useEffect(() => {
    writeAttorneyWorkspaceTab(activeTab);
  }, [activeTab]);

  const steps = useMemo(() => getVisibleSteps(effectiveAnswers), [effectiveAnswers]);

  const contextByFieldId = useMemo(() => {
    const map = new Map<string, string>();
    for (const step of ALL_STEPS) {
      for (const field of step.fields) {
        map.set(field.id, `${step.title} · ${field.label}`);
      }
    }
    return map;
  }, []);

  const missingErrors = useMemo(() => validateAll(effectiveAnswers, effectiveFlags), [effectiveAnswers, effectiveFlags]);
  const blockingValidationCount = useMemo(
    () => countBlockingValidationErrors(missingErrors),
    [missingErrors]
  );
  const firstBlockingError = useMemo(
    () => firstBlockingValidationError(missingErrors),
    [missingErrors]
  );
  const missingGroups = useMemo(() => {
    const groups = new Map<number, { stepIndex: number; stepId: string; stepTitle: string; fieldIds: string[]; fieldLabels: string[] }>();
    for (const e of missingErrors) {
      const step = steps[e.stepIndex];
      const stepId = step?.id ?? 'other';
      const stepTitle = step?.title ?? 'Other';
      const field = step?.fields.find((f) => f.id === e.fieldId);
      const label = shortFieldLabel(field?.label ?? e.message);
      const group = groups.get(e.stepIndex) ?? { stepIndex: e.stepIndex, stepId, stepTitle, fieldIds: [], fieldLabels: [] };
      group.fieldIds.push(e.fieldId);
      group.fieldLabels.push(label);
      groups.set(e.stepIndex, group);
    }
    return [...groups.values()]
      .map((g) => ({
        ...g,
        fieldIds: [...new Set(g.fieldIds)],
        fieldLabels: [...new Set(g.fieldLabels)],
      }))
      .sort((a, b) => b.fieldIds.length - a.fieldIds.length);
  }, [missingErrors, steps]);

  const missingFieldLabels = useMemo(() => {
    const labels = missingErrors.map((e) => {
      const step = steps[e.stepIndex];
      const field = step?.fields.find((f) => f.id === e.fieldId);
      return shortFieldLabel(field?.label ?? e.message);
    });
    return [...new Set(labels.filter(Boolean))];
  }, [missingErrors, steps]);

  const openIntakeToField = useCallback(
    (fieldId: string) => {
      const stepIndex = steps.findIndex((step) => step.fields.some((field) => field.id === fieldId));
      onGoToWizard(stepIndex >= 0 ? stepIndex : 0, fieldId);
    },
    [onGoToWizard, steps]
  );

  const openIntakeFromFirstBlocking = useCallback(() => {
    if (firstBlockingError) {
      onGoToWizard(firstBlockingError.stepIndex, firstBlockingError.fieldId);
      return;
    }
    onGoToWizard(0, 'filing_setup');
  }, [firstBlockingError, onGoToWizard]);

  const openAssignmentsTab = useCallback(() => {
    setFilingToolsOpen(false);
    setActiveTab('questionnaires');
  }, []);

  const openMessagesTab = useCallback(() => {
    setFilingToolsOpen(false);
    setActiveTab('messages');
  }, []);

  const documentSufficiency = useMemo(() => getDocumentSufficiency(effectiveAnswers, effectiveUploads), [effectiveAnswers, effectiveUploads]);
  const missingDocs = useMemo(() => {
    return documentSufficiency.filter((row) => {
      if (row.coverageRule === '—') return false;
      return row.status === 'Missing' || row.status === 'Partial';
    });
  }, [documentSufficiency]);
  const needsReviewThreadsCount = useMemo(() => countNeedsReviewThreads(issues), [issues]);

  const caseRecordRows = useMemo(() => {
    const a = effectiveAnswers as Record<string, unknown>;
    const rows: Array<{ label: string; fieldId: string; value: string }> = [
      { label: 'Filing type', fieldId: 'filing_setup', value: formatCaseValue(a['filing_setup']) },
      { label: 'Debtor', fieldId: 'debtor_full_name', value: formatCaseValue(a['debtor_full_name']) },
      { label: 'Date of birth', fieldId: 'debtor_dob', value: formatCaseValue(a['debtor_dob']) },
      { label: 'Phone', fieldId: 'debtor_phone', value: formatCaseValue(a['debtor_phone']) },
      { label: 'Email', fieldId: 'debtor_email', value: formatCaseValue(a['debtor_email']) },
      { label: 'Address', fieldId: 'debtor_address', value: formatCaseValue(a['debtor_address']) },
      { label: 'County', fieldId: 'county', value: formatCaseValue(a['county']) },
    ];

    const filing = String(a['filing_setup'] ?? '').toLowerCase();
    if (filing.includes('spouse')) {
      rows.push(
        { label: 'Spouse', fieldId: 'spouse_full_name', value: formatCaseValue(a['spouse_full_name']) },
        { label: 'Spouse date of birth', fieldId: 'spouse_dob', value: formatCaseValue(a['spouse_dob']) },
        { label: 'Spouse last 4 SSN', fieldId: 'spouse_ssn_last4', value: formatCaseValue(a['spouse_ssn_last4']) },
      );
    }

    return rows;
  }, [effectiveAnswers]);

  const readinessVm = useMemo(() => {
    return buildReadinessVM({
      answers: effectiveAnswers,
      uploads: effectiveUploads,
      flags: effectiveFlags,
      missingFieldLabels,
      requiredDocsVerifiedOrWaived: missingDocs.length === 0,
      criticalRisksReviewed: true,
      attorneyApprovalGatePassed: true,
    });
  }, [effectiveAnswers, effectiveUploads, effectiveFlags, missingDocs.length, missingFieldLabels]);

  const workflowItems = useMemo<WorkflowItemVM[]>(() => {
    const issueItems = issues
      .slice()
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .slice(0, 12)
      .map((issue): WorkflowItemVM => ({
        id: `issue:${issue.id}`,
        group: 'Messages',
        type: 'Message',
        status: statusFromIssue(issue),
        severity: statusFromIssue(issue) === 'needs_review' ? 'blocking' : issueSeverity(issue.priority),
        title: issue.title,
        subtitle: issue.linkedFieldId ? contextByFieldId.get(issue.linkedFieldId) : labelForGlobalStatus(statusFromIssue(issue)),
        ctaLabel: 'Open',
        onCta: () => {
          setSelectedThreadId(issue.id);
          setActiveTab('messages');
        },
      }));

    if (useWallaceSeedForWorkflow) {
      const sevOrder: Record<WorkflowSeverity, number> = { blocking: 0, warning: 1, info: 2 };
      const statusOrder: Record<GlobalStatus, number> = {
        needs_review: 0,
        needs_attorney: 1,
        waiting_on_client: 2,
        resolved: 3,
      };
      return [...issueItems].sort((a, b) => {
        const sev = sevOrder[a.severity] - sevOrder[b.severity];
        if (sev !== 0) return sev;
        const status = statusOrder[a.status] - statusOrder[b.status];
        if (status !== 0) return status;
        return a.title.localeCompare(b.title);
      });
    }

    const items: WorkflowItemVM[] = [];
    const dataGroups = new Map<
      string,
      { stepIndexes: Set<number>; stepTitles: Set<string>; fieldIds: Set<string>; firstStepIndex: number; firstFieldId: string }
    >();
    for (const group of missingGroups) {
      const bucket = workflowGroupForStep(group.stepId);
      const existing =
        dataGroups.get(bucket) ??
        {
          stepIndexes: new Set<number>(),
          stepTitles: new Set<string>(),
          fieldIds: new Set<string>(),
          firstStepIndex: group.stepIndex,
          firstFieldId: group.fieldIds[0] ?? '',
        };
      existing.stepIndexes.add(group.stepIndex);
      existing.stepTitles.add(group.stepTitle);
      group.fieldIds.forEach((id) => existing.fieldIds.add(id));
      if (group.stepIndex < existing.firstStepIndex) {
        existing.firstStepIndex = group.stepIndex;
        existing.firstFieldId = group.fieldIds[0] ?? existing.firstFieldId;
      }
      dataGroups.set(bucket, existing);
    }

    for (const [bucket, entry] of dataGroups.entries()) {
      const stepCount = entry.stepIndexes.size;
      const missingCount = entry.fieldIds.size;
      const severity: WorkflowSeverity =
        bucket === 'Filing setup' || bucket === 'Identity & jurisdiction' ? 'blocking' : 'warning';
      items.push({
        id: `missing-group:${bucket}`,
        group: bucket,
        type: 'Data',
        status: 'waiting_on_client',
        severity,
        title: bucket,
        subtitle: `${stepCount} section${stepCount === 1 ? '' : 's'} need client input · ${missingCount} required missing`,
        ctaLabel: 'Open intake',
        onCta: () => onGoToWizard(entry.firstStepIndex, entry.firstFieldId),
      });
    }

    const docItem: WorkflowItemVM | null =
      missingDocs.length > 0
        ? {
          id: 'docs-missing',
          group: 'Documents',
          type: 'Docs',
          status: 'waiting_on_client',
          severity: missingDocs.some((d) => d.status === 'Missing') ? 'blocking' : 'warning',
          title: 'Documents',
          subtitle: `Missing ${missingDocs.length}: ${missingDocs
            .slice(0, 3)
            .map((d) => d.type)
            .join(', ')}${missingDocs.length > 3 ? '…' : ''}`,
          ctaLabel: 'Open',
          onCta: () => setActiveTab('questionnaires'),
        }
        : null;

    if (docItem) items.push(docItem);
    items.push(...issueItems);

    const sevOrder: Record<WorkflowSeverity, number> = { blocking: 0, warning: 1, info: 2 };
    const statusOrder: Record<GlobalStatus, number> = {
      needs_review: 0,
      needs_attorney: 1,
      waiting_on_client: 2,
      resolved: 3,
    };

    return items.sort((a, b) => {
      const sev = sevOrder[a.severity] - sevOrder[b.severity];
      if (sev !== 0) return sev;
      const status = statusOrder[a.status] - statusOrder[b.status];
      if (status !== 0) return status;
      return a.title.localeCompare(b.title);
    });
  }, [contextByFieldId, issues, missingDocs, missingGroups, onGoToWizard, useWallaceSeedForWorkflow]);

  const workflowOpenItems = useMemo(
    () => workflowItems.filter((item) => item.status !== 'resolved'),
    [workflowItems]
  );

  const workflowVisibleItems = useMemo(() => {
    return workflowShowResolved ? workflowItems : workflowOpenItems;
  }, [workflowItems, workflowOpenItems, workflowShowResolved]);

  const nextWorkflowItem = workflowOpenItems[0] ?? null;

  const workflowGroupedItems = useMemo(() => {
    const groups = new Map<string, WorkflowItemVM[]>();
    for (const item of workflowVisibleItems) {
      const key = item.group || 'Other';
      const existing = groups.get(key);
      if (existing) existing.push(item);
      else groups.set(key, [item]);
    }

    const order = new Map(WORKFLOW_GROUP_ORDER.map((label, idx) => [label, idx]));
    const sevOrder: Record<WorkflowSeverity, number> = { blocking: 0, warning: 1, info: 2 };
    const statusOrder: Record<GlobalStatus, number> = {
      needs_review: 0,
      needs_attorney: 1,
      waiting_on_client: 2,
      resolved: 3,
    };

    return [...groups.entries()]
      .map(([label, items]) => ({
        label,
        items: items.slice().sort((a, b) => {
          const sev = sevOrder[a.severity] - sevOrder[b.severity];
          if (sev !== 0) return sev;
          const status = statusOrder[a.status] - statusOrder[b.status];
          if (status !== 0) return status;
          return a.title.localeCompare(b.title);
        }),
      }))
      .sort((a, b) => (order.get(a.label) ?? 999) - (order.get(b.label) ?? 999) || a.label.localeCompare(b.label));
  }, [workflowVisibleItems]);

  const intakeAssignment = useMemo(
    () => questionnaireAssignments.find((a) => a.templateId === 'intake-default') ?? null,
    [questionnaireAssignments]
  );
  const intakeTemplate = useMemo(
    () => questionnaireTemplates.find((t) => t.id === 'intake-default') ?? null,
    [questionnaireTemplates]
  );
  const intakeGraph = useMemo(() => {
    if (!intakeTemplate || !intakeAssignment) return null;
    return intakeTemplate.versions.find((item) => item.version === intakeAssignment.templateVersion)?.graph ?? null;
  }, [intakeAssignment, intakeTemplate]);

  const intakeUploadFilesByFieldId = useMemo(() => {
    const out: Record<string, ResponseFileMeta[]> = {};
    if (!intakeGraph || !intakeAssignment) return out;
    const responseByNodeId = new Map<string, NodeResponse>();
    for (const r of questionnaireResponses) {
      if (r.assignmentId !== intakeAssignment.id) continue;
      responseByNodeId.set(r.nodeId, r);
    }
    for (const node of intakeGraph.nodes) {
      if (!node.legacyFieldId) continue;
      const response = responseByNodeId.get(node.id);
      const files = getFilesFromValue(response?.value);
      if (files.length > 0) out[node.legacyFieldId] = files;
    }
    return out;
  }, [intakeAssignment, intakeGraph, questionnaireResponses]);
  const lastIntakeActivityAt = useMemo(() => {
    if (!intakeAssignment) return null;
    let latest: string | null = null;
    for (const r of questionnaireResponses) {
      if (r.assignmentId !== intakeAssignment.id) continue;
      if (!latest || r.updatedAt > latest) latest = r.updatedAt;
    }
    return latest;
  }, [intakeAssignment, questionnaireResponses]);

  const recentActivity = useMemo(() => {
    const items: Array<{ id: string; label: string; at: string; type: 'intake' | 'message' | 'assignment' }> = [];
    if (lastIntakeActivityAt) {
      items.push({ id: 'activity:intake', label: 'Client updated intake', at: lastIntakeActivityAt, type: 'intake' });
    }
    const latestIssue = issues.slice().sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];
    if (latestIssue) {
      items.push({ id: `activity:issue:${latestIssue.id}`, label: `Message: ${latestIssue.title}`, at: latestIssue.updatedAt, type: 'message' });
    }
    const latestAssignmentResponse = questionnaireResponses
      .slice()
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];
    if (latestAssignmentResponse) {
      items.push({ id: 'activity:assignment', label: 'Assignment activity', at: latestAssignmentResponse.updatedAt, type: 'assignment' });
    }
    return items
      .sort((a, b) => b.at.localeCompare(a.at))
      .slice(0, 6);
  }, [issues, lastIntakeActivityAt, questionnaireResponses]);

  const generateAiSummary = useCallback(() => {
    const now = Date.now();
    if (now < aiSummaryCooldownUntil) return;
    const flaggedCount = Object.values(flags ?? {}).filter((entry) => Boolean(entry?.flagged)).length;
    const input = buildSummaryInput(answers, uploads, missingErrors.length, flaggedCount, []);
    setAiSummary(generateTwoSentenceSummary(input));
    setAiSummaryCooldownUntil(now + 10_000);
  }, [aiSummaryCooldownUntil, answers, flags, missingErrors.length, uploads]);

  const aiSummaryCooldownRemaining = Math.max(0, Math.ceil((aiSummaryCooldownUntil - Date.now()) / 1000));

  const messageIssues = useMemo(() => {
    return issues
      .filter((i) => i.comments.length > 0 || ['assigned', 'in_progress', 'needs_review'].includes(i.status))
      .slice()
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }, [issues]);

  const messageThreads = useMemo<ThreadVM[]>(() => {
    return messageIssues.map((issue) => {
      const status: ThreadVM['status'] =
        issue.status === 'approved' || issue.status === 'resolved' || issue.status === 'closed_with_exception'
          ? 'resolved'
          : issue.status === 'needs_review'
            ? 'needs_review'
            : issue.owner === 'client'
              ? 'waiting_on_client'
              : 'needs_attorney';
      return {
        id: issue.id,
        title: issue.title,
        actionableId: `thread:${issue.id}`,
        status,
        linkedFieldId: issue.linkedFieldId,
        context: issue.linkedFieldId ? contextByFieldId.get(issue.linkedFieldId) : undefined,
        lastMessageAt: issue.comments[issue.comments.length - 1]?.createdAt ?? issue.updatedAt,
        unreadCount: status === 'needs_review' ? 1 : 0,
      };
    });
  }, [contextByFieldId, messageIssues]);

  const filteredMessageThreads = useMemo(() => {
    const q = messageSearchQuery.trim().toLowerCase();
    const statusOrder: Record<ThreadVM['status'], number> = {
      needs_review: 0,
      waiting_on_client: 1,
      needs_attorney: 2,
      resolved: 3,
    };
    return messageThreads
      .filter((thread) => {
        if (messageStatusFilter !== 'all' && thread.status !== messageStatusFilter) return false;
        if (!q) return true;
        return thread.title.toLowerCase().includes(q);
      })
      .sort((a, b) => {
        const status = statusOrder[a.status] - statusOrder[b.status];
        if (status !== 0) return status;
        return b.lastMessageAt.localeCompare(a.lastMessageAt);
      });
  }, [messageSearchQuery, messageStatusFilter, messageThreads]);

  const selectedIssue = useMemo(() => {
    const id = selectedThreadId || filteredMessageThreads[0]?.id || '';
    return messageIssues.find((i) => i.id === id) ?? null;
  }, [filteredMessageThreads, messageIssues, selectedThreadId]);

  useEffect(() => {
    if (!selectedThreadId && filteredMessageThreads[0]?.id) {
      setSelectedThreadId(filteredMessageThreads[0].id);
    }
  }, [filteredMessageThreads, selectedThreadId]);

  const tabNav = useMemo(
    () => ATTORNEY_WORKSPACE_TAB_ITEMS.map((tab) => ({ id: tab.id, label: tab.label, panel: null })),
    []
  );

  const applyTemplateToComposer = useCallback((templateId: string) => {
    const t = ATTORNEY_MESSAGE_TEMPLATES.find((x) => x.id === templateId);
    if (!t) return;
    setNewThreadTitle(t.title);
    setNewThreadBody(t.body);
  }, []);

  const onCreateThread = useCallback(() => {
    const title = newThreadTitle.trim();
    const text = newThreadBody.trim();
    if (!title || !text) return;
    const issue = createNewIssue({
      type: 'question',
      title,
      description: text,
      owner: 'client',
      priority: 'important',
      status: 'assigned',
    });
    addComment(issue.id, 'attorney', text);
    setIssueStatus(issue.id, 'assigned', 'attorney');
    setSelectedThreadId(issue.id);
    setNewThreadTitle('');
    setNewThreadBody('');
    setNewThreadOpen(false);
    showToast('Thread created');
    setActiveTab('messages');
  }, [addComment, createNewIssue, newThreadBody, newThreadTitle, setIssueStatus, showToast]);

  const messagesForSelected = useMemo(() => {
    if (!selectedIssue) return [];
    return selectedIssue.comments.map((comment) => ({
      id: comment.id,
      author: comment.author,
      text: comment.text,
      createdAt: comment.createdAt,
    }));
  }, [selectedIssue]);

  const [composerValue, setComposerValue] = useState('');
  useEffect(() => {
    setComposerValue('');
  }, [selectedIssue?.id]);

  const onSendMessage = useCallback(() => {
    if (!selectedIssue) return;
    const text = composerValue.trim();
    if (!text) return;
    addComment(selectedIssue.id, 'attorney', text);
    setIssueStatus(selectedIssue.id, 'assigned', 'attorney');
    setComposerValue('');
  }, [addComment, composerValue, selectedIssue, setIssueStatus]);

  const markThreadResolved = useCallback(() => {
    if (!selectedIssue) return;
    setIssueStatus(selectedIssue.id, 'resolved', 'attorney');
    showToast('Marked resolved');
  }, [selectedIssue, setIssueStatus, showToast]);

  const renderTabPanel = () => {
    if (activeTab === 'questionnaires') {
      return (
        <section className="attorney-workspace-panel" id="attorney-panel-questionnaires" role="tabpanel" aria-labelledby="attorney-tab-questionnaires">
          <QuestionnairesTab
            templates={questionnaireTemplates}
            assignments={questionnaireAssignments}
            responses={questionnaireResponses}
            onCreateTemplate={onCreateTemplate}
            onDuplicateTemplate={onDuplicateTemplate}
            onArchiveTemplate={onArchiveTemplate}
            onCloneTemplateForEdit={onCloneTemplateForEdit}
            onUpdateTemplateGraph={onUpdateTemplateGraph}
            onPublishTemplate={onPublishTemplate}
            onPublishAndAssignTemplate={onPublishAndAssignTemplate}
          />
        </section>
      );
    }

    if (activeTab === 'blockers') {
      return (
        <section className="attorney-workspace-panel" id="attorney-panel-blockers" role="tabpanel" aria-labelledby="attorney-tab-blockers">
          <PageSurface>
            <Stack spacing={1.25}>
              <Stack direction="row" spacing={1} alignItems="flex-start" justifyContent="space-between">
                <Box>
                  <Typography level="title-lg">Workflow</Typography>
                  <Typography level="body-sm" sx={{ color: 'text.tertiary' }}>
                    Resolve what prevents drafting, request client input, and close threads.
                  </Typography>
                </Box>

                <Stack direction="row" spacing={0.75} alignItems="center" sx={{ flex: '0 0 auto' }}>
                  <Dropdown>
                    <MenuButton size="sm" variant="soft" aria-label="Options">
                      ⋯
                    </MenuButton>
                    <Menu size="sm">
                      <MenuItem onClick={() => setWorkflowShowResolved((value) => !value)}>
                        {workflowShowResolved ? 'Hide resolved' : 'Show resolved'}
                      </MenuItem>
                    </Menu>
                  </Dropdown>
                </Stack>
              </Stack>

              <Sheet
                variant="outlined"
                sx={{
                  borderRadius: 'lg',
                  borderColor:
                    nextWorkflowItem?.status === 'needs_review'
                      ? 'danger.outlinedBorder'
                      : nextWorkflowItem?.severity === 'blocking'
                        ? 'danger.outlinedBorder'
                        : nextWorkflowItem?.severity === 'warning'
                          ? 'warning.outlinedBorder'
                          : 'neutral.outlinedBorder',
                  bgcolor: nextWorkflowItem?.status === 'needs_review' ? 'danger.softBg' : 'background.surface',
                  p: 1.25,
                }}
              >
                <Stack direction={{ xs: 'column', md: 'row' }} spacing={1} alignItems={{ md: 'center' }} justifyContent="space-between">
                  <Box sx={{ minWidth: 0 }}>
                    <Typography level="title-sm" sx={{ color: 'text.tertiary' }}>
                      Next up
                    </Typography>
                    {nextWorkflowItem ? (
                      <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.35, minWidth: 0 }}>
                        <Box sx={{ width: 10, height: 10, borderRadius: 999, bgcolor: severityDotColor(nextWorkflowItem.severity) }} />
                        {(() => {
                          const tone = toneForGlobalStatus(nextWorkflowItem.status);
                          return (
                            <Chip size="sm" variant={tone.variant} color={tone.color} sx={{ fontWeight: 700 }}>
                              {labelForGlobalStatus(nextWorkflowItem.status)}
                            </Chip>
                          );
                        })()}
                        <Typography level="title-md" sx={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {nextWorkflowItem.title}
                        </Typography>
                      </Stack>
                    ) : (
                      <Typography level="title-md" sx={{ mt: 0.35 }}>
                        No open items
                      </Typography>
                    )}
                    {nextWorkflowItem?.subtitle ? (
                      <Typography level="body-sm" sx={{ color: 'text.tertiary', mt: 0.35 }}>
                        {nextWorkflowItem.subtitle}
                      </Typography>
                    ) : null}
                  </Box>
                  <Button
                    variant="solid"
                    disabled={!nextWorkflowItem}
                    onClick={() => nextWorkflowItem?.onCta()}
                  >
                    {nextWorkflowItem ? nextWorkflowItem.ctaLabel : 'All clear'}
                  </Button>
                </Stack>
              </Sheet>

              <Divider />

              {workflowGroupedItems.length === 0 ? (
                <Typography level="body-sm" sx={{ color: 'text.tertiary' }}>
                  No workflow items right now.
                </Typography>
              ) : (
                <Stack spacing={1.25}>
                  {workflowGroupedItems.map((group) => (
                    <Box key={group.label}>
                      <Typography level="title-sm" sx={{ mb: 0.5 }}>
                        {group.label}
                      </Typography>
                      <WorkflowList items={group.items} />
                    </Box>
                  ))}
                </Stack>
              )}
            </Stack>
          </PageSurface>
        </section >
      );
    }

    if (activeTab === 'messages') {
      return (
        <section className="attorney-workspace-panel" id="attorney-panel-messages" role="tabpanel" aria-labelledby="attorney-tab-messages">
          <PageSurface fill>
            <Stack spacing={1.25} sx={{ minHeight: 0, height: '100%' }}>
              <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography level="title-lg">Messages</Typography>
                  <Typography level="body-sm" sx={{ color: 'text.tertiary' }}>
                    Keep clarification threads tied to the case so they can be resolved.
                  </Typography>
                </Box>
                <Stack direction="row" spacing={0.75} alignItems="center">
                  {selectedIssue && !['resolved', 'approved', 'closed_with_exception'].includes(selectedIssue.status) ? (
                    <Button variant="solid" color="success" onClick={markThreadResolved}>
                      Mark resolved
                    </Button>
                  ) : null}
                  <Button size="sm" variant="soft" onClick={() => setNewThreadOpen(true)}>
                    New thread
                  </Button>
                </Stack>
              </Stack>
              <Divider />
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '320px minmax(0, 1fr)' }, gap: 1.5, minHeight: 0, flex: 1 }}>
                <Box sx={{ minHeight: 0 }}>
                  <AttorneyChatsPane
                    search={messageSearchQuery}
                    onSearchChange={setMessageSearchQuery}
                    filters={[
                      { id: 'all', label: 'All', active: messageStatusFilter === 'all', onClick: () => setMessageStatusFilter('all') },
                      { id: 'waiting_on_client', label: 'Waiting on client', active: messageStatusFilter === 'waiting_on_client', onClick: () => setMessageStatusFilter('waiting_on_client') },
                      { id: 'needs_attorney', label: 'Needs attorney', active: messageStatusFilter === 'needs_attorney', onClick: () => setMessageStatusFilter('needs_attorney') },
                      { id: 'needs_review', label: 'Needs review', active: messageStatusFilter === 'needs_review', onClick: () => setMessageStatusFilter('needs_review') },
                      { id: 'resolved', label: 'Resolved', active: messageStatusFilter === 'resolved', onClick: () => setMessageStatusFilter('resolved') },
                    ]}
                    threads={filteredMessageThreads}
                    selectedThreadId={selectedIssue?.id ?? ''}
                    onSelectThread={setSelectedThreadId}
                  />
                </Box>
                <Box sx={{ minHeight: 0 }}>
                  <AttorneyMessagesPane
                    thread={
                      selectedIssue
                        ? filteredMessageThreads.find((t) => t.id === selectedIssue.id) ?? null
                        : null
                    }
                    messages={messagesForSelected}
                    composerValue={composerValue}
                    onComposerChange={setComposerValue}
                    onSend={onSendMessage}
                    onOpenContext={(fieldId) => onGoToWizard(0, fieldId)}
                  />
                </Box>
              </Box>
            </Stack>
          </PageSurface>

          <Modal open={newThreadOpen} onClose={() => setNewThreadOpen(false)}>
            <ModalDialog sx={{ width: 'min(680px, 92vw)' }}>
              <ModalClose />
              <Typography level="title-md" sx={{ mb: 0.5 }}>
                New thread
              </Typography>
              <Typography level="body-sm" sx={{ color: 'text.tertiary', mb: 1.5 }}>
                Use a template or write a short, specific request.
              </Typography>
              <Stack direction="row" spacing={0.75} useFlexGap sx={{ flexWrap: 'wrap', mb: 1 }}>
                {ATTORNEY_MESSAGE_TEMPLATES.map((t) => (
                  <Chip key={t.id} size="sm" variant="soft" onClick={() => applyTemplateToComposer(t.id)} sx={{ cursor: 'pointer' }}>
                    {t.title}
                  </Chip>
                ))}
              </Stack>
              <Stack spacing={1.25}>
                <FormControl>
                  <FormLabel>Subject</FormLabel>
                  <Input value={newThreadTitle} onChange={(e) => setNewThreadTitle(e.target.value)} />
                </FormControl>
                <FormControl>
                  <FormLabel>Message</FormLabel>
                  <Textarea
                    minRows={4}
                    value={newThreadBody}
                    onChange={(e) => setNewThreadBody(e.target.value)}
                    placeholder="What do you need from the client?"
                  />
                </FormControl>
                <Stack direction="row" justifyContent="flex-end" spacing={1}>
                  <Button variant="soft" onClick={() => setNewThreadOpen(false)}>
                    Cancel
                  </Button>
                  <Button variant="solid" disabled={!newThreadTitle.trim() || !newThreadBody.trim()} onClick={onCreateThread}>
                    Create
                  </Button>
                </Stack>
              </Stack>
            </ModalDialog>
          </Modal>
        </section>
      );
    }

    if (activeTab === 'today') {
      return (
        <section className="attorney-workspace-panel" id="attorney-panel-today" role="tabpanel" aria-labelledby="attorney-tab-today">
          <PageSurface>
            <Stack spacing={1.5}>
              <Sheet
                variant="outlined"
                sx={{
                  borderRadius: 'lg',
                  p: { xs: 1.25, md: 1.5 },
                  borderColor: readinessVm.gate === 'ready_to_draft' ? 'success.outlinedBorder' : 'neutral.outlinedBorder',
                  bgcolor: readinessVm.gate === 'ready_to_draft' ? 'success.softBg' : 'background.surface',
                }}
              >
                <Stack direction={{ xs: 'column', md: 'row' }} spacing={1} alignItems={{ md: 'center' }} justifyContent="space-between">
                  <Box sx={{ minWidth: 0 }}>
                    <Typography level="title-sm" sx={{ color: 'text.tertiary' }}>
                      Filing readiness
                    </Typography>
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.35, minWidth: 0 }}>
                      {readinessVm.status === 'not_ready' ? (
                        <Box component="span" className="status-indicator-pulse warning" />
                      ) : readinessVm.status === 'ready' ? (
                        <Box component="span" className="status-indicator-pulse" />
                      ) : (
                        <Box component="span" sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: 'neutral.400', display: 'inline-block', mr: 1 }} />
                      )}
                      <Typography level="title-sm" sx={{ fontWeight: 700 }}>
                        {readinessVm.label}
                      </Typography>
                      <Typography level="body-xs" sx={{ color: 'text.tertiary' }}>
                        Updated {lastSavedText(lastSavedAt)}
                      </Typography>
                    </Stack>
                  </Box>
                  {nextWorkflowItem ? (
                    <Box sx={{ mt: { xs: 1, md: 0 }, textAlign: { md: 'right' } }}>
                      <Typography level="body-xs" sx={{ fontWeight: 600, color: 'primary.600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Next move
                      </Typography>
                      <Typography level="body-sm" sx={{ fontWeight: 600, color: 'text.primary' }}>
                        {nextWorkflowItem.title}
                      </Typography>
                    </Box>
                  ) : null}
                </Stack>


                <Box sx={{ mt: 1 }}>
                  <Typography level="body-sm" sx={{ fontWeight: 700 }}>
                    Readiness checks
                  </Typography>
                  <Stack spacing={0.45} sx={{ mt: 0.45, maxWidth: 520 }}>
                    <Stack direction="row" spacing={0.75} alignItems="center" justifyContent="space-between">
                      <Stack direction="row" spacing={0.6} alignItems="center" sx={{ minWidth: 0 }}>
                        <Typography
                          level="body-xs"
                          sx={{
                            fontWeight: 900,
                            color: readinessVm.criteria.requiredDataComplete ? 'success.600' : 'warning.700',
                          }}
                        >
                          {readinessVm.criteria.requiredDataComplete ? '✓' : '•'}
                        </Typography>
                        <Typography level="body-xs" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                          Required data complete
                        </Typography>
                      </Stack>
                      <Typography level="body-xs" sx={{ color: 'text.tertiary', fontWeight: 700 }}>
                        {readinessVm.criteria.requiredDataComplete ? 'Complete' : 'Needs attention'}
                      </Typography>
                    </Stack>

                    <Stack direction="row" spacing={0.75} alignItems="center" justifyContent="space-between">
                      <Stack direction="row" spacing={0.6} alignItems="center" sx={{ minWidth: 0 }}>
                        <Typography
                          level="body-xs"
                          sx={{
                            fontWeight: 900,
                            color: readinessVm.criteria.requiredDocsVerifiedOrWaived ? 'success.600' : 'warning.700',
                          }}
                        >
                          {readinessVm.criteria.requiredDocsVerifiedOrWaived ? '✓' : '•'}
                        </Typography>
                        <Typography level="body-xs" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                          Required documents verified or waived
                        </Typography>
                      </Stack>
                      <Typography level="body-xs" sx={{ color: 'text.tertiary', fontWeight: 700 }}>
                        {readinessVm.criteria.requiredDocsVerifiedOrWaived ? 'Complete' : 'Needs attention'}
                      </Typography>
                    </Stack>

                    <Stack direction="row" spacing={0.75} alignItems="center" justifyContent="space-between">
                      <Stack direction="row" spacing={0.6} alignItems="center" sx={{ minWidth: 0 }}>
                        <Typography
                          level="body-xs"
                          sx={{
                            fontWeight: 900,
                            color: readinessVm.criteria.criticalRisksReviewed ? 'success.600' : 'warning.700',
                          }}
                        >
                          {readinessVm.criteria.criticalRisksReviewed ? '✓' : '•'}
                        </Typography>
                        <Typography level="body-xs" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                          Critical risks reviewed
                        </Typography>
                      </Stack>
                      <Typography level="body-xs" sx={{ color: 'text.tertiary', fontWeight: 700 }}>
                        {readinessVm.criteria.criticalRisksReviewed ? 'Complete' : 'Needs attention'}
                      </Typography>
                    </Stack>

                    <Stack direction="row" spacing={0.75} alignItems="center" justifyContent="space-between">
                      <Stack direction="row" spacing={0.6} alignItems="center" sx={{ minWidth: 0 }}>
                        <Typography
                          level="body-xs"
                          sx={{
                            fontWeight: 900,
                            color: readinessVm.criteria.attorneyApprovalGatePassed ? 'success.600' : 'warning.700',
                          }}
                        >
                          {readinessVm.criteria.attorneyApprovalGatePassed ? '✓' : '•'}
                        </Typography>
                        <Typography level="body-xs" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                          Attorney approval gate passed
                        </Typography>
                      </Stack>
                      <Typography level="body-xs" sx={{ color: 'text.tertiary', fontWeight: 700 }}>
                        {readinessVm.criteria.attorneyApprovalGatePassed ? 'Complete' : 'Needs attention'}
                      </Typography>
                    </Stack>
                  </Stack>
                </Box>


                <Stack direction="row" spacing={0.75} alignItems="center" sx={{ flex: '0 0 auto' }}>
                  <Dropdown>
                    <MenuButton size="sm" variant="soft" aria-label="Options">
                      ⋯
                    </MenuButton>
                    <Menu size="sm" placement="bottom-end">
                      <MenuItem onClick={() => setCaseRecordOpen(true)}>Case record</MenuItem>
                      <MenuItem onClick={openIntakeFromFirstBlocking}>
                        Open intake
                      </MenuItem>
                      <MenuItem
                        onClick={() => {
                          setActiveTab('blockers');
                          setFilingToolsOpen(true);
                        }}
                      >
                        Filing tools
                      </MenuItem>
                    </Menu>
                  </Dropdown>
                  <Button
                    variant="solid"
                    disabled={!nextWorkflowItem}
                    onClick={() => nextWorkflowItem?.onCta()}
                  >
                    {nextWorkflowItem ? nextWorkflowItem.ctaLabel : 'All clear'}
                  </Button>
                </Stack>
              </Sheet>

              <Box>
                <Typography level="title-sm" sx={{ mb: 0.75 }}>
                  Recent activity
                </Typography>
                {recentActivity.length === 0 ? (
                  <Typography level="body-sm" sx={{ color: 'text.tertiary' }}>
                    No recent activity.
                  </Typography>
                ) : (
                  <List size="sm" sx={{ '--List-gap': '0.35rem' }}>
                    {recentActivity.map((item) => {
                      const timeAgo = lastSavedText(new Date(item.at).getTime());
                      return (
                        <ListItem key={item.id} sx={{ p: 0 }}>
                          <ListItemButton sx={{ p: 0.5, borderRadius: 'sm', cursor: 'default', '&:hover': { bgcolor: 'transparent' } }}>
                            <ListItemDecorator sx={{ alignSelf: 'flex-start', mt: 0.25 }}>
                              {item.type === 'intake' ? (
                                <Box sx={{ color: 'primary.500' }}>
                                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                                </Box>
                              ) : item.type === 'message' ? (
                                <Box sx={{ color: 'warning.500' }}>
                                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
                                </Box>
                              ) : (
                                <Box sx={{ color: 'success.500' }}>
                                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" /></svg>
                                </Box>
                              )}
                            </ListItemDecorator>
                            <ListItemContent>
                              <Typography level="body-sm" sx={{ fontWeight: 500, color: 'text.primary' }}>
                                {item.label}
                              </Typography>
                              <Typography level="body-xs" sx={{ color: 'text.tertiary' }}>
                                {timeAgo}
                              </Typography>
                            </ListItemContent>
                          </ListItemButton>
                        </ListItem>
                      );
                    })}
                  </List>
                )}
              </Box>

              <AccordionGroup sx={{ mt: 0.5 }}>
                <Accordion>
                  <AccordionSummary>
                    <Typography level="title-sm">Case note (AI)</Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Stack spacing={1}>
                      {aiSummary ? (
                        <Typography level="body-sm" sx={{ whiteSpace: 'pre-wrap', bgcolor: 'background.level1', p: 1, borderRadius: 'sm', borderLeft: '3px solid', borderColor: 'primary.500' }}>
                          {aiSummary}
                        </Typography>
                      ) : (
                        <Typography level="body-sm" sx={{ color: 'text.tertiary' }}>
                          Generate a 2-sentence summary of the case status, identifying key blockers and missing info.
                        </Typography>
                      )}
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Button
                          size="sm"
                          variant="solid"
                          color="primary"
                          onClick={generateAiSummary}
                          disabled={aiSummaryCooldownRemaining > 0}
                          startDecorator={
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>
                          }
                        >
                          {aiSummary ? 'Regenerate summary' : 'Generate summary'}
                        </Button>
                        <Typography level="body-xs" sx={{ color: 'text.tertiary' }}>
                          {aiSummaryCooldownRemaining > 0 ? `Wait ${aiSummaryCooldownRemaining}s` : ' '}
                        </Typography>
                      </Stack>
                    </Stack>
                  </AccordionDetails>
                </Accordion>
              </AccordionGroup>
            </Stack >

            <Drawer
              open={caseRecordOpen}
              onClose={() => setCaseRecordOpen(false)}
              anchor="right"
              size="md"
              variant="plain"
            >
              <ModalClose />
              <Box sx={{ p: 1.5 }}>
                <Typography level="title-md">Case record (derived)</Typography>
                <Typography level="body-sm" sx={{ color: 'text.tertiary', mt: 0.25 }}>
                  Derived from assignment evidence. Review before generating filing forms.
                </Typography>
                <Stack direction="row" spacing={0.75} sx={{ mt: 1 }}>
                  <Button size="sm" variant="soft" onClick={openIntakeFromFirstBlocking}>
                    Open intake
                  </Button>
                </Stack>
              </Box>
              <Divider />
              <Box sx={{ flex: 1, minHeight: 0, overflow: 'auto', p: 1.5 }}>
                <List size="sm" sx={{ '--List-gap': '0.55rem' }}>
                  {caseRecordRows.map((row) => {
                    const isMissing = row.value === 'Missing';
                    return (
                      <ListItem key={row.fieldId} sx={{ p: 0 }}>
                        <Stack direction="row" spacing={1} alignItems="baseline" justifyContent="space-between" sx={{ width: '100%' }}>
                          <Typography level="body-xs" sx={{ color: 'text.tertiary', fontWeight: 700 }}>
                            {row.label}
                          </Typography>
                          <Typography
                            level="body-sm"
                            sx={{
                              fontWeight: isMissing ? 800 : 600,
                              color: isMissing ? 'var(--joy-palette-danger-600)' : 'var(--joy-palette-text-primary)',
                              textAlign: 'right',
                              maxWidth: '62%',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                            title={row.value}
                          >
                            {row.value}
                          </Typography>
                        </Stack>
                      </ListItem>
                    );
                  })}
                </List>
              </Box>
            </Drawer>
          </PageSurface >
        </section >
      );
    }

    if (activeTab === 'settings') {
      return (
        <section className="attorney-workspace-panel" id="attorney-panel-settings" role="tabpanel" aria-labelledby="attorney-tab-settings">
          <AttorneySettingsPane />
        </section>
      );
    }

    if (activeTab === 'settings') {
      return (
        <section className="attorney-workspace-panel" id="attorney-panel-settings" role="tabpanel" aria-labelledby="attorney-tab-settings">
          <AttorneySettingsPane />
        </section>
      );
    }

    return null;
  };



  return (
    <div className="attorney-dashboard">
      <Sheet className="attorney-header-bar" variant="plain">
        <Stack direction="row" spacing={1} alignItems="center" className="attorney-header-left">
          <Typography level="title-md" className="attorney-title">
            {caseTitle}
          </Typography>
          <Typography level="body-xs" className="attorney-subtitle">
            Case workspace
          </Typography>
        </Stack>
        <Stack direction="row" spacing={1} alignItems="center" className="attorney-header-right">
          <Dropdown>
            <MenuButton size="sm" variant="soft" className="btn-actions-menu">
              Actions
            </MenuButton>
            <Menu placement="bottom-end" sx={{ minWidth: 220 }}>
              <MenuItem
                disabled={!onLoadDemo}
                onClick={() => {
                  onLoadDemo?.();
                  showToast('Wallace demo loaded');
                  setActiveTab('blockers');
                  setFilingToolsOpen(true);
                }}
              >
                Load Wallace demo
              </MenuItem>
              <MenuItem onClick={onReset} color="danger">
                Reset
              </MenuItem>
            </Menu>
          </Dropdown>
          <Button size="sm" variant="solid" onClick={() => setViewMode('client')}>
            Client View
          </Button>
        </Stack>
      </Sheet>

      <Snackbar
        open={Boolean(toast)}
        color={toast && /(fail|error)/i.test(toast) ? 'danger' : 'success'}
        autoHideDuration={2200}
        onClose={() => setToast(null)}
      >
        {toast ?? ''}
      </Snackbar>

      <AttorneyWorkspaceShell
        activeTab={activeTab}
        tabs={tabNav}
        onChangeTab={(tab) => setActiveTab(tab)}
        action={
          <Button size="sm" variant="soft" onClick={() => setFilingToolsOpen(true)}>
            Filing tools
          </Button>
        }
      />

      <div className="attorney-workspace-content">
        {viewMode === 'client' ? null : renderTabPanel()}
      </div>

      <FilingToolsDrawer
        open={filingToolsOpen}
        onClose={() => setFilingToolsOpen(false)}
        answers={answers}
        documentSufficiency={documentSufficiency}
        intakeUploadFilesByFieldId={intakeUploadFilesByFieldId}
        onMoveIntakeUploadFile={onMoveIntakeUploadFile}
        onApplyToIntakeField={onApplyToIntakeField}
        missingRequiredCount={blockingValidationCount}
        missingDocsCount={missingDocs.length}
        needsReviewThreadsCount={needsReviewThreadsCount}
        onOpenIntake={openIntakeFromFirstBlocking}
        onOpenIntakeToField={openIntakeToField}
        onOpenAssignments={openAssignmentsTab}
        onOpenMessages={openMessagesTab}
      />
    </div>
  );
}
