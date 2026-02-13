/**
 * Main dashboard layout: composes header, KPI row, filter, split (action queue + documents/schedules),
 * analysis (financial, filing readiness), strategy signals, footer (creditors, reliability), debug.
 */
import type { ReactNode } from 'react';
import { CaseHeader } from './CaseHeader';
import { KPIRow } from './KPIRow';
import { ActionQueue } from './ActionQueue/ActionQueue';
import type { ActionQueueItem } from './ActionQueue/ActionCard';
import type { NextAction } from './CaseHeader.types';
import type { ActionStatusValue } from './dashboardShared';
import type { Flags } from '../../form/types';
import { DocumentPanel, type DocSufficiencyRow } from './Documents/DocumentPanel';
import { SchedulesChecklist } from './SchedulesChecklist';
import type { ScheduleRow } from './SchedulesChecklist';
import { FinancialDashboard } from './Financial/FinancialDashboard';
import { MeansTest } from './Financial/MeansTest';
import { FinancialCharts } from './Financial/FinancialCharts';
import type { AttorneyFinancialEntry } from './dashboardShared';
import type { Answers } from '../../form/types';
import { FilingReadinessCard } from './FilingReadinessCard';
import { StrategySignalsCard } from './StrategySignalsCard';
import type { StrategySignal } from './StrategySignalsCard';
import { ExemptionAnalysis } from './CaseInsights/ExemptionAnalysis';
import { RiskAssessment } from './CaseInsights/RiskAssessment';
import type { RiskAssessmentResult } from '../../attorney/riskAssessment';
import { ExportPanel } from './Export/ExportPanel';
import { CreditorMatrixCard } from './Creditors/CreditorMatrixCard';
import type { CreditorRow } from '../../attorney/creditorMatrix';
import type { AttorneyCreditorEntry } from './dashboardShared';
import { ClientReliabilityCard } from './ClientReliabilityCard';

export interface DashboardLayoutProps {
  // Header
  caseStatus: { label: string; color: string };
  readinessScore: number;
  missingCount: number;
  docReceived: number;
  docTotal: number;
  primaryBlockers: string[];
  nextBestActionSingle: { action: string; title: string };
  nextBestActions: NextAction[];
  missingRequiredCount: number;
  missingDocsCount: number;
  flaggedAndUrgencyCount: number;
  docRequestMessage: string;
  lastSavedAt: number | null;
  copyToast: 'Copied' | 'Copy failed' | null;
  onScrollToActionQueue: () => void;
  onScrollToFlags: () => void;
  onCopy: (text: string) => void;
  onCopyExportBundle: () => void;
  onCopyCaseSnapshot: () => void;
  onReset: () => void;
  onToggleClientView: () => void;
  aiSummaryCard: ReactNode;

  // KPI
  completionPct: number;
  flagsAndUrgencyCount: number;
  reliabilityScore: number;

  // Filter
  searchQuery: string;
  onSearchChange: (value: string) => void;

  // Action queue
  actionQueueOpen: Record<'critical' | 'important' | 'follow-up', boolean>;
  displayCritical: { item: ActionQueueItem; i: number }[];
  displayImportant: { item: ActionQueueItem; i: number }[];
  displayFollowUpMoved: {
    item: ActionQueueItem;
    i: number;
    source: 'critical' | 'important';
  }[];
  displayFollowUpOriginal: { item: ActionQueueItem; i: number }[];
  actionStatus: Record<string, ActionStatusValue>;
  flags: Flags;
  actionItemId: (item: ActionQueueItem, i: number, prefix: string) => string;
  onToggleActionGroup: (key: 'critical' | 'important' | 'follow-up') => void;
  onSetItemStatus: (itemId: string, status: ActionStatusValue) => void;
  onActionStatusChange: (itemId: string, value: string, fieldId?: string) => void;
  onJumpToField: (stepIndex: number, fieldId?: string) => void;
  onCopyFollowUp: () => void;
  onExpandAllActionQueue: () => void;
  onCollapseAllActionQueue: () => void;
  onBatchMarkReviewedCritical?: () => void;
  onBatchMarkReviewedImportant?: () => void;
  hasAnyActions: boolean;

  // Documents & schedules
  documentSufficiency: DocSufficiencyRow[];
  uploads: Record<string, string[]>;
  fullDocRequestText: string;
  scheduleCoverage: ScheduleRow[];

  // Financial
  assetsSnapshot: {
    vehicles: number;
    properties: number;
    bankAccounts: number;
  };
  debtsSnapshot: {
    priority: boolean;
    otherSecured: boolean;
    cosigned: boolean;
    unsecuredText: string | null;
  };
  incomeSnapshot: {
    debtorEmployed: boolean;
    spouseEmployed: boolean;
    otherList: string[];
    incomeDocsUploaded: boolean;
  };
  attorneyFinancial: AttorneyFinancialEntry;
  onAttorneyFinancialChange: (entry: AttorneyFinancialEntry) => void;

