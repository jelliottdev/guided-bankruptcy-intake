import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { intakeToCanonical } from './transform';
import { validateCase } from './validation';
import { getSeededAnswers } from '../form/seedData';
import { getInitialAnswers } from '../form/defaults';
import { getApplicableFormIds, getFormRegistration, generatePacket, type FormId } from './forms/registry';

describe('Filing Engine', () => {
    describe('intakeToCanonical', () => {
        it('transforms raw seed data into a valid Canonical Case', () => {
            const answers = getSeededAnswers();
            const canonical = intakeToCanonical(answers);

            expect(canonical.id).toBeDefined();
            expect(canonical.debtor1.name.first).toBeDefined();
            expect(canonical.creditCounseling.debtor1).toBeDefined();
            expect(canonical.filing.chapter).toBe('13');
        });

        it('normalizes currency strings', () => {
            const answers = getInitialAnswers();
            answers['cash_on_hand'] = '$1,200.00';

            const canonical = intakeToCanonical(answers);
            // assets logic is currently passed through from scheduleB, ensure it maps
            expect(canonical.assets.cashOnHand).toBe(1200);
        });
    });

    describe('validateCase', () => {
        it('flags missing SSN as a Blocking issue', () => {
            const answers = getInitialAnswers();
            const canonical = intakeToCanonical(answers);

            // Ensure SSN is missing
            canonical.debtor1.ssnLast4 = undefined;

            const validateIssues = validateCase(canonical);
            const ssnIssue = validateIssues.find(i => i.code === 'F101_SSN_INVALID');

            expect(ssnIssue).toBeDefined();
            expect(ssnIssue?.severity).toBe('Blocking');
        });

        it('flags missing Credit Counseling', () => {
            const answers = getSeededAnswers();
            answers['credit_counseling'] = 'No';

            const canonical = intakeToCanonical(answers);
            // Simulation: If answer is No, transform sets status to completed_no_cert (based on current logic dummy)
            // But we want to test missing.
            // Let's force it.
            // @ts-ignore
            canonical.creditCounseling.debtor1.status = 'requested_waiver';

            const issues = validateCase(canonical);

            const ccIssue = issues.find(i => i.code === 'STAT_CC_MISSING');
            expect(ccIssue).toBeDefined();
            expect(ccIssue?.severity).toBe('Blocking');
        });

        it('passes validation when essential fields are present', () => {
            // Construct a "perfect" case
            const answers = getSeededAnswers();
            const canonical = intakeToCanonical(answers);

            // Patch in required data
            canonical.debtor1.ssnLast4 = '1234';
            canonical.debtor1.address.county = 'Orange';
            canonical.creditCounseling.debtor1.status = 'completed_with_cert';

            const issues = validateCase(canonical);
            const blocking = issues.filter(i => i.severity === 'Blocking');

            expect(blocking.length).toBe(0);
        });

        it('Wallace demo seed produces a file-ready case with no blocking issues', () => {
            const answers = getSeededAnswers();
            const canonical = intakeToCanonical(answers);
            const issues = validateCase(canonical);
            const blocking = issues.filter(i => i.severity === 'Blocking');
            expect(canonical.creditCounseling.debtor1.status).toBe('completed_with_cert');
            expect(canonical.debtor1.ssnLast4).toBeDefined();
            expect(canonical.debtor1.address.county).toBeDefined();
            expect(blocking.length).toBe(0);
        });
    });

    describe('form registry / packet', () => {
        it('getApplicableFormIds returns all registered forms for any case', () => {
            const answers = getSeededAnswers();
            const canonical = intakeToCanonical(answers);
            const ids = getApplicableFormIds(canonical);
            expect(ids).toContain('b101');
            expect(ids).toContain('schedule-ab');
            expect(ids.length).toBeGreaterThanOrEqual(2);
        });

        it('generatePacket produces one PDF per applicable form when templates exist', async () => {
            const answers = getSeededAnswers();
            const canonical = intakeToCanonical(answers);
            const publicDir = path.join(process.cwd(), 'public');
            const loadTemplate = async (formId: FormId) => {
                const reg = getFormRegistration(formId);
                if (!reg) throw new Error(`No registration for ${formId}`);
                const templatePath = path.join(publicDir, reg.templatePath);
                if (!fs.existsSync(templatePath)) throw new Error(`Template not found: ${templatePath}`);
                return fs.readFileSync(templatePath).buffer as ArrayBuffer;
            };
            const packet = await generatePacket(canonical, loadTemplate);
            expect(packet.length).toBe(getApplicableFormIds(canonical).length);
            packet.forEach((entry) => {
                expect(entry.formId).toBeDefined();
                expect(entry.label).toBeDefined();
                expect(entry.pdfBytes).toBeInstanceOf(Uint8Array);
                expect(entry.pdfBytes.length).toBeGreaterThan(500);
            });
        });
    });
});
