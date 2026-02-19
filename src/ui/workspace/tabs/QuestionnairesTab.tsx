import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Box from '@mui/joy/Box';
import Button from '@mui/joy/Button';
import Chip from '@mui/joy/Chip';
import Divider from '@mui/joy/Divider';
import Dropdown from '@mui/joy/Dropdown';
import Drawer from '@mui/joy/Drawer';
import FormControl from '@mui/joy/FormControl';
import FormLabel from '@mui/joy/FormLabel';
import Input from '@mui/joy/Input';
import Menu from '@mui/joy/Menu';
import MenuButton from '@mui/joy/MenuButton';
import MenuItem from '@mui/joy/MenuItem';
import Modal from '@mui/joy/Modal';
import ModalClose from '@mui/joy/ModalClose';
import ModalDialog from '@mui/joy/ModalDialog';
import List from '@mui/joy/List';
import ListDivider from '@mui/joy/ListDivider';
import ListItem from '@mui/joy/ListItem';
import ListItemButton from '@mui/joy/ListItemButton';
import ListItemContent from '@mui/joy/ListItemContent';
import Option from '@mui/joy/Option';
import Select from '@mui/joy/Select';
import Sheet from '@mui/joy/Sheet';
import Stack from '@mui/joy/Stack';
import Tab from '@mui/joy/Tab';
import TabList from '@mui/joy/TabList';
import TabPanel from '@mui/joy/TabPanel';
import Tabs from '@mui/joy/Tabs';
import Textarea from '@mui/joy/Textarea';
import Typography from '@mui/joy/Typography';
import LinearProgress from '@mui/joy/LinearProgress';
import { deriveAssignmentProgress } from '../../../questionnaires/runtime/stage';
import { createGraphEdge, createGraphNode } from '../../../questionnaires/store';
import type {
  FilingLabel,
  NodeResponse,
  QuestionnaireAssignment,
  QuestionnaireGraph,
  QuestionnaireNodeKind,
  QuestionnaireTemplate,
  QuestionInputType,
  ResponseValue,
} from '../../../questionnaires/types';
import { BuilderCanvas } from '../questionnaire-builder/BuilderCanvas';
import {
  questionnaireDragMimeType,
  setLastDraggedQuestionnaireKind,
} from '../questionnaire-builder/dragMime';
import { PreviewPane } from '../questionnaire-builder/PreviewPane';
import { ToolboxPane } from '../questionnaire-builder/ToolboxPane';
import { validateGraph } from '../questionnaire-builder/graphValidation';
import { labelForGlobalStatus, statusFromAssignment, toneForGlobalStatus } from '../../shared/globalStatus';
import type { GlobalStatus } from '../../shared/globalStatus';
import { compareInboxRows, formatShortDate, getDueUrgency } from './assignmentInboxSort';

type AssignmentWorkspaceView = 'home' | 'editor';
type EditorSurface = 'design' | 'preview';

import { EmptyState } from '../../shared/EmptyState';

type WizardStarter = 'blank' | 'intake' | 'followup' | 'documents';

type AssignmentWizardState = {
  title: string;
  purpose: string;
  starter: WizardStarter;
  sectionCount: number;
  includeDocumentRequest: boolean;
  includeApprovalGate: boolean;
};

type AssignmentRow = {
  assignment: QuestionnaireAssignment;
  template: QuestionnaireTemplate | null;
  progressTotal: number;
  progressCompleted: number;
  progressPercent: number;
  status: GlobalStatus;
  lastActivityAt: string;
};

const ASSIGNMENT_TEMPLATES_OPEN_KEY = 'gbi:ui:assignments:templatesOpen';

interface QuestionnairesTabProps {
  templates: QuestionnaireTemplate[];
  assignments: QuestionnaireAssignment[];
  responses: NodeResponse[];
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
}

type SkeletonPrompt = {
  kind: QuestionnaireNodeKind;
  title: string;
  helpText: string;
  inputType?: QuestionInputType;
  required?: boolean;
  labels: FilingLabel[];
  placeholder?: string;
  options?: Array<{ id: string; label: string }>;
};

type SkeletonSection = {
  title: string;
  helpText: string;
  prompts: SkeletonPrompt[];
};

function isFilesValue(
  value: ResponseValue
): value is { files: Array<{ id: string; name: string; uploadedAt: string }> } {
  if (typeof value !== 'object' || value == null) return false;
  return 'files' in value && Array.isArray((value as { files?: unknown }).files);
}

function nowIso(): string {
  return new Date().toISOString();
}

function formatWhen(value: string | undefined): string {
  if (!value) return 'No activity';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return 'No activity';
  const deltaMs = Date.now() - parsed.getTime();
  const deltaMin = Math.floor(deltaMs / 60000);
  if (deltaMin < 1) return 'Just now';
  if (deltaMin < 60) return `${deltaMin}m ago`;
  const deltaHr = Math.floor(deltaMin / 60);
  if (deltaHr < 24) return `${deltaHr}h ago`;
  const deltaDay = Math.floor(deltaHr / 24);
  if (deltaDay === 1) return 'Yesterday';
  if (deltaDay < 7) return `${deltaDay}d ago`;
  return parsed.toLocaleDateString();
}

const NUMBER_FORMATTER = new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 });
const DECIMAL_STRING_RE = /^-?\d+\.\d+$/;

function nextUntitledTitle(base: string, takenTitles: Set<string>): string {
  const cleanBase = base.trim() || 'Untitled';
  if (!takenTitles.has(cleanBase)) return cleanBase;
  for (let i = 2; i < 1000; i += 1) {
    const candidate = `${cleanBase} (${i})`;
    if (!takenTitles.has(candidate)) return candidate;
  }
  return `${cleanBase} (${Date.now()})`;
}

function titleCaseKey(value: string): string {
  const cleaned = value.replace(/_/g, ' ').trim();
  if (!cleaned) return value;
  return cleaned.replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatMaybeDecimalString(value: string): string {
  const trimmed = value.trim();
  if (!DECIMAL_STRING_RE.test(trimmed)) return value;
  const num = Number(trimmed);
  if (!Number.isFinite(num)) return value;
  return NUMBER_FORMATTER.format(num);
}

function formatResponseValue(value: ResponseValue | undefined): string {
  if (value == null) return 'No response';
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return 'No response';
    return formatMaybeDecimalString(trimmed);
  }
  if (typeof value === 'number') return NUMBER_FORMATTER.format(value);
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (Array.isArray(value)) return value.length > 0 ? value.join(', ') : 'No selections';
  if (isFilesValue(value)) {
    return value.files.length > 0
      ? value.files.map((file) => file.name).join(', ')
      : 'No files uploaded';
  }
  if (typeof value === 'object') {
    const lines = Object.entries(value)
      .filter(([, item]) => typeof item === 'string' && item.trim().length > 0)
      .map(([key, item]) => `${titleCaseKey(key)}: ${formatMaybeDecimalString(String(item))}`);
    return lines.length > 0 ? lines.join(' · ') : 'No response';
  }
  return 'No response';
}

function resolveGraph(template: QuestionnaireTemplate | null): QuestionnaireGraph {
  const empty: QuestionnaireGraph = { nodes: [], edges: [] };
  if (!template) return empty;
  return (
    template.versions.find((item) => item.version === template.activeVersion)?.graph ?? empty
  );
}

