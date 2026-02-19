import Box from '@mui/joy/Box';
import Button from '@mui/joy/Button';
import Textarea from '@mui/joy/Textarea';

interface AttorneyMessageInputProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  onSend: () => void;
}

export function AttorneyMessageInput({ value, onChange, disabled, onSend }: AttorneyMessageInputProps) {
  return (
    <Box sx={{ mt: 1.5, display: 'grid', gap: 1 }}>
      <Textarea
        minRows={2}
        maxRows={5}
        placeholder="Type a message to client..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
        <Button size="sm" variant="solid" disabled={disabled} onClick={onSend}>
          Send
        </Button>
      </Box>
    </Box>
  );
}
