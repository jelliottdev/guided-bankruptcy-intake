import Box from '@mui/joy/Box';
import Typography from '@mui/joy/Typography';
import React from 'react';

type EmptyStateProps = {
    title: string;
    description?: string;
    icon?: React.ReactNode;
    action?: React.ReactNode;
    height?: number | string;
};

export function EmptyState({ title, description, icon, action, height = '100%' }: EmptyStateProps) {
    return (
        <Box
            sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                height,
                p: 3,
                textAlign: 'center',
                color: 'text.tertiary',
            }}
        >
            {icon && (
                <Box
                    sx={{
                        mb: 2,
                        opacity: 0.5,
                        color: 'inherit',
                        '& svg': { width: 48, height: 48, strokeWidth: 1.5 },
                    }}
                >
                    {icon}
                </Box>
            )}
            <Typography level="title-md" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                {title}
            </Typography>
            {description && (
                <Typography level="body-sm" sx={{ mt: 0.5, maxWidth: 300 }}>
                    {description}
                </Typography>
            )}
            {action && <Box sx={{ mt: 2 }}>{action}</Box>}
        </Box>
    );
}
