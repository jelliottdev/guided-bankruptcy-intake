export type ActionableKind =
  | 'task'
  | 'question'
  | 'doc_request'
  | 'conflict'
  | 'thread'
  | 'appointment';

export type Owner = 'client' | 'attorney' | 'staff' | 'system';
export type Responsible = 'client' | 'attorney' | 'staff';
export type DueKind = 'hard_deadline' | 'target' | 'sla';
export type Severity = 'urgent' | 'high' | 'normal' | 'low';

export type ContextLink =
  | { type: 'field'; stepId: string; fieldId: string }
  | { type: 'doc'; docTypeId: string; requestId?: string }
  | { type: 'thread'; threadId: string }
  | { type: 'appointment'; appointmentId: string }
  | { type: 'external'; href: string; label: string };

export type TaskStatus =
  | 'open'
  | 'in_progress'
  | 'waiting_on_client'
  | 'waiting_on_staff'
  | 'needs_attorney'
  | 'snoozed'
  | 'done'
  | 'dismissed'
  | 'converted'
  | 'escalated';

export type QuestionStatus =
  | 'unassigned'
  | 'assigned_to_client'
  | 'answered_by_client'
  | 'needs_clarification'
  | 'assigned_to_attorney'
  | 'resolved'
  | 'resolved_with_override'
  | 'waived'
  | 'replaced';

export type DocRequestStatus =
  | 'not_requested'
  | 'requested'
  | 'partially_received'
  | 'received_unreviewed'
  | 'received_insufficient'
  | 'received_sufficient'
  | 'waived'
  | 'replaced';

export type ThreadStatus =
  | 'open'
  | 'awaiting_client'
  | 'awaiting_attorney'
  | 'resolved'
  | 'converted_to_task'
  | 'converted_to_doc_request'
  | 'archived';

export type AppointmentStatus =
  | 'proposed'
  | 'awaiting_client'
  | 'confirmed'
  | 'reschedule_requested'
  | 'cancelled'
  | 'completed';

export type ActionableStatusMap = {
  task: TaskStatus;
  conflict: TaskStatus;
  question: QuestionStatus;
  doc_request: DocRequestStatus;
  thread: ThreadStatus;
  appointment: AppointmentStatus;
};

export type ActionableStatus<K extends ActionableKind = ActionableKind> = ActionableStatusMap[K];

export type AuditVisibility = 'internal' | 'client_visible';
export type AuditSource = 'user_action' | 'system_rule' | 'migration';

export interface AuditEvent {
  id: string;
  entityId: string;
  entityKind: ActionableKind;
  actorRole: Owner;
  action:
    | 'created'
    | 'assigned'
    | 'status_changed'
    | 'due_changed'
    | 'message_sent'
    | 'doc_uploaded'
    | 'doc_marked_sufficient'
    | 'waived'
    | 'resolved'
    | 'overridden'
    | 'migrated';
  from?: unknown;
  to?: unknown;
  metadata?: Record<string, unknown>;
  at: string;
  visibility: AuditVisibility;
  source: AuditSource;
}

export type ResolutionReasonCode =
  | 'completed'
  | 'not_applicable'
  | 'duplicate'
  | 'converted_to_question'
  | 'converted_to_doc_request'
  | 'requires_hearing_or_call'
  | 'outside_scope'
  | 'insufficient_missing_pages'
  | 'insufficient_wrong_date_range'
  | 'waived_client_cannot_obtain'
  | 'waived_not_applicable'
  | 'accepted'
  | 'clarified'
  | 'attorney_override'
  | 'replaced'
  | 'answered'
  | 'archived';

export interface Resolution {
  outcome: string;
  resolutionReasonCode?: ResolutionReasonCode;
  note?: string;
  resolvedBy: Owner;
  resolvedAt: string;
}

export interface Actionable<K extends ActionableKind = ActionableKind> {
  id: string;
  kind: K;
  title: string;
  description: string;
  owner: Owner;
  responsible: Responsible;
  severity: Severity;
  dueKind: DueKind;
  dueAt?: string;
  slaHours?: number;
  status: ActionableStatus<K>;
  links: ContextLink[];
  resolution?: Resolution;
  audit: AuditEvent[];
  createdAt: string;
  updatedAt: string;
}

