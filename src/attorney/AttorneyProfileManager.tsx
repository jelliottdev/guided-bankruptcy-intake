/**
 * Attorney Profile Manager - UI for configuring attorney information
 */

import { useState } from 'react';
import {
    Box,
    Button,
    FormControl,
    FormLabel,
    Input,
    Select,
    Option,
    Stack,
    Typography,
    Sheet,
    Alert,
    Chip,
} from '@mui/joy';
import { CheckCircle, AlertCircle, Save, X } from 'lucide-react';
import type { AttorneyProfile, USState, BankruptcyDistrict } from '../types/AttorneyProfile';
import { validateAttorneyProfile } from '../types/AttorneyProfile';
import {
    loadAttorneyProfile,
    saveAttorneyProfile,
    getDemoAttorneyProfile,
} from '../store/attorneyProfileStore';

const US_STATES: USState[] = [
    'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
    'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
    'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
    'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
    'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY', 'DC',
];

const FLORIDA_DISTRICTS: { value: BankruptcyDistrict; label: string }[] = [
    { value: 'flnd', label: 'Northern District of Florida' },
    { value: 'flmd', label: 'Middle District of Florida' },
    { value: 'flsd', label: 'Southern District of Florida' },
];

interface AttorneyProfileManagerProps {
    onClose?: () => void;
    onSave?: (profile: AttorneyProfile) => void;
}

