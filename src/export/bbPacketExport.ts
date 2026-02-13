/**
 * Export intake answers to a filled, flattened BB Packet (HTML).
 * Mirrors the 26-page packet structure; user can print to PDF.
 */
import type { Answers } from '../form/types';
import { getBankAccountCount, getRealEstateCount, getVehicleCount, hasBankAccounts, hasRealEstate, hasVehicles, isJointFiling } from '../utils/logic';

function str(v: unknown): string {
  if (v == null) return '';
  if (typeof v === 'string') return v.trim();
  if (Array.isArray(v)) return v.join(', ');
  if (typeof v === 'object') return Object.entries(v as Record<string, string>).map(([k, val]) => `${k}: ${val}`).join('; ') || '';
  return String(v);
}

function fmtDate(s: string): string {
  if (!s.trim()) return '';
  const d = new Date(s.trim());
  if (Number.isNaN(d.getTime())) return s;
  return `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`;
}

export function exportBBPacketHTML(answers: Answers): string {
  const a = (id: string) => str(answers[id] ?? '');
  const today = new Date();
  const dateToday = `${today.getMonth() + 1}/${today.getDate()}/${today.getFullYear()}`;

  const sections: string[] = [];

  // Page 1 — Debtor Information (intro line on first page)
  sections.push(`
    <div class="bb-page html2pdf__page-break">
      <p class="bb-intro">Filled and flattened from Guided Bankruptcy Intake. Print or Save as PDF.</p>
      <h2>Bankruptcy (BB) Packet – Client Intake Page 1 of 26</h2>
      <h3>Debtor Information</h3>
      <h4>A. Debtor</h4>
      <table class="bb-table"><tbody>
        <tr><td><strong>Debtor Name:</strong></td><td>${a('debtor_full_name')}</td><td><strong>Date:</strong></td><td>${dateToday}</td></tr>
        <tr><td><strong>Address:</strong></td><td colspan="3">${a('debtor_address')}</td></tr>
        <tr><td><strong>Same as Mailing?</strong></td><td>${answers['mailing_different'] === 'No' ? 'Yes' : 'No'}</td><td><strong>County:</strong></td><td>${a('county')}</td></tr>
        <tr><td><strong>Home Phone:</strong></td><td>${a('debtor_phone')}</td><td><strong>Cell Phone:</strong></td><td>${a('debtor_phone_cell')}</td></tr>
        <tr><td><strong>Social Security No.:</strong></td><td>***-**-${a('debtor_ssn_last4')}</td><td><strong>Date of Birth:</strong></td><td>${fmtDate(a('debtor_dob'))}</td></tr>
        <tr><td><strong>Business names used in last six years:</strong></td><td colspan="3">${a('business_names')}</td></tr>
        <tr><td><strong>Prior Bankruptcies:</strong></td><td colspan="3">${a('prior_bankruptcy_details')}</td></tr>
        <tr><td><strong>Pending Bankruptcies?</strong></td><td>${a('pending_bankruptcy')}</td></tr>
      </tbody></table>
      ${isJointFiling(answers) ? `
      <h4>B. Joint Debtor</h4>
      <table class="bb-table"><tbody>
        <tr><td><strong>Name:</strong></td><td>${a('spouse_full_name')}</td></tr>
        <tr><td><strong>Names used in last six years:</strong></td><td>${a('spouse_other_names')}</td></tr>
        <tr><td><strong>Address:</strong></td><td>${a('spouse_address')}</td></tr>
        <tr><td><strong>Same as Mailing?</strong></td><td>${answers['spouse_mailing_different'] === 'No' ? 'Yes' : 'No'}</td><td><strong>County:</strong></td><td>${a('spouse_county')}</td></tr>
        <tr><td><strong>Home Phone:</strong></td><td>${a('spouse_phone')}</td><td><strong>Cell Phone:</strong></td><td>${a('spouse_phone_cell')}</td></tr>
        <tr><td><strong>Social Security No.:</strong></td><td>***-**-${a('spouse_ssn_last4')}</td><td><strong>Date of Birth:</strong></td><td>${fmtDate(a('spouse_dob'))}</td></tr>
        <tr><td><strong>Prior Bankruptcies:</strong></td><td>${a('spouse_prior_bankruptcy_details')}</td></tr>
        <tr><td><strong>Pending Bankruptcies?</strong></td><td>${a('spouse_pending_bankruptcy')}</td></tr>
      </tbody></table>
      ` : ''}
      <p class="bb-signature">Debtor Signature: _________________________ Date: _________</p>
      ${isJointFiling(answers) ? '<p class="bb-signature">Joint Debtor Signature: _________________________ Date: _________</p>' : ''}
    </div>
  `);

  // Page 2–3 — Real Property
  if (hasRealEstate(answers)) {
    const n = getRealEstateCount(answers);
    for (let i = 1; i <= n; i++) {
      const p = `property_${i}_`;
      const isPrimary = answers[`${p}type`] === 'Primary Residence';
      sections.push(`
        <div class="bb-page html2pdf__page-break">
          <h2>Bankruptcy (BB) Packet – Client Intake Page ${sections.length + 1} of 26</h2>
          <h3>Real Property ${isPrimary ? '– Primary Residence' : '(Other)'}</h3>
          <table class="bb-table"><tbody>
            <tr><td><strong>Property Type:</strong></td><td>${a(`${p}type`)}</td><td><strong>Fair Market Value:</strong></td><td>${a(`${p}value`)}</td></tr>
            <tr><td><strong>Address:</strong></td><td colspan="3">${a(`${p}address`)}</td></tr>
            <tr><td colspan="4"><strong>First Mortgage</strong></td></tr>
            <tr><td><strong>Mortgage Holder:</strong></td><td>${a(`${p}first_mortgage_holder`) || a(`${p}mortgage_details`)}</td><td><strong>Account No.:</strong></td><td>${a(`${p}first_mortgage_account`)}</td></tr>
            <tr><td><strong>Mailing Address:</strong></td><td colspan="3">${a(`${p}first_mortgage_address`)}</td></tr>
            <tr><td><strong>Monthly Payment:</strong></td><td>${a(`${p}first_mortgage_monthly`)}</td><td><strong>Balance Owed:</strong></td><td>${a(`${p}first_mortgage_balance`)}</td></tr>
            <tr><td><strong>Co-Debtor:</strong></td><td>${a(`${p}first_mortgage_co_debtor`)}</td><td><strong>Treatment:</strong></td><td>${a(`${p}first_mortgage_treatment`)}</td></tr>
            ${answers[`${p}second_mortgage`] === 'Yes' ? `
            <tr><td colspan="4"><strong>Second Mortgage</strong></td></tr>
            <tr><td><strong>Mortgage Holder:</strong></td><td>${a(`${p}second_mortgage_holder`)}</td><td><strong>Monthly Payment:</strong></td><td>${a(`${p}second_mortgage_monthly`)}</td></tr>
            <tr><td><strong>Balance Owed:</strong></td><td>${a(`${p}second_mortgage_balance`)}</td><td><strong>Treatment:</strong></td><td>${a(`${p}second_mortgage_treatment`)}</td></tr>
            ` : ''}
            <tr><td colspan="4"><strong>HOA / Association</strong></td></tr>
            <tr><td><strong>HOA Name / Details:</strong></td><td colspan="3">${a(`${p}hoa_details`)}</td></tr>
            <tr><td><strong>Arrearage:</strong></td><td>${a(`${p}hoa_arrearage`)}</td><td><strong>Collection Agency:</strong></td><td>${a(`${p}hoa_collection_agency`)}</td></tr>
          </tbody></table>
          <p class="bb-signature">Debtor Signature: _________________________ Date: _________</p>
        </div>
      `);
    }
  }

  // Page 4 — Cash and Deposits
  sections.push(`
    <div class="bb-page html2pdf__page-break">
      <h2>Bankruptcy (BB) Packet – Client Intake Page ${sections.length + 1} of 26</h2>
      <h3>Personal Property – Cash &amp; Deposits</h3>
      <p><strong>Cash on Hand Amount:</strong> ${a('cash_on_hand')}</p>
      <h4>Deposits of Money (Banks/Credit Unions)</h4>
      <table class="bb-table"><tbody>
        ${[1, 2, 3].map((i) => hasBankAccounts(answers) && getBankAccountCount(answers) >= i ? `
        <tr><td><strong>Bank #${i} Name:</strong></td><td>${a(`account_${i}_name`)}</td><td><strong>Account Type:</strong></td><td>${a(`account_${i}_balance`) ? 'Checking/Savings' : ''}</td></tr>
        <tr><td><strong>Address:</strong></td><td colspan="3">${a(`account_${i}_address`)}</td></tr>
        <tr><td><strong>Balance:</strong></td><td>${a(`account_${i}_balance`)}</td></tr>
        ` : '').join('')}
      </tbody></table>
      <p><strong>Security Deposits – Company / Person Holding:</strong> ${a('security_deposit_details')}</p>
      <p class="bb-signature">Debtor Signature: _________________________ Date: _________</p>
    </div>
  `);

  // Page 5 — Household
  sections.push(`
    <div class="bb-page html2pdf__page-break">
      <h2>Bankruptcy (BB) Packet – Client Intake Page ${sections.length + 1} of 26</h2>
      <h3>Personal Property – Household Furnishings</h3>
      <p>${a('household_property') ? `Grid/values: ${typeof answers['household_property'] === 'object' ? JSON.stringify(answers['household_property']) : a('household_property')}` : ''}</p>
      <p><strong>Total Fair Market Value:</strong> ${a('household_property_total')}</p>
      <p class="bb-signature">Debtor Signature: _________________________ Date: _________</p>
    </div>
  `);

  // Page 6 — Other Personal Property
  sections.push(`
    <div class="bb-page html2pdf__page-break">
      <h2>Bankruptcy (BB) Packet – Client Intake Page ${sections.length + 1} of 26</h2>
      <h3>Other Personal Property</h3>
      <p><strong>Valuables / Details:</strong> ${a('valuables_details')}</p>
      <p><strong>Financial Assets / Details:</strong> ${a('financial_assets_details')}</p>
      <p class="bb-signature">Debtor Signature: _________________________ Date: _________</p>
    </div>
  `);

  // Page 7–8 — Vehicles
  sections.push(`
    <div class="bb-page html2pdf__page-break">
      <h2>Bankruptcy (BB) Packet – Client Intake Page ${sections.length + 1} of 26</h2>
      <h3>Other Assets &amp; Vehicles</h3>
      ${hasVehicles(answers) ? `<table class="bb-table"><tbody>
        ${[1, 2, 3].map((i) => getVehicleCount(answers) >= i ? `
        <tr><td><strong>Vehicle #${i}:</strong></td><td>${a(`vehicle_${i}_details`)}</td><td><strong>Value:</strong></td><td>${a(`vehicle_${i}_value`)}</td></tr>
        <tr><td><strong>Loan Details:</strong></td><td colspan="3">${a(`vehicle_${i}_loan_details`)}</td></tr>
        <tr><td><strong>Treatment:</strong></td><td>${a(`vehicle_${i}_plan`)}</td></tr>
        ` : '').join('')}
      </tbody></table>` : '<p>No vehicles.</p>'}
      <p><strong>Pets:</strong> ${a('pets_description')}</p>
      <p class="bb-signature">Debtor Signature: _________________________ Date: _________</p>
    </div>
  `);

  // Secured / Priority / Unsecured (combined)
  sections.push(`
    <div class="bb-page html2pdf__page-break">
      <h2>Bankruptcy (BB) Packet – Client Intake Page ${sections.length + 1} of 26</h2>
      <h3>Secured Debts (Other Than Home/Auto)</h3>
      <p>${a('other_secured_details')}</p>
      <h3>Priority Claims &amp; Unsecured Debts</h3>
      <p><strong>Priority (Taxes, etc.):</strong> ${a('priority_debts_details')}</p>
      <p><strong>Unsecured Creditors:</strong> ${a('unsecured_creditors')}</p>
      ${[1, 2, 3, 4, 5].map((i) => answers[`unsecured_${i}_name`] ? `<p>Creditor ${i}: ${a(`unsecured_${i}_name`)} – ${a(`unsecured_${i}_balance`)} – ${a(`unsecured_${i}_notes`)}</p>` : '').join('')}
      <p class="bb-signature">Debtor Signature: _________________________ Date: _________</p>
    </div>
  `);

  // Income & Expenses
  const me = answers['monthly_expenses'];
  const housingExp = me && typeof me === 'object' && 'housing' in me ? (me as Record<string, string>)['housing'] ?? '' : '';
  sections.push(`
    <div class="bb-page html2pdf__page-break">
      <h2>Bankruptcy (BB) Packet – Client Intake Page ${sections.length + 1} of 26</h2>
      <h3>Income &amp; Expenses</h3>
      <p><strong>Marital Status:</strong> ${a('marital_status')} &nbsp; <strong>Dependents:</strong> ${a('dependents')}</p>
      <p><strong>Pay Frequency – Debtor:</strong> ${a('debtor_pay_frequency')} &nbsp; <strong>Joint:</strong> ${a('spouse_pay_frequency')}</p>
      <p><strong>Gross Wages (Debtor / Joint):</strong> ${a('debtor_gross_pay')} / ${a('spouse_gross_pay')}</p>
      <p><strong>Net Monthly Income / Anticipated Changes:</strong> ${a('income_breakdown_notes')} / ${a('income_anticipated_changes')}</p>
      <p><strong>Rent/Mortgage:</strong> ${housingExp}</p>
      <p><strong>Taxes &amp; Insurance Included?</strong> ${a('housing_taxes_insurance_included')}</p>
      <p><strong>Total Monthly Expenses:</strong> ${a('monthly_expenses_total')}</p>
      <p class="bb-signature">Debtor Signature: _________________________ Date: _________</p>
    </div>
  `);

  // Income History / SOFA
  sections.push(`
    <div class="bb-page html2pdf__page-break">
      <h2>Bankruptcy (BB) Packet – Client Intake Page ${sections.length + 1} of 26</h2>
      <h3>Statement of Financial Affairs – Income</h3>
      <p><strong>Income YTD / Last Year / 2 Years Ago (Debtor):</strong> ${a('income_current_ytd')} / ${a('income_last_year')} / ${a('income_two_years_ago')}</p>
      ${isJointFiling(answers) ? `<p><strong>Spouse YTD / Last Year / 2 Years Ago:</strong> ${a('spouse_income_ytd')} / ${a('spouse_income_last_year')} / ${a('spouse_income_two_years_ago')}</p>` : ''}
      <h3>Payments &amp; Legal Actions</h3>
      <p><strong>Payments to Creditors (90 days):</strong> ${a('payments_to_creditors_90_days')} ${a('paid_creditor_600_details')}</p>
      <p><strong>Lawsuits / Garnishments:</strong> ${a('lawsuits_garnishments_details')}</p>
      <p><strong>Repossessions / Foreclosures:</strong> ${a('repossession_foreclosure_details')}</p>
      <p><strong>Closed Accounts:</strong> ${a('closed_accounts_details')}</p>
      <p><strong>Gifts (2 years):</strong> ${a('gifts_last_2_years')}</p>
      <p><strong>Losses (1 year):</strong> ${a('losses_last_year')}</p>
      <p><strong>Debt Counseling:</strong> ${a('debt_counseling_payee')} – ${a('debt_counseling_dates_amounts')}</p>
      <p><strong>Safe Deposit Boxes:</strong> ${a('safe_deposit_boxes')}</p>
      <p><strong>Setoffs:</strong> ${a('setoffs')}</p>
      <p><strong>Property Held for Another:</strong> ${a('property_held_for_another')}</p>
      <p><strong>Prior Addresses (3 years):</strong> ${a('prior_addresses_3_years')}</p>
      <p class="bb-signature">Debtor Signature: _________________________ Date: _________</p>
    </div>
  `);

  // Business (if any)
  if (answers['self_employed'] === 'Yes') {
    sections.push(`
      <div class="bb-page html2pdf__page-break">
        <h2>Bankruptcy (BB) Packet – Client Intake Page ${sections.length + 1} of 26</h2>
        <h3>Business Information (Last 6 Years)</h3>
        <p><strong>Business Name / Type:</strong> ${a('business_name_type')}</p>
        <p><strong>Address:</strong> ${a('business_address')}</p>
        <p><strong>EIN:</strong> ${a('business_ein')} &nbsp; <strong>Dates:</strong> ${a('business_dates')}</p>
        <p><strong>Books/Records Location:</strong> ${a('business_books_records_location')}</p>
        <p><strong>Who Keeps:</strong> ${a('business_books_records_who')}</p>
        <p><strong>Inventories:</strong> ${a('business_inventories')}</p>
        <p><strong>Partners/Officers:</strong> ${a('business_partners_officers')}</p>
        <p><strong>Withdrawals/Distributions (2 years):</strong> ${a('business_withdrawals_distributions')}</p>
        <p class="bb-signature">Debtor Signature: _________________________ Date: _________</p>
      </div>
    `);
  }

  // Pad to at least 26 pages for consistent numbering
  const totalPages = 26;
  while (sections.length < totalPages) {
    sections.push(`
      <div class="bb-page html2pdf__page-break">
        <h2>Bankruptcy (BB) Packet – Client Intake Page ${sections.length + 1} of ${totalPages}</h2>
        <p><em>No additional data for this section.</em></p>
        <p class="bb-signature">Debtor Signature: _________________________ Date: _________</p>
      </div>
    `);
  }

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>BB Packet – Filled Client Intake</title>
  <style>
    body { font-family: Georgia, serif; font-size: 14pt; line-height: 1.5; color: #111; max-width: 8.5in; margin: 0 auto; padding: 0.5in; }
    .bb-page { break-after: page; page-break-after: always; margin-bottom: 1.25em; padding-bottom: 1.25em; border-bottom: 1px solid #ddd; }
    .bb-table { width: 100%; border-collapse: collapse; margin: 0.75em 0; font-size: 14pt; }
    .bb-table td { padding: 8px 14px; vertical-align: top; border: 1px solid #666; line-height: 1.5; }
    .bb-table strong { font-size: 14pt; }
    .bb-signature { margin-top: 1.25em; font-style: italic; font-size: 14pt; }
    .bb-intro { text-align: center; font-weight: bold; margin: 0 0 0.75em 0; font-size: 15pt; }
    h2 { font-size: 18pt; margin: 0 0 0.5em 0; font-weight: bold; }
    h3 { font-size: 16pt; margin: 0.6em 0 0.35em 0; font-weight: bold; }
    h4 { font-size: 15pt; margin: 0.4em 0; font-weight: bold; }
    p { margin: 0.5em 0; font-size: 14pt; }
    @media print {
      body { padding: 0; }
      .bb-page { break-after: page; border: none; page-break-after: always; }
      .bb-page:last-child { page-break-after: auto; }
    }
  </style>
</head>
<body>
  ${sections.slice(0, totalPages).join('\n')}
</body>
</html>`;

  return html;
}

/**
 * Generate BB Packet as a filled PDF from intake answers.
 * Builds HTML from answers then converts to PDF with html2pdf so the preview and download show client data.
 */
export function generateBBPacketPDF(answers: Answers): Promise<string | null> {
  const html = exportBBPacketHTML(answers);

  return new Promise<string | null>((resolve) => {
    const iframe = document.createElement('iframe');
    iframe.setAttribute('style', 'position:absolute;left:-9999px;width:816px;height:1056px;');
    document.body.appendChild(iframe);

    const cleanup = (): void => {
      try {
        if (iframe.parentNode) document.body.removeChild(iframe);
      } catch {
        /* ignore */
      }
    };

    const onLoad = (): void => {
      iframe.removeEventListener('load', onLoad);
      const doc = iframe.contentDocument;
      const body = doc?.body;
      if (!body) {
        cleanup();
        resolve(null);
        return;
      }

      import('html2pdf.js')
        .then(({ default: html2pdf }) => {
          html2pdf()
            .set({
              margin: 10,
              filename: 'BB-Packet-Filled.pdf',
              image: { type: 'jpeg', quality: 0.98 },
              html2canvas: { scale: 2, useCORS: true },
              jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
              pagebreak: { mode: ['css', 'legacy'], after: ['.bb-page'] },
            } as Record<string, unknown>)
            .from(body)
            .toPdf()
            .output('datauristring')
            .then((dataUri: string) => {
              cleanup();
              resolve(dataUri);
            })
            .catch(() => {
              cleanup();
              resolve(null);
            });
        })
        .catch(() => {
          cleanup();
          resolve(null);
        });
    };

    iframe.srcdoc = html;
    iframe.addEventListener('load', onLoad);
  });
}

