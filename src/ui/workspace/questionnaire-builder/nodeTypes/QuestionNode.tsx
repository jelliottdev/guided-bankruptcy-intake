import { memo, useEffect, useState, type MouseEvent } from 'react';
import type { NodeProps } from '@xyflow/react';
import Box from '@mui/joy/Box';
import Button from '@mui/joy/Button';
import Input from '@mui/joy/Input';
import Option from '@mui/joy/Option';
import Select from '@mui/joy/Select';
import Stack from '@mui/joy/Stack';
import Typography from '@mui/joy/Typography';
import type { QuestionInputType, QuestionnaireNode } from '../../../../questionnaires/types';
import { BaseNodeCard } from './BaseNodeCard';

type QuestionNodeData = {
  id?: string;
  title?: string;
  labels?: string[];
  inputType?: QuestionInputType;
  required?: boolean;
  showHandles?: boolean;
  canvasMode?: 'smart' | 'full';
  onPatchNode?: (nodeId: string, patch: Partial<QuestionnaireNode>) => void;
  onDeleteNode?: (nodeId: string) => void;
};

function QuestionNodeBase({ data, selected }: NodeProps) {
  const nodeData = data as unknown as QuestionNodeData;
  const labels = Array.isArray(nodeData.labels) && nodeData.labels.length > 0 ? nodeData.labels.join(', ') : 'unlabeled';
  const showHandles = nodeData.showHandles !== false;
  const canvasMode = nodeData.canvasMode === 'full' ? 'full' : 'smart';
  const nodeId = typeof nodeData.id === 'string' ? nodeData.id : '';
  const required = nodeData.required === true;
  const [draftTitle, setDraftTitle] = useState(String(nodeData.title ?? 'Question'));
  const editableInline =
    canvasMode === 'full' &&
    Boolean(selected) &&
    typeof nodeData.onPatchNode === 'function' &&
    nodeId.length > 0;

  useEffect(() => {
    setDraftTitle(String(nodeData.title ?? 'Question'));
  }, [nodeData.title, nodeId]);

  const stopPointer = (event: MouseEvent) => {
    event.stopPropagation();
  };

  return (
    <BaseNodeCard
      title={String(nodeData.title ?? 'Question')}
      subtitle={`${String(nodeData.inputType ?? 'text')} • ${labels}`}
      badge="Q"
      leadingIcon="Q"
      color="primary"
      showHandles={showHandles}
      selected={Boolean(selected)}
    >
      {editableInline ? (
        <Stack
          spacing={0.6}
          sx={{
            mt: 0.8,
            borderTop: '1px solid',
            borderColor: 'divider',
            pt: 0.65,
          }}
          className="nodrag nopan"
          onMouseDown={stopPointer}
          onPointerDown={stopPointer}
        >
          <Typography level="body-xs" sx={{ color: 'text.secondary', fontWeight: 700 }}>
            Quick edit
          </Typography>
          <Input
            size="sm"
            value={draftTitle}
            onChange={(event) => setDraftTitle(event.target.value)}
            onBlur={() =>
              nodeData.onPatchNode?.(nodeId, {
                title: draftTitle.trim() || 'Untitled question',
              } as Partial<QuestionnaireNode>)
            }
            className="nodrag nopan nowheel"
          />
          <Stack direction="row" spacing={0.55} alignItems="center">
            <Select
              size="sm"
              value={nodeData.inputType ?? 'text'}
              onChange={(_, next) =>
                nodeData.onPatchNode?.(nodeId, {
                  inputType: (next ?? 'text') as QuestionInputType,
                } as Partial<QuestionnaireNode>)
              }
              sx={{ minWidth: 124 }}
              className="nodrag nopan nowheel"
            >
              <Option value="text">Text</Option>
              <Option value="textarea">Textarea</Option>
              <Option value="number">Number</Option>
              <Option value="date">Date</Option>
              <Option value="yes_no">Yes / No</Option>
              <Option value="single_select">Single select</Option>
              <Option value="multi_select">Multi select</Option>
              <Option value="file_upload">File upload</Option>
            </Select>
            <Button
              size="sm"
              variant={required ? 'solid' : 'soft'}
              color={required ? 'warning' : 'neutral'}
              onClick={() =>
                nodeData.onPatchNode?.(nodeId, {
                  required: !required,
                } as Partial<QuestionnaireNode>)
              }
            >
              {required ? 'Required' : 'Optional'}
            </Button>
            <Box sx={{ ml: 'auto' }}>
              <Button size="sm" variant="soft" color="danger" onClick={() => nodeData.onDeleteNode?.(nodeId)}>
                Delete
              </Button>
            </Box>
          </Stack>
        </Stack>
      ) : null}
    </BaseNodeCard>
  );
}

export const QuestionNode = memo(QuestionNodeBase);
QuestionNode.displayName = 'QuestionNode';
