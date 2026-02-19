import type { IntakeState } from '../form/types';
import type { Appointment } from '../scheduling/types';
import { scopedStorageKey } from '../state/clientScope';
import {
  deriveResponsible,
  makeAuditEvent,
  nowIso,
  transitionActionable,
  type Actionable,
  type ActionableKind,
  type ActionableStatus,
  type ContextLink,
  type Owner,
  type Resolution,
  type Responsible,
  type Severity,
} from './actionables';

const WORKSPACE_STORE_KEY = 'gbi:workspace:v2';
const WORKSPACE_SCHEMA_VERSION = 2;
const ISSUE_STORE_KEY = 'gbi:issues:v1';
const SCHEDULING_STORE_KEY = 'gbi:scheduling:v1';

type LegacyIssue = {
  id: string;
  type: 'question' | 'document' | 'clarification' | 'task';
  title: string;
  description: string;
  linkedFieldId?: string;
  linkedStepId?: string;
  dueAt?: string;
  owner: 'client' | 'attorney';
  priority: 'critical' | 'important' | 'normal';
  status: 'assigned' | 'in_progress' | 'needs_review' | 'resolved' | 'approved' | 'closed_with_exception';
  comments?: Array<{ id: string; author: 'client' | 'attorney'; text: string; createdAt: string }>;
  audit?: Array<{ id: string; type: string; actor: 'client' | 'attorney'; detail: string; createdAt: string }>;
  createdAt: string;
  updatedAt: string;
  resolution?: {
    rationale: string;
    outcomeType: 'resolved' | 'approved' | 'closed_with_exception';
    resolvedAt: string;
    resolvedBy: 'client' | 'attorney';
  };
};

type LegacySchedulingState = {
  appointments?: Appointment[];
};

export interface WorkspaceThreadSnapshot {
  id: string;
  title: string;
  linkedActionableId?: string;
  lastMessageAt?: string;
  createdAt: string;
}

export interface WorkspaceDocumentMeta {
  docTypeId: string;
  requestId?: string;
  lastReviewedAt?: string;
  quality?: 'ok' | 'needs_rescan' | 'missing_pages';
  coverage?: string;
  satisfies?: string[];
}

export interface WorkspaceStateV2 {
  actionables: Actionable[];
  threads: WorkspaceThreadSnapshot[];
  documentsMeta: WorkspaceDocumentMeta[];
  appointments: Appointment[];
  audit: ReturnType<typeof makeAuditEvent>[];
}

export interface PersistedStateV2 {
  schemaVersion: 2;
  intake: IntakeState | null;
  workspace: WorkspaceStateV2;
}

function emptyWorkspace(): WorkspaceStateV2 {
  return {
    actionables: [],
    threads: [],
    documentsMeta: [],
    appointments: [],
    audit: [],
  };
}

function mapPriorityToSeverity(priority: LegacyIssue['priority']): Severity {
  if (priority === 'critical') return 'urgent';
  if (priority === 'important') return 'high';
  return 'normal';
}

function mapIssueToKind(type: LegacyIssue['type']): ActionableKind {
  if (type === 'document') return 'doc_request';
  if (type === 'question' || type === 'clarification') return 'question';
  return 'task';
}

function mapIssueStatusToActionableStatus(kind: ActionableKind, status: LegacyIssue['status']): ActionableStatus {
  if (kind === 'doc_request') {
    if (status === 'assigned') return 'requested';
    if (status === 'in_progress') return 'received_unreviewed';
    if (status === 'needs_review') return 'received_insufficient';
    if (status === 'approved') return 'received_sufficient';
    if (status === 'closed_with_exception') return 'waived';
    return 'received_sufficient';
  }
  if (kind === 'question') {
    if (status === 'assigned') return 'assigned_to_client';
    if (status === 'in_progress') return 'needs_clarification';
    if (status === 'needs_review') return 'assigned_to_attorney';
    if (status === 'closed_with_exception') return 'waived';
    if (status === 'approved') return 'resolved';
    return 'resolved';
  }
  if (status === 'assigned') return 'open';
  if (status === 'in_progress') return 'in_progress';
  if (status === 'needs_review') return 'needs_attorney';
  if (status === 'closed_with_exception') return 'dismissed';
  if (status === 'approved') return 'done';
  return 'done';
}

function buildLinks(issue: LegacyIssue): ContextLink[] {
  const links: ContextLink[] = [];
  if (issue.linkedFieldId && issue.linkedStepId) {
    links.push({ type: 'field', stepId: issue.linkedStepId, fieldId: issue.linkedFieldId });
  } else if (issue.linkedFieldId) {
    links.push({ type: 'field', stepId: 'unknown', fieldId: issue.linkedFieldId });
  }
  return links;
}

