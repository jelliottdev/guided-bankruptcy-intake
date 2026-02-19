/**
 * Validation Engine - Multi-layer validation system for Form 101
 */

export type ValidationSeverity = 'blocker' | 'critical' | 'warning' | 'info';

export interface ValidationIssue {
    id: string;
    severity: ValidationSeverity;
    category: 'required_field' | 'cross_field' | 'document' | 'pdf_technical' | 'attorney' | 'jurisdiction';
    title: string;
    message: string;

    /** Field ID(s) related to this issue */
    fieldIds?: string[];

    /** Form question number (e.g., "Question 16") */
    formQuestion?: string;

    /** Legal requirement reference (e.g., "11 U.S.C. § 109(h)") */
    legalRequirement?: string;

    /** How to resolve this issue */
    resolution?: string;

    /** Can this be auto-fixed? */
    autoFixable?: boolean;
}

export interface ValidationResult {
    canFile: boolean;
    readinessLevel: 'not_ready' | 'needs_work' | 'ready_with_warnings' | 'court_ready';
    issues: ValidationIssue[];
    blockers: ValidationIssue[];
    critical: ValidationIssue[];
    warnings: ValidationIssue[];
    info: ValidationIssue[];
}

/**
 * Categorize validation issues by severity
 */
export function categorizeIssues(issues: ValidationIssue[]): Pick<ValidationResult, 'blockers' | 'critical' | 'warnings' | 'info'> {
    return {
        blockers: issues.filter(i => i.severity === 'blocker'),
        critical: issues.filter(i => i.severity === 'critical'),
        warnings: issues.filter(i => i.severity === 'warning'),
        info: issues.filter(i => i.severity === 'info'),
    };
}

/**
 * Determine readiness level from issues
 */
export function determineReadinessLevel(issues: ValidationIssue[]): ValidationResult['readinessLevel'] {
    const categorized = categorizeIssues(issues);

    if (categorized.blockers.length > 0) return 'not_ready';
    if (categorized.critical.length > 0) return 'needs_work';
    if (categorized.warnings.length > 0) return 'ready_with_warnings';
    return 'court_ready';
}

/**
 * Create a validation result from issues
 */
export function createValidationResult(issues: ValidationIssue[]): ValidationResult {
    const categorized = categorizeIssues(issues);
    const readinessLevel = determineReadinessLevel(issues);

    return {
        canFile: categorized.blockers.length === 0,
        readinessLevel,
        issues,
        ...categorized,
    };
}

/**
 * Merge multiple validation results
 */
export function mergeValidationResults(...results: ValidationResult[]): ValidationResult {
    const allIssues = results.flatMap(r => r.issues);
    // Remove duplicates by ID
    const uniqueIssues = Array.from(
        new Map(allIssues.map(issue => [issue.id, issue])).values()
    );
    return createValidationResult(uniqueIssues);
}
