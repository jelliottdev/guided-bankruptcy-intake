import { useEffect, useState, useRef } from 'react';
import Box from '@mui/joy/Box';
import Button from '@mui/joy/Button';
import Input from '@mui/joy/Input';
import Stack from '@mui/joy/Stack';
import IconButton from '@mui/joy/IconButton';
import Typography from '@mui/joy/Typography';
import Textarea from '@mui/joy/Textarea';

// Format: Creditor: Name | Balance: $123 | Account: 1234
const PARSE_RE = /^Creditor: (.*?) \| Balance: (.*?) \| Account: (.*)$/;

type CreditorItem = {
    id: string;
    name: string;
    balance: string;
    account: string;
};

interface CreditorInputProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
}

export function CreditorInput({ value, onChange, placeholder }: CreditorInputProps) {
    const [items, setItems] = useState<CreditorItem[]>([]);
    const [mode, setMode] = useState<'structured' | 'raw'>('structured');
    const [initialized, setInitialized] = useState(false);

    // Initialize state from prop once
    useEffect(() => {
        if (initialized) return;
        setInitialized(true);

        if (!value || !value.trim()) {
            setItems([]);
            setMode('structured');
            return;
        }

        const lines = value.split('\n');
        const parsed: CreditorItem[] = [];
        let allValid = true;

        for (const line of lines) {
            if (!line.trim()) continue;
            const match = line.match(PARSE_RE);
            if (match) {
                parsed.push({
                    id: Math.random().toString(36).slice(2, 9),
                    name: match[1],
                    balance: match[2],
                    account: match[3],
                });
            } else {
                allValid = false;
                break;
            }
        }

        if (allValid) {
            setItems(parsed);
            setMode('structured');
        } else {
            setMode('raw');
        }
    }, [value, initialized]);

    const updateTextFromItems = (currentItems: CreditorItem[]) => {
        const text = currentItems
            .map((item) => `Creditor: ${item.name.trim()} | Balance: ${item.balance.trim()} | Account: ${item.account.trim()}`)
            .join('\n');
        onChange(text);
    };

    const handleChange = (id: string, field: keyof CreditorItem, val: string) => {
        setItems((prev) => {
            const next = prev.map((item) => (item.id === id ? { ...item, [field]: val } : item));
            updateTextFromItems(next);
            return next;
        });
    };

    const handleAdd = () => {
        setItems((prev) => {
            const next = [...prev, { id: Math.random().toString(36).slice(2, 9), name: '', balance: '', account: '' }];
            updateTextFromItems(next);
            return next;
        });
    };

    const handleDelete = (id: string) => {
        setItems((prev) => {
            const next = prev.filter((item) => item.id !== id);
            updateTextFromItems(next);
            return next;
        });
    };

    if (mode === 'raw') {
        return (
            <Stack spacing={1}>
                <Textarea
                    minRows={3}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder={placeholder}
                />
                <Typography level="body-xs" sx={{ color: 'text.tertiary' }}>
                    Editing as raw text because the format didn't match the structured list.
                </Typography>
                <Button size="sm" variant="soft" color="danger" onClick={() => {
                    if (confirm('Verify you want to switch formats. Current text will be lost if you proceed.')) {
                        setItems([]);
                        setMode('structured');
                        onChange('');
                    }
                }}>
                    Switch to List View (Clear text)
                </Button>
            </Stack>
        );
    }

    return (
        <Stack spacing={1}>
            {items.map((item, index) => (
                <Stack key={item.id} direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems="flex-start">
                    <Input
                        size="sm"
                        placeholder="Creditor Name"
                        value={item.name}
                        onChange={(e) => handleChange(item.id, 'name', e.target.value)}
                        sx={{ flex: 2, minWidth: 0 }}
                    />
                    <Input
                        size="sm"
                        placeholder="Balance"
                        value={item.balance}
                        onChange={(e) => handleChange(item.id, 'balance', e.target.value)}
                        sx={{ flex: 1, minWidth: 0 }}
                    />
                    <Input
                        size="sm"
                        placeholder="Account #"
                        value={item.account}
                        onChange={(e) => handleChange(item.id, 'account', e.target.value)}
                        sx={{ flex: 1, minWidth: 0 }}
                    />
                    <IconButton size="sm" variant="plain" color="danger" onClick={() => handleDelete(item.id)}>
                        ✕
                    </IconButton>
                </Stack>
            ))}
            <Button size="sm" variant="soft" onClick={handleAdd} sx={{ alignSelf: 'flex-start' }}>
                + Add Creditor
            </Button>
        </Stack>
    );
}
