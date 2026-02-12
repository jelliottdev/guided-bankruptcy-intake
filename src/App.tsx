import { useState, useCallback, useMemo, useEffect, type ReactNode } from 'react';
import { IntakeProvider, useIntake } from './state/IntakeProvider';
import { Layout } from './ui/Layout';
import { StepShell } from './ui/StepShell';
import { FieldRenderer } from './ui/FieldRenderer';
import { Review } from './ui/Review';
import { AttorneyDashboard } from './ui/AttorneyDashboard';
import { getVisibleSteps } from './form/steps';
import { getErrorsForStep } from './form/validate';

function lastSavedText(lastSavedAt: number | null): string {
  if (lastSavedAt == null) return 'Saved';
  const sec = Math.floor((Date.now() - lastSavedAt) / 1000);
  if (sec < 60) return 'Saved';
  if (sec < 120) return 'Last saved 1m ago';
  if (sec < 3600) return `Last saved ${Math.floor(sec / 60)}m ago`;
  return `Last saved ${Math.floor(sec / 3600)}h ago`;
}

function AppContent() {
  const { state, dispatch, setAnswer, addUpload, removeUpload, setStep, reset, setViewMode, setFlag, setFlagNote } = useIntake();
  const { answers, uploads, flags, currentStepIndex, lastSavedAt, saving, submitted, viewMode } = state;

  const [focusFieldId, setFocusFieldId] = useState<string | null>(null);
  /** Steps where user has pressed Next (so we show errors only after attempt, not on first render or after Back). */
  const [attemptedSteps, setAttemptedSteps] = useState<Set<number>>(() => new Set());
  /** True when user jumped from Attorney View via "Open" → show sticky Return to Attorney View. */
  const [returnToAttorneyAvailable, setReturnToAttorneyAvailable] = useState(false);

  const steps = useMemo(() => getVisibleSteps(answers), [answers]);
  const totalSteps = steps.length;
  const currentStep = steps[currentStepIndex];
  const isFinalReviewStep = currentStep?.id === 'final_review';

  const currentStepErrors = useMemo(
    () => (currentStep ? getErrorsForStep(answers, currentStepIndex, flags) : []),
    [answers, currentStepIndex, currentStep, flags]
  );
  const nextDisabled = currentStepErrors.length > 0;
  const showErrorsForCurrentStep = attemptedSteps.has(currentStepIndex);
  const errorsByFieldId = useMemo(
    () =>
      showErrorsForCurrentStep
        ? Object.fromEntries(currentStepErrors.map((e) => [e.fieldId, e.message]))
        : {},
    [currentStepErrors, showErrorsForCurrentStep]
  );

  const saveStatusText = saving ? 'Saving…' : lastSavedText(lastSavedAt);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
    const firstFieldId = steps[currentStepIndex]?.fields[0]?.id ?? null;
    setFocusFieldId(firstFieldId);
  }, [currentStepIndex, steps]);

  useEffect(() => {
    const hasData = Object.keys(answers).some((k) => {
      const v = answers[k];
      if (v == null) return false;
      if (typeof v === 'string') return v.trim() !== '';
      if (Array.isArray(v)) return v.length > 0;
      return Object.keys(v).length > 0;
    });
    const handler = (e: BeforeUnloadEvent) => {
      if (hasData && !submitted) {
        e.preventDefault();
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [answers, submitted]);

  const onBack = useCallback(() => {
    setFocusFieldId(null);
    setStep(Math.max(0, currentStepIndex - 1));
  }, [currentStepIndex, setStep]);

  const onNext = useCallback(() => {
    setAttemptedSteps((prev) => new Set(prev).add(currentStepIndex));
    setFocusFieldId(null);
    if (currentStepErrors.length > 0) return;
    setStep(Math.min(totalSteps - 1, currentStepIndex + 1));
  }, [currentStepIndex, totalSteps, setStep, currentStepErrors.length]);

  const jumpToStep = useCallback(
    (stepIndex: number, fieldId?: string) => {
      setStep(stepIndex);
      setFocusFieldId(fieldId ?? null);
    },
    [setStep]
  );

  const onGoToWizard = useCallback(
    (stepIndex: number, fieldId?: string) => {
      setReturnToAttorneyAvailable(true);
      setViewMode('client');
      setStep(stepIndex);
      setFocusFieldId(fieldId ?? null);
    },
    [setViewMode, setStep]
  );

  const onReturnToAttorney = useCallback(() => {
    setReturnToAttorneyAvailable(false);
    setViewMode('attorney');
  }, [setViewMode]);

  const handleReset = useCallback(() => {
    reset();
    setAttemptedSteps(new Set());
    setFocusFieldId(null);
  }, [reset]);

  const handleSubmit = useCallback(() => {
    dispatch({ type: 'SET_SUBMITTED', submitted: true });
  }, [dispatch]);

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

  const stepBanner =
    showErrorsForCurrentStep && currentStepErrors.length > 0
      ? 'This section has missing required items.'
      : undefined;

  let wizardContent: ReactNode;
  if (!currentStep) {
    wizardContent = <p>No steps to show.</p>;
  } else if (isFinalReviewStep && !submitted) {
    wizardContent = (
      <Review
        currentStepIndex={currentStepIndex}
        totalSteps={totalSteps}
        onBack={onBack}
        onSubmit={handleSubmit}
        saveStatusText={saveStatusText}
        jumpToStep={jumpToStep}
        submitted={false}
      />
    );
  } else if (submitted) {
    wizardContent = (
      <Review
        currentStepIndex={currentStepIndex}
        totalSteps={totalSteps}
        onBack={onBack}
        onSubmit={handleSubmit}
        saveStatusText={saveStatusText}
        jumpToStep={jumpToStep}
        submitted={true}
      />
    );
  } else {
    wizardContent = (
      <StepShell
        title={currentStep.title}
        description={currentStep.description}
        uploadInstructions={currentStep.uploadInstructions}
        currentStepIndex={currentStepIndex}
        totalSteps={totalSteps}
        onBack={onBack}
        onNext={onNext}
        isLastStep={false}
        saveStatusText={saveStatusText}
        nextDisabled={nextDisabled}
        stepBanner={stepBanner}
        saving={saving}
      >
        <form onSubmit={(e) => e.preventDefault()} style={{ marginBottom: 0 }}>
          {currentStep.fields.map((field) => (
            <FieldRenderer
              key={field.id}
              field={field}
              value={answers[field.id]}
              onChange={(value) => setAnswer(field.id, value)}
              onUpload={addUpload}
              onRemoveUpload={removeUpload}
              uploads={field.type === 'file' ? uploads[field.id] : undefined}
              answers={answers}
              flags={flags}
              error={errorsByFieldId[field.id]}
              focusFieldId={focusFieldId}
              onFocusDone={() => setFocusFieldId(null)}
              onSetAnswer={setAnswer}
              onSetFlag={setFlag}
              onSetFlagNote={setFlagNote}
            />
          ))}
        </form>
      </StepShell>
    );
  }

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
          <Layout email={urlParams.email} phone={urlParams.phone} onReset={handleReset}>
            {wizardContent}
          </Layout>
        </div>
        <div className={`screen screen-attorney ${viewMode === 'attorney' ? 'active' : 'inactive'}`}>
          <AttorneyDashboard
            email={urlParams.email}
            phone={urlParams.phone}
            onGoToWizard={onGoToWizard}
            onReset={handleReset}
          />
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <IntakeProvider>
      <AppContent />
    </IntakeProvider>
  );
}