function migrateIssueToActionable(issue: LegacyIssue): Actionable {
  const kind = mapIssueToKind(issue.type);
  const status = mapIssueStatusToActionableStatus(kind, issue.status);
  const responsible = deriveResponsible(kind, status, issue.owner as Responsible);
  const migratedAt = nowIso();
  const baseAudit = makeAuditEvent({
    entityId: issue.id,
    entityKind: kind,
    actorRole: issue.owner as Owner,
    action: 'migrated',
    at: migratedAt,
    source: 'migration',
    visibility: 'internal',
    metadata: { from: 'issues:v1' },
  });
  const resolution: Resolution | undefined = issue.resolution
    ? {
        outcome: issue.resolution.outcomeType,
        resolvedAt: issue.resolution.resolvedAt,
        resolvedBy: issue.resolution.resolvedBy,
        note: issue.resolution.rationale,
      }
    : undefined;
  return {
    id: `issue:${issue.id}`,
    kind,
    title: issue.title,
    description: issue.description,
    owner: issue.owner as Owner,
    responsible,
    severity: mapPriorityToSeverity(issue.priority),
    dueKind: issue.dueAt ? 'target' : 'sla',
    dueAt: issue.dueAt,
    status,
    links: buildLinks(issue),
    resolution,
    audit: [baseAudit],
    createdAt: issue.createdAt,
    updatedAt: issue.updatedAt,
  };
}

function migrateSchedulingToActionables(appointments: Appointment[]): Actionable[] {
  return appointments.map((appointment) => {
    const status =
      appointment.status === 'proposed'
        ? 'awaiting_client'
        : appointment.status === 'reschedule_requested'
          ? 'reschedule_requested'
          : appointment.status;
    return {
      id: `appointment:${appointment.id}`,
      kind: 'appointment',
      title: `Appointment: ${appointment.typeId.replace(/_/g, ' ')}`,
      description: appointment.notes ?? 'Appointment record',
      owner: 'client',
      responsible: deriveResponsible('appointment', status),
      severity: 'normal',
      dueKind: 'target',
      dueAt: appointment.startsAt,
      status,
      links: [{ type: 'appointment', appointmentId: appointment.id }],
      audit: [
        makeAuditEvent({
          entityId: `appointment:${appointment.id}`,
          entityKind: 'appointment',
          actorRole: 'system',
          action: 'migrated',
          source: 'migration',
          visibility: 'internal',
          metadata: { from: 'scheduling:v1' },
        }),
      ],
      createdAt: appointment.startsAt,
      updatedAt: appointment.startsAt,
    };
  });
}

function readLegacyIssues(): LegacyIssue[] {
  try {
    const raw = localStorage.getItem(scopedStorageKey(ISSUE_STORE_KEY));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as { issues?: LegacyIssue[] };
    return Array.isArray(parsed.issues) ? parsed.issues : [];
  } catch {
    return [];
  }
}

function readLegacyScheduling(): Appointment[] {
  try {
    const raw = localStorage.getItem(scopedStorageKey(SCHEDULING_STORE_KEY));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as { data?: LegacySchedulingState };
    const appointments = parsed?.data?.appointments;
    return Array.isArray(appointments) ? appointments : [];
  } catch {
    return [];
  }
}

export function migrateToV2(intake: IntakeState | null = null): PersistedStateV2 {
  const legacyIssues = readLegacyIssues();
  const legacyAppointments = readLegacyScheduling();
  const issueActionables = legacyIssues.map(migrateIssueToActionable);
  const appointmentActionables = migrateSchedulingToActionables(legacyAppointments);
  const workspace: WorkspaceStateV2 = {
    ...emptyWorkspace(),
    actionables: [...issueActionables, ...appointmentActionables],
    appointments: legacyAppointments,
    threads: legacyIssues
      .filter((issue) => (issue.comments?.length ?? 0) > 0)
      .map((issue) => ({
        id: `thread:${issue.id}`,
        title: issue.title,
        linkedActionableId: `issue:${issue.id}`,
        lastMessageAt: issue.comments?.[issue.comments.length - 1]?.createdAt ?? issue.updatedAt,
        createdAt: issue.createdAt,
      })),
    audit: [
      makeAuditEvent({
        entityId: 'workspace',
        entityKind: 'task',
        actorRole: 'system',
        action: 'migrated',
        source: 'migration',
        visibility: 'internal',
      }),
    ],
  };
  return {
    schemaVersion: WORKSPACE_SCHEMA_VERSION,
    intake,
    workspace,
  };
}

export function loadWorkspaceState(intake: IntakeState | null = null): PersistedStateV2 {
  try {
    const raw = localStorage.getItem(scopedStorageKey(WORKSPACE_STORE_KEY));
    if (!raw) return migrateToV2(intake);
    const parsed = JSON.parse(raw) as PersistedStateV2;
    if (parsed.schemaVersion === WORKSPACE_SCHEMA_VERSION && parsed.workspace) {
      return parsed;
    }
    return migrateToV2(intake);
  } catch {
    return migrateToV2(intake);
  }
}

export function saveWorkspaceState(state: PersistedStateV2): void {
  try {
    localStorage.setItem(scopedStorageKey(WORKSPACE_STORE_KEY), JSON.stringify(state));
  } catch {
    // non-fatal in demo
  }
}