  // Filing readiness
  timelineReadiness: { days: string; note: string };
  filingChecklist: { clientMustProvide: string[]; attorneyMustConfirm: string[] };

  // Strategy
  strategySignals: StrategySignal[];

  // Creditors
  creditorMatrix: CreditorRow[];
  attorneyCreditors: AttorneyCreditorEntry[];
  mergedCreditorMatrix: CreditorRow[];
  creditorCountByType: Record<string, number>;
  creditorFormOpen: boolean;
  creditorEditingId: string | null;
  creditorDraft: { name: string; type: CreditorRow['type']; balanceOrNote: string };
  onOpenAddCreditor: () => void;
  onOpenEditCreditor: (entry: AttorneyCreditorEntry) => void;
  onSaveCreditorDraft: () => void;
  onCancelCreditorForm: () => void;
  onRemoveAttorneyCreditor: (id: string) => void;
  onCreditorDraftChange: (draft: {
    name: string;
    type: CreditorRow['type'];
    balanceOrNote: string;
  }) => void;
  exportWorksheetText: string;

  // Means test
  answers: Answers;
  meansTestState: string;
  onMeansTestStateChange: (state: string) => void;

  // Exemption analysis
  exemptionSet: string;
  onExemptionSetChange: (value: string) => void;

  // Risk assessment
  riskAssessmentResult: RiskAssessmentResult;

  // Export
  exportPanelInputs: {
    primaryBlockers: string[];
    filingChecklist: { clientMustProvide: string[]; attorneyMustConfirm: string[] };
    missingSchedules: string[];
    clientSummaryLines: string[];
    followUpQuestions: string[];
    docRequestLines: string[];
    debtorName?: string;
    caseStatus: string;
  };

  // Reliability
  clientReliability: {
    score: number;
    breakdown: { missingRequired: number; docsMissing: number; flaggedAnswers: number };
  };
  reliabilityNextStepText: string;

  // Debug
  showDebug: boolean;
  onToggleDebug: () => void;
  onCopyRawJson: () => void;
  rawJson: string;
}