function starterSections(starter: WizardStarter): SkeletonSection[] {
  if (starter === 'blank') {
    return [
      {
        title: 'New section',
        helpText: 'Describe what this assignment collects from the client.',
        prompts: [
          {
            kind: 'question',
            title: 'New question',
            helpText: 'Ask the client for the information you need.',
            inputType: 'text',
            required: false,
            labels: ['other'],
            placeholder: 'Type the question and choose an input type.',
          },
        ],
      },
    ];
  }

  if (starter === 'documents') {
    return [
      {
        title: 'Document upload packet',
        helpText: 'Collect required evidence files before attorney review.',
        prompts: [
          {
            kind: 'doc_request',
            title: 'Upload the most recent paystubs (60 days)',
            helpText: 'Include all employers and all pages for each pay period.',
            inputType: 'file_upload',
            required: true,
            labels: ['documents', 'income'],
          },
          {
            kind: 'doc_request',
            title: 'Upload the latest bank statements (2-3 months)',
            helpText: 'Upload statements for every active account.',
            inputType: 'file_upload',
            required: true,
            labels: ['documents', 'assets'],
          },
          {
            kind: 'question',
            title: "If a document is unavailable, explain what you can provide instead.",
            helpText: 'This creates an exception trail for attorney review.',
            inputType: 'textarea',
            required: true,
            labels: ['documents', 'other'],
            placeholder: 'Example: Statement delayed by bank, replacement arriving in 2 days.',
          },
        ],
      },
    ];
  }

  if (starter === 'followup') {
    return [
      {
        title: 'Blocking clarifications',
        helpText: 'Resolve the remaining blockers that prevent filing readiness.',
        prompts: [
          {
            kind: 'question',
            title: 'Have any assets changed in the last 30 days?',
            helpText: 'Used to confirm schedules are still accurate before filing.',
            inputType: 'yes_no',
            required: true,
            labels: ['assets', 'schedule_a_b'],
          },
          {
            kind: 'question',
            title: 'Describe the change and estimated value impact.',
            helpText: 'Required only when assets changed.',
            inputType: 'textarea',
            required: true,
            labels: ['assets', 'exemptions'],
            placeholder: 'Vehicle sold, paid off loan, or new asset purchased.',
          },
          {
            kind: 'question',
            title: 'Confirm current monthly take-home income.',
            helpText: 'This confirms means-test and Schedule I assumptions.',
            inputType: 'number',
            required: true,
            labels: ['income', 'schedule_i_j'],
            placeholder: 'e.g. 4200',
          },
        ],
      },
      {
        title: 'Attorney follow-up',
        helpText: 'Capture final confirmations for attorney sign-off.',
        prompts: [
          {
            kind: 'task',
            title: 'Acknowledge attorney follow-up request',
            helpText: 'Client confirms all follow-up requests were reviewed.',
            inputType: 'text',
            required: false,
            labels: ['other'],
          },
        ],
      },
    ];
  }

  return [
    {
      title: 'Client profile',
      helpText: 'Collect filing identity and household details.',
      prompts: [
        {
          kind: 'question',
          title: 'Full legal name',
          helpText: 'Match current legal ID and filing records.',
          inputType: 'text',
          required: true,
          labels: ['identity_household'],
        },
        {
          kind: 'question',
          title: 'Primary phone number',
          helpText: 'Used for urgent filing communication.',
          inputType: 'text',
          required: true,
          labels: ['identity_household'],
        },
        {
          kind: 'question',
          title: 'Current street address',
          helpText: 'Needed for petition and venue checks.',
          inputType: 'textarea',
          required: true,
          labels: ['identity_household', 'sofa'],
        },
      ],
    },
    {
      title: 'Income and expenses',
      helpText: 'Collect monthly cashflow needed for means test and schedules.',
      prompts: [
        {
          kind: 'question',
          title: 'Current gross monthly income',
          helpText: 'Include wages and recurring income sources.',
          inputType: 'number',
          required: true,
          labels: ['income', 'schedule_i_j'],
          placeholder: 'e.g. 5800',
        },
        {
          kind: 'question',
          title: 'Estimated total monthly expenses',
          helpText: 'Use best estimate; attorney will verify before filing.',
          inputType: 'number',
          required: true,
          labels: ['expenses', 'schedule_i_j'],
          placeholder: 'e.g. 4300',
        },
      ],
    },
    {
      title: 'Assets and debts',
      helpText: 'Capture property and debt details for schedules A/B through E/F.',
      prompts: [
        {
          kind: 'question',
          title: 'List vehicles and estimated values',
          helpText: 'Include lender details if financed.',
          inputType: 'textarea',
          required: true,
          labels: ['assets', 'schedule_a_b', 'schedule_d'],
        },
        {
          kind: 'question',
          title: 'List secured debts (mortgage, auto loans, liens)',
          helpText: 'Include creditor name and approximate balance.',
          inputType: 'textarea',
          required: true,
          labels: ['debts_secured', 'schedule_d'],
        },
        {
          kind: 'question',
          title: 'List unsecured debts (credit cards, medical, personal loans)',
          helpText: 'Include known creditor names and amounts if available.',
          inputType: 'textarea',
          required: true,
          labels: ['debts_unsecured', 'schedule_e_f'],
        },
      ],
    },
  ];
}

function buildWizardSkeletonGraph(input: AssignmentWizardState): QuestionnaireGraph {
  const sections = starterSections(input.starter);
  const clampedSectionCount = Math.max(1, Math.min(input.sectionCount, sections.length));
  const selectedSections = sections.slice(0, clampedSectionCount);

  if (input.includeDocumentRequest && !selectedSections.some((item) =>
    item.prompts.some((prompt) => prompt.kind === 'doc_request'))
  ) {
    selectedSections.push({
      title: 'Document request',
      helpText: 'Collect supporting files required for filing readiness.',
      prompts: [
        {
          kind: 'doc_request',
          title: 'Upload missing filing documents',
          helpText: 'Attach all requested statements and supporting evidence files.',
          inputType: 'file_upload',
          required: true,
          labels: ['documents'],
        },
      ],
    });
  }

  const nodes = [] as QuestionnaireGraph['nodes'];
  const edges = [] as QuestionnaireGraph['edges'];

  const start = createGraphNode('start', {
    title: 'Start',
    clientVisible: false,
    labels: [],
    ui: { x: 80, y: 120 },
  });
  nodes.push(start);

  let previousNodeId = start.id;
  let yBase = 120;
  let lastSectionId: string | undefined;

  selectedSections.forEach((section, sectionIndex) => {
    const sectionNode = createGraphNode('section', {
      title: section.title,
      helpText: section.helpText,
      clientVisible: true,
      labels: ['other'],
      ui: { x: 180, y: yBase },
    });
    nodes.push(sectionNode);
    edges.push(createGraphEdge({ from: previousNodeId, to: sectionNode.id }));
    previousNodeId = sectionNode.id;
    lastSectionId = sectionNode.id;

    let promptY = yBase + 96;
    section.prompts.forEach((prompt) => {
      const node = createGraphNode(prompt.kind, {
        title: prompt.title,
        helpText: prompt.helpText,
        placeholder: prompt.placeholder,
        labels: prompt.labels,
        inputType: prompt.inputType,
        required: prompt.required,
        blocksWorkflow: Boolean(prompt.required),
        options: prompt.options,
        sectionId: sectionNode.id,
        ui: { x: 440, y: promptY },
      });

      if (prompt.kind === 'doc_request') {
        node.inputType = 'file_upload';
        node.required = true;
      }

      nodes.push(node);
      edges.push(createGraphEdge({ from: previousNodeId, to: node.id }));
      previousNodeId = node.id;
      promptY += 88;
    });

    yBase += Math.max(210, 100 + section.prompts.length * 88);

    if (sectionIndex < selectedSections.length - 1) {
      const reminder = createGraphNode('reminder', {
        title: `${section.title} review`,
        helpText: 'Confirm this section is complete before moving forward.',
        labels: ['other'],
        clientVisible: false,
        sectionId: sectionNode.id,
        required: false,
        ui: { x: 440, y: promptY },
      });
      nodes.push(reminder);
      edges.push(createGraphEdge({ from: previousNodeId, to: reminder.id }));
      previousNodeId = reminder.id;
      yBase += 60;
    }
  });

  if (input.includeApprovalGate) {
    const gate = createGraphNode('approval_gate', {
      title: 'Attorney approval gate',
      helpText: 'Attorney verifies assignment responses before completion.',
      labels: ['other'],
      clientVisible: false,
      sectionId: lastSectionId,
      required: false,
      blocksWorkflow: true,
      ui: { x: 440, y: yBase },
    });
    nodes.push(gate);
    edges.push(createGraphEdge({ from: previousNodeId, to: gate.id }));
    previousNodeId = gate.id;
    yBase += 88;
  }

  const end = createGraphNode('end', {
    title: 'End',
    clientVisible: false,
    labels: [],
    ui: { x: 760, y: yBase },
  });
  nodes.push(end);
  edges.push(createGraphEdge({ from: previousNodeId, to: end.id }));

  return { nodes, edges };
}

function defaultWizardState(): AssignmentWizardState {
  return {
    title: 'New assignment',
    purpose: 'Collect filing-critical information with a polished guided flow.',
    starter: 'intake',
    sectionCount: 3,
    includeDocumentRequest: true,
    includeApprovalGate: true,
  };
}

