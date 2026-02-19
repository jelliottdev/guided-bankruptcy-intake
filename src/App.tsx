import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { useColorScheme } from '@mui/joy/styles';
import { useIntake } from './state/IntakeProvider';
import { getSeededAttorneyFinancial, saveAttorneyFinancial } from './ui/dashboard/dashboardShared';
import { Layout } from './ui/Layout';
import { AttorneyDashboard } from './ui/AttorneyDashboard';
import { MessagesPanel } from './ui/client/MessagesPanel';
import { ClientTodoPanel } from './ui/client/ClientTodoPanel';
import { ClientDashboardTabs, type ClientDashboardTab } from './ui/client/ClientDashboardTabs';
import { AssignmentRunner } from './ui/client/AssignmentRunner';
import { AccessGate } from './ui/AccessGate';
import { getInitialAnswers } from './form/defaults';
import { getSeededAnswers, getSeededUploads } from './form/seedData';
import { useIssues } from './issues/IssuesProvider';
import type { Issue } from './issues/types';
import { trackUXEvent } from './telemetry/localTelemetry';
import { computeBaselineSnapshot, saveBaselineSnapshot } from './telemetry/baselineMetrics';
import { clearDemoState, scopedStorageKey } from './state/clientScope';
import { saveAttorneyProfile, WALLACE_DEMO_ATTORNEY } from './attorney/attorneyProfile';
import {
  archiveQuestionnaireTemplate,
  assignTemplate,
  cloneTemplateForEdit,
  createQuestionnaireTemplate,
  duplicateQuestionnaireTemplate,
  getFreshQuestionnaireState,
  loadQuestionnaireState,
  publishTemplateVersion,
  clearAssignmentResponses,
  responsesForAssignment,
  saveQuestionnaireState,
  updateAssignmentComputedStage,
  updateTemplateGraph,
  upsertNodeResponse,
} from './questionnaires/store';
import type {
  QuestionnaireGraph,
  QuestionnaireAssignment,
  ResponseValue,
} from './questionnaires/types';
import { buildIntakeStateFromAssignment } from './questionnaires/runtime/intakeSync';
import { clearOcrState, useOcrState, upsertOcrResult } from './ocr/store';
import type { OcrResult } from './ocr/types';
import { reconcileOcrResultAgainstCanonical } from './ocr/reconcile';
import { intakeToCanonical } from './engine/transform';
import { moveFileBetweenValues } from './questionnaires/runtime/filesValue';
import { clearAllBlobs, putBlob } from './files/blobStore';
import { enqueueOcr } from './ocr/queue';

function nowIso(): string {
  return new Date().toISOString();
}

function randomId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function wallaceDocsUrl(fileName: string): string {
  const base = (import.meta as unknown as { env?: { BASE_URL?: string } }).env?.BASE_URL ?? '/';
  const prefix = base.endsWith('/') ? base : `${base}/`;
  return `${prefix}__wallace_docs/${encodeURIComponent(fileName)}`;
}

function docFieldForOcrIssue(result: OcrResult): string | null {
  const legacy = result.legacyFieldId;
  if (legacy === 'upload_paystubs' || legacy === 'upload_bank_statements' || legacy === 'upload_tax_returns') return legacy;
  if (result.docType === 'paystub') return 'upload_paystubs';
  if (result.docType === 'bank_statement') return 'upload_bank_statements';
  if (result.docType === 'tax_return') return 'upload_tax_returns';
  return legacy ?? null;
}

function docLabel(fieldId: string): string {
  switch (fieldId) {
    case 'upload_paystubs':
      return 'Paystubs';
    case 'upload_bank_statements':
      return 'Bank statements';
    case 'upload_tax_returns':
      return 'Tax returns';
    case 'upload_documents_bulk':
      return 'Bulk documents';
    default:
      return 'Documents';
  }
}

function reviewLabel(reason: string): string {
  switch (reason) {
    case 'low_confidence':
      return 'Low OCR confidence';
    case 'unreadable':
      return 'Unreadable or empty scan';
    case 'conflict':
      return 'Conflicts with intake answers';
    case 'unknown_type':
      return 'Unknown document type';
    case 'partial_pdf':
      return 'Partial PDF processed';
    case 'missing_blob':
      return 'OCR unavailable (re-upload required)';
    case 'too_large':
      return 'Too large to process automatically';
    case 'unsupported':
      return 'Unsupported file type';
    default:
      return 'Needs review';
  }
}

