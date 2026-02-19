import { memo, useEffect, useMemo, useState, type MouseEvent } from 'react';
import type { NodeProps } from '@xyflow/react';
import Box from '@mui/joy/Box';
import Button from '@mui/joy/Button';
import Chip from '@mui/joy/Chip';
import Input from '@mui/joy/Input';
import Option from '@mui/joy/Option';
import Select from '@mui/joy/Select';
import Stack from '@mui/joy/Stack';
import Textarea from '@mui/joy/Textarea';
import Typography from '@mui/joy/Typography';
import type { QuestionInputType, QuestionnaireNode, QuestionnaireNodeKind } from '../../../../questionnaires/types';
import { BaseNodeCard } from './BaseNodeCard';

interface SectionQuestionItem {
  id: string;
  kind: QuestionnaireNodeKind;
  title: string;
  inputType?: QuestionInputType;
  required?: boolean;
}

interface SectionNodeData {
  id?: string;
  title?: string;
  helpText?: string;
  sectionQuestionCount?: number;
  sectionQuestions?: SectionQuestionItem[];
  simpleOrder?: number;
  canvasMode?: 'smart' | 'full';
  showHandles?: boolean;
  onPatchNode?: (nodeId: string, patch: Partial<QuestionnaireNode>) => void;
  onDeleteNode?: (nodeId: string) => void;
  onAddQuestionToSection?: (sectionId: string) => void;
}