export function QuestionnairesTab({
  templates,
  assignments,
  responses,
  onCreateTemplate: _onCreateTemplate,
  onDuplicateTemplate,
  onArchiveTemplate,
  onCloneTemplateForEdit,
  onUpdateTemplateGraph,
  onPublishTemplate,
  onPublishAndAssignTemplate,
}: QuestionnairesTabProps) {
  const workbenchRef = useRef<HTMLDivElement | null>(null);
  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [view, setView] = useState<AssignmentWorkspaceView>('home');
  const [editorSurface, setEditorSurface] = useState<EditorSurface>('design');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(templates[0]?.id ?? '');
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [templatesOpen, setTemplatesOpen] = useState(() => {
    if (typeof window === 'undefined') return false;
    try {
      return localStorage.getItem(ASSIGNMENT_TEMPLATES_OPEN_KEY) === 'true';
    } catch {
      return false;
    }
  });
  const [resolvedOpen, setResolvedOpen] = useState(false);
  const [showToolbox, setShowToolbox] = useState(true);
  const [showWizard, setShowWizard] = useState(false);
  const [activityDrawerOpen, setActivityDrawerOpen] = useState(false);
  const [draftsOpen, setDraftsOpen] = useState(false);
  const [sendOpen, setSendOpen] = useState(false);
  const [sendDueAt, setSendDueAt] = useState('');
  const [sendNotes, setSendNotes] = useState('');
  const [wizardStep, setWizardStep] = useState(0);
  const [wizardState, setWizardState] = useState<AssignmentWizardState>(
    defaultWizardState()
  );
  const [autosaveState, setAutosaveState] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [autosavedAt, setAutosavedAt] = useState<string | null>(null);

  const activeTemplates = useMemo(
    () => templates.filter((template) => !template.archived),
    [templates]
  );

  useEffect(() => {
    if (!activeTemplates.some((template) => template.id === selectedTemplateId)) {
      setSelectedTemplateId(activeTemplates[0]?.id ?? '');
      setSelectedNodeId(null);
    }
  }, [activeTemplates, selectedTemplateId]);

  useEffect(() => {
    if (!selectedAssignmentId) return;
    if (assignments.some((assignment) => assignment.id === selectedAssignmentId)) return;
    setSelectedAssignmentId(null);
  }, [assignments, selectedAssignmentId]);

  useEffect(() => {
    const workbench = workbenchRef.current;
    return () => {
      if (autosaveTimerRef.current) {
        clearTimeout(autosaveTimerRef.current);
      }
      if (workbench && document.fullscreenElement === workbench) {
        void document.exitFullscreen();
      }
    };
  }, []);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const shouldLockPageScroll = view === 'editor' && editorSurface === 'design';
    document.documentElement.classList.toggle('questionnaires-scroll-locked', shouldLockPageScroll);
    document.body.classList.toggle('questionnaires-scroll-locked', shouldLockPageScroll);
    return () => {
      document.documentElement.classList.remove('questionnaires-scroll-locked');
      document.body.classList.remove('questionnaires-scroll-locked');
    };
  }, [editorSurface, view]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(ASSIGNMENT_TEMPLATES_OPEN_KEY, templatesOpen ? 'true' : 'false');
    } catch {
      // non-fatal for local demo
    }
  }, [templatesOpen]);

  const templateById = useMemo(
    () => new Map(activeTemplates.map((template) => [template.id, template])),
    [activeTemplates]
  );

  const responseStatsByAssignment = useMemo(() => {
    const map = new Map<string, { count: number; latestAt: string }>();
    for (const response of responses) {
      const existing = map.get(response.assignmentId);
      if (!existing) {
        map.set(response.assignmentId, { count: 1, latestAt: response.updatedAt });
        continue;
      }
      existing.count += 1;
      if (response.updatedAt > existing.latestAt) {
        existing.latestAt = response.updatedAt;
      }
    }
    return map;
  }, [responses]);

  const assignmentRows = useMemo<AssignmentRow[]>(() => {
    return assignments
      .map((assignment) => {
        const template = templateById.get(assignment.templateId) ?? null;
        const progress = deriveAssignmentProgress(assignment, template, responses);
        const responseMeta = responseStatsByAssignment.get(assignment.id);
        const lastActivityAt = responseMeta?.latestAt ?? assignment.assignedAt;
        const status = statusFromAssignment({ ...assignment, computedStage: progress.stage });
        return {
          assignment,
          template,
          progressTotal: progress.total,
          progressCompleted: progress.completed,
          progressPercent: progress.percent,
          status,
          lastActivityAt,
        };
      })
      .sort((left, right) => right.lastActivityAt.localeCompare(left.lastActivityAt));
  }, [assignments, responses, responseStatsByAssignment, templateById]);

  const filteredAssignments = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return assignmentRows;
    return assignmentRows.filter((row) => {
      const text = [
        row.assignment.title,
        row.template?.title ?? '',
        labelForGlobalStatus(row.status),
      ]
        .join(' ')
        .toLowerCase();
      return text.includes(query);
    });
  }, [assignmentRows, searchQuery]);

  const sortedAssignments = useMemo(() => {
    const copy = [...filteredAssignments];
    copy.sort((left, right) =>
      compareInboxRows(
        {
          id: left.assignment.id,
          status: left.status,
          dueAt: left.assignment.dueAt,
          lastActivityAt: left.lastActivityAt,
        },
        {
          id: right.assignment.id,
          status: right.status,
          dueAt: right.assignment.dueAt,
          lastActivityAt: right.lastActivityAt,
        }
      )
    );
    return copy;
  }, [filteredAssignments]);

  const openAssignmentRows = useMemo(
    () => sortedAssignments.filter((row) => row.status !== 'resolved'),
    [sortedAssignments]
  );

  const resolvedAssignmentRows = useMemo(
    () => sortedAssignments.filter((row) => row.status === 'resolved'),
    [sortedAssignments]
  );

  const selectedTemplate = useMemo(
    () => activeTemplates.find((template) => template.id === selectedTemplateId) ?? null,
    [activeTemplates, selectedTemplateId]
  );

  const selectedAssignment = useMemo(
    () => assignments.find((assignment) => assignment.id === selectedAssignmentId) ?? null,
    [assignments, selectedAssignmentId]
  );

  const selectedGraph = useMemo(() => resolveGraph(selectedTemplate), [selectedTemplate]);

  const validation = useMemo(() => validateGraph(selectedGraph), [selectedGraph]);

  const galleryTemplates = useMemo(() => {
    const starters = activeTemplates.filter(
      (template) => template.createdBy === 'system' || template.isDefault
    );
    return starters.length > 0 ? starters : activeTemplates;
  }, [activeTemplates]);

  const draftTemplates = useMemo(() => {
    const usedTemplateIds = new Set(assignments.map((assignment) => assignment.templateId));
    const query = searchQuery.trim().toLowerCase();
    return activeTemplates
      .filter((template) => template.createdBy === 'attorney' && !usedTemplateIds.has(template.id))
      .filter((template) => {
        if (!query) return true;
        const haystack = `${template.title} ${template.description}`.toLowerCase();
        return haystack.includes(query);
      })
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }, [activeTemplates, assignments, searchQuery]);

  const clientActivity = useMemo(() => {
    const assignmentById = new Map(assignments.map((item) => [item.id, item]));
    const nodeTitleByTemplateVersion = new Map<string, Map<string, string>>();

    const getNodeTitle = (templateId: string, templateVersion: number, nodeId: string): string => {
      const key = `${templateId}:${templateVersion}`;
      let titleByNodeId = nodeTitleByTemplateVersion.get(key);
      if (!titleByNodeId) {
        titleByNodeId = new Map<string, string>();
        const template = templateById.get(templateId) ?? null;
        const version = template?.versions.find((item) => item.version === templateVersion) ?? null;
        if (version) {
          for (const node of version.graph.nodes) titleByNodeId.set(node.id, node.title);
        }
        nodeTitleByTemplateVersion.set(key, titleByNodeId);
      }
      return titleByNodeId.get(nodeId) ?? 'Prompt';
    };

    const uploads: Array<{ id: string; fileName: string; nodeTitle: string; assignmentTitle: string; at: string }> =
      [];
    const answersRows: Array<{ id: string; nodeTitle: string; assignmentTitle: string; value: string; at: string }> =
      [];

    for (const response of responses) {
      const assignment = assignmentById.get(response.assignmentId);
      if (!assignment) continue;
      const assignmentTitle = assignment.title;
      const nodeTitle = getNodeTitle(assignment.templateId, assignment.templateVersion, response.nodeId);

      if (response.skipped) {
        answersRows.push({
          id: `${response.assignmentId}:${response.nodeId}:${response.updatedAt}`,
          nodeTitle,
          assignmentTitle,
          value: `Deferred: ${response.skipped.reason}`,
          at: response.updatedAt,
        });
        continue;
      }

      const value = response.value;
      if (!value) continue;

      if (isFilesValue(value)) {
        for (const file of value.files) {
          uploads.push({
            id: `${response.assignmentId}:${response.nodeId}:${file.id}`,
            fileName: file.name,
            nodeTitle,
            assignmentTitle,
            at: file.uploadedAt ?? response.updatedAt,
          });
        }
      } else {
        answersRows.push({
          id: `${response.assignmentId}:${response.nodeId}:${response.updatedAt}`,
          nodeTitle,
          assignmentTitle,
          value: formatResponseValue(value),
          at: response.updatedAt,
        });
      }
    }

    uploads.sort((a, b) => b.at.localeCompare(a.at));
    answersRows.sort((a, b) => b.at.localeCompare(a.at));
    return {
      uploads: uploads.slice(0, 6),
      answers: answersRows.slice(0, 8),
    };
  }, [assignments, responses, templateById]);

  const clientActivityBody =
    clientActivity.uploads.length === 0 && clientActivity.answers.length === 0 ? (
      <Typography level="body-sm" sx={{ color: 'text.tertiary' }}>
        No client activity yet.
      </Typography>
    ) : (
      <Stack spacing={1}>
        {clientActivity.uploads.length > 0 ? (
          <Box>
            <Typography level="title-sm" sx={{ mb: 0.5 }}>
              Recent uploads
            </Typography>
            <Stack spacing={0.5}>
              {clientActivity.uploads.map((upload) => (
                <Sheet key={upload.id} variant="soft" sx={{ p: 0.75, borderRadius: 'md' }}>
                  <Typography level="body-sm" sx={{ fontWeight: 700 }}>
                    {upload.fileName}
                  </Typography>
                  <Typography level="body-xs" sx={{ color: 'text.tertiary' }}>
                    {upload.assignmentTitle} · {upload.nodeTitle}
                  </Typography>
                  <Typography level="body-xs" sx={{ color: 'text.tertiary', mt: 0.2 }}>
                    {formatWhen(upload.at)}
                  </Typography>
                </Sheet>
              ))}
            </Stack>
          </Box>
        ) : null}

        <Box>
          <Typography level="title-sm" sx={{ mb: 0.5 }}>
            Recent answers
          </Typography>
          {clientActivity.answers.length === 0 ? (
            <Typography level="body-sm" sx={{ color: 'text.tertiary' }}>
              No answers yet.
            </Typography>
          ) : (
            <Stack spacing={0.5}>
              {clientActivity.answers.map((entry) => (
                <Sheet key={entry.id} variant="soft" sx={{ p: 0.75, borderRadius: 'md' }}>
                  <Typography level="body-sm" sx={{ fontWeight: 700 }}>
                    {entry.nodeTitle}
                  </Typography>
                  <Typography level="body-xs" sx={{ color: 'text.tertiary' }}>
                    {entry.value}
                  </Typography>
                  <Typography level="body-xs" sx={{ color: 'text.tertiary', mt: 0.2 }}>
                    {entry.assignmentTitle} · {formatWhen(entry.at)}
                  </Typography>
                </Sheet>
              ))}
            </Stack>
          )}
        </Box>
      </Stack>
    );

  const handleGraphChange = useCallback(
    (nextGraph: QuestionnaireGraph) => {
      if (!selectedTemplate) return;
      onUpdateTemplateGraph(selectedTemplate.id, nextGraph);
      setAutosaveState('saving');
      if (autosaveTimerRef.current) {
        clearTimeout(autosaveTimerRef.current);
      }
      autosaveTimerRef.current = setTimeout(() => {
        setAutosaveState('saved');
        setAutosavedAt(nowIso());
      }, 420);
    },
    [onUpdateTemplateGraph, selectedTemplate]
  );

  const sendToClient = useCallback(() => {
    if (!selectedTemplate) return;
    const result = onPublishAndAssignTemplate(selectedTemplate.id, {
      dueAt: sendDueAt.trim() || undefined,
      assignmentTitle: selectedTemplate.title,
      notes: sendNotes.trim() || undefined,
    });
    if (!result) return;
    setSendOpen(false);
    setSendDueAt('');
    setSendNotes('');
    setView('home');
    setSelectedAssignmentId(result.assignmentId);
  }, [onPublishAndAssignTemplate, selectedTemplate, sendDueAt, sendNotes]);

  const openAssignmentEditor = useCallback(
    (row: AssignmentRow) => {
      setSelectedAssignmentId(row.assignment.id);
      setSelectedTemplateId(row.assignment.templateId);
      setSelectedNodeId(null);
      setView('editor');
      setEditorSurface('design');
    },
    []
  );

  const openTemplateAsNewAssignment = useCallback(
    (template: QuestionnaireTemplate) => {
      const taken = new Set<string>([
        ...activeTemplates.map((t) => t.title),
        ...assignments.map((a) => a.title),
      ]);
      const draftTitle = nextUntitledTitle(template.title, taken);
      const editableTemplateId = onCloneTemplateForEdit(template.id, { title: draftTitle });
      setSelectedAssignmentId(null);
      setSelectedTemplateId(editableTemplateId);
      setSelectedNodeId(null);
      setView('editor');
      setEditorSurface('design');
      setAutosaveState('idle');
      setAutosavedAt(null);
    },
    [activeTemplates, assignments, onCloneTemplateForEdit]
  );

  const openDraftTemplateEditor = useCallback((template: QuestionnaireTemplate) => {
    setSelectedAssignmentId(null);
    setSelectedTemplateId(template.id);
    setSelectedNodeId(null);
    setView('editor');
    setEditorSurface('design');
    setAutosaveState('idle');
    setAutosavedAt(null);
  }, []);

  const createWizardAssignment = useCallback(() => {
    const starterTemplateId =
      wizardState.starter === 'followup'
        ? 'template-ch7-followup'
        : wizardState.starter === 'documents'
          ? 'template-doc-clarification'
          : 'intake-default';

    const baseTemplate =
      activeTemplates.find((template) => template.id === starterTemplateId) ??
      activeTemplates[0] ??
      null;
    if (!baseTemplate) return;

    const taken = new Set<string>([
      ...activeTemplates.map((t) => t.title),
      ...assignments.map((a) => a.title),
    ]);
    const draftTitle = nextUntitledTitle(wizardState.title.trim() || baseTemplate.title, taken);
    const editableTemplateId = onCloneTemplateForEdit(baseTemplate.id, { title: draftTitle });
    const generatedGraph = buildWizardSkeletonGraph(wizardState);

    onUpdateTemplateGraph(editableTemplateId, generatedGraph);
    setSelectedAssignmentId(null);
    setSelectedTemplateId(editableTemplateId);
    setSelectedNodeId(null);
    setView('editor');
    setEditorSurface('design');
    setAutosaveState('saved');
    setAutosavedAt(nowIso());
    setShowWizard(false);
    setWizardStep(0);
  }, [
    activeTemplates,
    assignments,
    onCloneTemplateForEdit,
    onUpdateTemplateGraph,
    wizardState,
  ]);

  const addNodeFromToolbox = useCallback(
    (kind: QuestionnaireNodeKind) => {
      if (!selectedTemplate) return;
      const sections = selectedGraph.nodes
        .filter((node) => node.kind === 'section')
        .sort((a, b) => {
          const av = a.sectionOrder ?? a.order ?? a.ui?.y ?? 0;
          const bv = b.sectionOrder ?? b.order ?? b.ui?.y ?? 0;
          if (av !== bv) return av - bv;
          return a.id.localeCompare(b.id);
        });
      const selectedSection = selectedGraph.nodes.find(
        (node) => node.id === selectedNodeId && node.kind === 'section'
      );
      const targetSection = selectedSection ?? sections[0] ?? null;

      if (kind === 'section') {
        const maxOrder = Math.max(0, ...sections.map((section) => section.sectionOrder ?? section.order ?? section.ui?.y ?? 0));
        const nextSection = createGraphNode('section', {
          title: 'New section',
          helpText: 'Describe what this section collects for the client.',
        });
        nextSection.sectionOrder = maxOrder + 1000;
        handleGraphChange({
          ...selectedGraph,
          nodes: [...selectedGraph.nodes, nextSection],
        });
        setSelectedNodeId(nextSection.id);
        return;
      }

      if (!targetSection) return;

      const sectionNodes = selectedGraph.nodes
        .filter((node) => node.sectionId === targetSection.id)
        .sort((a, b) => {
          const av = a.order ?? a.ui?.y ?? 0;
          const bv = b.order ?? b.ui?.y ?? 0;
          if (av !== bv) return av - bv;
          return a.id.localeCompare(b.id);
        });
      const nextNode = createGraphNode(kind, {
        sectionId: targetSection.id,
      });
      nextNode.order = (sectionNodes.length + 1) * 1000;

      if (kind === 'question') {
        nextNode.inputType = 'text';
        nextNode.required = false;
      }

      if (kind === 'doc_request') {
        nextNode.inputType = 'file_upload';
        nextNode.required = true;
        nextNode.labels = ['documents'];
      }

      handleGraphChange({
        ...selectedGraph,
        nodes: [...selectedGraph.nodes, nextNode],
      });
      setSelectedNodeId(nextNode.id);
    },
    [handleGraphChange, selectedGraph, selectedNodeId, selectedTemplate]
  );

  const startDrag = useCallback(
    (event: React.DragEvent, kind: QuestionnaireNodeKind) => {
      setLastDraggedQuestionnaireKind(kind);
      event.dataTransfer.setData(questionnaireDragMimeType(), kind);
      event.dataTransfer.setData('text/plain', kind);
      event.dataTransfer.effectAllowed = 'move';
    },
    []
  );

  const openFullscreen = useCallback(async () => {
    if (!workbenchRef.current) return;
    if (document.fullscreenElement === workbenchRef.current) {
      await document.exitFullscreen();
      return;
    }
    await workbenchRef.current.requestFullscreen();
  }, []);

  const autosaveLabel =
    autosaveState === 'saving'
      ? 'Autosaving…'
      : autosaveState === 'saved'
        ? `Autosaved ${formatWhen(autosavedAt ?? undefined)}`
        : 'Autosave on';

  return (
    <Sheet
      ref={workbenchRef}
      variant="plain"
      className="assignments-workspace"
      sx={{
        display: 'grid',
        gap: 1,
        height: '100%',
        minHeight: 0,
        overflow: 'hidden',
      }}
    >
      {view === 'home' ? (
        <Sheet
          variant="soft"
          sx={{
            borderRadius: 'lg',
            border: '1px solid',
            borderColor: 'neutral.outlinedBorder',
            p: 1.25,
            display: 'grid',
            gap: 1.1,
            minHeight: 0,
            gridTemplateRows: 'auto auto auto minmax(0, 1fr)',
          }}
        >
          <Stack
            direction={{ xs: 'column', lg: 'row' }}
            spacing={1}
            alignItems={{ lg: 'center' }}
            justifyContent="space-between"
            className="assignments-home-header"
          >
            <Box>
              <Typography level="title-lg">Assignments</Typography>
              <Typography level="body-sm" sx={{ color: 'text.tertiary' }}>
                Start from a template, then edit and assign with autosave.
              </Typography>
            </Box>
            <Stack direction="row" spacing={0.75}>
              <Button variant="solid" onClick={() => setShowWizard(true)}>
                New assignment
              </Button>
              <Button
                size="sm"
                variant="soft"
                onClick={() => setActivityDrawerOpen(true)}
              >
                Activity
              </Button>
            </Stack>
          </Stack>

          <Input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search assignments"
            size="lg"
          />

          <Sheet
            variant="plain"
            className="assignments-template-gallery"
            sx={{
              borderRadius: 'lg',
              overflow: 'hidden',
              bgcolor: 'transparent',
            }}
          >
            <ListItemButton
              onClick={() => setTemplatesOpen((value) => !value)}
              sx={{
                borderRadius: 0,
                bgcolor: 'background.surface',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 1,
                px: 1.1,
                py: 0.85,
              }}
            >
              <Stack spacing={0.12} sx={{ minWidth: 0 }}>
                <Typography level="title-sm" sx={{ fontWeight: 800 }}>
                  Templates
                </Typography>
                <Typography level="body-xs" sx={{ color: 'text.tertiary' }}>
                  Start a new assignment from a template.
                </Typography>
              </Stack>
              <Stack direction="row" spacing={0.75} alignItems="center">
                <Chip size="sm" variant="soft" color="neutral">
                  {Math.min(10, galleryTemplates.length) + 1}
                </Chip>
                <Typography level="body-xs" sx={{ color: 'text.tertiary', fontWeight: 900 }}>
                  {templatesOpen ? '▾' : '▸'}
                </Typography>
              </Stack>
            </ListItemButton>

            {templatesOpen ? (
              <Box sx={{ px: 1, pb: 0.9 }}>
                <Box
                  className="assignments-template-strip"
                  sx={{
                    display: 'flex',
                    gap: 0.75,
                    overflowX: 'auto',
                    pb: 0.35,
                    pr: 0.5,
                  }}
                >
                  <Sheet
                    variant="plain"
                    className="assignments-template-card assignments-template-card-blank"
                    onClick={() => {
                      setWizardState({
                        ...defaultWizardState(),
                        title: 'New assignment',
                        starter: 'blank',
                        sectionCount: 1,
                        includeApprovalGate: false,
                        includeDocumentRequest: false,
                      });
                      setWizardStep(0);
                      setShowWizard(true);
                    }}
                    sx={{
                      borderRadius: 'lg',
                      bgcolor: 'background.surface',
                      p: 1,
                      minWidth: 220,
                      cursor: 'pointer',
                      boxShadow: 'sm',
                      transition: 'all 0.2s ease',
                      border: '1px solid',
                      borderColor: 'transparent',
                      '&:hover': {
                        transform: 'translateY(-4px)',
                        boxShadow: 'md',
                        borderColor: 'primary.200',
                      },
                    }}
                  >
                    <Box
                      sx={{
                        borderRadius: 'sm',
                        border: '1px dashed',
                        borderColor: 'neutral.outlinedBorder',
                        bgcolor: 'background.body',
                        height: 104,
                        mb: 0.85,
                        display: 'grid',
                        placeItems: 'center',
                        fontSize: '2rem',
                        color: 'primary.500',
                      }}
                    >
                      +
                    </Box>
                    <Typography level="body-sm" sx={{ fontWeight: 700 }}>
                      Blank assignment
                    </Typography>
                    <Typography level="body-xs" sx={{ color: 'text.tertiary' }}>
                      Start with one section and build from there.
                    </Typography>
                  </Sheet>

                  {galleryTemplates.slice(0, 10).map((template) => {
                    const graph = resolveGraph(template);
                    const sectionCount = graph.nodes.filter((node) => node.kind === 'section').length;
                    const questionCount = graph.nodes.filter((node) => node.kind === 'question').length;
                    return (
                      <Sheet
                        key={template.id}
                        variant="plain"
                        className="assignments-template-card"
                        onClick={() => openTemplateAsNewAssignment(template)}
                        sx={{
                          borderRadius: 'lg',
                          bgcolor: 'background.surface',
                          p: 1,
                          minWidth: 220,
                          cursor: 'pointer',
                          boxShadow: 'sm',
                          transition: 'all 0.2s ease',
                          border: '1px solid',
                          borderColor: 'transparent',
                          '&:hover': {
                            transform: 'translateY(-4px)',
                            boxShadow: 'md',
                            borderColor: 'primary.200',
                          },
                        }}
                      >
                        <Box
                          className="assignments-template-preview"
                          sx={{
                            borderRadius: 'sm',
                            border: '1px solid',
                            borderColor: 'neutral.outlinedBorder',
                            bgcolor: 'background.body',
                            height: 104,
                            mb: 0.85,
                            px: 1,
                            py: 0.85,
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'space-between',
                          }}
                        >
                          <Typography level="body-sm" sx={{ fontWeight: 700, lineHeight: 1.3 }}>
                            {template.title}
                          </Typography>
                          <Typography level="body-xs" sx={{ color: 'text.tertiary' }}>
                            {sectionCount} sections · {questionCount} prompts
                          </Typography>
                        </Box>
                        <Typography level="body-xs" sx={{ color: 'text.tertiary' }}>
                          {template.description}
                        </Typography>
                      </Sheet>
                    );
                  })}

                </Box>
              </Box>
            ) : null}
          </Sheet>

          <Box
            className="assignments-home-grid"
            sx={{
              display: 'grid',
              gridTemplateColumns: '1fr',
              gap: 1,
              minHeight: 0,
              overflow: 'hidden',
            }}
          >
            <Sheet
              variant="plain"
              sx={{
                borderRadius: 'lg',
                minHeight: 0,
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                bgcolor: 'transparent',
              }}
            >
              <Box sx={{ px: 1, pt: 0.9, pb: 0.8 }}>
                <Typography level="title-sm">Assignment files</Typography>
                <Typography level="body-xs" sx={{ color: 'text.tertiary', mt: 0.2 }}>
                  Track what you have assigned, what is waiting on the client, and what needs review.
                </Typography>
              </Box>
              <ListDivider />
              <Box sx={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
                {sortedAssignments.length === 0 ? (
                  <EmptyState
                    title="No assignments found"
                    description="Try adjusting your search filters."
                    icon={
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="11" cy="11" r="8" />
                        <line x1="21" y1="21" x2="16.65" y2="16.65" />
                      </svg>
                    }
                  />
                ) : openAssignmentRows.length === 0 ? (
                  <EmptyState
                    title="No open assignments"
                    description="All active assignments have been resolved."
                    icon={
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                        <polyline points="22 4 12 14.01 9 11.01" />
                      </svg>
                    }
                  />
                ) : (
                  <List
                    size="sm"
                    sx={{
                      '--ListItem-paddingX': '0px',
                      '--ListItem-paddingY': '0px',
                      '--List-gap': '8px',
                    }}
                  >
                    {openAssignmentRows.map((row, idx) => {
                      const isSelected = row.assignment.id === selectedAssignmentId;
                      const tone = toneForGlobalStatus(row.status);
                      const title = row.assignment.title.trim();
                      const fileMark = title.slice(0, 1).toUpperCase() || 'A';
                      const dueUrgency = getDueUrgency(row.assignment.dueAt);
                      const fileMarkBg = row.template?.kind === 'intake' ? '#dbeafe' : '#e2e8f0';
                      const fileMarkFg = row.template?.kind === 'intake' ? '#1d4ed8' : '#334155';
                      const showProgressBar = row.progressTotal > 0;
                      const progressEmpty = row.progressCompleted <= 0;

                      return (
                        <ListItem key={row.assignment.id} sx={{ p: 0 }}>
                          <ListItemButton
                            className={`assignments-file-row${isSelected ? ' is-selected' : ''}`}
                            onClick={() => openAssignmentEditor(row)}
                            sx={{
                              borderRadius: 'lg',
                              border: '1px solid',
                              bgcolor: isSelected ? 'primary.50' : 'background.surface',
                              alignItems: 'center',
                              display: 'flex',
                              gap: 1,
                              px: 1.25,
                              py: 1.25,
                              position: 'relative',
                              transition: 'all 0.2s ease',
                              borderColor: isSelected ? 'primary.200' : 'transparent',
                              boxShadow: isSelected ? 'sm' : 'none',
                              '&:hover': {
                                bgcolor: isSelected ? 'primary.100' : 'background.level1',
                                transform: 'scale(1.005)',
                              },
                            }}
                          >
                            <Box sx={{ display: { xs: 'none', md: 'grid' }, placeItems: 'center' }}>
                              <Box
                                sx={{
                                  width: 34,
                                  height: 34,
                                  borderRadius: 'sm',
                                  bgcolor: fileMarkBg,
                                  color: fileMarkFg,
                                  fontWeight: 800,
                                  display: 'grid',
                                  placeItems: 'center',
                                  fontSize: '0.75rem',
                                }}
                              >
                                {fileMark}
                              </Box>
                            </Box>

                            <ListItemContent sx={{ minWidth: 0 }}>
                              <Typography
                                level="body-sm"
                                sx={{
                                  fontWeight: 800,
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                }}
                              >
                                {row.assignment.title}
                              </Typography>

                              <Typography
                                level="body-xs"
                                sx={{
                                  color: 'text.tertiary',
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                }}
                              >
                                Last activity {formatWhen(row.lastActivityAt)}
                                {row.assignment.dueAt ? ` · Due ${formatShortDate(row.assignment.dueAt)}` : ''}
                              </Typography>

                              {row.progressTotal > 0 ? (
                                <Typography level="body-xs" sx={{ color: 'text.tertiary', mt: 0.35 }}>
                                  Answered {row.progressCompleted}/{row.progressTotal}
                                </Typography>
                              ) : null}

                              {showProgressBar ? (
                                <Box
                                  className="assignments-row-progress"
                                  data-empty={progressEmpty ? 'true' : undefined}
                                  sx={{ mt: 0.6, width: '100%', maxWidth: 120, p: '2px', borderRadius: 99, bgcolor: 'background.level1' }}
                                >
                                  <div style={{
                                    height: 4,
                                    width: '100%',
                                    borderRadius: 99,
                                    background: 'rgba(0,0,0,0.05)',
                                    overflow: 'hidden'
                                  }}>
                                    <div style={{
                                      height: '100%',
                                      width: `${Math.max(5, row.progressPercent)}%`,
                                      background: 'linear-gradient(90deg, #3b82f6, #60a5fa)',
                                      boxShadow: '0 0 4px rgba(59, 130, 246, 0.4)',
                                      borderRadius: 99,
                                      transition: 'width 0.5s cubic-bezier(0.4, 0, 0.2, 1)'
                                    }} />
                                  </div>
                                </Box>
                              ) : null}
                            </ListItemContent>

                            <Stack spacing={0.3} alignItems="flex-end" justifyContent="center" sx={{ flexShrink: 0 }}>
                              <Chip size="sm" variant={tone.variant} color={tone.color} sx={{ fontWeight: 700 }}>
                                {labelForGlobalStatus(row.status)}
                              </Chip>
                              {dueUrgency === 'overdue' ? (
                                <Typography level="body-xs" sx={{ color: 'danger.700', fontWeight: 700 }}>
                                  Overdue
                                </Typography>
                              ) : dueUrgency === 'soon' ? (
                                <Typography level="body-xs" sx={{ color: 'warning.700', fontWeight: 700 }}>
                                  Due soon
                                </Typography>
                              ) : null}
                            </Stack>
                          </ListItemButton>
                        </ListItem>
                      );
                    })}
                  </List>
                )}

                {resolvedAssignmentRows.length > 0 ? (
                  <Box sx={{ px: 1.25, py: 1, borderTop: '1px solid', borderColor: 'divider' }}>
                    <ListItemButton
                      onClick={() => setResolvedOpen((value) => !value)}
                      sx={{
                        borderRadius: 'md',
                        border: '1px solid',
                        borderColor: 'neutral.outlinedBorder',
                        bgcolor: 'background.surface',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: 1,
                        p: 0.85,
                      }}
                    >
                      <Stack spacing={0.1} sx={{ minWidth: 0 }}>
                        <Typography level="body-sm" sx={{ fontWeight: 800 }}>
                          Resolved
                        </Typography>
                        <Typography level="body-xs" sx={{ color: 'text.tertiary' }}>
                          Completed assignments.
                        </Typography>
                      </Stack>
                      <Stack direction="row" spacing={0.75} alignItems="center">
                        <Chip size="sm" variant="soft" color="neutral">
                          {resolvedAssignmentRows.length}
                        </Chip>
                        <Typography level="body-xs" sx={{ color: 'text.tertiary', fontWeight: 900 }}>
                          {resolvedOpen ? '▾' : '▸'}
                        </Typography>
                      </Stack>
                    </ListItemButton>

                    {resolvedOpen ? (
                      <List
                        size="sm"
                        sx={{
                          mt: 0.75,
                          '--ListItem-paddingX': '0px',
                          '--ListItem-paddingY': '0px',
                          '--List-gap': '0px',
                          border: '1px solid',
                          borderColor: 'neutral.outlinedBorder',
                          borderRadius: 'md',
                          overflow: 'hidden',
                        }}
                      >
                        {resolvedAssignmentRows.map((row, idx) => {
                          const isSelected = row.assignment.id === selectedAssignmentId;
                          const tone = toneForGlobalStatus(row.status);
                          const title = row.assignment.title.trim();
                          const fileMark = title.slice(0, 1).toUpperCase() || 'A';
                          const fileMarkBg = row.template?.kind === 'intake' ? '#dbeafe' : '#e2e8f0';
                          const fileMarkFg = row.template?.kind === 'intake' ? '#1d4ed8' : '#334155';
                          const showProgressBar = row.progressTotal > 0;
                          const progressEmpty = row.progressCompleted <= 0;

                          return (
                            <ListItem key={row.assignment.id} sx={{ p: 0 }}>
                              <ListItemButton
                                className={`assignments-file-row${isSelected ? ' is-selected' : ''}`}
                                onClick={() => openAssignmentEditor(row)}
                                sx={{
                                  borderRadius: 0,
                                  border: 'none',
                                  bgcolor: isSelected ? 'primary.50' : 'transparent',
                                  alignItems: 'center',
                                  display: 'flex',
                                  gap: 1,
                                  px: 1.25,
                                  py: 0.85,
                                  position: 'relative',
                                  transition: 'background-color 160ms ease',
                                  borderBottom: idx < resolvedAssignmentRows.length - 1 ? '1px solid' : 'none',
                                  borderColor: 'divider',
                                  '&:hover': {
                                    bgcolor: 'primary.50',
                                  },
                                  ...(isSelected
                                    ? {
                                      '&::before': {
                                        content: '""',
                                        position: 'absolute',
                                        left: 0,
                                        top: 10,
                                        bottom: 10,
                                        width: 3,
                                        borderRadius: 999,
                                        bgcolor: 'primary.500',
                                      },
                                    }
                                    : {}),
                                }}
                              >
                                <Box sx={{ display: { xs: 'none', md: 'grid' }, placeItems: 'center' }}>
                                  <Box
                                    sx={{
                                      width: 34,
                                      height: 34,
                                      borderRadius: 'sm',
                                      bgcolor: fileMarkBg,
                                      color: fileMarkFg,
                                      fontWeight: 800,
                                      display: 'grid',
                                      placeItems: 'center',
                                      fontSize: '0.75rem',
                                    }}
                                  >
                                    {fileMark}
                                  </Box>
                                </Box>

                                <ListItemContent sx={{ minWidth: 0 }}>
                                  <Typography
                                    level="body-sm"
                                    sx={{
                                      fontWeight: 800,
                                      whiteSpace: 'nowrap',
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis',
                                    }}
                                  >
                                    {row.assignment.title}
                                  </Typography>
                                  <Typography
                                    level="body-xs"
                                    sx={{
                                      color: 'text.tertiary',
                                      whiteSpace: 'nowrap',
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis',
                                    }}
                                  >
                                    Last activity {formatWhen(row.lastActivityAt)}
                                    {row.assignment.dueAt ? ` · Due ${formatShortDate(row.assignment.dueAt)}` : ''}
                                  </Typography>
                                  {row.progressTotal > 0 ? (
                                    <Typography level="body-xs" sx={{ color: 'text.tertiary', mt: 0.35 }}>
                                      Answered {row.progressCompleted}/{row.progressTotal}
                                    </Typography>
                                  ) : null}
                                  {showProgressBar ? (
                                    <Box
                                      className="assignments-row-progress"
                                      data-empty={progressEmpty ? 'true' : undefined}
                                      sx={{ mt: 0.4 }}
                                    >
                                      <LinearProgress
                                        determinate
                                        value={row.progressPercent}
                                        size="sm"
                                        sx={{ height: 3, borderRadius: 999 }}
                                      />
                                    </Box>
                                  ) : null}
                                </ListItemContent>

                                <Stack spacing={0.3} alignItems="flex-end" justifyContent="center" sx={{ flexShrink: 0 }}>
                                  <Chip size="sm" variant={tone.variant} color={tone.color} sx={{ fontWeight: 700 }}>
                                    {labelForGlobalStatus(row.status)}
                                  </Chip>
                                </Stack>
                              </ListItemButton>
                            </ListItem>
                          );
                        })}
                      </List>
                    ) : null}
                  </Box>
                ) : null}

                {draftTemplates.length > 0 ? (
                  <Box sx={{ px: 1.25, pb: 1, borderTop: '1px solid', borderColor: 'divider' }}>
                    <ListItemButton
                      onClick={() => setDraftsOpen((value) => !value)}
                      sx={{
                        borderRadius: 'md',
                        border: '1px solid',
                        borderColor: 'neutral.outlinedBorder',
                        bgcolor: 'background.surface',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: 1,
                        p: 0.85,
                      }}
                    >
                      <Stack spacing={0.1} sx={{ minWidth: 0 }}>
                        <Typography level="body-sm" sx={{ fontWeight: 800 }}>
                          Drafts (not sent)
                        </Typography>
                        <Typography level="body-xs" sx={{ color: 'text.tertiary' }}>
                          Created from templates. Autosaved until you send.
                        </Typography>
                      </Stack>
                      <Stack direction="row" spacing={0.75} alignItems="center">
                        <Chip size="sm" variant="soft" color="neutral">
                          {draftTemplates.length}
                        </Chip>
                        <Typography level="body-xs" sx={{ color: 'text.tertiary', fontWeight: 900 }}>
                          {draftsOpen ? '▾' : '▸'}
                        </Typography>
                      </Stack>
                    </ListItemButton>

                    {draftsOpen ? (
                      <List
                        size="sm"
                        sx={{
                          mt: 0.75,
                          '--ListItem-paddingX': '0px',
                          '--ListItem-paddingY': '0.2rem',
                          '--List-gap': '0.35rem',
                        }}
                      >
                        {draftTemplates.map((template) => (
                          <ListItem key={template.id}>
                            <ListItemButton
                              onClick={() => openDraftTemplateEditor(template)}
                              sx={{
                                borderRadius: 'md',
                                border: '1px solid',
                                borderColor: 'neutral.outlinedBorder',
                                bgcolor: 'background.surface',
                                display: 'grid',
                                gridTemplateColumns: 'minmax(0, 1fr) auto',
                                gap: 1,
                                p: 0.85,
                                transition: 'border-color 130ms ease, box-shadow 130ms ease',
                                '&:hover': {
                                  borderColor: 'primary.300',
                                  boxShadow: 'sm',
                                },
                              }}
                            >
                              <ListItemContent sx={{ minWidth: 0 }}>
                                <Typography level="body-sm" sx={{ fontWeight: 800 }}>
                                  {template.title}
                                </Typography>
                                <Typography level="body-xs" sx={{ color: 'text.tertiary' }}>
                                  Updated {formatWhen(template.updatedAt)}
                                </Typography>
                              </ListItemContent>
                              <Stack spacing={0.4} alignItems="flex-end" justifyContent="space-between">
                                <Chip size="sm" variant="soft" color="neutral">
                                  Draft
                                </Chip>
                                <Typography level="body-xs" sx={{ color: 'text.tertiary', fontWeight: 900 }}>
                                  ›
                                </Typography>
                              </Stack>
                            </ListItemButton>
                          </ListItem>
                        ))}
                      </List>
                    ) : null}
                  </Box>
                ) : null}
              </Box>
            </Sheet>

          </Box>

          <Drawer
            open={activityDrawerOpen}
            onClose={() => setActivityDrawerOpen(false)}
            anchor="right"
            size="md"
            variant="plain"
            sx={{ display: 'block' }}
          >
            <ModalClose />
            <Box sx={{ p: 1.5 }}>
              <Typography level="title-md">Client activity</Typography>
              <Typography level="body-sm" sx={{ color: 'text.tertiary', mt: 0.25 }}>
                Recent answers and uploads tied to assignments.
              </Typography>
            </Box>
            <ListDivider />
            <Box sx={{ flex: 1, minHeight: 0, overflow: 'auto', px: 1.25, py: 1 }}>
              {clientActivityBody}
            </Box>
          </Drawer>
        </Sheet >
      ) : (
        <Sheet
          variant="soft"
          sx={{
            borderRadius: 'lg',
            border: '1px solid',
            borderColor: 'neutral.outlinedBorder',
            p: 1,
            display: 'flex',
            flexDirection: 'column',
            minHeight: 0,
            overflow: 'hidden',
          }}
        >
          <Stack
            direction={{ xs: 'column', lg: 'row' }}
            spacing={1}
            alignItems={{ lg: 'center' }}
            justifyContent="space-between"
            className="assignments-editor-titlebar"
            sx={{ mb: 1 }}
          >
            <Stack spacing={0.25} sx={{ minWidth: 0 }}>
              <Button
                size="sm"
                variant="plain"
                sx={{ alignSelf: 'flex-start', px: 0 }}
                onClick={() => setView('home')}
              >
                ← Back
              </Button>
              <Typography level="title-md" sx={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {selectedAssignment?.title ?? selectedTemplate?.title ?? 'Assignment editor'}
              </Typography>
              <Typography level="body-xs" sx={{ color: 'text.tertiary' }}>
                Edit the journey, then preview what the client will see.
              </Typography>
            </Stack>

            <Stack direction="row" spacing={0.75} useFlexGap sx={{ flexWrap: 'wrap', alignItems: 'center' }}>
              <Typography level="body-xs" className="assignments-autosave-status">
                {autosaveLabel}
              </Typography>
              {validation.errors.length > 0 ? (
                <Chip size="sm" variant="soft" color="warning">
                  {validation.errors.length} checks
                </Chip>
              ) : null}
              <Button
                size="sm"
                variant="solid"
                disabled={
                  !selectedTemplate ||
                  selectedTemplate.createdBy === 'system' ||
                  selectedTemplate.isDefault ||
                  validation.errors.length > 0
                }
                onClick={() => {
                  setSendDueAt(selectedAssignment?.dueAt ?? '');
                  setSendNotes('');
                  setSendOpen(true);
                }}
              >
                Send to client
              </Button>
              <Dropdown>
                <MenuButton size="sm" variant="soft" aria-label="Options">
                  ⋯
                </MenuButton>
                <Menu size="sm">
                  {editorSurface === 'design' ? (
                    <MenuItem onClick={() => setShowToolbox((value) => !value)}>
                      {showToolbox ? 'Hide insert panel' : 'Show insert panel'}
                    </MenuItem>
                  ) : null}
                  <MenuItem
                    disabled={!selectedTemplate || validation.errors.length > 0}
                    onClick={() =>
                      selectedTemplate &&
                      onPublishTemplate(selectedTemplate.id, 'Published from assignment editor')
                    }
                  >
                    Publish version
                  </MenuItem>
                  <MenuItem
                    disabled={!selectedTemplate}
                    onClick={() => selectedTemplate && onDuplicateTemplate(selectedTemplate.id)}
                  >
                    Save as template copy
                  </MenuItem>
                  <MenuItem onClick={() => void openFullscreen()}>
                    Toggle fullscreen
                  </MenuItem>
                  <MenuItem
                    color="danger"
                    disabled={!selectedTemplate || selectedTemplate.isDefault}
                    onClick={() => selectedTemplate && onArchiveTemplate(selectedTemplate.id)}
                  >
                    Archive template
                  </MenuItem>
                </Menu>
              </Dropdown>
            </Stack>
          </Stack>

          <Tabs
            value={editorSurface}
            onChange={(_, next) => setEditorSurface((next as EditorSurface) ?? 'design')}
            sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}
          >
            <TabList
              size="sm"
              variant="soft"
              sx={{
                width: 'fit-content',
                borderRadius: 'lg',
                '--Tabs-indicatorThickness': '0px',
                '--Tab-indicatorThickness': '0px',
                mb: 1,
              }}
            >
              <Tab value="design">Edit</Tab>
              <Tab value="preview">Preview</Tab>
            </TabList>

            <TabPanel value="design" sx={{ p: 0, flex: 1, minHeight: 0, overflow: 'hidden' }}>
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', xl: showToolbox ? '280px minmax(0, 1fr)' : 'minmax(0, 1fr)' },
                  gap: 1,
                  minHeight: 0,
                  height: '100%',
                }}
              >
                <Box sx={{ display: { xs: 'none', xl: showToolbox ? 'block' : 'none' }, minHeight: 0 }}>
                  <ToolboxPane onDragStart={startDrag} onAddNode={addNodeFromToolbox} />
                </Box>
                <Sheet
                  variant="outlined"
                  sx={{
                    borderRadius: 'lg',
                    borderColor: 'neutral.outlinedBorder',
                    minHeight: 0,
                    overflow: 'hidden',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                  }}
                >
                  <BuilderCanvas
                    graph={selectedGraph}
                    onGraphChange={handleGraphChange}
                    selectedNodeId={selectedNodeId}
                    onSelectedNodeIdChange={setSelectedNodeId}
                  />
                </Sheet>
              </Box>
            </TabPanel>

            <TabPanel value="preview" sx={{ p: 0, flex: 1, minHeight: 0, overflow: 'auto' }}>
              <Box sx={{ p: 1 }}>
                <PreviewPane graph={selectedGraph} mode="preview" />
              </Box>
            </TabPanel>
          </Tabs>
        </Sheet>
      )
      }

      <Modal open={sendOpen} onClose={() => setSendOpen(false)}>
        <ModalDialog variant="outlined" sx={{ width: 'min(560px, calc(100vw - 24px))' }}>
          <ModalClose />
          <Typography level="title-md">Send to client</Typography>
          <Typography level="body-sm" sx={{ color: 'text.tertiary', mt: 0.25 }}>
            This publishes a locked version and assigns it to the client.
          </Typography>

          <Stack spacing={1} sx={{ mt: 1.25 }}>
            <FormControl>
              <FormLabel>Due date (optional)</FormLabel>
              <Input type="date" value={sendDueAt} onChange={(e) => setSendDueAt(e.target.value)} />
            </FormControl>
            <FormControl>
              <FormLabel>Note (optional)</FormLabel>
              <Textarea
                minRows={3}
                value={sendNotes}
                onChange={(e) => setSendNotes(e.target.value)}
                placeholder="Short instructions for the client (stored with the published version)."
              />
            </FormControl>

            <Stack direction="row" justifyContent="flex-end" spacing={0.75} sx={{ mt: 0.5 }}>
              <Button variant="soft" onClick={() => setSendOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="solid"
                disabled={!selectedTemplate || selectedTemplate.createdBy === 'system' || selectedTemplate.isDefault}
                onClick={sendToClient}
              >
                Send
              </Button>
            </Stack>
          </Stack>
        </ModalDialog>
      </Modal>

      <Modal open={showWizard} onClose={() => setShowWizard(false)}>
        <ModalDialog variant="outlined" sx={{ width: 'min(860px, calc(100vw - 24px))', maxHeight: '90vh', overflow: 'auto' }}>
          <ModalClose />
          <Typography level="title-lg">Assignment Creator</Typography>
          <Typography level="body-sm" sx={{ color: 'text.tertiary' }}>
            Build a polished assignment skeleton in three short steps.
          </Typography>

          <Stack direction="row" spacing={0.5} useFlexGap sx={{ flexWrap: 'wrap', mt: 0.8 }}>
            <Chip size="sm" variant={wizardStep === 0 ? 'solid' : 'soft'} color={wizardStep === 0 ? 'primary' : 'neutral'}>
              1. Basics
            </Chip>
            <Chip size="sm" variant={wizardStep === 1 ? 'solid' : 'soft'} color={wizardStep === 1 ? 'primary' : 'neutral'}>
              2. Skeleton
            </Chip>
            <Chip size="sm" variant={wizardStep === 2 ? 'solid' : 'soft'} color={wizardStep === 2 ? 'primary' : 'neutral'}>
              3. Draft
            </Chip>
          </Stack>

          <Divider sx={{ my: 1 }} />

          {wizardStep === 0 ? (
            <Stack spacing={1}>
              <FormControl>
                <FormLabel>Assignment title</FormLabel>
                <Input
                  value={wizardState.title}
                  onChange={(event) => setWizardState((prev) => ({ ...prev, title: event.target.value }))}
                  placeholder="e.g. Emergency filing follow-up"
                />
              </FormControl>
              <FormControl>
                <FormLabel>Purpose</FormLabel>
                <Textarea
                  minRows={3}
                  value={wizardState.purpose}
                  onChange={(event) => setWizardState((prev) => ({ ...prev, purpose: event.target.value }))}
                  placeholder="Describe what this assignment should collect from the client."
                />
              </FormControl>
            </Stack>
          ) : null}

          {wizardStep === 1 ? (
            <Stack spacing={1}>
              <FormControl>
                <FormLabel>Starter style</FormLabel>
                <Select
                  value={wizardState.starter}
                  onChange={(_, next) =>
                    setWizardState((prev) => ({ ...prev, starter: (next as WizardStarter | null) ?? 'intake' }))
                  }
                >
                  <Option value="blank">Blank assignment</Option>
                  <Option value="intake">Guided intake</Option>
                  <Option value="followup">Follow-up / blocker resolution</Option>
                  <Option value="documents">Document clarification</Option>
                </Select>
              </FormControl>
              <FormControl>
                <FormLabel>Section count</FormLabel>
                <Input
                  type="number"
                  slotProps={{ input: { min: 1, max: 6 } }}
                  value={String(wizardState.sectionCount)}
                  onChange={(event) => {
                    const next = Number.parseInt(event.target.value, 10);
                    setWizardState((prev) => ({
                      ...prev,
                      sectionCount: Number.isFinite(next) ? Math.max(1, Math.min(6, next)) : 3,
                    }));
                  }}
                />
              </FormControl>
              <Stack direction="row" spacing={0.75} useFlexGap sx={{ flexWrap: 'wrap' }}>
                <Button
                  size="sm"
                  variant={wizardState.includeDocumentRequest ? 'solid' : 'soft'}
                  onClick={() =>
                    setWizardState((prev) => ({
                      ...prev,
                      includeDocumentRequest: !prev.includeDocumentRequest,
                    }))
                  }
                >
                  Include document request
                </Button>
                <Button
                  size="sm"
                  variant={wizardState.includeApprovalGate ? 'solid' : 'soft'}
                  onClick={() =>
                    setWizardState((prev) => ({
                      ...prev,
                      includeApprovalGate: !prev.includeApprovalGate,
                    }))
                  }
                >
                  Include attorney approval gate
                </Button>
              </Stack>
            </Stack>
          ) : null}

          {wizardStep === 2 ? (
            <Stack spacing={1}>
              <Sheet variant="soft" sx={{ p: 1, borderRadius: 'md' }}>
                <Typography level="title-sm">Summary</Typography>
                <Typography level="body-sm" sx={{ color: 'text.tertiary' }}>
                  {wizardState.title || 'New assignment'} · {wizardState.sectionCount} sections · {wizardState.starter} starter
                </Typography>
                <Typography level="body-xs" sx={{ color: 'text.tertiary', mt: 0.35 }}>
                  {wizardState.purpose}
                </Typography>
              </Sheet>
            </Stack>
          ) : null}

          <Stack direction="row" spacing={0.75} justifyContent="space-between" sx={{ mt: 1.2 }}>
            <Button
              variant="soft"
              onClick={() => {
                if (wizardStep === 0) {
                  setShowWizard(false);
                  setWizardState(defaultWizardState());
                  return;
                }
                setWizardStep((prev) => Math.max(0, prev - 1));
              }}
            >
              {wizardStep === 0 ? 'Cancel' : 'Back'}
            </Button>
            <Stack direction="row" spacing={0.75}>
              {wizardStep < 2 ? (
                <Button variant="solid" onClick={() => setWizardStep((prev) => Math.min(2, prev + 1))}>
                  Next
                </Button>
              ) : (
                <Button
                  variant="solid"
                  onClick={createWizardAssignment}
                  disabled={!wizardState.title.trim()}
                >
                  Create draft
                </Button>
              )}
            </Stack>
          </Stack>
        </ModalDialog>
      </Modal>
    </Sheet >
  );
}