function AppContent() {
  const { setMode } = useColorScheme();
  const { state, dispatch, reset, setViewMode } = useIntake();
  const {
    issues,
    upsertIssue,
    addComment,
    replaceIssues,
    createNewIssue,
    setIssueStatus,
  } = useIssues();
  const { answers, uploads, flags, viewMode } = state;
  const ocrState = useOcrState();

  /** True when user jumped from Attorney View via "Open" → show sticky Return to Attorney View. */
  const [returnToAttorneyAvailable, setReturnToAttorneyAvailable] = useState(false);
  /** Increments on reset so Attorney View overlays (financial, creditors) are cleared and dashboard remounts. */
  const [resetCount, setResetCount] = useState(0);
  const [clientDashboardTab, setClientDashboardTab] = useState<ClientDashboardTab>('todo');
  const [clientSurface, setClientSurface] = useState<'dashboard' | 'assignment'>('dashboard');
  const [activeAssignmentId, setActiveAssignmentId] = useState<string | null>(null);
  const [clientRunnerInitialSectionId, setClientRunnerInitialSectionId] = useState<string | null>(null);
  const [clientRunnerFocusNodeId, setClientRunnerFocusNodeId] = useState<string | null>(null);
  const [questionnaireState, setQuestionnaireState] = useState(() => loadQuestionnaireState());
  const questionnaireTemplates = questionnaireState.templates;
  const questionnaireAssignments = questionnaireState.assignments;
  const questionnaireResponses = questionnaireState.responses;

  const intakeTemplate = useMemo(
    () => questionnaireTemplates.find((template) => template.id === 'intake-default') ?? null,
    [questionnaireTemplates]
  );

  const intakeAssignment = useMemo(
    () => questionnaireAssignments.find((assignment) => assignment.templateId === 'intake-default') ?? null,
    [questionnaireAssignments]
  );

  const intakeGraph = useMemo(() => {
    if (!intakeTemplate || !intakeAssignment) return null;
    return (
      intakeTemplate.versions.find((item) => item.version === intakeAssignment.templateVersion)?.graph ?? null
    );
  }, [intakeAssignment, intakeTemplate]);

  const intakeResponses = useMemo(
    () => (intakeAssignment ? responsesForAssignment(questionnaireResponses, intakeAssignment.id) : []),
    [intakeAssignment, questionnaireResponses]
  );

  const answersRef = useRef(answers);
  answersRef.current = answers;
  const uploadsRef = useRef(uploads);
  uploadsRef.current = uploads;

  useEffect(() => {
    if (!intakeGraph) return;
    if (!intakeAssignment) return;
    const t = window.setTimeout(() => {
      if (typeof window !== 'undefined' && localStorage.getItem('gbi:wallace-demo-loaded') === '1') return;
      const next = buildIntakeStateFromAssignment(intakeGraph, intakeResponses);
      const currentAnswers = answersRef.current;
      const currentUploads = uploadsRef.current;
      const mergedAnswers = { ...getInitialAnswers(), ...currentAnswers };
      for (const [k, v] of Object.entries(next.answers)) {
        if (v === undefined || v === null) continue;
        if (typeof v === 'string' && v.trim() !== '') mergedAnswers[k] = v;
        else if (Array.isArray(v) && v.length > 0) mergedAnswers[k] = v;
        else if (typeof v === 'object' && v !== null && !Array.isArray(v) && Object.keys(v).length > 0) mergedAnswers[k] = v;
      }
      const mergedUploads = { ...next.uploads };
      for (const [k, v] of Object.entries(currentUploads)) {
        if (Array.isArray(v) && v.length > 0) {
          const nextList = mergedUploads[k];
          if (!Array.isArray(nextList) || nextList.length === 0) mergedUploads[k] = v;
        }
      }
      dispatch({
        type: 'HYDRATE',
        state: {
          answers: mergedAnswers,
          uploads: mergedUploads,
          flags: next.flags,
        },
      });
    }, 300);
    return () => window.clearTimeout(t);
  }, [dispatch, intakeAssignment, intakeGraph, intakeResponses]);

  useEffect(() => {
    const hasData = Object.keys(answers).some((k) => {
      const v = answers[k];
      if (v == null) return false;
      if (typeof v === 'string') return v.trim() !== '';
      if (Array.isArray(v)) return v.length > 0;
      return Object.keys(v).length > 0;
    });
    const handler = (e: BeforeUnloadEvent) => {
      if (hasData) {
        e.preventDefault();
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [answers]);

  const onGoToWizard = useCallback(
    (stepIndex: number, fieldId?: string) => {
      setReturnToAttorneyAvailable(true);
      setViewMode('client');
      setClientSurface('assignment');
      setClientRunnerInitialSectionId(null);
      setClientRunnerFocusNodeId(null);
      const intakeAssignment =
        questionnaireAssignments.find(
          (assignment) =>
            assignment.templateId === 'intake-default' &&
            !['approved', 'closed'].includes(assignment.computedStage ?? 'assigned')
        ) ?? questionnaireAssignments.find((assignment) => assignment.templateId === 'intake-default');
      if (intakeAssignment) {
        setActiveAssignmentId(intakeAssignment.id);
        setQuestionnaireState((prev) => ({
          ...prev,
          assignments: updateAssignmentComputedStage(prev.assignments, intakeAssignment.id, 'in_progress'),
        }));
      }

      if (!intakeAssignment) return;
      const intakeTemplate = questionnaireTemplates.find((template) => template.id === 'intake-default') ?? null;
      const graph = intakeTemplate?.versions.find((item) => item.version === intakeAssignment.templateVersion)?.graph;
      if (!graph) return;

      if (fieldId) {
        const node = graph.nodes.find((candidate) => candidate.legacyFieldId === fieldId) ?? null;
        if (node) {
          setClientRunnerInitialSectionId(node.sectionId ?? null);
          setClientRunnerFocusNodeId(node.id);
          return;
        }
      }
      void stepIndex; // kept for signature compatibility
    },
    [questionnaireAssignments, questionnaireTemplates, setViewMode]
  );

  const onReturnToAttorney = useCallback(() => {
    setReturnToAttorneyAvailable(false);
    setViewMode('attorney');
  }, [setViewMode]);

  const handleReset = useCallback(() => {
    reset();
    setClientSurface('dashboard');
    setClientDashboardTab('todo');
    setActiveAssignmentId(null);
    setClientRunnerInitialSectionId(null);
    setClientRunnerFocusNodeId(null);
    clearDemoState();
    clearOcrState();
    void clearAllBlobs();
    replaceIssues([]);
    const fresh = getFreshQuestionnaireState();
    saveQuestionnaireState(fresh);
    setQuestionnaireState(fresh);
    setResetCount((c) => c + 1);
  }, [reset, replaceIssues]);

  const handleLoadDemo = useCallback(() => {
    // Demo should be deterministic; clear any previous OCR/blob artifacts first.
    clearOcrState();
    saveAttorneyProfile(WALLACE_DEMO_ATTORNEY);
    const seededAnswers = getSeededAnswers();
    const seededUploads = getSeededUploads();

    const template = questionnaireState.templates.find((item) => item.id === 'intake-default') ?? null;
    const assignment = questionnaireState.assignments.find((item) => item.templateId === 'intake-default') ?? null;
    if (!template || !assignment) return;
    const graph = template.versions.find((item) => item.version === assignment.templateVersion)?.graph;
    if (!graph) return;

    const seedFilesToImport: Array<{
      fileId: string;
      fileName: string;
      uploadedAt: string;
      mimeType: string;
      assignmentId: string;
      nodeId: string;
      legacyFieldId?: string;
    }> = [];

    let nextResponses = clearAssignmentResponses(questionnaireState.responses, assignment.id);
    for (const node of graph.nodes) {
      if (!node.legacyFieldId) continue;
      const fieldId = node.legacyFieldId;
      const uploadFiles = seededUploads[fieldId] ?? [];

      if (node.inputType === 'file_upload' || node.kind === 'doc_request') {
        if (uploadFiles.length === 0) continue;
        const uploadedAt = new Date().toISOString();
        nextResponses = upsertNodeResponse(nextResponses, {
          assignmentId: assignment.id,
          nodeId: node.id,
          value: {
            files: uploadFiles.map((name, idx) => {
              const id = `seed-${node.id}-${idx + 1}`;
              seedFilesToImport.push({
                fileId: id,
                fileName: name,
                uploadedAt,
                mimeType: 'application/pdf',
                assignmentId: assignment.id,
                nodeId: node.id,
                legacyFieldId: fieldId,
              });
              return {
                id,
                name,
                uploadedAt,
                mimeType: 'application/pdf',
                blobKey: id,
              };
            }),
          },
          skipped: undefined,
        });
        continue;
      }

      const value = seededAnswers[fieldId];
      if (value == null) continue;
      if (typeof value === 'string' && value.trim().length === 0) continue;
      if (Array.isArray(value) && value.length === 0) continue;
      if (typeof value === 'object' && Object.keys(value).length === 0) continue;

      nextResponses = upsertNodeResponse(nextResponses, {
        assignmentId: assignment.id,
        nodeId: node.id,
        value: value as ResponseValue,
        skipped: undefined,
      });
    }

    setQuestionnaireState({
      ...questionnaireState,
      responses: nextResponses,
      assignments: updateAssignmentComputedStage(questionnaireState.assignments, assignment.id, 'in_progress'),
    });

    dispatch({
      type: 'HYDRATE',
      state: {
        answers: getSeededAnswers(),
        uploads: getSeededUploads(),
        flags: {},
      },
    });

    try {
      localStorage.setItem('gbi:wallace-demo-loaded', '1');
      localStorage.setItem(scopedStorageKey('gbi:wallace-demo-loaded'), '1');
    } catch {
      /* ignore */
    }

    const autoOcrFields = new Set<string>([
      'upload_documents_bulk',
      'upload_paystubs',
      'upload_bank_statements',
      'upload_tax_returns',
    ]);
    seedFilesToImport.forEach((file) => {
      if (!file.legacyFieldId || !autoOcrFields.has(file.legacyFieldId)) return;
      upsertOcrResult({
        fileId: file.fileId,
        assignmentId: file.assignmentId,
        nodeId: file.nodeId,
        legacyFieldId: file.legacyFieldId,
        name: file.fileName,
        uploadedAt: file.uploadedAt,
        mimeType: file.mimeType,
        status: 'queued',
        progress: 0,
        review: undefined,
      });
    });

    void (async () => {
      try {
        await clearAllBlobs();
      } catch {
        // ignore
      }
      // Import real Wallace PDFs from the dev server into IndexedDB so OCR + "Open file" works.
      for (const file of seedFilesToImport) {
        const shouldAutoOcr = Boolean(file.legacyFieldId && autoOcrFields.has(file.legacyFieldId));
        try {
          const res = await fetch(wallaceDocsUrl(file.fileName), { cache: 'no-store' });
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const blob = await res.blob();
          await putBlob(file.fileId, blob, {
            name: file.fileName,
            mimeType: blob.type || file.mimeType,
            sizeBytes: blob.size,
            createdAt: file.uploadedAt,
          });
          if (shouldAutoOcr) {
            upsertOcrResult({
              fileId: file.fileId,
              mimeType: blob.type || file.mimeType,
              sizeBytes: blob.size,
              status: 'queued',
              progress: 0,
              review: undefined,
            });
            enqueueOcr(file.fileId, { mode: 'auto', continuePdf: false });
          } else {
            upsertOcrResult({
              fileId: file.fileId,
              assignmentId: file.assignmentId,
              nodeId: file.nodeId,
              legacyFieldId: file.legacyFieldId,
              name: file.fileName,
              uploadedAt: file.uploadedAt,
              mimeType: blob.type || file.mimeType,
              sizeBytes: blob.size,
              status: 'not_processed',
              progress: undefined,
              review: undefined,
            });
          }
        } catch (err) {
          upsertOcrResult({
            fileId: file.fileId,
            status: 'error',
            progress: undefined,
            review: {
              needsReview: true,
              reason: 'missing_blob',
              detail: `Couldn't load demo file "${file.fileName}" (${String(err ?? 'fetch failed')}).`,
            },
          });
        }
      }
    })();

    saveAttorneyFinancial(getSeededAttorneyFinancial());
    setResetCount((c) => c + 1);
  }, [dispatch, questionnaireState]);

  const createTemplateFromAttorney = useCallback((title: string, description?: string) => {
    setQuestionnaireState((prev) => ({
      ...prev,
      templates: createQuestionnaireTemplate(prev.templates, { title, description }),
    }));
  }, []);

  const duplicateTemplateFromAttorney = useCallback((templateId: string) => {
    setQuestionnaireState((prev) => ({
      ...prev,
      templates: duplicateQuestionnaireTemplate(prev.templates, templateId),
    }));
  }, []);

  const archiveTemplateFromAttorney = useCallback((templateId: string) => {
    setQuestionnaireState((prev) => ({
      ...prev,
      templates: archiveQuestionnaireTemplate(prev.templates, templateId),
    }));
  }, []);

  const cloneTemplateForEditFromAttorney = useCallback((templateId: string): string => {
    let editableTemplateId = templateId;
    setQuestionnaireState((prev) => {
      const result = cloneTemplateForEdit(prev.templates, templateId);
      editableTemplateId = result.editableTemplateId;
      return {
        ...prev,
        templates: result.templates,
      };
    });
    return editableTemplateId;
  }, []);

  const cloneTemplateForEditFromAttorneyWithName = useCallback(
    (templateId: string, opts?: { title?: string }): string => {
      const desiredTitle = opts?.title?.trim();
      if (!desiredTitle) return cloneTemplateForEditFromAttorney(templateId);

      let editableTemplateId = templateId;
      setQuestionnaireState((prev) => {
        const nextTemplates = duplicateQuestionnaireTemplate(prev.templates, templateId);
        const created = nextTemplates[0] ?? null;
        if (!created) return { ...prev, templates: nextTemplates };

        editableTemplateId = created.id;
        const renamed = { ...created, title: desiredTitle, updatedAt: nowIso() };
        return {
          ...prev,
          templates: [renamed, ...nextTemplates.slice(1)],
        };
      });
      return editableTemplateId;
    },
    [cloneTemplateForEditFromAttorney]
  );

  const updateTemplateGraphFromAttorney = useCallback((templateId: string, graph: QuestionnaireGraph) => {
    setQuestionnaireState((prev) => ({
      ...prev,
      templates: updateTemplateGraph(prev.templates, templateId, graph),
    }));
  }, []);

  const publishTemplateFromAttorney = useCallback((templateId: string, notes?: string) => {
    setQuestionnaireState((prev) => ({
      ...prev,
      templates: publishTemplateVersion(prev.templates, templateId, { notes, by: 'attorney' }),
    }));
  }, []);

  const publishAndAssignTemplateFromAttorney = useCallback(
    (
      templateId: string,
      input?: { dueAt?: string; assignmentTitle?: string; notes?: string }
    ): { assignmentId: string } | null => {
      const assignmentId = randomId('assign');
      setQuestionnaireState((prev) => {
        const nextTemplates = publishTemplateVersion(prev.templates, templateId, {
          notes: input?.notes,
          by: 'attorney',
        });
        const template = nextTemplates.find((item) => item.id === templateId) ?? null;
        if (!template) return prev;

        const nextAssignment: QuestionnaireAssignment = {
          id: assignmentId,
          templateId: template.id,
          templateVersion: template.activeVersion,
          title: input?.assignmentTitle?.trim() || template.title,
          assignedAt: nowIso(),
          assignedBy: 'attorney',
          dueAt: input?.dueAt?.trim() || undefined,
          computedStage: 'assigned',
        };

        return {
          ...prev,
          templates: nextTemplates,
          assignments: [nextAssignment, ...prev.assignments],
        };
      });
      return { assignmentId };
    },
    []
  );

  const openAssignedQuestionnaire = useCallback((assignmentId: string) => {
    setReturnToAttorneyAvailable(false);
    setActiveAssignmentId(assignmentId);
    setClientSurface('assignment');
    setClientRunnerInitialSectionId(null);
    setClientRunnerFocusNodeId(null);
    setQuestionnaireState((prev) => ({
      ...prev,
      assignments: updateAssignmentComputedStage(prev.assignments, assignmentId, 'in_progress'),
    }));
  }, []);

  const returnToClientDashboard = useCallback(() => {
    setClientSurface('dashboard');
    setClientDashboardTab('todo');
    setClientRunnerInitialSectionId(null);
    setClientRunnerFocusNodeId(null);
  }, []);

  const submitAssignmentFromClient = useCallback((assignmentId: string) => {
    setQuestionnaireState((prev) => ({
      ...prev,
      assignments: updateAssignmentComputedStage(prev.assignments, assignmentId, 'submitted'),
    }));
    setClientSurface('dashboard');
    setActiveAssignmentId(null);
    setReturnToAttorneyAvailable(false);
    setClientRunnerInitialSectionId(null);
    setClientRunnerFocusNodeId(null);
  }, []);

  const setAssignmentResponseValue = useCallback(
    (assignmentId: string, nodeId: string, value: ResponseValue | undefined) => {
      setQuestionnaireState((prev) => ({
        ...prev,
        responses: upsertNodeResponse(prev.responses, {
          assignmentId,
          nodeId,
          value,
          skipped: undefined,
        }),
        assignments: updateAssignmentComputedStage(prev.assignments, assignmentId, 'in_progress'),
      }));
    },
    []
  );

  const skipAssignmentNode = useCallback((assignmentId: string, nodeId: string, reason: string) => {
    setQuestionnaireState((prev) => ({
      ...prev,
      responses: upsertNodeResponse(prev.responses, {
        assignmentId,
        nodeId,
        value: undefined,
        skipped: {
          reason: reason.trim() || 'Client marked unavailable.',
          by: 'client',
          at: new Date().toISOString(),
        },
      }),
      assignments: updateAssignmentComputedStage(prev.assignments, assignmentId, 'in_progress'),
    }));
  }, []);

  const applyToIntakeField = useCallback(
    (fieldId: string, value: string) => {
      console.log(`[OCR Apply] Attempting to apply: ${fieldId} = ${value}`);

      if (!intakeAssignment || !intakeGraph) {
        console.warn('[OCR Apply] No intake assignment or graph available');
        return;
      }

      const node = intakeGraph.nodes.find((candidate) => candidate.legacyFieldId === fieldId) ?? null;
      if (!node) {
        console.warn(`[OCR Apply] No node found for field ID: ${fieldId}`);
        console.log('[OCR Apply] Available legacy field IDs:', intakeGraph.nodes.map(n => n.legacyFieldId).filter(Boolean));
        return;
      }

      console.log(`[OCR Apply] Found node ${node.id} for ${fieldId}, applying value: ${value}`);
      setAssignmentResponseValue(intakeAssignment.id, node.id, value);
      console.log(`[OCR Apply] ✅ Successfully applied ${fieldId} = ${value}`);
    },
    [intakeAssignment, intakeGraph, setAssignmentResponseValue]
  );

  const moveIntakeUploadFile = useCallback(
    (fileId: string, fromLegacyFieldId: string, toLegacyFieldId: string) => {
      if (!intakeAssignment || !intakeGraph) return;
      const fromNode = intakeGraph.nodes.find((n) => n.legacyFieldId === fromLegacyFieldId) ?? null;
      const toNode = intakeGraph.nodes.find((n) => n.legacyFieldId === toLegacyFieldId) ?? null;
      if (!fromNode || !toNode) return;

      setQuestionnaireState((prev) => {
        const fromResp = prev.responses.find((r) => r.assignmentId === intakeAssignment.id && r.nodeId === fromNode.id) ?? null;
        const toResp = prev.responses.find((r) => r.assignmentId === intakeAssignment.id && r.nodeId === toNode.id) ?? null;

        const moved = moveFileBetweenValues(fromResp?.value, toResp?.value, fileId);
        if (!moved.moved) return prev;

        let nextResponses = upsertNodeResponse(prev.responses, {
          assignmentId: intakeAssignment.id,
          nodeId: fromNode.id,
          value: moved.fromValue,
          skipped: undefined,
        });
        nextResponses = upsertNodeResponse(nextResponses, {
          assignmentId: intakeAssignment.id,
          nodeId: toNode.id,
          value: moved.toValue,
          skipped: undefined,
        });

        return {
          ...prev,
          responses: nextResponses,
          assignments: updateAssignmentComputedStage(prev.assignments, intakeAssignment.id, 'in_progress'),
        };
      });

      // Keep OCR grouping consistent with the new doc bucket.
      upsertOcrResult({ fileId, legacyFieldId: toLegacyFieldId, nodeId: toNode.id, assignmentId: intakeAssignment.id });
    },
    [intakeAssignment, intakeGraph]
  );

  useEffect(() => {
    Object.entries(flags).forEach(([fieldId, entry]) => {
      if (!entry.flagged || (entry.note ?? '').trim().length < 10 || entry.resolved) return;
      upsertIssue(
        (issue) => issue.linkedFieldId === fieldId && issue.type === 'clarification' && issue.status !== 'approved',
        {
          type: 'clarification',
          title: `Clarify: ${fieldId}`,
          description: entry.note.trim(),
          owner: 'client',
          priority: 'important',
          status: 'needs_review',
          linkedFieldId: fieldId,
        }
      );
    });
  }, [flags, upsertIssue]);

  const canonicalForOcr = useMemo(() => intakeToCanonical(answers), [answers]);

  useEffect(() => {
    const results = Object.values(ocrState.resultsByFileId);
    if (results.length === 0) return;

    // 1) Reconcile OCR results against canonical case for conflict detection.
    for (const result of results) {
      const nextReview = reconcileOcrResultAgainstCanonical(canonicalForOcr, result);
      if (!nextReview) continue;
      const prev = result.review;
      const changed =
        !prev ||
        prev.needsReview !== nextReview.needsReview ||
        prev.reason !== nextReview.reason ||
        (prev.detail ?? '') !== (nextReview.detail ?? '');
      if (changed) upsertOcrResult({ fileId: result.fileId, review: nextReview });
    }

    // 2) Turn review signals into actionable Issues (idempotent per file+reason+detail).
    for (const result of results) {
      if (!result.review?.needsReview) continue;
      const fieldId = docFieldForOcrIssue(result);
      if (!fieldId) continue;
      const key = `${fieldId}:${result.review.reason}:${result.review.detail ?? ''}:${result.processedAt ?? ''}`;
      if (result.notifiedIssueKey === key) continue;

      const title = `Review document: ${docLabel(fieldId)}`;
      const reasonText = reviewLabel(result.review.reason);
      const detail = result.review.detail ? ` (${result.review.detail})` : '';
      const comment = `OCR flagged "${result.name}": ${reasonText}${detail}`;

      const matcher = (issue: Issue) =>
        issue.type === 'document' &&
        issue.linkedFieldId === fieldId &&
        issue.status !== 'approved' &&
        issue.status !== 'closed_with_exception';

      const existing = issues.find(matcher) ?? null;
      const issue = upsertIssue(matcher, {
        type: 'document',
        title,
        description: `OCR results need review for ${docLabel(fieldId)}.`,
        owner: 'attorney',
        priority: 'important',
        status: 'needs_review',
        linkedFieldId: fieldId,
      });

      // If the thread was previously resolved, reopen it.
      if (existing && existing.status !== 'needs_review') {
        setIssueStatus(existing.id, 'needs_review', 'attorney');
      }

      addComment(issue.id, 'attorney', comment);
      upsertOcrResult({ fileId: result.fileId, notifiedIssueKey: key });
    }
  }, [addComment, canonicalForOcr, issues, ocrState.resultsByFileId, setIssueStatus, upsertIssue]);

  useEffect(() => {
    saveBaselineSnapshot(computeBaselineSnapshot(answers, uploads, flags, issues));
  }, [answers, uploads, flags, issues]);

  useEffect(() => {
    const intakeTemplate = questionnaireTemplates.find((template) => template.id === 'intake-default');
    if (!intakeTemplate) return;
    const hasAnyIntakeAssignment = questionnaireAssignments.some(
      (assignment) => assignment.templateId === intakeTemplate.id
    );
    if (hasAnyIntakeAssignment) return;
    setQuestionnaireState((prev) => ({
      ...prev,
      assignments: assignTemplate(prev.assignments, intakeTemplate),
    }));
  }, [questionnaireTemplates, questionnaireAssignments]);

  useEffect(() => {
    saveQuestionnaireState({
      schemaVersion: 3,
      templates: questionnaireTemplates,
      assignments: questionnaireAssignments,
      responses: questionnaireResponses,
      archivedV1: questionnaireState.archivedV1,
    });
  }, [questionnaireTemplates, questionnaireAssignments, questionnaireResponses, questionnaireState.archivedV1]);

  const urlParams = useMemo(() => {
    if (typeof window === 'undefined') return { email: null, phone: null };
    const p = new URLSearchParams(window.location.search);
    return {
      email: p.get('email'),
      phone: p.get('phone'),
    };
  }, []);

  useEffect(() => {
    if (viewMode === 'attorney') {
      document.documentElement.classList.add('attorney-mode');
      document.body.classList.add('attorney-mode');
    } else {
      document.documentElement.classList.remove('attorney-mode');
      document.body.classList.remove('attorney-mode');
    }
    return () => {
      document.documentElement.classList.remove('attorney-mode');
      document.body.classList.remove('attorney-mode');
    };
  }, [viewMode]);

  useEffect(() => {
    setMode('light');
  }, [setMode, viewMode]);

  const templateById = useMemo(
    () => new Map(questionnaireTemplates.map((template) => [template.id, template])),
    [questionnaireTemplates]
  );
  const activeAssignment = useMemo(() => {
    if (activeAssignmentId) {
      return questionnaireAssignments.find((assignment) => assignment.id === activeAssignmentId) ?? null;
    }
    return (
      questionnaireAssignments.find((assignment) => assignment.computedStage === 'in_progress') ??
      questionnaireAssignments.find((assignment) => assignment.computedStage === 'assigned') ??
      null
    );
  }, [questionnaireAssignments, activeAssignmentId]);
  const activeTemplate = activeAssignment ? templateById.get(activeAssignment.templateId) ?? null : null;
  const activeResponses = useMemo(
    () => (activeAssignment ? responsesForAssignment(questionnaireResponses, activeAssignment.id) : []),
    [questionnaireResponses, activeAssignment]
  );

  const todoCount = useMemo(() => {
    const openAssignments = questionnaireAssignments.filter(
      (assignment) => !['approved', 'closed'].includes(assignment.computedStage ?? 'assigned')
    ).length;
    const openClientIssues = issues.filter(
      (issue) => issue.owner === 'client' && ['assigned', 'in_progress'].includes(issue.status)
    ).length;
    return openAssignments + openClientIssues;
  }, [questionnaireAssignments, issues]);
  const messageCount = useMemo(
    () => issues.filter((issue) => ['assigned', 'in_progress'].includes(issue.status)).length,
    [issues]
  );

  const openIssueFromClientTodo = useCallback((issue: Issue) => {
    if (issue.linkedFieldId) {
      setClientRunnerInitialSectionId(null);
      setClientRunnerFocusNodeId(null);
      setReturnToAttorneyAvailable(false);
      if (intakeAssignment && intakeGraph) {
        setClientSurface('assignment');
        setActiveAssignmentId(intakeAssignment.id);
        setQuestionnaireState((prev) => ({
          ...prev,
          assignments: updateAssignmentComputedStage(prev.assignments, intakeAssignment.id, 'in_progress'),
        }));
        const node = intakeGraph.nodes.find((candidate) => candidate.legacyFieldId === issue.linkedFieldId) ?? null;
        if (node) {
          setClientRunnerInitialSectionId(node.sectionId ?? null);
          setClientRunnerFocusNodeId(node.id);
        }
        return;
      }
    }
    setClientDashboardTab('messages');
  }, [intakeAssignment, intakeGraph]);

  const clientMessagesPanel = (
    <MessagesPanel
      issues={issues}
      onCreateGeneralIssue={(title, text) => {
        const issue = createNewIssue({
          type: 'question',
          title,
          description: text,
          owner: 'client',
          priority: 'normal',
          status: 'needs_review',
        });
        addComment(issue.id, 'client', text);
        trackUXEvent('message_sent', { issueId: issue.id, mode: 'new_thread' });
      }}
      onAddComment={(issueId, text) => {
        addComment(issueId, 'client', text);
        trackUXEvent('message_sent', { issueId, mode: 'reply' });
      }}
      onMarkNeedsReview={(issueId) => {
        setIssueStatus(issueId, 'needs_review', 'client');
      }}
    />
  );

  const clientDashboardContent = (
    <ClientDashboardTabs
      tab={clientDashboardTab}
      onChangeTab={setClientDashboardTab}
      todoCount={todoCount}
      messageCount={messageCount}
      todoPanel={
        <ClientTodoPanel
          templates={questionnaireTemplates}
          assignments={questionnaireAssignments}
          issues={issues}
          onOpenAssignment={openAssignedQuestionnaire}
          onOpenIssue={openIssueFromClientTodo}
        />
      }
      messagesPanel={clientMessagesPanel}
    />
  );

  const clientAssignmentContent =
    clientSurface === 'assignment' && activeAssignment && activeTemplate ? (
      <AssignmentRunner
        template={activeTemplate}
        assignment={activeAssignment}
        responses={activeResponses}
        initialSectionId={clientRunnerInitialSectionId ?? undefined}
        focusNodeId={clientRunnerFocusNodeId ?? undefined}
        onChangeResponse={(nodeId, value) => setAssignmentResponseValue(activeAssignment.id, nodeId, value)}
        onSkipNode={(nodeId, reason) => skipAssignmentNode(activeAssignment.id, nodeId, reason)}
        onSubmit={() => submitAssignmentFromClient(activeAssignment.id)}
        onBackToDashboard={returnToClientDashboard}
      />
    ) : null;

  return (
    <div className={`app-root ${viewMode === 'attorney' ? 'attorney-mode' : ''}`}>
      <div className="app-screens">
        <div className={`screen screen-client ${viewMode === 'client' ? 'active' : 'inactive'}`}>
          {returnToAttorneyAvailable && viewMode === 'client' && (
            <div className="return-to-attorney-sticky">
              <button
                type="button"
                className="return-to-attorney-btn"
                onClick={onReturnToAttorney}
              >
                Return to Attorney View
              </button>
            </div>
          )}
          <Layout email={urlParams.email} phone={urlParams.phone} onReset={handleReset} onLoadDemo={handleLoadDemo}>
            {clientSurface === 'assignment' ? (
              clientAssignmentContent ?? clientDashboardContent
            ) : (
              clientDashboardContent
            )}
          </Layout>
        </div>
        <div className={`screen screen-attorney ${viewMode === 'attorney' ? 'active' : 'inactive'}`}>
          <AttorneyDashboard
            key={`dashboard-${resetCount}`}
            email={urlParams.email}
            phone={urlParams.phone}
            onGoToWizard={onGoToWizard}
            onReset={handleReset}
            onLoadDemo={handleLoadDemo}
            questionnaireTemplates={questionnaireTemplates}
            questionnaireAssignments={questionnaireAssignments}
            questionnaireResponses={questionnaireResponses}
            onCreateTemplate={createTemplateFromAttorney}
            onDuplicateTemplate={duplicateTemplateFromAttorney}
            onArchiveTemplate={archiveTemplateFromAttorney}
            onCloneTemplateForEdit={cloneTemplateForEditFromAttorneyWithName}
            onUpdateTemplateGraph={updateTemplateGraphFromAttorney}
            onPublishTemplate={publishTemplateFromAttorney}
            onPublishAndAssignTemplate={publishAndAssignTemplateFromAttorney}
            onApplyToIntakeField={applyToIntakeField}
            onMoveIntakeUploadFile={moveIntakeUploadFile}
            viewMode={viewMode}
          />
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AccessGate>
      <AppContent />
    </AccessGate>
  );
}
