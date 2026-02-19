/* eslint-disable no-empty */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Box from '@mui/joy/Box';
import Button from '@mui/joy/Button';
import Chip from '@mui/joy/Chip';
import Divider from '@mui/joy/Divider';
import Drawer from '@mui/joy/Drawer';
import LinearProgress from '@mui/joy/LinearProgress';
import ModalClose from '@mui/joy/ModalClose';
import Option from '@mui/joy/Option';
import Select from '@mui/joy/Select';
import Sheet from '@mui/joy/Sheet';
import Stack from '@mui/joy/Stack';
import Typography from '@mui/joy/Typography';
import CircularProgress from '@mui/joy/CircularProgress';
import Modal from '@mui/joy/Modal';
import ModalDialog from '@mui/joy/ModalDialog';
import Snackbar from '@mui/joy/Snackbar';
import type { Answers } from '../../../form/types';
import { isJointFiling } from '../../../utils/logic';
import { getMedianIncomeStates, runMeansTest } from '../../../attorney/meansTest';
import type { DocSufficiencyRow } from '../../../attorney/snapshot';
import { labelForGlobalStatus, toneForGlobalStatus, type GlobalStatus } from '../../shared/globalStatus';
import { loadFilingStateOverride, saveFilingStateOverride } from './filingPrefs';
import { getSeededAnswers } from '../../../form/seedData';
import { buildCanonical } from '../../../engine/transform';
import { validateCase, type ValidationIssue } from '../../../engine/validation';
import { generateB101 } from '../../../engine/export/b101';
import { extractPetitionAnswersFromPdfBlob } from '../../../ocr/extractPetitionAnswers';
import { generateScheduleAB as generateScheduleABEngine } from '../../../engine/export/scheduleAB';
// import { Form101Readiness } from './Form101Readiness'; // Deprecated by Engine

import { useOcrState, upsertOcrResult } from '../../../ocr/store';
import { loadAttorneyProfile } from '../../../attorney/attorneyProfile';
import type { OcrResult, OcrDocType } from '../../../ocr/types';
import { enqueueOcr } from '../../../ocr/queue';
import { getBlob, hasBlob } from '../../../files/blobStore';
import type { ResponseFileMeta } from '../../../questionnaires/runtime/filesValue';
import { getMappableFields } from '../../../ocr/fieldMapping';
import { ReviewConflicts } from './ReviewConflicts';
import { PropertySnapshotTool } from './PropertySnapshotTool';
import type { PropertyReport } from '../../../api/attom';

/** B101-critical intake keys; filled from voluntary petition (raw/visual analysis) or seed. */
const B101_CRITICAL_KEYS = [
  'filing_chapter',
  'filing_fee_method',
  'debt_nature',
  'asset_range',
  'liability_range',
  'filing_date',
] as const;

/** Merge answers with seed defaults for B101. Intake/petition values win when already set. */
function mergeAnswersWithB101SeedDefaults(answers: Answers): Answers {
  const seed = getSeededAnswers();
  const out = { ...answers };
  for (const key of B101_CRITICAL_KEYS) {
    const current = out[key];
    const hasValue = current !== undefined && current !== null && String(current).trim() !== '';
    if (!hasValue) {
      const seedVal = seed[key];
      if (seedVal !== undefined && seedVal !== null && seedVal !== '') {
        out[key] = seedVal;
      }
    }
  }
  return out;
}

/** Intake keys that drive Schedule A/B (real estate, vehicles, financial, household, business/farm). */
const SCHEDULE_AB_SEED_KEYS = [
  'real_estate_ownership',
  'real_estate_count',
  'property_1_address',
  'property_1_city',
  'property_1_state',
  'property_1_zip',
  'property_1_county',
  'property_1_ownership',
  'property_1_type',
  'property_1_value',
  'property_1_mortgage',
  'property_1_mortgage_balance',
  'property_1_mortgage_details',
  'property_2_address',
  'property_2_city',
  'property_2_state',
  'property_2_zip',
  'property_2_county',
  'property_2_type',
  'property_2_value',
  'bank_accounts',
  'bank_account_count',
  'account_1_institution',
  'account_1_type',
  'account_1_balance',
  'account_1_ownership',
  'account_1_last4',
  'account_2_institution',
  'account_2_type',
  'account_2_balance',
  'account_2_ownership',
  'account_2_last4',
  'account_3_institution',
  'account_3_type',
  'account_3_balance',
  'account_3_ownership',
  'account_3_last4',
  'security_deposits',
  'security_deposit_details',
  'household_property',
  'cash_on_hand',
  'retirement_details',
  'tax_refunds_details',
  'life_insurance_details',
  'financial_assets_details',
  'vehicles',
  'vehicle_count',
  'vehicle_1_year',
  'vehicle_1_make',
  'vehicle_1_model',
  'vehicle_1_value',
  'vehicle_1_ownership',
  'vehicle_1_vin',
  'vehicle_1_mileage',
  'vehicle_2_year',
  'vehicle_2_make',
  'vehicle_2_model',
  'vehicle_2_value',
  'vehicle_2_ownership',
  'vehicle_2_vin',
  'vehicle_2_mileage',
  'business_or_farm',
  'business_farm_description',
  'business_farm_value',
] as const;

/** Merge answers with seed defaults for Schedule A/B so export has data when intake is incomplete. */
function mergeAnswersWithScheduleABSeedDefaults(answers: Answers): Answers {
  const seed = getSeededAnswers();
  const out = { ...answers };
  for (const key of SCHEDULE_AB_SEED_KEYS) {
    const current = out[key];
    const isEmpty =
      current === undefined ||
      current === null ||
      (typeof current === 'string' && String(current).trim() === '') ||
      (typeof current === 'object' && current !== null && Object.keys(current as object).length === 0);
    if (isEmpty) {
      const seedVal = seed[key];
      if (seedVal !== undefined && seedVal !== null) {
        if (typeof seedVal === 'string' && String(seedVal).trim() === '') {
          out[key] = seedVal;
        } else if (typeof seedVal !== 'string' || String(seedVal).trim() !== '') {
          out[key] = seedVal;
        }
      }
    }
  }
  return out;
}