export interface TransitionContext {
  actorRole: Owner;
  now?: string;
  source?: AuditSource;
  visibility?: AuditVisibility;
  resolution?: Pick<Resolution, 'outcome' | 'resolutionReasonCode' | 'note'>;
}

export interface TransitionResult<K extends ActionableKind = ActionableKind> {
  ok: boolean;
  value: Actionable<K>;
  reason?: string;
}

export function nowIso(): string {
  return new Date().toISOString();
}

export function randomId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

const VALID_STATUSES_BY_KIND: Record<ActionableKind, readonly string[]> = {
  task: ['open', 'in_progress', 'waiting_on_client', 'waiting_on_staff', 'needs_attorney', 'snoozed', 'done', 'dismissed', 'converted', 'escalated'],
  conflict: ['open', 'in_progress', 'waiting_on_client', 'waiting_on_staff', 'needs_attorney', 'snoozed', 'done', 'dismissed', 'converted', 'escalated'],
  question: ['unassigned', 'assigned_to_client', 'answered_by_client', 'needs_clarification', 'assigned_to_attorney', 'resolved', 'resolved_with_override', 'waived', 'replaced'],
  doc_request: ['not_requested', 'requested', 'partially_received', 'received_unreviewed', 'received_insufficient', 'received_sufficient', 'waived', 'replaced'],
  thread: ['open', 'awaiting_client', 'awaiting_attorney', 'resolved', 'converted_to_task', 'converted_to_doc_request', 'archived'],
  appointment: ['proposed', 'awaiting_client', 'confirmed', 'reschedule_requested', 'cancelled', 'completed'],
};

const ALLOWED_TRANSITIONS_BY_KIND: Record<ActionableKind, Record<string, readonly string[]>> = {
  task: {
    open: ['in_progress', 'waiting_on_client', 'waiting_on_staff', 'needs_attorney', 'snoozed', 'done', 'dismissed', 'converted', 'escalated'],
    in_progress: ['open', 'waiting_on_client', 'waiting_on_staff', 'needs_attorney', 'snoozed', 'done', 'dismissed', 'converted', 'escalated'],
    waiting_on_client: ['in_progress', 'needs_attorney', 'done', 'dismissed'],
    waiting_on_staff: ['in_progress', 'needs_attorney', 'done', 'dismissed'],
    needs_attorney: ['in_progress', 'waiting_on_client', 'waiting_on_staff', 'done', 'dismissed', 'converted', 'escalated'],
    snoozed: ['open', 'in_progress', 'needs_attorney'],
  },
  conflict: {
    open: ['in_progress', 'waiting_on_client', 'waiting_on_staff', 'needs_attorney', 'snoozed', 'done', 'dismissed', 'converted', 'escalated'],
    in_progress: ['open', 'waiting_on_client', 'waiting_on_staff', 'needs_attorney', 'snoozed', 'done', 'dismissed', 'converted', 'escalated'],
    waiting_on_client: ['in_progress', 'needs_attorney', 'done', 'dismissed'],
    waiting_on_staff: ['in_progress', 'needs_attorney', 'done', 'dismissed'],
    needs_attorney: ['in_progress', 'waiting_on_client', 'waiting_on_staff', 'done', 'dismissed', 'converted', 'escalated'],
    snoozed: ['open', 'in_progress', 'needs_attorney'],
  },
  question: {
    unassigned: ['assigned_to_client', 'assigned_to_attorney', 'waived', 'replaced'],
    assigned_to_client: ['answered_by_client', 'needs_clarification', 'waived', 'replaced'],
    answered_by_client: ['assigned_to_attorney', 'resolved', 'needs_clarification'],
    needs_clarification: ['assigned_to_client', 'assigned_to_attorney', 'waived'],
    assigned_to_attorney: ['resolved', 'resolved_with_override', 'needs_clarification', 'waived', 'replaced'],
  },
  doc_request: {
    not_requested: ['requested', 'waived', 'replaced'],
    requested: ['partially_received', 'received_unreviewed', 'waived', 'replaced'],
    partially_received: ['requested', 'received_unreviewed', 'waived', 'replaced'],
    received_unreviewed: ['received_sufficient', 'received_insufficient', 'requested', 'waived'],
    received_insufficient: ['requested', 'received_unreviewed', 'waived', 'replaced'],
  },
  thread: {
    open: ['awaiting_client', 'awaiting_attorney', 'resolved', 'converted_to_task', 'converted_to_doc_request', 'archived'],
    awaiting_client: ['awaiting_attorney', 'resolved', 'converted_to_task', 'converted_to_doc_request', 'archived'],
    awaiting_attorney: ['awaiting_client', 'resolved', 'converted_to_task', 'converted_to_doc_request', 'archived'],
  },
  appointment: {
    proposed: ['awaiting_client', 'cancelled'],
    awaiting_client: ['confirmed', 'reschedule_requested', 'cancelled'],
    reschedule_requested: ['awaiting_client', 'confirmed', 'cancelled'],
    confirmed: ['completed', 'cancelled', 'reschedule_requested'],
  },
};

