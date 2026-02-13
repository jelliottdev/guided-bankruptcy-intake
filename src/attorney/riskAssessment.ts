/**
 * Risk assessment: trustee scrutiny score, dismissal risk factors, fraud indicators.
 * Heuristic-based for attorney awareness; not legal advice.
 */
import type { Answers } from '../form/types';
import { runExemptionAnalysis } from './exemptions';
import { runMeansTest } from './meansTest';
import { hasRealEstate, hasVehicles } from '../utils/logic';

export type RiskFactor = {
  id: string;
  label: string;
  severity: 'low' | 'medium' | 'high';
  note: string;
};

export interface RiskAssessmentResult {
  trusteeScrutinyScore: number;
  dismissalRiskFactors: RiskFactor[];
  fraudIndicators: RiskFactor[];
  timelineRisk: RiskFactor[];
  recommendations: string[];
}

/**
 * Compute a 0-100 trustee scrutiny score (higher = more likely to draw scrutiny).
 */
export function computeRiskAssessment(
  answers: Answers,
  missingRequiredCount: number,
  docMissingCount: number,
  urgencyCount: number,
  stateOverride?: string
): RiskAssessmentResult {
  const dismissalRiskFactors: RiskFactor[] = [];
  const fraudIndicators: RiskFactor[] = [];
  const timelineRisk: RiskFactor[] = [];
  const recommendations: string[] = [];
  let score = 0;

  if (missingRequiredCount > 5) {
    dismissalRiskFactors.push({
      id: 'missing-required',
      label: 'Many required fields missing',
      severity: 'high',
      note: `${missingRequiredCount} required answers missing; petition may be incomplete.`,
    });
    score += 25;
  } else if (missingRequiredCount > 0) {
    dismissalRiskFactors.push({
      id: 'missing-required',
      label: 'Some required fields missing',
      severity: 'medium',
      note: `${missingRequiredCount} required answers missing.`,
    });
    score += 10;
  }

  if (docMissingCount >= 4) {
    dismissalRiskFactors.push({
      id: 'docs-missing',
      label: 'Multiple document categories missing',
      severity: 'high',
      note: 'Trustee may request documents to verify income and assets.',
    });
    score += 15;
  } else if (docMissingCount > 0) {
    score += 5;
  }

  if (urgencyCount > 0) {
    timelineRisk.push({
      id: 'urgency',
      label: 'Urgency items reported',
      severity: urgencyCount >= 2 ? 'high' : 'medium',
      note: 'Garnishment, foreclosure, or other urgency — file promptly and ensure accuracy.',
    });
    score += 10;
  }

  const meansResult = runMeansTest(answers, stateOverride);
  if (meansResult.pass === false) {
    dismissalRiskFactors.push({
      id: 'above-median',
      label: 'Income above median',
      severity: 'medium',
      note: 'Means test second part (disposable income) may apply; Chapter 13 or presumption of abuse.',
    });
    score += 15;
  }

  const exemptionResult = runExemptionAnalysis(answers, stateOverride || 'federal');
  if (exemptionResult.totalNonExempt > 5000) {
    dismissalRiskFactors.push({
      id: 'non-exempt-assets',
      label: 'Significant non-exempt assets',
      severity: 'high',
      note: `Approx. ${exemptionResult.totalNonExempt.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })} non-exempt — trustee may seek to administer.`,
    });
    score += 20;
  } else if (exemptionResult.totalNonExempt > 0) {
    score += 5;
  }

  const hasRealEstateVal = hasRealEstate(answers);
  const hasVehiclesVal = hasVehicles(answers);
  if (hasRealEstateVal || hasVehiclesVal) {
    score += 5;
  }

  const recentTransfers = answers['recent_transfers'];
  const transferText = typeof recentTransfers === 'string' ? (recentTransfers as string).toLowerCase() : '';
  if (transferText && (transferText.includes('yes') || transferText.includes('large') || transferText.includes('$'))) {
    fraudIndicators.push({
      id: 'recent-transfers',
      label: 'Recent transfers reported',
      severity: 'medium',
      note: 'Review for avoidable transfers; trustee may scrutinize.',
    });
    score += 15;
  }

  const lawsuits = answers['pending_lawsuits'];
  const lawsuitText = typeof lawsuits === 'string' ? (lawsuits as string).toLowerCase() : '';
  if (lawsuitText && lawsuitText.trim().length > 10) {
    timelineRisk.push({
      id: 'lawsuits',
      label: 'Pending lawsuits',
      severity: 'medium',
      note: 'List all pending litigation on petition.',
    });
  }

  if (score > 0 && missingRequiredCount > 0) {
    recommendations.push('Complete all required fields before filing.');
  }
  if (docMissingCount > 0) {
    recommendations.push('Collect and upload missing documents to support income and assets.');
  }
  if (meansResult.pass === false) {
    recommendations.push('Review means test and consider Chapter 13 or rebuttal if filing Chapter 7.');
  }
  if (exemptionResult.totalNonExempt > 0) {
    recommendations.push('Confirm exemption strategy for non-exempt assets with attorney.');
  }
  if (urgencyCount > 0) {
    recommendations.push('Address urgency items (garnishment, foreclosure) with filing timeline.');
  }

  const trusteeScrutinyScore = Math.min(100, Math.round(score));

  return {
    trusteeScrutinyScore,
    dismissalRiskFactors,
    fraudIndicators,
    timelineRisk,
    recommendations,
  };
}