function formatCurrency(value: number): string {
  if (!Number.isFinite(value)) return '—';
  return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(
    value
  );
}

function formatWhen(value: string | null): string {
  if (!value) return 'Never';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return 'Never';
  const deltaMs = Date.now() - parsed.getTime();
  const deltaMin = Math.floor(deltaMs / 60000);
  if (deltaMin < 1) return 'Just now';
  if (deltaMin < 60) return `${deltaMin}m ago`;
  const deltaHr = Math.floor(deltaMin / 60);
  if (deltaHr < 24) return `${deltaHr}h ago`;
  const deltaDay = Math.floor(deltaHr / 24);
  if (deltaDay === 1) return 'Yesterday';
  return `${deltaDay}d ago`;
}

function isEmpty(value: unknown): boolean {
  if (value == null) return true;
  if (typeof value === 'string') return value.trim() === '';
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === 'object') return Object.keys(value as Record<string, unknown>).length === 0;
  return false;
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

// function extractLast4(input: string): string | null { ... } (unused)

type FilingToolsDrawerProps = {
  open: boolean;
  onClose: () => void;
  answers: Answers;
  documentSufficiency: DocSufficiencyRow[];
  intakeUploadFilesByFieldId: Record<string, ResponseFileMeta[]>;

  missingRequiredCount: number;
  missingDocsCount: number;
  needsReviewThreadsCount: number;

  onOpenIntake: () => void;
  onOpenIntakeToField: (fieldId: string) => void;
  onOpenAssignments: () => void;
  onOpenMessages: () => void;

  onApplyToIntakeField: (fieldId: string, value: string) => void;
  onMoveIntakeUploadFile: (fileId: string, fromLegacyFieldId: string, toLegacyFieldId: string) => void;
};

const REQUIRED_DOC_FIELDS: ReadonlyArray<{ fieldId: string; label: string; docType: OcrDocType }> = [
  { fieldId: 'upload_paystubs', label: 'Paystubs', docType: 'paystub' },
  { fieldId: 'upload_bank_statements', label: 'Bank statements', docType: 'bank_statement' },
  { fieldId: 'upload_tax_returns', label: 'Tax returns', docType: 'tax_return' },
  { fieldId: 'upload_debt_counseling', label: 'Credit counseling', docType: 'credit_counseling' },
];

function extractedSummary(result: OcrResult): string | null {
  const fields = result.extracted?.fields ?? {};
  if (result.docType === 'paystub') {
    const gross = typeof fields.grossPay?.value === 'number' ? formatCurrency(fields.grossPay.value) : null;
    const net = typeof fields.netPay?.value === 'number' ? formatCurrency(fields.netPay.value) : null;
    const ytd = typeof fields.ytdGross?.value === 'number' ? formatCurrency(fields.ytdGross.value) : null;
    const parts = [
      gross ? `Gross ${gross}` : null,
      net ? `Net ${net}` : null,
      ytd ? `YTD ${ytd}` : null,
    ].filter(Boolean) as string[];
    return parts.length > 0 ? parts.join(' · ') : null;
  }
  if (result.docType === 'bank_statement') {
    const end = typeof fields.endingBalance?.value === 'number' ? formatCurrency(fields.endingBalance.value) : null;
    const period = typeof fields.statementPeriod?.value === 'string' ? String(fields.statementPeriod.value) : null;
    const date = typeof fields.endingBalanceDate?.value === 'string' ? String(fields.endingBalanceDate.value) : null;
    const parts = [
      end ? `Ending ${end}` : null,
      date ? `As of ${date}` : null,
      period ? `Period ${period}` : null,
    ].filter(Boolean) as string[];
    return parts.length > 0 ? parts.join(' · ') : null;
  }
  if (result.docType === 'tax_return') {
    const agi = typeof fields.agi?.value === 'number' ? formatCurrency(fields.agi.value) : null;
    const year = typeof fields.taxYear?.value === 'number' ? String(fields.taxYear.value) : null;
    const parts = [year ? `Year ${year}` : null, agi ? `AGI ${agi}` : null].filter(Boolean) as string[];
    return parts.length > 0 ? parts.join(' · ') : null;
  }
  if (result.docType === 'credit_counseling') {
    const completed = typeof fields.completionDate?.value === 'string' ? String(fields.completionDate.value) : null;
    return completed ? `Completed ${completed}` : null;
  }
  return null;
}