const TERMINAL_NOTE_REQUIRED = new Set<string>([
  'dismissed',
  'waived',
  'resolved_with_override',
  'archived',
  'cancelled',
]);

const DEFAULT_RESOLUTION_REASON_BY_STATUS: Record<string, ResolutionReasonCode> = {
  done: 'completed',
  dismissed: 'not_applicable',
  converted: 'converted_to_question',
  escalated: 'requires_hearing_or_call',
  resolved: 'answered',
  resolved_with_override: 'attorney_override',
  waived: 'waived_not_applicable',
  replaced: 'replaced',
  received_sufficient: 'accepted',
  converted_to_task: 'converted_to_question',
  converted_to_doc_request: 'converted_to_doc_request',
  archived: 'archived',
  cancelled: 'not_applicable',
  completed: 'completed',
};

export function isStatusForKind(kind: ActionableKind, status: string): boolean {
  return VALID_STATUSES_BY_KIND[kind].includes(status);
}

function isTransitionAllowed(kind: ActionableKind, from: string, to: string): boolean {
  if (from === to) return true;
  const map = ALLOWED_TRANSITIONS_BY_KIND[kind];
  const allowed = map[from];
  if (!allowed) return false;
  return allowed.includes(to);
}

function defaultResolutionReason(status: string): ResolutionReasonCode | undefined {
  return DEFAULT_RESOLUTION_REASON_BY_STATUS[status];
}

export function isTerminalStatus(kind: ActionableKind, status: string): boolean {
  if (kind === 'task' || kind === 'conflict') {
    return ['done', 'dismissed', 'converted', 'escalated'].includes(status);
  }
  if (kind === 'question') {
    return ['resolved', 'resolved_with_override', 'waived', 'replaced'].includes(status);
  }
  if (kind === 'doc_request') {
    return ['received_sufficient', 'waived', 'replaced'].includes(status);
  }
  if (kind === 'thread') {
    return ['resolved', 'converted_to_task', 'converted_to_doc_request', 'archived'].includes(status);
  }
  return ['cancelled', 'completed'].includes(status);
}

export function defaultStatusForKind(kind: ActionableKind): ActionableStatus {
  switch (kind) {
    case 'question':
      return 'unassigned';
    case 'doc_request':
      return 'not_requested';
    case 'thread':
      return 'open';
    case 'appointment':
      return 'proposed';
    default:
      return 'open';
  }
}

export function deriveResponsible(
  kind: ActionableKind,
  status: string,
  explicitResponsible?: Responsible
): Responsible {
  if (status === 'waiting_on_client' || status === 'assigned_to_client' || status === 'requested' || status === 'partially_received' || status === 'awaiting_client') {
    return 'client';
  }
  if (status === 'waiting_on_staff' || status === 'received_unreviewed' || status === 'received_insufficient') {
    return 'staff';
  }
  if (status === 'needs_attorney' || status === 'assigned_to_attorney' || status === 'awaiting_attorney') {
    return 'attorney';
  }
  if ((kind === 'task' || kind === 'conflict') && explicitResponsible) {
    return explicitResponsible;
  }
  if (kind === 'question') return 'client';
  if (kind === 'doc_request') return 'client';
  if (kind === 'thread') return 'staff';
  if (kind === 'appointment') return 'client';
  return 'attorney';
}

