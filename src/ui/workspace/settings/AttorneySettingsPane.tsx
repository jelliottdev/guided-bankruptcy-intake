import { useEffect, useState } from 'react';
import Box from '@mui/joy/Box';
import Button from '@mui/joy/Button';
import FormControl from '@mui/joy/FormControl';
import FormLabel from '@mui/joy/FormLabel';
import Input from '@mui/joy/Input';
import Stack from '@mui/joy/Stack';
import Typography from '@mui/joy/Typography';
import Sheet from '@mui/joy/Sheet';
import { PageSurface } from '../../PageSurface';
import {
    type AttorneyProfile,
    loadAttorneyProfile,
    saveAttorneyProfile
} from '../../../attorney/attorneyProfile';

export function AttorneySettingsPane() {
    const [profile, setProfile] = useState<AttorneyProfile>(loadAttorneyProfile);
    const [dirty, setDirty] = useState(false);
    const [saved, setSaved] = useState(false);

    const handleChange = (field: keyof AttorneyProfile, value: string) => {
        setProfile((prev) => ({ ...prev, [field]: value }));
        setDirty(true);
        setSaved(false);
    };

    const handleSave = () => {
        saveAttorneyProfile(profile);
        setDirty(false);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
    };

    return (
        <Box sx={{ maxWidth: 800, mx: 'auto', p: 2 }}>
            <PageSurface>
                <Stack spacing={3}>
                    <Box>
                        <Typography level="title-lg">Attorney Settings</Typography>
                        <Typography level="body-sm" sx={{ color: 'text.tertiary' }}>
                            Manage your firm details for court forms and correspondence.
                        </Typography>
                    </Box>

                    <Sheet variant="outlined" sx={{ borderRadius: 'md', p: 2 }}>
                        <Stack spacing={2}>
                            <Typography level="title-sm">Profile Information</Typography>

                            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                                <FormControl sx={{ flex: 2 }}>
                                    <FormLabel>Full Name</FormLabel>
                                    <Input
                                        value={profile.name}
                                        onChange={(e) => handleChange('name', e.target.value)}
                                        placeholder="e.g. Saul Goodman"
                                    />
                                </FormControl>
                                <FormControl sx={{ flex: 1 }}>
                                    <FormLabel>Bar Number</FormLabel>
                                    <Input
                                        value={profile.barNumber}
                                        onChange={(e) => handleChange('barNumber', e.target.value)}
                                        placeholder="e.g. 1234567"
                                    />
                                </FormControl>
                                <FormControl sx={{ flex: 1 }}>
                                    <FormLabel>Bar State</FormLabel>
                                    <Input
                                        value={profile.barState}
                                        onChange={(e) => handleChange('barState', e.target.value)}
                                        placeholder="e.g. NM"
                                    />
                                </FormControl>
                            </Stack>

                            <FormControl>
                                <FormLabel>Firm Name</FormLabel>
                                <Input
                                    value={profile.firmName}
                                    onChange={(e) => handleChange('firmName', e.target.value)}
                                    placeholder="e.g. Better Call Saul Law"
                                />
                            </FormControl>

                            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                                <FormControl sx={{ flex: 1 }}>
                                    <FormLabel>Email</FormLabel>
                                    <Input
                                        value={profile.email}
                                        onChange={(e) => handleChange('email', e.target.value)}
                                        placeholder="attorney@example.com"
                                    />
                                </FormControl>
                                <FormControl sx={{ flex: 1 }}>
                                    <FormLabel>Phone</FormLabel>
                                    <Input
                                        value={profile.phone}
                                        onChange={(e) => handleChange('phone', e.target.value)}
                                        placeholder="(555) 555-5555"
                                    />
                                </FormControl>
                            </Stack>
                        </Stack>
                    </Sheet>

                    <Sheet variant="outlined" sx={{ borderRadius: 'md', p: 2 }}>
                        <Stack spacing={2}>
                            <Typography level="title-sm">Address</Typography>

                            <FormControl>
                                <FormLabel>Street Address</FormLabel>
                                <Input
                                    value={profile.street}
                                    onChange={(e) => handleChange('street', e.target.value)}
                                    placeholder="123 Legal Way"
                                />
                            </FormControl>

                            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                                <FormControl sx={{ flex: 2 }}>
                                    <FormLabel>City</FormLabel>
                                    <Input
                                        value={profile.city}
                                        onChange={(e) => handleChange('city', e.target.value)}
                                        placeholder="Albuquerque"
                                    />
                                </FormControl>
                                <FormControl sx={{ flex: 1 }}>
                                    <FormLabel>State</FormLabel>
                                    <Input
                                        value={profile.state}
                                        onChange={(e) => handleChange('state', e.target.value)}
                                        placeholder="NM"
                                    />
                                </FormControl>
                                <FormControl sx={{ flex: 1 }}>
                                    <FormLabel>ZIP</FormLabel>
                                    <Input
                                        value={profile.zip}
                                        onChange={(e) => handleChange('zip', e.target.value)}
                                        placeholder="87102"
                                    />
                                </FormControl>
                            </Stack>
                        </Stack>
                    </Sheet>

                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, alignItems: 'center' }}>
                        {saved && (
                            <Typography level="body-sm" color="success">
                                Saved successfully
                            </Typography>
                        )}
                        <Button
                            size="lg"
                            onClick={handleSave}
                            disabled={!dirty}
                        >
                            Save Changes
                        </Button>
                    </Box>
                </Stack>
            </PageSurface>
        </Box>
    );
}
