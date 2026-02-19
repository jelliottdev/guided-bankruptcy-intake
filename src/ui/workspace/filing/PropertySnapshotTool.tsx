import { useState } from 'react';
import { Stack, Button, Input, Card, Typography, CircularProgress, Alert, Divider, Grid } from '@mui/joy';
import { usePropertySnapshot } from '../../../hooks/usePropertySnapshot';

import type { PropertyReport } from '../../../api/attom';

export interface PropertySnapshotToolProps {
    onSaveToCase?: (report: PropertyReport) => void;
}

export function PropertySnapshotTool({ onSaveToCase }: PropertySnapshotToolProps) {
    const [address, setAddress] = useState('');
    const { loading, error, report, fetchReport } = usePropertySnapshot();

    const handleGenerate = () => {
        if (address) {
            fetchReport(address);
        }
    };

    const formatCurrency = (val: number | undefined | null) => {
        if (val === null || val === undefined) return 'N/A';
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val);
    };

    return (
        <Stack spacing={2} sx={{ p: 2 }}>
            <Typography level="title-md">Property Snapshot (ATTOM)</Typography>

            <Stack direction="row" spacing={1}>
                <Input
                    placeholder="Enter full property address"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    fullWidth
                    disabled={loading}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') handleGenerate();
                    }}
                />
                <Button onClick={handleGenerate} disabled={loading || !address}>
                    {loading ? <CircularProgress size="sm" /> : 'Search'}
                </Button>
            </Stack>

            {error && (
                <Alert color="danger" size="sm">{error}</Alert>
            )}

            {report && (
                <Card variant="outlined" sx={{ overflow: 'auto', maxHeight: '600px' }}>
                    <Stack spacing={2}>
                        <Typography level="title-lg">{report.address}</Typography>
                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                            <Stack direction="row" spacing={1} alignItems="center">
                                <Typography level="body-xs">ATTOM ID: {report.attom_id}</Typography>
                                {report.profile?.zoning && <Typography level="body-xs">Zoning: {report.profile.zoning}</Typography>}
                            </Stack>
                            {onSaveToCase && (
                                <Button
                                    size="sm"
                                    variant="soft"
                                    color="primary"
                                    onClick={() => onSaveToCase(report)}
                                >
                                    Save to Case
                                </Button>
                            )}
                        </Stack>
                        <Divider />

                        <Grid container spacing={2}>
                            <Grid xs={12} md={6}>
                                <Typography level="title-sm">Valuation (AVM)</Typography>
                                <Typography level="h4">{formatCurrency(report.valuation?.value)}</Typography>
                                {report.valuation && (
                                    <>
                                        <Typography level="body-xs">
                                            Range: {formatCurrency(report.valuation.low)} - {formatCurrency(report.valuation.high)}
                                        </Typography>
                                        <Typography level="body-xs">
                                            Confidence: {report.valuation.confidence_score ?? 'N/A'} (FSD: {report.valuation.fsd ?? 'N/A'})
                                        </Typography>
                                        <Typography level="body-xs" textColor="neutral.500">
                                            Date: {report.valuation.date ? new Date(report.valuation.date).toLocaleDateString() : 'N/A'}
                                        </Typography>
                                    </>
                                )}
                            </Grid>

                            <Grid xs={12} md={6}>
                                <Typography level="title-sm">Tax Assessment</Typography>
                                <Typography level="h4">{formatCurrency(report.assessment?.total_assessed_value)}</Typography>
                                {report.assessment ? (
                                    <>
                                        <Typography level="body-xs">Tax Year: {report.assessment.tax_year}</Typography>
                                        <Typography level="body-xs">Tax Amount: {formatCurrency(report.assessment.tax_amount)}</Typography>
                                        <Typography level="body-xs">Market Value: {formatCurrency(report.assessment.market_value)}</Typography>
                                    </>
                                ) : (
                                    <Typography level="body-xs" textColor="neutral.500">No assessment data</Typography>
                                )}
                            </Grid>

                            <Grid xs={12} md={6}>
                                <Typography level="title-sm">Sales History</Typography>
                                {report.sales_history && report.sales_history.length > 0 ? (
                                    <Stack spacing={0.5}>
                                        {report.sales_history.map((sale, idx) => (
                                            <Stack key={idx} direction="row" justifyContent="space-between">
                                                <Typography level="body-xs">{sale.last_sale_date}</Typography>
                                                <Typography level="body-xs" fontWeight="bold">{formatCurrency(sale.last_sale_amount)}</Typography>
                                            </Stack>
                                        ))}
                                    </Stack>
                                ) : (
                                    <Typography level="body-xs" textColor="neutral.500">No sales history</Typography>
                                )}
                            </Grid>

                            <Grid xs={12} md={6}>
                                <Typography level="title-sm">Mortgage Record</Typography>
                                <Typography level="h4">{formatCurrency(report.mortgage?.amount)}</Typography>
                                {report.mortgage ? (
                                    <>
                                        <Typography level="body-sm">{report.mortgage.lender?.name || 'Unknown Lender'}</Typography>
                                        <Typography level="body-xs">Date: {report.mortgage.date || 'N/A'}</Typography>
                                    </>
                                ) : (
                                    <Typography level="body-xs">No mortgage record found/simulated</Typography>
                                )}
                            </Grid>

                            <Grid xs={12} md={6}>
                                <Typography level="title-sm">Equity (Est.)</Typography>
                                <Typography level="h4" color={(report.equity?.estimated_value ?? 0) > 0 ? 'success' : 'danger'}>
                                    {formatCurrency(report.equity?.estimated_value)}
                                </Typography>
                            </Grid>

                            <Grid xs={12} md={6}>
                                <Typography level="title-sm">Foreclosure Status</Typography>
                                <Typography level="body-sm" color={report.foreclosure?.status === 'Active' ? 'danger' : 'neutral'}>
                                    {report.foreclosure?.status || 'None'}
                                </Typography>
                                {report.foreclosure?.details && <Typography level="body-xs">{report.foreclosure.details}</Typography>}
                            </Grid>

                            <Grid xs={12} md={6}>
                                <Typography level="title-sm">Ownership</Typography>
                                <Typography level="body-sm">{report.owner?.formatted_string ?? 'Unknown'}</Typography>
                                {report.owner?.mailing_address && (
                                    <Typography level="body-xs">Mailing: {report.owner.mailing_address}</Typography>
                                )}
                            </Grid>

                            <Grid xs={12}>
                                <Divider />
                                <Typography level="title-sm" sx={{ mt: 1 }}>Property Details</Typography>
                                <Stack direction="row" spacing={2} flexWrap="wrap">
                                    <Typography level="body-sm">Type: {report.profile?.type ?? 'N/A'}</Typography>
                                    <Typography level="body-sm">Built: {report.profile?.year_built ?? 'N/A'}</Typography>
                                    <Typography level="body-sm">SqFt: {report.profile?.sqft ?? 'N/A'}</Typography>
                                    <Typography level="body-sm">Lot SqFt: {report.profile?.lot_sqft ?? 'N/A'}</Typography>
                                    <Typography level="body-sm">Beds/Baths: {report.profile?.beds ?? 0}/{report.profile?.baths ?? 0}</Typography>
                                </Stack>
                            </Grid>
                        </Grid>
                    </Stack>
                </Card>
            )
            }
        </Stack >
    );
}