export function FilingToolsDrawer({
  open,
  onClose,
  answers,
  documentSufficiency,
  intakeUploadFilesByFieldId,
  onOpenIntake,
  onOpenIntakeToField,
  onOpenAssignments,
  onOpenMessages,
  onApplyToIntakeField,
  onMoveIntakeUploadFile,
  missingRequiredCount,
  missingDocsCount,
  needsReviewThreadsCount,
}: FilingToolsDrawerProps) {
  const [stateOverride, setStateOverride] = useState(() => loadFilingStateOverride());

  // --- ENGINE INTEGRATION (Hoisted) ---
  const canonical = useMemo(() => buildCanonical(answers, null, null), [answers]);
  const validationIssues = useMemo(() => validateCase(canonical), [canonical]);
  const blockingIssues = validationIssues.filter(i => i.severity === 'Blocking');
  const warningIssues = validationIssues.filter(i => i.severity === 'Warning');
  const isReadyToDraft = blockingIssues.length === 0;
  const [generatingForm101, setGeneratingForm101] = useState(false);
  const [form101Error, setForm101Error] = useState<string | null>(null);
  const [form101GeneratedAt, setForm101GeneratedAt] = useState<string | null>(null);
  const [form101BlobUrl, setForm101BlobUrl] = useState<string | null>(null);
  const [form101FileName, setForm101FileName] = useState<string>('Official-Form-101.pdf');
  const [generatingScheduleAB, setGeneratingScheduleAB] = useState(false);
  const [scheduleABError, setScheduleABError] = useState<string | null>(null);
  const [scheduleABBlobUrl, setScheduleABBlobUrl] = useState<string | null>(null);
  const [scheduleABFileName, setScheduleABFileName] = useState<string>('Official-Form-106AB.pdf');
  const [expandedDocFieldId, setExpandedDocFieldId] = useState<string | null>(null);
  const [viewRawText, setViewRawText] = useState<{ name: string; text: string } | null>(null);
  const [blobAvailability, setBlobAvailability] = useState<Record<string, boolean>>({});
  const [applyToast, setApplyToast] = useState<string | null>(null);
  const [petitionImportMessage, setPetitionImportMessage] = useState<string | null>(null);
  const petitionFileInputRef = useRef<HTMLInputElement>(null);
  const ocrState = useOcrState();

  useEffect(() => {
    return () => {
      if (!form101BlobUrl) return;
      try {
        URL.revokeObjectURL(form101BlobUrl);
      } catch {
        // ignore
      }
    };
  }, [form101BlobUrl]);

  const buildForm101FileName = useCallback(() => {
    const baseName = String(answers['debtor_full_name'] ?? '').trim() || 'Debtor';
    const safe = baseName
      .replace(/[^A-Za-z0-9]+/g, ' ')
      .trim()
      .replace(/\s+/g, '-')
      .slice(0, 60);
    const d = new Date();
    const yyyy = String(d.getFullYear());
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `Official-Form-101-${safe || 'Debtor'}-${yyyy}-${mm}-${dd}.pdf`;
  }, [answers]);

  const openFile = useCallback(async (fileId: string) => {
    try {
      const blob = await getBlob(fileId);
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      try {
        window.open(url, '_blank', 'noopener,noreferrer');
      } finally {
        window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    setForm101Error(null);
  }, [open]);

  useEffect(() => {
    saveFilingStateOverride(stateOverride);
  }, [stateOverride]);

  const missingIncomeInputs = useMemo(() => {
    const debtorGross = answers['debtor_gross_pay'];
    const ytd = answers['income_current_ytd'];
    const debtorFreq = answers['debtor_pay_frequency'];

    if (isEmpty(debtorGross) && isEmpty(ytd)) return true;
    if (!isEmpty(debtorGross) && isEmpty(debtorFreq)) return true;

    if (isJointFiling(answers)) {
      const spouseGross = answers['spouse_gross_pay'];
      const spouseFreq = answers['spouse_pay_frequency'];
      if (!isEmpty(spouseGross) && isEmpty(spouseFreq)) return true;
    }

    return false;
  }, [answers]);

  const medianStates = useMemo(() => getMedianIncomeStates(), []);
  const means = useMemo(() => runMeansTest(answers, stateOverride || undefined), [answers, stateOverride]);

  const meansView = useMemo(() => {
    const hasState = (stateOverride || '').trim().length > 0 || !isEmpty(answers['state']);
    let outcome: 'undetermined' | 'below' | 'above' = 'undetermined';
    let outcomeLabel = 'Undetermined';
    let status: GlobalStatus = 'needs_attorney';

    if (!hasState) {
      outcomeLabel = 'Select state to run';
      status = 'needs_attorney';
      outcome = 'undetermined';
    } else if (missingIncomeInputs) {
      outcomeLabel = 'Income inputs missing';
      status = 'needs_attorney';
      outcome = 'undetermined';
    } else if (means.pass == null) {
      outcomeLabel = 'Undetermined';
      status = 'needs_attorney';
      outcome = 'undetermined';
    } else if (means.pass) {
      outcomeLabel = 'At or below median';
      status = 'resolved';
      outcome = 'below';
    } else {
      outcomeLabel = 'Above median';
      status = 'needs_review';
      outcome = 'above';
    }

    return { outcome, outcomeLabel, status };
  }, [answers, means.pass, missingIncomeInputs, stateOverride]);

  const generateForm101 = useCallback(async () => {
    if (generatingForm101) return;
    setGeneratingForm101(true);
    setForm101Error(null);
    try {
      const base = (import.meta as unknown as { env?: { BASE_URL?: string } }).env?.BASE_URL ?? '';
      const templateRes = await fetch(`${base}forms/b101.pdf`);
      if (!templateRes.ok) throw new Error(`Failed to load template: ${templateRes.statusText}`);
      const templateBytes = await templateRes.arrayBuffer();

      const profile = loadAttorneyProfile();
      const attorney = {
        name: profile.name || 'Attorney',
        firmName: profile.firmName ?? '',
        address: {
          street1: profile.street ?? '',
          city: profile.city ?? '',
          state: (profile.state ?? 'FL').slice(0, 2),
          zip: profile.zip ?? '00000',
        },
        phone: profile.phone ?? '',
        email: profile.email ?? '',
        barNumber: profile.barNumber ?? '',
        barState: (profile.barState ?? 'FL').slice(0, 2),
        signatureDate: undefined,
      };
      const canonical = buildCanonical(mergeAnswersWithB101SeedDefaults(answers), attorney, null);

      const bytes = await generateB101(canonical, templateBytes);

      const blob = new Blob([bytes as any], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      setForm101BlobUrl((prev) => {
        if (prev && prev !== url) {
          // Cleanup old URL
          window.setTimeout(() => URL.revokeObjectURL(prev), 60_000);
        }
        return url;
      });
      setForm101FileName(buildForm101FileName());
      setForm101GeneratedAt(new Date().toISOString());

      // Attempt to open in new tab
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (err) {
      console.error('PDF Generation Error:', err);
      setForm101Error("Couldn't generate Form 101. See console.");
    } finally {
      setGeneratingForm101(false);
    }
  }, [answers, buildForm101FileName, generatingForm101]);

  const handleImportFromPetitionPdf = useCallback(
    async (file: File) => {
      setPetitionImportMessage(null);
      try {
        const { parsed, textLength, suggestVisual } = await extractPetitionAnswersFromPdfBlob(file);
        const keys = Object.keys(parsed) as (keyof typeof parsed)[];
        keys.forEach((key) => {
          const v = parsed[key];
          if (v != null && String(v).trim() !== '') onApplyToIntakeField(key, String(v));
        });
        if (keys.length > 0) {
          setApplyToast(`Imported ${keys.length} answer${keys.length === 1 ? '' : 's'} from petition (raw analysis)`);
        }
        if (suggestVisual && keys.length === 0) {
          setPetitionImportMessage('PDF had little extractable text (image-only?). Run OCR on this file, then use "View scanned text" or re-import.');
        } else if (suggestVisual && keys.length > 0) {
          setPetitionImportMessage(`Only ${textLength} chars of text; some values may be missing. Run OCR for visual analysis if needed.`);
        }
      } catch (err) {
        setPetitionImportMessage(String(err ?? 'Import failed'));
      }
    },
    [onApplyToIntakeField]
  );

  const generateScheduleAB = useCallback(async () => {
    if (generatingScheduleAB) return;
    setGeneratingScheduleAB(true);
    setScheduleABError(null);
    try {
      const merged = mergeAnswersWithScheduleABSeedDefaults(answers);
      const attorney = loadAttorneyProfile();
      const canonical = buildCanonical(
        merged,
        attorney?.name ? {
          name: attorney.name,
          firmName: attorney.firmName ?? '',
          address: {
            street1: attorney.street ?? '',
            city: attorney.city ?? '',
            state: (attorney.state ?? 'FL').slice(0, 2),
            zip: attorney.zip ?? '00000',
          },
          phone: attorney.phone ?? '',
          email: attorney.email ?? '',
          barNumber: attorney.barNumber ?? '',
          barState: (attorney.barState ?? 'FL').slice(0, 2),
          signatureDate: undefined,
        } : null,
        null
      );
      const base = (import.meta as unknown as { env?: { BASE_URL?: string } }).env?.BASE_URL ?? '';
      const templateRes = await fetch(`${base}forms/form_b106ab.pdf`);
      if (!templateRes.ok) {
        setScheduleABError("Couldn't load Schedule A/B template.");
        return;
      }
      const templateBuffer = await templateRes.arrayBuffer();
      const bytes = await generateScheduleABEngine(canonical, templateBuffer);

      const blob = new Blob([bytes as unknown as BlobPart], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      setScheduleABBlobUrl((prev) => {
        if (prev && prev !== url) {
          window.setTimeout(() => URL.revokeObjectURL(prev), 60_000);
        }
        return url;
      });

      const baseName = String(answers['debtor_full_name'] ?? '').trim() || 'Debtor';
      const safe = baseName.replace(/[^A-Za-z0-9]+/g, ' ').trim().replace(/\s+/g, '-').slice(0, 60);
      const d = new Date();
      const yyyy = String(d.getFullYear());
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      setScheduleABFileName(`Official-Form-106AB-${safe}-${yyyy}-${mm}-${dd}.pdf`);

      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (e) {
      console.error('Schedule A/B generation error:', e);
      setScheduleABError('Error generating PDF');
    } finally {
      setGeneratingScheduleAB(false);
    }
  }, [answers, generatingScheduleAB]);

  const meansTone = toneForGlobalStatus(meansView.status);


  const docSuffByLabel = useMemo(() => {
    return new Map(documentSufficiency.map((row) => [row.type, row]));
  }, [documentSufficiency]);

  const allDocFileIds = useMemo(() => {
    const ids: string[] = [];
    for (const entry of Object.values(intakeUploadFilesByFieldId)) {
      for (const file of entry) ids.push(file.id);
    }
    return [...new Set(ids.filter(Boolean))];
  }, [intakeUploadFilesByFieldId]);

  useEffect(() => {
    if (!open) return;
    if (allDocFileIds.length === 0) return;

    let cancelled = false;
    let timer: number | null = null;
    let attempts = 0;

    const run = async () => {
      attempts += 1;
      const checks = await Promise.all(
        allDocFileIds.map(async (fileId) => {
          try {
            return [fileId, await hasBlob(fileId)] as const;
          } catch {
            return [fileId, false] as const;
          }
        })
      );
      if (cancelled) return;
      setBlobAvailability((prev) => {
        const next = { ...prev };
        checks.forEach(([id, ok]) => {
          next[id] = ok;
        });
        return next;
      });

      // Demo seeding imports files asynchronously; when the drawer is open we poll briefly
      // so "Open file" and OCR status become available without a reload.
      const anyMissing = checks.some(([, ok]) => !ok);
      if (anyMissing && attempts < 8) {
        timer = window.setTimeout(() => void run(), 900);
      }
    };

    void run();
    return () => {
      cancelled = true;
      if (timer != null) window.clearTimeout(timer);
    };

  }, [open, allDocFileIds]);



  const handleSaveToCase = useCallback((report: PropertyReport) => {
    // Basic mapping to property_1 fields (for now, overwriting or filling empty)

    // Parse address parts if possible from the single line or rely on what we have.
    onApplyToIntakeField('property_1_address', report.address);
    // onApplyToIntakeField('property_1_city', ...); // We don't have city/state/zip separated in PropertyReport yet.

    if (report.valuation?.value) {
      onApplyToIntakeField('property_1_value', String(report.valuation.value));
    }

    if (report.mortgage?.amount) {
      onApplyToIntakeField('property_1_mortgage_balance', String(report.mortgage.amount));
      onApplyToIntakeField('property_1_mortgage', 'Yes'); // Infer existence
    }

    if (report.profile?.year_built) {
      // We might not have a direct field for year built in simple intake, but if we did:
      // onApplyToIntakeField('property_1_year_built', String(report.profile.year_built));
    }

    setApplyToast('Property data saved to Case (Slot 1)');
  }, [onApplyToIntakeField]);

  const bulkUploads = intakeUploadFilesByFieldId['upload_documents_bulk'] ?? [];

  return (
    <Drawer open={open} onClose={onClose} anchor="right" size="md" variant="plain">
      <ModalClose />
      <Box sx={{ p: 1.5 }}>
        <Typography level="title-md">Filing tools</Typography>
        <Typography level="body-sm" sx={{ color: 'text.tertiary', mt: 0.25 }}>
          Preflight checks, means test, document review, and court form exports.
        </Typography>
      </Box>
      <Divider />

      <Divider />

      <Modal open={Boolean(viewRawText)} onClose={() => setViewRawText(null)}>
        <ModalDialog variant="outlined" sx={{ width: 'min(600px, 90vw)' }}>
          <ModalClose />
          <Typography level="title-md">Scanned Text: {viewRawText?.name}</Typography>
          <Sheet
            variant="soft"
            sx={{
              p: 1.5,
              borderRadius: 'md',
              mt: 1.5,
              maxHeight: '60vh',
              overflow: 'auto',
              fontFamily: 'monospace',
              whiteSpace: 'pre-wrap',
            }}
          >
            {viewRawText?.text || 'No text extracted.'}
          </Sheet>
        </ModalDialog>
      </Modal>

      <Box sx={{ p: 1.5, overflow: 'auto' }}>
        <Stack spacing={2}>

          {/* ENGINE-POWERED READINESS */}
          <Stack spacing={0.9}>
            <Stack direction="row" alignItems="center" justifyContent="space-between">
              <Typography level="title-sm">Filing Readiness</Typography>
              <Chip
                size="sm"
                color={isReadyToDraft ? 'success' : 'danger'}
                variant="solid"
              >
                {isReadyToDraft ? 'Ready to Draft' : `${blockingIssues.length} Defects`}
              </Chip>
            </Stack>

            <Sheet variant="outlined" sx={{ borderRadius: 'md', p: 0, overflow: 'hidden' }}>
              {validationIssues.length === 0 ? (
                <Box sx={{ p: 2, textAlign: 'center' }}>
                  <Typography level="body-sm" color="success">All checks passed.</Typography>
                </Box>
              ) : (
                <Stack divider={<Divider />}>
                  {validationIssues.map((issue, idx) => (
                    <Stack
                      key={idx}
                      direction="row"
                      alignItems="start"
                      spacing={1.5}
                      sx={{
                        p: 1.5,
                        bgcolor: issue.severity === 'Blocking' ? 'danger.50' : 'warning.50'
                      }}
                    >
                      <Box sx={{ mt: 0.25 }}>
                        {issue.severity === 'Blocking' ? (
                          <Typography color="danger">🛑</Typography> // Or generic icon
                        ) : (
                          <Typography color="warning">⚠️</Typography>
                        )}
                      </Box>
                      <Box sx={{ flex: 1 }}>
                        <Typography level="title-sm" sx={{ color: issue.severity === 'Blocking' ? 'danger.700' : 'warning.700' }}>
                          {issue.message}
                        </Typography>
                        <Typography level="body-xs" sx={{ color: 'text.tertiary' }}>
                          Code: {issue.code}
                        </Typography>
                      </Box>
                      {issue.fixAction && (
                        <Button
                          size="sm"
                          variant="outlined"
                          color={issue.severity === 'Blocking' ? 'danger' : 'warning'}
                          onClick={() => {
                            if (issue.fixAction?.fieldId) {
                              onOpenIntakeToField(issue.fixAction.fieldId);
                            } else if (issue.fixAction?.stepId) {
                              // TODO: Navigate to step generic
                              onOpenIntake();
                            }
                          }}
                        >
                          Fix
                        </Button>
                      )}
                    </Stack>
                  ))}
                </Stack>
              )}
            </Sheet>
          </Stack>

          {(() => {
            const ocrResultsNeedingReview = Object.values(ocrState.resultsByFileId).filter((r) => r.review?.needsReview);
            if (ocrResultsNeedingReview.length === 0) return null;
            return (
              <ReviewConflicts
                results={ocrResultsNeedingReview}
                onAcceptOcr={(fieldId, value) => {
                  onApplyToIntakeField(fieldId, value);
                  onOpenIntakeToField(fieldId);
                }}
                onKeepIntake={(fileId) => {
                  const r = ocrState.resultsByFileId[fileId];
                  if (r?.review) upsertOcrResult({ fileId, review: { ...r.review, needsReview: false } });
                }}
              />
            );
          })()}



          // ...

          <Stack spacing={0.9}>
            <Typography level="title-sm">Property Data</Typography>
            <Sheet variant="soft" sx={{ p: 1, borderRadius: 'md' }}>
              <PropertySnapshotTool onSaveToCase={handleSaveToCase} />
            </Sheet>
          </Stack>

          <Stack spacing={0.9}>
            <Typography level="title-sm">Documents</Typography>
            <Sheet variant="soft" sx={{ p: 1, borderRadius: 'md' }}>
              <Stack spacing={1}>
                {REQUIRED_DOC_FIELDS.map((doc) => {
                  const files = intakeUploadFilesByFieldId[doc.fieldId] ?? [];
                  const results = files
                    .map((f) => ocrState.resultsByFileId[f.id])
                    .filter(Boolean) as OcrResult[];
                  const unfiledRecognized = bulkUploads.filter((file) => {
                    const r = ocrState.resultsByFileId[file.id] ?? null;
                    return r?.docType === doc.docType;
                  });

                  const hasNeedsReview = results.some((r) => Boolean(r.review?.needsReview));
                  const hasProcessing = results.some((r) => r.status === 'queued' || r.status === 'processing');
                  const suffRow = docSuffByLabel.get(doc.label) ?? null;
                  const missing = suffRow ? suffRow.status === 'Missing' || suffRow.status === 'Partial' : files.length === 0;
                  const hasUnfiled = unfiledRecognized.length > 0;

                  const status: GlobalStatus = hasNeedsReview
                    ? 'needs_review'
                    : missing
                      ? hasUnfiled
                        ? 'needs_attorney'
                        : 'waiting_on_client'
                      : 'resolved';
                  const tone = toneForGlobalStatus(status);
                  const expanded = expandedDocFieldId === doc.fieldId;

                  return (
                    <Box key={doc.fieldId}>
                      <Box
                        role="button"
                        tabIndex={0}
                        onClick={() => setExpandedDocFieldId((cur) => (cur === doc.fieldId ? null : doc.fieldId))}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            setExpandedDocFieldId((cur) => (cur === doc.fieldId ? null : doc.fieldId));
                          }
                        }}
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 1,
                          px: 0.75,
                          py: 0.65,
                          borderRadius: 'sm',
                          cursor: 'pointer',
                          transition: 'background-color 160ms ease',
                          '&:hover': { bgcolor: 'background.level2' },
                        }}
                      >
                        <Box sx={{ minWidth: 0 }}>
                          <Typography level="body-sm" sx={{ fontWeight: 800 }}>
                            {doc.label}
                          </Typography>
                          <Typography level="body-xs" sx={{ color: 'text.tertiary' }}>
                            {files.length > 0 ? `${files.length} file${files.length === 1 ? '' : 's'}` : 'No uploads'}
                            {suffRow?.coverageRule ? ` · ${suffRow.coverageRule}` : ''}
                            {missing && hasUnfiled ? ` · ${unfiledRecognized.length} in bulk` : ''}
                            {hasProcessing ? ' · Processing…' : ''}
                          </Typography>
                        </Box>
                        <Chip size="sm" variant={tone.variant} color={tone.color} sx={{ fontWeight: 700, flexShrink: 0 }}>
                          {labelForGlobalStatus(status)}
                        </Chip>
                      </Box>

                      {expanded ? (
                        <Box sx={{ mt: 0.75, px: 0.75 }}>
                          <Stack spacing={0.85}>
                            {files.length === 0 ? (
                              <Typography level="body-xs" sx={{ color: 'text.tertiary' }}>
                                {hasUnfiled
                                  ? `${unfiledRecognized.length} upload${unfiledRecognized.length === 1 ? '' : 's'} recognized in bulk. Assign below to satisfy ${doc.label.toLowerCase()}.`
                                  : `No files uploaded yet for ${doc.label.toLowerCase()}.`}
                              </Typography>
                            ) : (
                              (() => {
                                // const taxYearRank = ... (unused)

                                return files.map((file) => {
                                  const result = ocrState.resultsByFileId[file.id] ?? null;
                                  const blobOk = blobAvailability[file.id] !== false;
                                  const canRun = blobOk && (result?.status === 'not_processed' || result?.status === 'error' || !result);
                                  const canContinue =
                                    blobOk && result?.status === 'done' && result?.review?.reason === 'partial_pdf';
                                  const summary = result ? extractedSummary(result) : null;
                                  const showNeedsReview = Boolean(result?.review?.needsReview);
                                  const confPct =
                                    result?.status === 'done' && typeof result.ocrConfidence === 'number'
                                      ? Math.round(clamp01(result.ocrConfidence) * 100)
                                      : null;
                                  // const endingBalance = ... (unused)
                                  // const bankLast4 = ... (unused)
                                  // const bankTarget = ... (unused)

                                  // const taxAgi = ... (unused)

                                  return (
                                    <Sheet
                                      key={file.id}
                                      variant="plain"
                                      sx={{
                                        p: 0.75,
                                        borderRadius: 'sm',
                                        border: '1px solid',
                                        borderColor: 'neutral.outlinedBorder',
                                        bgcolor: 'background.surface',
                                      }}
                                    >
                                      <Stack spacing={0.45}>
                                        <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
                                          <Box sx={{ minWidth: 0 }}>
                                            <Typography level="body-sm" sx={{ fontWeight: 700 }}>
                                              {file.name}
                                            </Typography>
                                            <Typography level="body-xs" sx={{ color: 'text.tertiary' }}>
                                              {result?.status === 'processing' || result?.status === 'queued'
                                                ? 'Processing…'
                                                : result?.status === 'done'
                                                  ? summary ?? 'Processed'
                                                  : result?.status === 'unsupported'
                                                    ? 'Unsupported file type'
                                                    : result?.status === 'not_processed'
                                                      ? 'Not processed'
                                                      : result?.status === 'error'
                                                        ? 'OCR error'
                                                        : blobOk
                                                          ? 'Not processed'
                                                          : 'OCR unavailable (re-upload required)'}
                                              {confPct != null ? ` · Confidence ${confPct}%` : ''}
                                            </Typography>
                                          </Box>
                                          {showNeedsReview ? (
                                            <Chip size="sm" variant="solid" color="danger" sx={{ fontWeight: 700, flexShrink: 0 }}>
                                              Needs review
                                            </Chip>
                                          ) : null}
                                        </Stack>

                                        {result?.status === 'processing' ? (
                                          <LinearProgress size="sm" determinate value={Math.round(clamp01(result.progress ?? 0) * 100)} />
                                        ) : null}

                                        {result?.review?.detail ? (
                                          <Typography level="body-xs" sx={{ color: showNeedsReview ? 'danger.700' : 'text.tertiary' }}>
                                            {result.review.detail}
                                          </Typography>
                                        ) : null}

                                        <Stack direction="row" spacing={0.75} useFlexGap sx={{ flexWrap: 'wrap', mt: 0.25 }}>
                                          {blobOk ? (
                                            <Button size="sm" variant="plain" onClick={() => void openFile(file.id)}>
                                              Open file
                                            </Button>
                                          ) : null}
                                          {result?.status === 'done' && result.rawText ? (
                                            <Button
                                              size="sm"
                                              variant="plain"
                                              onClick={() => setViewRawText({ name: file.name, text: result.rawText! })}
                                            >
                                              View scanned text
                                            </Button>
                                          ) : null}
                                          {canRun ? (
                                            <Button
                                              size="sm"
                                              variant="soft"
                                              onClick={() => {
                                                upsertOcrResult({
                                                  fileId: file.id,
                                                  status: 'queued',
                                                  progress: 0,
                                                  review: undefined,
                                                });
                                                enqueueOcr(file.id, { mode: 'manual', continuePdf: false });
                                              }}
                                            >
                                              Run OCR
                                            </Button>
                                          ) : null}
                                          {canContinue ? (
                                            <Button
                                              size="sm"
                                              variant="soft"
                                              onClick={() => enqueueOcr(file.id, { mode: 'manual', continuePdf: true })}
                                            >
                                              Continue OCR
                                            </Button>
                                          ) : null}

                                          {/* Document Ownership Selector (for paystubs in joint filings) */}
                                          {result?.status === 'done' && result.docType === 'paystub' && isJointFiling(answers) ? (
                                            <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.75 }}>
                                              <Typography level="body-xs" sx={{ color: 'text.tertiary' }}>
                                                Belongs to:
                                              </Typography>
                                              <Select
                                                size="sm"
                                                value={result.belongsTo || 'debtor'}
                                                onChange={(_, value) => {
                                                  if (value) {
                                                    upsertOcrResult({ fileId: result.fileId, belongsTo: value as 'debtor' | 'spouse' | 'joint' });
                                                  }
                                                }}
                                                sx={{ minWidth: 120, fontSize: '0.75rem' }}
                                              >
                                                <Option value="debtor">Debtor{answers.debtor_full_name ? ` (${String(answers.debtor_full_name).split(' ')[0]})` : ''}</Option>
                                                <Option value="spouse">Spouse{answers.spouse_full_name ? ` (${String(answers.spouse_full_name).split(' ')[0]})` : ''}</Option>
                                                <Option value="joint">Both</Option>
                                              </Select>
                                            </Stack>
                                          ) : null}

                                          {result?.status === 'done' && result.extracted?.fields && result.docType ? (() => {
                                            const belongsTo = result.belongsTo || 'debtor';
                                            const mappable = getMappableFields(result.docType, result.extracted.fields, belongsTo);
                                            if (mappable.length === 0) return null;

                                            return (
                                              <Stack direction="row" spacing={0.75} sx={{ flexWrap: 'wrap' }}>
                                                {mappable.map(({ ocrField, intakeFieldId, value, confidence }) => (
                                                  <Button
                                                    key={ocrField}
                                                    size="sm"
                                                    variant="plain"
                                                    onClick={() => {
                                                      onApplyToIntakeField(intakeFieldId, String(value));
                                                      setApplyToast(`Applied ${ocrField}`);
                                                    }}
                                                    sx={{ fontSize: '0.75rem' }}
                                                  >
                                                    Apply {ocrField} ({(confidence * 100).toFixed(0)}%)
                                                  </Button>
                                                ))}
                                                {mappable.length > 1 && (
                                                  <Button
                                                    size="sm"
                                                    variant="soft"
                                                    color="primary"
                                                    onClick={() => {
                                                      mappable.forEach(({ intakeFieldId, value }) => {
                                                        onApplyToIntakeField(intakeFieldId, String(value));
                                                      });
                                                      setApplyToast(`Applied ${mappable.length} fields`);
                                                    }}
                                                    sx={{ fontSize: '0.75rem', fontWeight: 700 }}
                                                  >
                                                    Apply All ({mappable.length})
                                                  </Button>
                                                )}
                                              </Stack>
                                            );
                                          })() : null}
                                        </Stack>
                                      </Stack>
                                    </Sheet>
                                  );
                                });
                              })()
                            )}
                          </Stack>
                        </Box>
                      ) : null}
                      <Divider sx={{ my: 0.75 }} />
                    </Box>
                  );
                })}

                {bulkUploads.length > 0 ? (
                  <Box>
                    <Typography level="body-sm" sx={{ fontWeight: 800, mb: 0.4 }}>
                      Unfiled uploads
                    </Typography>
                    <Typography level="body-xs" sx={{ color: 'text.tertiary', mb: 0.75 }}>
                      Bulk uploads can be assigned to Paystubs, Bank statements, or Tax returns so sufficiency counts.
                    </Typography>
                    <Stack spacing={0.7}>
                      {bulkUploads.map((file) => {
                        const result = ocrState.resultsByFileId[file.id] ?? null;
                        const docType = result?.docType ?? 'unknown';
                        const recognized =
                          docType === 'paystub' || docType === 'bank_statement' || docType === 'tax_return';
                        if (!recognized) return null;
                        return (
                          <Sheet
                            key={file.id}
                            variant="plain"
                            sx={{
                              p: 0.75,
                              borderRadius: 'sm',
                              border: '1px solid',
                              borderColor: 'neutral.outlinedBorder',
                              bgcolor: 'background.surface',
                            }}
                          >
                            <Stack spacing={0.45}>
                              <Typography level="body-sm" sx={{ fontWeight: 700 }}>
                                {file.name}
                              </Typography>
                              <Typography level="body-xs" sx={{ color: 'text.tertiary' }}>
                                Recognized as{' '}
                                {docType === 'paystub'
                                  ? 'Paystub'
                                  : docType === 'bank_statement'
                                    ? 'Bank statement'
                                    : 'Tax return'}
                                {result?.review?.needsReview ? ' · Needs review' : ''}
                              </Typography>
                              <Stack direction="row" spacing={0.75} useFlexGap sx={{ flexWrap: 'wrap', mt: 0.25 }}>
                                <Button
                                  size="sm"
                                  variant="soft"
                                  onClick={() => {
                                    const target =
                                      docType === 'paystub'
                                        ? 'upload_paystubs'
                                        : docType === 'bank_statement'
                                          ? 'upload_bank_statements'
                                          : 'upload_tax_returns';
                                    onMoveIntakeUploadFile(file.id, 'upload_documents_bulk', target);
                                    upsertOcrResult({ fileId: file.id, legacyFieldId: target });
                                  }}
                                >
                                  Assign to{' '}
                                  {docType === 'paystub'
                                    ? 'Paystubs'
                                    : docType === 'bank_statement'
                                      ? 'Bank statements'
                                      : 'Tax returns'}
                                </Button>
                              </Stack>
                            </Stack>
                          </Sheet>
                        );
                      })}
                    </Stack>
                  </Box>
                ) : null}
              </Stack>
            </Sheet>
          </Stack>

          <Stack spacing={0.9}>
            <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
              <Typography level="title-sm">Means test</Typography>
              <Chip size="sm" variant={meansTone.variant} color={meansTone.color} sx={{ fontWeight: 700 }}>
                {labelForGlobalStatus(meansView.status)}
              </Chip>
            </Stack>

            <Sheet variant="soft" sx={{ p: 1, borderRadius: 'md' }}>
              <Stack spacing={0.75}>
                <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
                  <Typography level="body-sm" sx={{ fontWeight: 800 }}>
                    Result
                  </Typography>
                  <Typography level="body-sm" sx={{ fontWeight: 800 }}>
                    {meansView.outcomeLabel}
                  </Typography>
                </Stack>

                <Stack spacing={0.35}>
                  <Typography level="body-xs" sx={{ color: 'text.tertiary' }}>
                    State
                  </Typography>
                  <Select
                    size="sm"
                    placeholder="Select state"
                    value={stateOverride || null}
                    onChange={(_, next) => setStateOverride(next ?? '')}
                  >
                    {medianStates.map((state) => (
                      <Option key={state} value={state}>
                        {state}
                      </Option>
                    ))}
                  </Select>
                </Stack>

                <Stack direction="row" spacing={1} sx={{ mt: 0.25 }} useFlexGap flexWrap="wrap">
                  <Typography level="body-xs" sx={{ color: 'text.tertiary' }}>
                    Household size: <strong>{means.householdSize}</strong>
                  </Typography>
                  <Typography level="body-xs" sx={{ color: 'text.tertiary' }}>
                    Current monthly income: <strong>{formatCurrency(means.currentMonthlyIncome)}</strong>
                  </Typography>
                  {means.medianMonthlyIncome != null ? (
                    <Typography level="body-xs" sx={{ color: 'text.tertiary' }}>
                      Median monthly income: <strong>{formatCurrency(means.medianMonthlyIncome)}</strong>
                    </Typography>
                  ) : null}
                </Stack>

                <Typography level="body-xs" sx={{ color: 'text.tertiary' }}>
                  {means.note}
                </Typography>

                {meansView.outcome === 'undetermined' && missingIncomeInputs ? (
                  <Button
                    size="sm"
                    variant="soft"
                    onClick={() => onOpenIntakeToField('debtor_gross_pay')}
                    sx={{ alignSelf: 'flex-start' }}
                  >
                    Open intake (income)
                  </Button>
                ) : null}
              </Stack>
            </Sheet>
          </Stack>

          <Stack spacing={0.9}>
            <Typography level="title-sm">Court forms</Typography>
            <Sheet variant="soft" sx={{ p: 1, borderRadius: 'md' }}>
              <Stack spacing={0.75}>
                <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
                  <Box sx={{ minWidth: 0 }}>
                    <Typography level="body-sm" sx={{ fontWeight: 800 }}>
                      Form 101 (Voluntary Petition)
                    </Typography>
                    <Typography level="body-xs" sx={{ color: 'text.tertiary' }}>
                      Generate a court-fileable PDF using the intake data currently on record.
                    </Typography>
                  </Box>
                  <Stack direction="row" spacing={0.75} alignItems="center" sx={{ flexShrink: 0 }} flexWrap="wrap">
                    <input
                      type="file"
                      ref={petitionFileInputRef}
                      accept=".pdf,application/pdf"
                      style={{ display: 'none' }}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) void handleImportFromPetitionPdf(file);
                        e.target.value = '';
                      }}
                    />
                    <Button
                      size="sm"
                      variant="outlined"
                      onClick={() => petitionFileInputRef.current?.click()}
                    >
                      Import from petition PDF
                    </Button>
                    <Button
                      size="sm"
                      variant="soft"
                      disabled={generatingForm101 || missingRequiredCount > 0}
                      onClick={generateForm101}
                      startDecorator={generatingForm101 ? <CircularProgress size="sm" /> : null}
                    >
                      {generatingForm101 ? 'Generating…' : 'Generate PDF'}
                    </Button>
                    {form101BlobUrl ? (
                      <Button
                        size="sm"
                        variant="plain"
                        onClick={() => {
                          try {
                            const a = document.createElement('a');
                            a.href = form101BlobUrl;
                            a.download = form101FileName;
                            a.rel = 'noopener';
                            a.click();
                          } catch {
                            // ignore
                          }
                        }}
                      >
                        Download
                      </Button>
                    ) : null}
                  </Stack>
                </Stack>

                {!isReadyToDraft ? (
                  <Typography level="body-xs" sx={{ color: 'danger.700' }}>
                    Resolve {blockingIssues.length} defects before generating.
                  </Typography>
                ) : null}

                {generatingForm101 ? <LinearProgress size="sm" sx={{ mt: 0.25 }} /> : null}

                {form101Error ? (
                  <Typography level="body-xs" sx={{ color: 'danger.700', fontWeight: 600 }}>
                    {form101Error}
                  </Typography>
                ) : null}

                <Typography level="body-xs" sx={{ color: 'text.tertiary' }}>
                  Generated {formatWhen(form101GeneratedAt)}
                  {form101BlobUrl ? ` · ${form101FileName}` : ''}
                </Typography>

                {petitionImportMessage ? (
                  <Typography level="body-xs" sx={{ color: 'warning.700' }}>
                    {petitionImportMessage}
                  </Typography>
                ) : null}

                <Divider sx={{ my: 1 }} />

                <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
                  <Box sx={{ minWidth: 0 }}>
                    <Typography level="body-sm" sx={{ fontWeight: 800 }}>
                      Schedule A/B (Property)
                    </Typography>
                    <Typography level="body-xs" sx={{ color: 'text.tertiary' }}>
                      Real estate, vehicles, and personal property.
                    </Typography>
                  </Box>
                  <Stack direction="row" spacing={0.75} alignItems="center" sx={{ flexShrink: 0 }}>
                    <Button
                      size="sm"
                      variant="soft"
                      disabled={generatingScheduleAB}
                      onClick={generateScheduleAB}
                      startDecorator={generatingScheduleAB ? <CircularProgress size="sm" /> : null}
                    >
                      {generatingScheduleAB ? 'Generating…' : 'Generate PDF'}
                    </Button>
                    {scheduleABBlobUrl ? (
                      <Button
                        size="sm"
                        variant="plain"
                        onClick={() => {
                          try {
                            const a = document.createElement('a');
                            a.href = scheduleABBlobUrl;
                            a.download = scheduleABFileName;
                            a.rel = 'noopener';
                            a.click();
                          } catch { }
                        }}
                      >
                        Download
                      </Button>
                    ) : null}
                  </Stack>
                </Stack>
                {scheduleABError ? (
                  <Typography level="body-xs" sx={{ color: 'danger.700', fontWeight: 600 }}>
                    {scheduleABError}
                  </Typography>
                ) : null}
              </Stack>
            </Sheet>
          </Stack>
        </Stack>
      </Box >

      <Snackbar
        open={!!applyToast}
        autoHideDuration={2000}
        onClose={() => setApplyToast(null)}
        color="success"
        variant="soft"
        size="sm"
      >
        {applyToast}
      </Snackbar>
    </Drawer >
  );
}
