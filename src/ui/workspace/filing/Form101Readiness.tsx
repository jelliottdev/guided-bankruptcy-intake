/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMemo, useState } from 'react';
import Box from '@mui/joy/Box';
import Button from '@mui/joy/Button';
import CircularProgress from '@mui/joy/CircularProgress';
import List from '@mui/joy/List';
import ListItem from '@mui/joy/ListItem';
import ListItemContent from '@mui/joy/ListItemContent';
import Sheet from '@mui/joy/Sheet';
import Stack from '@mui/joy/Stack';
import Typography from '@mui/joy/Typography';

import type { Answers } from '../../../form/types';
import { validateForm101 } from '../../../export/form101Validator';

function CheckCircleIcon({ color }: { color: string }) {
    return (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color }}>
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
        </svg>
    );
}

function WarningIcon({ color }: { color: string }) {
    return (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color }}>
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
    );
}

function ChevronDown() {
    return (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 12 15 18 9" />
        </svg>
    );
}

function ChevronUp() {
    return (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="18 15 12 9 6 15" />
        </svg>
    );
}

interface Form101ReadinessProps {
    answers: Answers;
    uploadedFilesByFieldId?: Record<string, any[]>; // Files uploaded to intake form
    onOpenIntakeToField: (fieldId: string) => void;
}

export function Form101Readiness({ answers, uploadedFilesByFieldId, onOpenIntakeToField }: Form101ReadinessProps) {
    const [expanded, setExpanded] = useState(false);
    const validation = useMemo(() => validateForm101(answers, uploadedFilesByFieldId), [answers, uploadedFilesByFieldId]);
    const criticalCount = validation.issues.filter((i) => i.severity === 'critical').length;
    const warningCount = validation.issues.filter((i) => i.severity === 'warning').length;
    const totalIssues = criticalCount + warningCount;

    const statusColor = criticalCount > 0 ? 'danger' : warningCount > 0 ? 'warning' : 'success';
    const statusLabel = criticalCount > 0 ? 'Not Ready' : warningCount > 0 ? 'Ready with Warnings' : 'Court Ready';

    return (
        <Sheet
            variant="soft"
            color={statusColor}
            sx={{
                p: 1.5,
                borderRadius: 'md',
                border: '1px solid',
                borderColor: `${statusColor}.outlinedBorder`,
                transition: 'all 0.2s',
            }}
        >
            <Box
                sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}
                onClick={() => setExpanded(!expanded)}
            >
                <Stack direction="row" spacing={1.5} alignItems="center">
                    <CircularProgress
                        determinate
                        value={totalIssues === 0 ? 100 : Math.max(5, 100 - totalIssues * 10)} // Rough progress
                        size="md"
                        color={statusColor}
                        variant="solid"
                        thickness={8}
                    >
                        {totalIssues === 0 ? <CheckCircleIcon color="var(--joy-palette-success-500)" /> : <WarningIcon color={`var(--joy-palette-${statusColor}-500)`} />}
                    </CircularProgress>
                    <Box>
                        <Typography level="title-sm" fontWeight="800">
                            Form 101 Readiness
                        </Typography>
                        <Typography level="body-xs" sx={{ color: 'text.secondary' }}>
                            {statusLabel} · {totalIssues} issue{totalIssues === 1 ? '' : 's'}
                        </Typography>
                    </Box>
                </Stack>
                {expanded ? <ChevronUp /> : <ChevronDown />}
            </Box>

            {expanded && totalIssues > 0 && (
                <List size="sm" sx={{ mt: 1.5, '--ListItem-paddingX': 0 }}>
                    {validation.issues.map((issue) => (
                        <ListItem key={issue.id} sx={{ alignItems: 'flex-start' }}>
                            <ListItemContent>
                                <Typography level="title-sm">{issue.label}</Typography>
                                <Typography level="body-xs" sx={{ color: 'text.secondary' }}>
                                    {issue.message}
                                </Typography>
                            </ListItemContent>
                            <Button
                                size="sm"
                                variant="outlined"
                                color={issue.severity === 'critical' ? 'danger' : 'warning'}
                                onClick={() => onOpenIntakeToField(issue.fieldId)}
                            >
                                Fix
                            </Button>
                        </ListItem>
                    ))}
                </List>
            )}

            {expanded && totalIssues === 0 && (
                <Box sx={{ mt: 1.5 }}>
                    <Typography level="body-sm" color="success">
                        All data points for Form 101 are present. You can generate the PDF with confidence.
                    </Typography>
                </Box>
            )}
        </Sheet>
    );
}