export function canEditOwner(role: Owner, kind: ActionableKind): boolean {
  if (role === 'attorney') return true;
  if (role === 'staff') return kind === 'task' || kind === 'conflict' || kind === 'thread' || kind === 'appointment';
  return false;
}

const ATTORNEY_ONLY_TRANSITIONS = new Set<string>([
  'resolved_with_override',
  'waived',
  'dismissed',
  'received_sufficient',
  'archived',
]);

const CLIENT_ALLOWED = new Set<string>([
  'answered_by_client',
  'partially_received',
  'awaiting_client',
  'reschedule_requested',
]);

const STAFF_BLOCKED = new Set<string>(['resolved_with_override', 'waived']);

export function canTransition(
  role: Owner,
  _kind: ActionableKind,
  _from: string,
  to: string
): boolean {
  if (role !== 'attorney' && ATTORNEY_ONLY_TRANSITIONS.has(to)) return false;
  if (role === 'attorney') return true;
  if (role === 'staff') return !STAFF_BLOCKED.has(to);
  if (role === 'client') return CLIENT_ALLOWED.has(to);
  return false;
}

export function makeAuditEvent(input: {
  entityId: string;
  entityKind: ActionableKind;
  actorRole: Owner;
  action: AuditEvent['action'];
  from?: unknown;
  to?: unknown;
  metadata?: Record<string, unknown>;
  at?: string;
  visibility?: AuditVisibility;
  source?: AuditSource;
}): AuditEvent {
  return {
    id: randomId('audit'),
    entityId: input.entityId,
    entityKind: input.entityKind,
    actorRole: input.actorRole,
    action: input.action,
    from: input.from,
    to: input.to,
    metadata: input.metadata,
    at: input.at ?? nowIso(),
    visibility: input.visibility ?? 'internal',
    source: input.source ?? 'user_action',
  };
}

export function transitionActionable<K extends ActionableKind>(
  actionable: Actionable<K>,
  toStatus: ActionableStatus<K>,
  ctx: TransitionContext
): TransitionResult<K> {
  if (actionable.status === toStatus) {
    return { ok: true, value: actionable };
  }
  if (!isStatusForKind(actionable.kind, toStatus)) {
    return { ok: false, value: actionable, reason: 'Invalid status for kind.' };
  }
  if (!isTransitionAllowed(actionable.kind, actionable.status, toStatus)) {
    return { ok: false, value: actionable, reason: 'Invalid status transition for kind.' };
  }
  if (!canTransition(ctx.actorRole, actionable.kind, actionable.status, toStatus)) {
    return { ok: false, value: actionable, reason: 'Transition not allowed for role.' };
  }
  const ts = ctx.now ?? nowIso();
  const nextResponsible = deriveResponsible(actionable.kind, toStatus, actionable.responsible);
  const terminal = isTerminalStatus(actionable.kind, toStatus);
  const resolutionReason = ctx.resolution?.resolutionReasonCode ?? defaultResolutionReason(toStatus);
  if (terminal && TERMINAL_NOTE_REQUIRED.has(toStatus) && !ctx.resolution?.note) {
    return { ok: false, value: actionable, reason: 'Resolution note required for this terminal transition.' };
  }
  const nextResolution: Resolution | undefined = terminal
    ? {
        outcome: ctx.resolution?.outcome ?? String(toStatus),
        resolutionReasonCode: resolutionReason,
        note: ctx.resolution?.note,
        resolvedBy: ctx.actorRole,
        resolvedAt: ts,
      }
    : actionable.resolution;
  const updated: Actionable<K> = {
    ...actionable,
    status: toStatus,
    responsible: nextResponsible,
    resolution: nextResolution,
    updatedAt: ts,
    audit: [
      ...actionable.audit,
      makeAuditEvent({
        entityId: actionable.id,
        entityKind: actionable.kind,
        actorRole: ctx.actorRole,
        action: 'status_changed',
        from: actionable.status,
        to: toStatus,
        metadata: terminal ? { resolution: nextResolution } : undefined,
        at: ts,
        source: ctx.source,
        visibility: ctx.visibility,
      }),
    ],
  };
  return { ok: true, value: updated };
}
