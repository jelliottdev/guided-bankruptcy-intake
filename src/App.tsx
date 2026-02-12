import { useState, useCallback, useMemo } from 'react';
import { IntakeProvider, useIntake } from './state/IntakeProvider';
import { Layout } from './ui/Layout';
import { StepShell } from './ui/StepShell';
import { FieldRenderer } from './ui/FieldRenderer';
import { Review } from './ui/Review';
import { getVisibleSteps } from './form/steps';

function lastSavedText(lastSavedAt: number | null): string {
  if (lastSavedAt == null) return 'Saved';
  const sec = Math.floor((Date.now() - lastSavedAt) / 1000);
  if (sec < 60) return 'Saved';
  if (sec < 120) return 'Last saved 1m ago';
  if (sec < 3600) return `Last saved ${Math.floor(sec / 60)}m ago`;
  return `Last saved ${Math.floor(sec / 3600)}h ago`;
}

function AppContent() {
  const { state, dispatch, setAnswer, addUpload, setStep, reset } = useIntake();
  const { answers, uploads, currentStepIndex, lastSavedAt, saving, submitted } = state;

  const [focusFieldId, setFocusFieldId] = useState<string | null>(null);

  const steps = useMemo(() => getVisibleSteps(answers), [answers]);
  const totalSteps = steps.length;
  const currentStep = steps[currentStepIndex];
  const isFinalReviewStep = currentStep?.id === 'final_review';

  const saveStatusText = saving ? 'Saving…' : lastSavedText(lastSavedAt);

  const onBack = useCallback(() => {
    setFocusFieldId(null);
    setStep(Math.max(0, currentStepIndex - 1));
  }, [currentStepIndex, setStep]);

  const onNext = useCallback(() => {
    setFocusFieldId(null);
    setStep(Math.min(totalSteps - 1, currentStepIndex + 1));
  }, [currentStepIndex, totalSteps, setStep]);

  const jumpToStep = useCallback(
    (stepIndex: number, fieldId?: string) => {
      setStep(stepIndex);
      setFocusFieldId(fieldId ?? null);
    },
    [setStep]
  );

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

  if (!currentStep) {
    return (
      <Layout email={urlParams.email} phone={urlParams.phone} onReset={reset}>
        <p>No steps to show.</p>
      </Layout>
    );
  }

  if (isFinalReviewStep && !submitted) {
    return (
      <Layout email={urlParams.email} phone={urlParams.phone} onReset={reset}>
        <Review
          currentStepIndex={currentStepIndex}
          totalSteps={totalSteps}
          onBack={onBack}
          onSubmit={handleSubmit}
          saveStatusText={saveStatusText}
          jumpToStep={jumpToStep}
          submitted={false}
        />
      </Layout>
    );
  }

  if (submitted) {
    return (
      <Layout email={urlParams.email} phone={urlParams.phone} onReset={reset}>
        <Review
          currentStepIndex={currentStepIndex}
          totalSteps={totalSteps}
          onBack={onBack}
          onSubmit={handleSubmit}
          saveStatusText={saveStatusText}
          jumpToStep={jumpToStep}
          submitted={true}
        />
      </Layout>
    );
  }

  return (
    <Layout email={urlParams.email} phone={urlParams.phone} onReset={reset}>
      <StepShell
        title={currentStep.title}
        description={currentStep.description}
        currentStepIndex={currentStepIndex}
        totalSteps={totalSteps}
        onBack={onBack}
        onNext={onNext}
        isLastStep={false}
        saveStatusText={saveStatusText}
      >
        {currentStep.fields.map((field) => (
          <FieldRenderer
            key={field.id}
            field={field}
            value={answers[field.id]}
            onChange={(value) => setAnswer(field.id, value)}
            onUpload={addUpload}
            uploads={field.type === 'file' ? uploads[field.id] : undefined}
            answers={answers}
            focusFieldId={focusFieldId}
            onFocusDone={() => setFocusFieldId(null)}
          />
        ))}
      </StepShell>
    </Layout>
  );
}

export default function App() {
  return (
    <IntakeProvider>
      <AppContent />
    </IntakeProvider>
  );
}