function SectionNodeBase({ data, selected }: NodeProps) {
  const nodeData = data as SectionNodeData;
  const count =
    typeof nodeData.sectionQuestionCount === 'number'
      ? nodeData.sectionQuestionCount
      : Number(nodeData.sectionQuestionCount ?? 0);
  const simpleMode = nodeData.canvasMode === 'smart';
  const chapter = Number(nodeData.simpleOrder ?? 0);
  const helpText = typeof nodeData.helpText === 'string' ? nodeData.helpText.trim() : '';
  const showHandles = nodeData.showHandles !== false;
  const nodeId = typeof nodeData.id === 'string' ? nodeData.id : '';
  const sectionQuestions = useMemo(
    () => (Array.isArray(nodeData.sectionQuestions) ? nodeData.sectionQuestions : []),
    [nodeData.sectionQuestions]
  );
  const [draftTitle, setDraftTitle] = useState(String(nodeData.title ?? 'Section'));
  const [draftHelpText, setDraftHelpText] = useState(helpText);
  const [questionDrafts, setQuestionDrafts] = useState<Record<string, string>>({});

  useEffect(() => {
    setDraftTitle(String(nodeData.title ?? 'Section'));
    setDraftHelpText(helpText);
  }, [nodeData.title, helpText, nodeId]);

  useEffect(() => {
    const next: Record<string, string> = {};
    for (const item of sectionQuestions) {
      next[item.id] = item.title;
    }
    setQuestionDrafts(next);
  }, [sectionQuestions]);

  const summaryLine = `${count} question${count === 1 ? '' : 's'}`;
  const detailLine = helpText.length > 0 ? helpText : 'Client-facing chapter for this intake stage.';
  const densityValue = count <= 0 ? 0 : count < 4 ? 1 : count < 8 ? 2 : 3;
  const chapterLabel = chapter > 0 ? `Chapter ${chapter}` : 'Chapter';
  const inlineEditable = simpleMode && Boolean(selected) && Boolean(nodeData.onPatchNode) && nodeId.length > 0;
  const stopPointer = (event: MouseEvent) => {
    event.stopPropagation();
  };

  return (
    <BaseNodeCard
      title={String(nodeData.title ?? 'Section')}
      subtitle={simpleMode ? detailLine : `${count} question${count === 1 ? '' : 's'} in section`}
      badge={simpleMode ? summaryLine : `${count}`}
      leadingIcon={undefined}
      color={simpleMode ? 'primary' : 'neutral'}
      prominent={simpleMode}
      simpleBand={simpleMode ? (chapter % 2 === 0 ? 'even' : 'odd') : undefined}
      showHandles={showHandles}
      selected={Boolean(selected)}
      incoming
      outgoing
    >
      {simpleMode ? (
        <Stack direction="row" spacing={0.8} alignItems="center" sx={{ mt: 0.75 }}>
          <Chip size="sm" variant="soft" color="primary" sx={{ borderRadius: 'md', fontWeight: 700 }}>
            {chapterLabel}
          </Chip>
          <Box sx={{ display: 'flex', gap: 0.35 }} aria-hidden>
            {[0, 1, 2, 3].map((index) => (
              <Box
                key={index}
                sx={{
                  width: 8,
                  height: 8,
                  borderRadius: 999,
                  bgcolor: index < densityValue ? '#2563eb' : '#dbeafe',
                }}
              />
            ))}
          </Box>
          <Typography level="body-xs" sx={{ color: 'text.tertiary' }}>
            {count <= 0 ? 'No prompts yet' : densityValue < 3 ? 'Focused chapter' : 'Dense chapter'}
          </Typography>
        </Stack>
      ) : null}
      {inlineEditable ? (
        <Stack
          spacing={0.7}
          sx={{
            mt: 1,
            borderTop: '1px solid',
            borderColor: 'divider',
            pt: 0.8,
          }}
          className="nodrag nopan"
          onMouseDown={stopPointer}
          onPointerDown={stopPointer}
        >
          <Typography level="body-xs" sx={{ color: 'text.secondary', fontWeight: 700 }}>
            Edit chapter
          </Typography>
          <Input
            size="sm"
            value={draftTitle}
            onChange={(event) => setDraftTitle(event.target.value)}
            onBlur={() => {
              const nextTitle = draftTitle.trim() || 'Untitled chapter';
              if (nextTitle !== nodeData.title) nodeData.onPatchNode?.(nodeId, { title: nextTitle });
            }}
            placeholder="Chapter title"
          />
          <Textarea
            size="sm"
            minRows={2}
            value={draftHelpText}
            onChange={(event) => setDraftHelpText(event.target.value)}
            onBlur={() => {
              const nextHelp = draftHelpText.trim();
              if (nextHelp !== helpText) {
                nodeData.onPatchNode?.(nodeId, {
                  helpText: nextHelp.length > 0 ? nextHelp : undefined,
                });
              }
            }}
            placeholder="Add client-facing guidance for this chapter"
          />

          <Typography level="body-xs" sx={{ color: 'text.secondary', fontWeight: 700, mt: 0.35 }}>
            Prompts in this chapter
          </Typography>
          {sectionQuestions.length === 0 ? (
            <Typography level="body-xs" sx={{ color: 'text.tertiary' }}>
              No prompts yet. Add one to start this chapter.
            </Typography>
          ) : (
            <Stack spacing={0.45}>
              {sectionQuestions.slice(0, 6).map((item) => (
                <Stack
                  key={item.id}
                  direction="row"
                  spacing={0.45}
                  alignItems="center"
                  sx={{
                    p: 0.45,
                    borderRadius: 'sm',
                    border: '1px solid',
                    borderColor: 'divider',
                    bgcolor: 'background.surface',
                  }}
                >
                  <Input
                    size="sm"
                    value={questionDrafts[item.id] ?? item.title}
                    onChange={(event) =>
                      setQuestionDrafts((previous) => ({
                        ...previous,
                        [item.id]: event.target.value,
                      }))
                    }
                    onBlur={() => {
                      const nextTitle = (questionDrafts[item.id] ?? item.title).trim() || 'Untitled question';
                      if (nextTitle !== item.title) {
                        nodeData.onPatchNode?.(item.id, {
                          title: nextTitle,
                        });
                      }
                    }}
                    sx={{ flex: 1 }}
                    className="nodrag nopan nowheel"
                  />
                  {item.kind === 'question' || item.kind === 'doc_request' ? (
                    <Select
                      size="sm"
                      value={item.inputType ?? 'text'}
                      onChange={(_, next) =>
                        nodeData.onPatchNode?.(item.id, {
                          inputType: (next ?? 'text') as QuestionInputType,
                        })
                      }
                      sx={{ minWidth: 120 }}
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
                  ) : (
                    <Chip size="sm" variant="soft" color="warning">
                      Decision
                    </Chip>
                  )}
                  <Button
                    size="sm"
                    variant={item.required ? 'solid' : 'soft'}
                    color={item.required ? 'warning' : 'neutral'}
                    onClick={() => nodeData.onPatchNode?.(item.id, { required: !item.required })}
                  >
                    {item.required ? 'Required' : 'Optional'}
                  </Button>
                  <Button
                    size="sm"
                    variant="soft"
                    color="danger"
                    onClick={() => nodeData.onDeleteNode?.(item.id)}
                  >
                    Remove
                  </Button>
                </Stack>
              ))}
              {sectionQuestions.length > 6 ? (
                <Typography level="body-xs" sx={{ color: 'text.tertiary' }}>
                  +{sectionQuestions.length - 6} more prompts. Use logic view for full detail.
                </Typography>
              ) : null}
            </Stack>
          )}
          <Button
            size="sm"
            variant="soft"
            color="primary"
            onClick={() => nodeData.onAddQuestionToSection?.(nodeId)}
          >
            Add question
          </Button>
        </Stack>
      ) : null}
    </BaseNodeCard>
  );
}

export const SectionNode = memo(SectionNodeBase);
SectionNode.displayName = 'SectionNode';
