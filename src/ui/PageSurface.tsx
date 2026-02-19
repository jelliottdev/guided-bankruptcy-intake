import { type ReactNode } from 'react';
import Sheet from '@mui/joy/Sheet';

export function PageSurface({ children, fill = false }: { children: ReactNode; fill?: boolean }) {
    return (
        <Sheet
            variant="plain" // changed from soft
            sx={{
                borderRadius: 'lg',
                bgcolor: 'background.body', // simpler background
                p: { xs: 0, md: 0 }, // remove default padding, let children handle it
                ...(fill
                    ? {
                        height: '100%',
                        minHeight: 0,
                        display: 'flex',
                        flexDirection: 'column',
                    }
                    : null),
            }}
        >
            {children}
        </Sheet>
    );
}