export function AttorneyProfileManager({ onClose, onSave }: AttorneyProfileManagerProps) {
    const [profile, setProfile] = useState<Partial<AttorneyProfile>>(() => {
        const loaded = loadAttorneyProfile();
        return loaded ?? {};
    });

    const [showValidation, setShowValidation] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);

    const validation = validateAttorneyProfile(profile);

    const handleSave = () => {
        setShowValidation(true);
        if (!validation.isValid) return;

        const completeProfile = profile as AttorneyProfile;
        saveAttorneyProfile(completeProfile);
        setSaveSuccess(true);
        onSave?.(completeProfile);

        setTimeout(() => {
            setSaveSuccess(false);
            onClose?.();
        }, 1500);
    };

    const handleLoadDemo = () => {
        setProfile(getDemoAttorneyProfile());
        setShowValidation(false);
    };

    const updateField = <K extends keyof AttorneyProfile>(field: K, value: AttorneyProfile[K]) => {
        setProfile(prev => ({ ...prev, [field]: value }));
        setSaveSuccess(false);
    };

    const toggleDistrict = (district: BankruptcyDistrict) => {
        setProfile(prev => {
            const current = prev.admittedDistricts ?? [];
            const updated = current.includes(district)
                ? current.filter(d => d !== district)
                : [...current, district];
            return { ...prev, admittedDistricts: updated };
        });
    };

    const getFieldError = (field: keyof AttorneyProfile) => {
        if (!showValidation) return null;
        return validation.errors.find(e => e.field === field)?.message;
    };

    return (
        <Stack spacing={2} sx={{ p: 2, maxWidth: 600, mx: 'auto' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Typography level="h3">Attorney Profile</Typography>
                {onClose && (
                    <Button variant="plain" size="sm" onClick={onClose}>
                        <X size={18} />
                    </Button>
                )}
            </Box>

            {saveSuccess && (
                <Alert color="success" startDecorator={<CheckCircle size={18} />}>
                    Profile saved successfully!
                </Alert>
            )}

            {showValidation && !validation.isValid && (
                <Alert color="danger" startDecorator={<AlertCircle size={18} />}>
                    Please fix validation errors before saving.
                </Alert>
            )}

            <Sheet variant="outlined" sx={{ p: 2, borderRadius: 'sm' }}>
                <Stack spacing={2}>
                    <Typography level="title-sm" sx={{ mb: 1 }}>
                        Attorney Information
                    </Typography>

                    <FormControl error={Boolean(getFieldError('name'))}>
                        <FormLabel>Full Name *</FormLabel>
                        <Input
                            value={profile.name ?? ''}
                            onChange={e => updateField('name', e.target.value)}
                            placeholder="Jane Smith"
                        />
                        {getFieldError('name') && (
                            <Typography level="body-xs" color="danger">{getFieldError('name')}</Typography>
                        )}
                    </FormControl>

                    <FormControl error={Boolean(getFieldError('firmName'))}>
                        <FormLabel>Law Firm / Practice Name *</FormLabel>
                        <Input
                            value={profile.firmName ?? ''}
                            onChange={e => updateField('firmName', e.target.value)}
                            placeholder="Smith & Associates"
                        />
                        {getFieldError('firmName') && (
                            <Typography level="body-xs" color="danger">{getFieldError('firmName')}</Typography>
                        )}
                    </FormControl>

                    <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                        <FormControl error={Boolean(getFieldError('barNumber'))}>
                            <FormLabel>Bar Number *</FormLabel>
                            <Input
                                value={profile.barNumber ?? ''}
                                onChange={e => updateField('barNumber', e.target.value)}
                                placeholder="12345678"
                            />
                            {getFieldError('barNumber') && (
                                <Typography level="body-xs" color="danger">{getFieldError('barNumber')}</Typography>
                            )}
                        </FormControl>

                        <FormControl error={Boolean(getFieldError('barState'))}>
                            <FormLabel>Bar State *</FormLabel>
                            <Select
                                value={profile.barState ?? undefined}
                                onChange={(_, value) => updateField('barState', value as USState)}
                                placeholder="Select state"
                            >
                                {US_STATES.map(state => (
                                    <Option key={state} value={state}>{state}</Option>
                                ))}
                            </Select>
                            {getFieldError('barState') && (
                                <Typography level="body-xs" color="danger">{getFieldError('barState')}</Typography>
                            )}
                        </FormControl>
                    </Box>

                    <FormControl error={Boolean(getFieldError('email'))}>
                        <FormLabel>Email *</FormLabel>
                        <Input
                            type="email"
                            value={profile.email ?? ''}
                            onChange={e => updateField('email', e.target.value)}
                            placeholder="attorney@lawfirm.com"
                        />
                        {getFieldError('email') && (
                            <Typography level="body-xs" color="danger">{getFieldError('email')}</Typography>
                        )}
                    </FormControl>

                    <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                        <FormControl error={Boolean(getFieldError('phone'))}>
                            <FormLabel>Phone *</FormLabel>
                            <Input
                                value={profile.phone ?? ''}
                                onChange={e => updateField('phone', e.target.value)}
                                placeholder="(555) 123-4567"
                            />
                            {getFieldError('phone') && (
                                <Typography level="body-xs" color="danger">{getFieldError('phone')}</Typography>
                            )}
                        </FormControl>

                        <FormControl error={Boolean(getFieldError('fax'))}>
                            <FormLabel>Fax (Optional)</FormLabel>
                            <Input
                                value={profile.fax ?? ''}
                                onChange={e => updateField('fax', e.target.value)}
                                placeholder="(555) 123-4568"
                            />
                        </FormControl>
                    </Box>

                    <Typography level="title-sm" sx={{ mt: 2, mb: 1 }}>
                        Office Address
                    </Typography>

                    <FormControl error={Boolean(getFieldError('address'))}>
                        <FormLabel>Street Address *</FormLabel>
                        <Input
                            value={profile.address ?? ''}
                            onChange={e => updateField('address', e.target.value)}
                            placeholder="123 Main Street, Suite 100"
                        />
                        {getFieldError('address') && (
                            <Typography level="body-xs" color="danger">{getFieldError('address')}</Typography>
                        )}
                    </FormControl>

                    <Box sx={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 2 }}>
                        <FormControl error={Boolean(getFieldError('city'))}>
                            <FormLabel>City *</FormLabel>
                            <Input
                                value={profile.city ?? ''}
                                onChange={e => updateField('city', e.target.value)}
                                placeholder="Orlando"
                            />
                            {getFieldError('city') && (
                                <Typography level="body-xs" color="danger">{getFieldError('city')}</Typography>
                            )}
                        </FormControl>

                        <FormControl error={Boolean(getFieldError('state'))}>
                            <FormLabel>State *</FormLabel>
                            <Select
                                value={profile.state ?? undefined}
                                onChange={(_, value) => updateField('state', value as USState)}
                                placeholder="FL"
                            >
                                {US_STATES.map(state => (
                                    <Option key={state} value={state}>{state}</Option>
                                ))}
                            </Select>
                            {getFieldError('state') && (
                                <Typography level="body-xs" color="danger">{getFieldError('state')}</Typography>
                            )}
                        </FormControl>

                        <FormControl error={Boolean(getFieldError('zip'))}>
                            <FormLabel>ZIP *</FormLabel>
                            <Input
                                value={profile.zip ?? ''}
                                onChange={e => updateField('zip', e.target.value)}
                                placeholder="32801"
                            />
                            {getFieldError('zip') && (
                                <Typography level="body-xs" color="danger">{getFieldError('zip')}</Typography>
                            )}
                        </FormControl>
                    </Box>

                    <Typography level="title-sm" sx={{ mt: 2, mb: 1 }}>
                        Admitted Districts *
                    </Typography>

                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                        {FLORIDA_DISTRICTS.map(district => {
                            const isSelected = profile.admittedDistricts?.includes(district.value) ?? false;
                            return (
                                <Chip
                                    key={district.value}
                                    variant={isSelected ? 'solid' : 'outlined'}
                                    color={isSelected ? 'primary' : 'neutral'}
                                    onClick={() => toggleDistrict(district.value)}
                                    sx={{ cursor: 'pointer' }}
                                >
                                    {district.label}
                                </Chip>
                            );
                        })}
                    </Box>
                    {getFieldError('admittedDistricts') && (
                        <Typography level="body-xs" color="danger">{getFieldError('admittedDistricts')}</Typography>
                    )}
                </Stack>
            </Sheet>

            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                <Button variant="outlined" onClick={handleLoadDemo}>
                    Load Demo Profile
                </Button>
                <Button
                    color="primary"
                    startDecorator={validation.isValid ? <CheckCircle size={18} /> : <Save size={18} />}
                    onClick={handleSave}
                >
                    {validation.isValid ? 'Save Profile' : 'Save (Fix Errors First)'}
                </Button>
            </Box>
        </Stack>
    );
}