export function DashboardLayout(props: DashboardLayoutProps) {
  const {
    caseStatus,
    readinessScore,
    missingCount,
    docReceived,
    docTotal,
    primaryBlockers,
    nextBestActionSingle,
    nextBestActions,
    missingRequiredCount,
    missingDocsCount,
    flaggedAndUrgencyCount,
    docRequestMessage,
    lastSavedAt,
    copyToast,
    onScrollToActionQueue,
    onScrollToFlags,
    onCopy,
    onCopyExportBundle,
    onCopyCaseSnapshot,
    onReset,
    onToggleClientView,
    aiSummaryCard,
    completionPct,
    flagsAndUrgencyCount,
    reliabilityScore,
    searchQuery,
    onSearchChange,
    actionQueueOpen,
    displayCritical,
    displayImportant,
    displayFollowUpMoved,
    displayFollowUpOriginal,
    actionStatus,
    flags,
    actionItemId,
    onToggleActionGroup,
    onSetItemStatus,
    onActionStatusChange,
    onJumpToField,
    onCopyFollowUp,
    onExpandAllActionQueue,
    onCollapseAllActionQueue,
    onBatchMarkReviewedCritical,
    onBatchMarkReviewedImportant,
    hasAnyActions,
    documentSufficiency,
    uploads,
    fullDocRequestText,
    scheduleCoverage,
    assetsSnapshot,
    debtsSnapshot,
    incomeSnapshot,
    attorneyFinancial,
    onAttorneyFinancialChange,
    timelineReadiness,
    filingChecklist,
    strategySignals,
    creditorMatrix,
    attorneyCreditors,
    mergedCreditorMatrix,
    creditorCountByType,
    creditorFormOpen,
    creditorEditingId,
    creditorDraft,
    onOpenAddCreditor,
    onOpenEditCreditor,
    onSaveCreditorDraft,
    onCancelCreditorForm,
    onRemoveAttorneyCreditor,
    onCreditorDraftChange,
    exportWorksheetText,
    answers,
    meansTestState,
    onMeansTestStateChange,
    exemptionSet,
    onExemptionSetChange,
    riskAssessmentResult,
    exportPanelInputs,
    clientReliability,
    reliabilityNextStepText,
    showDebug,
    onToggleDebug,
    onCopyRawJson,
    rawJson,
  } = props;

  return (
    <div className="attorney-dashboard">
      <CaseHeader
        aiSummaryCard={aiSummaryCard}
        caseStatus={caseStatus}
        readinessScore={readinessScore}
        missingCount={missingCount}
        docReceived={docReceived}
        docTotal={docTotal}
        primaryBlockers={primaryBlockers}
        nextBestActionSingle={nextBestActionSingle}
        nextBestActions={nextBestActions}
        missingRequiredCount={missingRequiredCount}
        missingDocsCount={missingDocsCount}
        flaggedAndUrgencyCount={flaggedAndUrgencyCount}
        docRequestMessage={docRequestMessage}
        lastSavedAt={lastSavedAt}
        copyToast={copyToast}
        onScrollToActionQueue={onScrollToActionQueue}
        onScrollToFlags={onScrollToFlags}
        onCopy={onCopy}
        onCopyExportBundle={onCopyExportBundle}
        onCopyCaseSnapshot={onCopyCaseSnapshot}
        onReset={onReset}
        onToggleClientView={onToggleClientView}
      />

      <KPIRow
        completionPct={completionPct}
        missingCount={missingCount}
        docTotal={docTotal}
        docReceived={docReceived}
        flagsAndUrgencyCount={flagsAndUrgencyCount}
        reliabilityScore={reliabilityScore}
      />

      <div className="dashboard-filterbar">
        <input
          type="search"
          className="dashboard-search"
          placeholder="Filter action queue and documents…"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          aria-label="Filter"
        />
      </div>

      <div className="dashboard-split">
        <ActionQueue
          actionQueueOpen={actionQueueOpen}
          displayCritical={displayCritical}
          displayImportant={displayImportant}
          displayFollowUpMoved={displayFollowUpMoved}
          displayFollowUpOriginal={displayFollowUpOriginal}
          actionStatus={actionStatus}
          flags={flags}
          actionItemId={actionItemId}
          onToggleGroup={onToggleActionGroup}
          onSetItemStatus={onSetItemStatus}
          onActionStatusChange={onActionStatusChange}
          onJumpToField={onJumpToField}
          onCopyFollowUp={onCopyFollowUp}
          onExpandAll={onExpandAllActionQueue}
          onCollapseAll={onCollapseAllActionQueue}
          onBatchMarkReviewedCritical={onBatchMarkReviewedCritical}
          onBatchMarkReviewedImportant={onBatchMarkReviewedImportant}
          hasAnyActions={hasAnyActions}
        />
        <div className="dashboard-right-panel">
          <DocumentPanel
            documentSufficiency={documentSufficiency}
            uploads={uploads}
            onCopyRequest={onCopy}
            fullDocRequestText={fullDocRequestText}
          />
          <SchedulesChecklist scheduleCoverage={scheduleCoverage} />
        </div>
      </div>

      <div className="dashboard-analysis">
        <FinancialDashboard
          assetsSnapshot={assetsSnapshot}
          debtsSnapshot={debtsSnapshot}
          incomeSnapshot={incomeSnapshot}
          attorneyFinancial={attorneyFinancial}
          onAttorneyFinancialChange={onAttorneyFinancialChange}
        />
        <MeansTest
          answers={answers}
          selectedState={meansTestState}
          onStateChange={onMeansTestStateChange}
        />
        <FinancialCharts
          attorneyFinancial={attorneyFinancial}
          scheduleCoverage={scheduleCoverage}
        />
        <FilingReadinessCard
          primaryBlockers={primaryBlockers}
          scheduleCoverage={scheduleCoverage}
          timelineReadiness={timelineReadiness}
          filingChecklist={filingChecklist}
          onCopyChecklist={onCopy}
        />
      </div>

      <StrategySignalsCard strategySignals={strategySignals} />

      <div className="dashboard-case-insights-row">
        <ExemptionAnalysis
          answers={answers}
          selectedExemptionSet={exemptionSet}
          onExemptionSetChange={onExemptionSetChange}
        />
        <RiskAssessment result={riskAssessmentResult} />
        <ExportPanel {...exportPanelInputs} />
      </div>

      <div className="dashboard-footer-row">
        <CreditorMatrixCard
          creditorMatrix={creditorMatrix}
          attorneyCreditors={attorneyCreditors}
          mergedCreditorMatrix={mergedCreditorMatrix}
          creditorCountByType={creditorCountByType}
          creditorFormOpen={creditorFormOpen}
          creditorEditingId={creditorEditingId}
          creditorDraft={creditorDraft}
          onOpenAddCreditor={onOpenAddCreditor}
          onOpenEditCreditor={onOpenEditCreditor}
          onSaveCreditorDraft={onSaveCreditorDraft}
          onCancelCreditorForm={onCancelCreditorForm}
          onRemoveAttorneyCreditor={onRemoveAttorneyCreditor}
          onCreditorDraftChange={onCreditorDraftChange}
          onCopyWorksheet={onCopy}
          exportWorksheetText={exportWorksheetText}
        />
        <ClientReliabilityCard
          score={clientReliability.score}
          breakdown={clientReliability.breakdown}
          recommendedNextStep={reliabilityNextStepText}
        />
      </div>

      <div className="attorney-card raw-section">
        <button
          type="button"
          className="raw-toggle"
          onClick={onToggleDebug}
          aria-expanded={showDebug}
        >
          {showDebug ? 'Hide developer/debug data' : 'Show developer/debug data'}
        </button>
        {showDebug && (
          <div className="raw-content">
            <button
              type="button"
              className="btn btn-secondary btn-copy-raw"
              onClick={onCopyRawJson}
              title="Copy raw JSON only"
            >
              Copy
            </button>
            <pre className="raw-json">{rawJson}</pre>
          </div>
        )}
      </div>
    </div>
  );
}