export function upsertActionable(
  workspace: WorkspaceStateV2,
  actionable: Actionable,
  actorRole: Owner = 'system'
): WorkspaceStateV2 {
  const existing = workspace.actionables.find((item) => item.id === actionable.id);
  if (!existing) {
    const createdAudit = makeAuditEvent({
      entityId: actionable.id,
      entityKind: actionable.kind,
      actorRole,
      action: 'created',
    });
    return {
      ...workspace,
      actionables: [...workspace.actionables, { ...actionable, audit: [...actionable.audit, createdAudit] }],
      audit: [...workspace.audit, createdAudit],
    };
  }
  const merged = workspace.actionables.map((item) => (item.id === actionable.id ? { ...item, ...actionable } : item));
  return { ...workspace, actionables: merged };
}

export function transitionWorkspaceActionable(
  workspace: WorkspaceStateV2,
  actionableId: string,
  nextStatus: string,
  actorRole: Owner,
  resolution?: Pick<Resolution, 'outcome' | 'resolutionReasonCode' | 'note'>
): WorkspaceStateV2 {
  let emittedAudit: ReturnType<typeof makeAuditEvent> | null = null;
  const nextActionables = workspace.actionables.map((item) => {
    if (item.id !== actionableId) return item;
    const transitioned = transitionActionable(item, nextStatus as never, { actorRole, resolution });
    if (!transitioned.ok) return item;
    emittedAudit = transitioned.value.audit[transitioned.value.audit.length - 1] ?? null;
    return transitioned.value;
  });
  return {
    ...workspace,
    actionables: nextActionables,
    audit: emittedAudit ? [...workspace.audit, emittedAudit] : workspace.audit,
  };
}

export function setActionableResponsible(
  workspace: WorkspaceStateV2,
  actionableId: string,
  responsible: Responsible,
  actorRole: Owner
): WorkspaceStateV2 {
  const ts = nowIso();
  let emittedAudit: ReturnType<typeof makeAuditEvent> | null = null;
  const nextActionables = workspace.actionables.map((item) => {
    if (item.id !== actionableId) return item;
    const next = { ...item, responsible, updatedAt: ts };
    emittedAudit = makeAuditEvent({
      entityId: item.id,
      entityKind: item.kind,
      actorRole,
      action: 'assigned',
      from: item.responsible,
      to: responsible,
      at: ts,
    });
    next.audit = [...item.audit, emittedAudit];
    return next;
  });
  return {
    ...workspace,
    actionables: nextActionables,
    audit: emittedAudit ? [...workspace.audit, emittedAudit] : workspace.audit,
  };
}

export function setActionableDue(
  workspace: WorkspaceStateV2,
  actionableId: string,
  dueKind: 'hard_deadline' | 'target' | 'sla',
  dueAt: string | undefined,
  actorRole: Owner
): WorkspaceStateV2 {
  const ts = nowIso();
  let emittedAudit: ReturnType<typeof makeAuditEvent> | null = null;
  const nextActionables = workspace.actionables.map((item) => {
    if (item.id !== actionableId) return item;
    const next = { ...item, dueKind, dueAt, updatedAt: ts };
    emittedAudit = makeAuditEvent({
      entityId: item.id,
      entityKind: item.kind,
      actorRole,
      action: 'due_changed',
      from: { dueKind: item.dueKind, dueAt: item.dueAt },
      to: { dueKind, dueAt },
      at: ts,
    });
    next.audit = [...item.audit, emittedAudit];
    return next;
  });
  return {
    ...workspace,
    actionables: nextActionables,
    audit: emittedAudit ? [...workspace.audit, emittedAudit] : workspace.audit,
  };
}

export function syncDerivedActionables(
  workspace: WorkspaceStateV2,
  derived: Actionable[]
): WorkspaceStateV2 {
  const byId = new Map(workspace.actionables.map((item) => [item.id, item]));
  for (const item of derived) {
    const existing = byId.get(item.id);
    if (!existing) {
      byId.set(item.id, item);
      continue;
    }
    byId.set(item.id, {
      ...item,
      owner: existing.owner,
      responsible: existing.responsible,
      dueKind: existing.dueKind,
      dueAt: existing.dueAt,
      slaHours: existing.slaHours,
      status: existing.status,
      resolution: existing.resolution,
      audit: existing.audit,
      createdAt: existing.createdAt,
      updatedAt: existing.updatedAt,
    });
  }
  return {
    ...workspace,
    actionables: Array.from(byId.values()),
  };
}

export function buildDerivedTaskActionable(input: {
  id: string;
  title: string;
  description: string;
  severity: Severity;
  owner?: Owner;
  responsible?: Responsible;
  links?: ContextLink[];
}): Actionable<'task'> {
  const ts = nowIso();
  const status: ActionableStatus<'task'> = 'open';
  return {
    id: input.id,
    kind: 'task',
    title: input.title,
    description: input.description,
    owner: input.owner ?? 'attorney',
    responsible: input.responsible ?? deriveResponsible('task', status),
    severity: input.severity,
    dueKind: 'sla',
    status,
    links: input.links ?? [],
    audit: [
      makeAuditEvent({
        entityId: input.id,
        entityKind: 'task',
        actorRole: 'system',
        action: 'created',
        source: 'system_rule',
      }),
    ],
    createdAt: ts,
    updatedAt: ts,
  };
}
