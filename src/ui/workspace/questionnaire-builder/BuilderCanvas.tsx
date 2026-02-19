import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Box from '@mui/joy/Box';
import Button from '@mui/joy/Button';
import Drawer from '@mui/joy/Drawer';
import Dropdown from '@mui/joy/Dropdown';
import Input from '@mui/joy/Input';
import List from '@mui/joy/List';
import ListDivider from '@mui/joy/ListDivider';
import ListItem from '@mui/joy/ListItem';
import ListItemButton from '@mui/joy/ListItemButton';
import ListItemContent from '@mui/joy/ListItemContent';
import Menu from '@mui/joy/Menu';
import MenuButton from '@mui/joy/MenuButton';
import MenuItem from '@mui/joy/MenuItem';
import ModalClose from '@mui/joy/ModalClose';
import Option from '@mui/joy/Option';
import Select from '@mui/joy/Select';
import Sheet from '@mui/joy/Sheet';
import Stack from '@mui/joy/Stack';
import Textarea from '@mui/joy/Textarea';
import Typography from '@mui/joy/Typography';
import { createGraphNode } from '../../../questionnaires/store';
import type {
  QuestionInputType,
  QuestionnaireGraph,
  QuestionnaireNode,
  QuestionnaireNodeKind,
} from '../../../questionnaires/types';
import {
  clearLastDraggedQuestionnaireKind,
  questionnaireDragMimeType,
  readLastDraggedQuestionnaireKind,
} from './dragMime';

interface BuilderCanvasProps {
  graph: QuestionnaireGraph;
  onGraphChange: (next: QuestionnaireGraph) => void;
  selectedNodeId: string | null;
  onSelectedNodeIdChange: (nodeId: string | null) => void;
}

type CanvasQuestionItem = {
  id: string;
  kind: QuestionnaireNodeKind;
  title: string;
  inputType?: QuestionnaireNode['inputType'];
  required?: boolean;
  order: number;
};

type SectionDraft = {
  title: string;
  helpText: string;
};

type SectionDropTarget = {
  sectionId: string;
  index: number;
};

type DraggedSection = {
  sectionId: string;
  fromIndex: number;
};

type DraggedSectionItem = {
  nodeId: string;
  fromSectionId: string;
  fromIndex: number;
  kind: QuestionnaireNodeKind;
};

const SECTION_DROP_KINDS = new Set<QuestionnaireNodeKind>([
  'question',
  'doc_request',
  'decision',
  'task',
  'approval_gate',
  'reminder',
  'note',
]);

const sectionItemDragMimeType = 'application/x-gbi-assignment-section-item';
const sectionDragMimeType = 'application/x-gbi-assignment-section';
const AUTO_EXPAND_DELAY_MS = 160;
const AUTO_COLLAPSE_DELAY_MS = 160;

function sectionSortValue(node: QuestionnaireNode): number {
  return node.sectionOrder ?? node.order ?? node.ui?.y ?? 0;
}

function itemSortValue(node: QuestionnaireNode): number {
  return node.order ?? node.ui?.y ?? 0;
}

function peekDraggedKind(event: React.DragEvent): QuestionnaireNodeKind | null {
  const dropped = event.dataTransfer.getData(questionnaireDragMimeType());
  const fallback = readLastDraggedQuestionnaireKind();
  const kind = (dropped || fallback) as QuestionnaireNodeKind | '';
  return kind ? kind : null;
}

function consumeDroppedKind(event: React.DragEvent): QuestionnaireNodeKind | null {
  const kind = peekDraggedKind(event);
  clearLastDraggedQuestionnaireKind();
  return kind;
}

function readDraggedSectionItem(event: React.DragEvent): DraggedSectionItem | null {
  const raw = event.dataTransfer.getData(sectionItemDragMimeType);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as DraggedSectionItem;
    if (!parsed?.nodeId || !parsed?.fromSectionId || !SECTION_DROP_KINDS.has(parsed.kind)) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function readDraggedSection(event: React.DragEvent): DraggedSection | null {
  const raw = event.dataTransfer.getData(sectionDragMimeType);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as DraggedSection;
    if (!parsed?.sectionId || typeof parsed.fromIndex !== 'number') return null;
    return parsed;
  } catch {
    return null;
  }
}

export function BuilderCanvas({ graph, onGraphChange, selectedNodeId, onSelectedNodeIdChange }: BuilderCanvasProps) {
  const graphRef = useRef(graph);
  useEffect(() => {
    graphRef.current = graph;
  }, [graph]);

  const sectionNodes = useMemo(
    () =>
      graph.nodes
        .filter((node) => node.kind === 'section')
        .sort((a, b) => {
          const av = sectionSortValue(a);
          const bv = sectionSortValue(b);
          if (av !== bv) return av - bv;
          return a.id.localeCompare(b.id);
        }),
    [graph.nodes]
  );

  const sectionQuestions = useMemo(() => {
    const bySection = new Map<string, CanvasQuestionItem[]>();
    for (const node of graph.nodes) {
      if (!node.sectionId || !SECTION_DROP_KINDS.has(node.kind)) continue;
      const list = bySection.get(node.sectionId) ?? [];
      list.push({
        id: node.id,
        kind: node.kind,
        title: node.title,
        inputType: node.inputType,
        required: node.required,
        order: itemSortValue(node),
      });
      bySection.set(node.sectionId, list);
    }
    for (const [key, list] of bySection.entries()) {
      bySection.set(
        key,
        [...list].sort((a, b) => a.order - b.order)
      );
    }
    return bySection;
  }, [graph.nodes]);

  const [sectionDrafts, setSectionDrafts] = useState<Record<string, SectionDraft>>({});
  const [questionTitleDrafts, setQuestionTitleDrafts] = useState<Record<string, string>>({});
  const [quickQuestionDrafts, setQuickQuestionDrafts] = useState<Record<string, string>>({});
  const [dropTarget, setDropTarget] = useState<SectionDropTarget | null>(null);
  const [sectionDropIndex, setSectionDropIndex] = useState<number | null>(null);
  const [rootDropActive, setRootDropActive] = useState(false);
  const [expandedSectionIds, setExpandedSectionIds] = useState<Set<string>>(new Set());
  const [autoExpandedSectionId, setAutoExpandedSectionId] = useState<string | null>(null);
  const [editingFieldId, setEditingFieldId] = useState<string | null>(null);
  const [outlineOpen, setOutlineOpen] = useState(false);
  const [outlineQuery, setOutlineQuery] = useState('');
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const journeyScrollRef = useRef<HTMLDivElement | null>(null);

  const expandedSectionIdsRef = useRef<Set<string>>(expandedSectionIds);
  const autoExpandedSectionIdRef = useRef<string | null>(autoExpandedSectionId);
  useEffect(() => {
    expandedSectionIdsRef.current = expandedSectionIds;
    autoExpandedSectionIdRef.current = autoExpandedSectionId;
  }, [autoExpandedSectionId, expandedSectionIds]);

  const expandTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const collapseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingAutoExpandIdRef = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      if (expandTimerRef.current) clearTimeout(expandTimerRef.current);
      if (collapseTimerRef.current) clearTimeout(collapseTimerRef.current);
    };
  }, []);

  const cancelAutoCollapse = useCallback(() => {
    if (collapseTimerRef.current) clearTimeout(collapseTimerRef.current);
    collapseTimerRef.current = null;
  }, []);

  const cancelAutoExpand = useCallback(() => {
    if (expandTimerRef.current) clearTimeout(expandTimerRef.current);
    expandTimerRef.current = null;
    pendingAutoExpandIdRef.current = null;
  }, []);

  const scheduleAutoExpand = useCallback(
    (sectionId: string) => {
      if (expandedSectionIdsRef.current.has(sectionId)) return;
      cancelAutoCollapse();
      if (pendingAutoExpandIdRef.current === sectionId) return;
      cancelAutoExpand();
      pendingAutoExpandIdRef.current = sectionId;
      expandTimerRef.current = setTimeout(() => {
        setExpandedSectionIds((prev) => {
          const next = new Set(prev);
          next.add(sectionId);
          return next;
        });
        setAutoExpandedSectionId(sectionId);
        pendingAutoExpandIdRef.current = null;
        expandTimerRef.current = null;
      }, AUTO_EXPAND_DELAY_MS);
    },
    [cancelAutoCollapse, cancelAutoExpand]
  );

  const scheduleAutoCollapse = useCallback(
    (sectionId: string) => {
      cancelAutoExpand();
      if (collapseTimerRef.current) clearTimeout(collapseTimerRef.current);
      collapseTimerRef.current = setTimeout(() => {
        if (autoExpandedSectionIdRef.current !== sectionId) return;
        setExpandedSectionIds((prev) => {
          const next = new Set(prev);
          next.delete(sectionId);
          return next;
        });
        setAutoExpandedSectionId(null);
        collapseTimerRef.current = null;
      }, AUTO_COLLAPSE_DELAY_MS);
    },
    [cancelAutoExpand]
  );

  const maybeAutoScroll = useCallback((clientY: number) => {
    const container = journeyScrollRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const threshold = 44;
    if (clientY < rect.top + threshold) {
      container.scrollTop -= 18;
    } else if (clientY > rect.bottom - threshold) {
      container.scrollTop += 18;
    }
  }, []);

  useEffect(() => {
    setSectionDrafts((previous) => {
      const next: Record<string, SectionDraft> = { ...previous };
      const validIds = new Set(sectionNodes.map((node) => node.id));
      for (const key of Object.keys(next)) {
        if (!validIds.has(key)) delete next[key];
      }
      for (const section of sectionNodes) {
        const isEditingThis =
          editingFieldId === `section-title-${section.id}` ||
          editingFieldId === `section-help-${section.id}`;
        if (!next[section.id]) {
          next[section.id] = { title: section.title, helpText: section.helpText ?? '' };
          continue;
        }
        if (isEditingThis) continue;
        const syncedTitle = section.title;
        const syncedHelp = section.helpText ?? '';
        if (next[section.id].title !== syncedTitle || next[section.id].helpText !== syncedHelp) {
          next[section.id] = { title: syncedTitle, helpText: syncedHelp };
        }
      }
      return next;
    });
  }, [editingFieldId, sectionNodes]);

  useEffect(() => {
    setQuestionTitleDrafts((previous) => {
      const next: Record<string, string> = { ...previous };
      const validIds = new Set(
        graph.nodes.filter((node) => SECTION_DROP_KINDS.has(node.kind)).map((node) => node.id)
      );
      for (const key of Object.keys(next)) {
        if (!validIds.has(key)) delete next[key];
      }
      for (const node of graph.nodes) {
        if (!SECTION_DROP_KINDS.has(node.kind)) continue;
        if (editingFieldId === `question-${node.id}`) continue;
        if (next[node.id] !== node.title) next[node.id] = node.title;
      }
      return next;
    });
  }, [editingFieldId, graph.nodes]);

  useEffect(() => {
    setExpandedSectionIds((prev) => {
      const next = new Set(prev);
      let changed = false;
      for (const id of next) {
        if (!sectionNodes.some((s) => s.id === id)) {
          next.delete(id);
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [sectionNodes]);

  const patchNode = useCallback(
    (nodeId: string, patch: Partial<QuestionnaireNode>) => {
      const current = graphRef.current;
      onGraphChange({
        ...current,
        nodes: current.nodes.map((node) => (node.id === nodeId ? { ...node, ...patch } : node)),
      });
    },
    [onGraphChange]
  );

  const removeNode = useCallback(
    (nodeId: string) => {
      const current = graphRef.current;
      const target = current.nodes.find((node) => node.id === nodeId);
      if (!target || target.kind === 'start' || target.kind === 'end') return;
      onGraphChange({
        ...current,
        nodes: current.nodes.filter((node) => node.id !== nodeId),
        edges: current.edges.filter((edge) => edge.from !== nodeId && edge.to !== nodeId),
      });
      if (selectedNodeId === nodeId) {
        onSelectedNodeIdChange(null);
      }
    },
    [onGraphChange, onSelectedNodeIdChange, selectedNodeId]
  );

  const updateSectionDraft = useCallback((sectionId: string, patch: Partial<SectionDraft>) => {
    setSectionDrafts((previous) => ({
      ...previous,
      [sectionId]: {
        title: previous[sectionId]?.title ?? '',
        helpText: previous[sectionId]?.helpText ?? '',
        ...patch,
      },
    }));
  }, []);

  const commitSectionDraft = useCallback(
    (sectionId: string) => {
      const draft = sectionDrafts[sectionId];
      if (!draft) return;
      const node = graphRef.current.nodes.find((item) => item.id === sectionId && item.kind === 'section');
      if (!node) return;
      const nextTitle = draft.title.trim() || 'Untitled section';
      const nextHelp = draft.helpText.trim();
      const patch: Partial<QuestionnaireNode> = {};
      if (nextTitle !== node.title) patch.title = nextTitle;
      if (nextHelp !== (node.helpText ?? '')) patch.helpText = nextHelp || undefined;
      if (Object.keys(patch).length > 0) patchNode(sectionId, patch);
    },
    [patchNode, sectionDrafts]
  );

  const updateQuestionDraft = useCallback((nodeId: string, title: string) => {
    setQuestionTitleDrafts((previous) => ({ ...previous, [nodeId]: title }));
  }, []);

  const commitQuestionDraft = useCallback(
    (nodeId: string) => {
      const nextTitle = (questionTitleDrafts[nodeId] ?? '').trim() || 'Untitled question';
      const node = graphRef.current.nodes.find((item) => item.id === nodeId);
      if (!node) return;
      if (nextTitle !== node.title) {
        patchNode(nodeId, { title: nextTitle });
      }
    },
    [patchNode, questionTitleDrafts]
  );

  const setQuestionInputType = useCallback(
    (nodeId: string, inputType: QuestionInputType) => {
      patchNode(nodeId, { inputType });
    },
    [patchNode]
  );

  const toggleQuestionRequired = useCallback(
    (nodeId: string, required: boolean) => {
      patchNode(nodeId, { required: !required });
    },
    [patchNode]
  );

  const insertNodeInSection = useCallback(
    (sectionId: string, index: number, kind: QuestionnaireNodeKind, titleOverride?: string) => {
      if (!SECTION_DROP_KINDS.has(kind)) return;
      const current = graphRef.current;
      const section = current.nodes.find((node) => node.id === sectionId && node.kind === 'section');
      if (!section) return;
      const sectionItems = current.nodes
        .filter((node) => node.sectionId === sectionId && SECTION_DROP_KINDS.has(node.kind))
        .sort((a, b) => {
          const av = itemSortValue(a);
          const bv = itemSortValue(b);
          if (av !== bv) return av - bv;
          return a.id.localeCompare(b.id);
        });

      const nextNode = createGraphNode(kind, { sectionId });

      if (kind === 'question') {
        nextNode.inputType = 'text';
        nextNode.required = false;
      }
      if (titleOverride && titleOverride.trim().length > 0) {
        nextNode.title = titleOverride.trim();
      }
      if (kind === 'doc_request') {
        nextNode.inputType = 'file_upload';
        nextNode.required = true;
        nextNode.labels = ['documents'];
      }

      const boundedIndex = Math.max(0, Math.min(index, sectionItems.length));
      const ordered = [...sectionItems];
      ordered.splice(boundedIndex, 0, nextNode);

      const updates = new Map<string, Partial<QuestionnaireNode>>();
      ordered.forEach((node, itemIndex) => {
        updates.set(node.id, { order: (itemIndex + 1) * 1000, sectionId });
      });
      nextNode.order = (boundedIndex + 1) * 1000;

      onGraphChange({
        ...current,
        nodes: [
          ...current.nodes.map((node) => (updates.has(node.id) ? { ...node, ...updates.get(node.id) } : node)),
          nextNode,
        ],
      });
      onSelectedNodeIdChange(nextNode.id);
      return nextNode.id;
    },
    [onGraphChange, onSelectedNodeIdChange]
  );

  const moveNodeToSection = useCallback(
    (dragged: DraggedSectionItem, targetSectionId: string, targetIndex: number) => {
      if (!SECTION_DROP_KINDS.has(dragged.kind)) return;
      const current = graphRef.current;
      const node = current.nodes.find((item) => item.id === dragged.nodeId);
      if (!node || !node.sectionId || !SECTION_DROP_KINDS.has(node.kind)) return;

      const sourceSection = current.nodes.find((item) => item.id === node.sectionId && item.kind === 'section');
      const destinationSection = current.nodes.find(
        (item) => item.id === targetSectionId && item.kind === 'section'
      );
      if (!sourceSection || !destinationSection) return;

      const sourceItems = current.nodes
        .filter((item) => item.sectionId === sourceSection.id && SECTION_DROP_KINDS.has(item.kind))
        .sort((a, b) => {
          const av = itemSortValue(a);
          const bv = itemSortValue(b);
          if (av !== bv) return av - bv;
          return a.id.localeCompare(b.id);
        });
      const sourceIndex = sourceItems.findIndex((item) => item.id === node.id);
      if (sourceIndex < 0) return;

      const destinationItems = current.nodes
        .filter((item) => item.sectionId === destinationSection.id && SECTION_DROP_KINDS.has(item.kind))
        .sort((a, b) => {
          const av = itemSortValue(a);
          const bv = itemSortValue(b);
          if (av !== bv) return av - bv;
          return a.id.localeCompare(b.id);
        })
        .filter((item) => item.id !== node.id);

      let boundedTarget = Math.max(0, Math.min(targetIndex, destinationItems.length));
      if (sourceSection.id === destinationSection.id) {
        if (sourceIndex < targetIndex) {
          boundedTarget = Math.max(0, Math.min(targetIndex - 1, destinationItems.length));
        }
        if (boundedTarget === sourceIndex) return;
      }

      const nextDestination = [...destinationItems];
      nextDestination.splice(boundedTarget, 0, node);

      const nextSource =
        sourceSection.id === destinationSection.id
          ? nextDestination
          : sourceItems.filter((item) => item.id !== node.id);

      const updates = new Map<string, Partial<QuestionnaireNode>>();
      nextSource.forEach((item, index) => {
        updates.set(item.id, { sectionId: sourceSection.id, order: (index + 1) * 1000 });
      });
      nextDestination.forEach((item, index) => {
        updates.set(item.id, { sectionId: destinationSection.id, order: (index + 1) * 1000 });
      });

      onGraphChange({
        ...current,
        nodes: current.nodes.map((item) => (updates.has(item.id) ? { ...item, ...updates.get(item.id) } : item)),
      });
      onSelectedNodeIdChange(node.id);
    },
    [onGraphChange, onSelectedNodeIdChange]
  );

  const moveSection = useCallback(
    (dragged: DraggedSection, targetIndex: number) => {
      const current = graphRef.current;
      const ordered = sectionNodes.map((node) => node.id);
      const fromIndex = ordered.indexOf(dragged.sectionId);
      if (fromIndex < 0) return;
      let boundedTarget = Math.max(0, Math.min(targetIndex, ordered.length));

      const nextOrder = [...ordered];
      const [moved] = nextOrder.splice(fromIndex, 1);
      if (!moved) return;
      if (fromIndex < boundedTarget) boundedTarget -= 1;
      nextOrder.splice(boundedTarget, 0, moved);

      const updates = new Map<string, Partial<QuestionnaireNode>>();
      nextOrder.forEach((id, idx) => updates.set(id, { sectionOrder: (idx + 1) * 1000 }));

      onGraphChange({
        ...current,
        nodes: current.nodes.map((node) => (updates.has(node.id) ? { ...node, ...updates.get(node.id) } : node)),
      });
    },
    [onGraphChange, sectionNodes]
  );

  const addSection = useCallback(() => {
    const current = graphRef.current;
    const lastSection = sectionNodes[sectionNodes.length - 1];
    const maxOrder = Math.max(0, ...sectionNodes.map((node) => sectionSortValue(node)));
    const nextNode = createGraphNode('section', {
      title: 'New section',
      helpText: 'Describe what this section collects from the client.',
    });
    nextNode.sectionOrder = Math.max((lastSection?.sectionOrder ?? 0) + 1000, maxOrder + 1000);

    onGraphChange({
      ...current,
      nodes: [...current.nodes, nextNode],
    });
    onSelectedNodeIdChange(nextNode.id);
    setExpandedSectionIds((prev) => {
      const next = new Set(prev);
      next.add(nextNode.id);
      return next;
    });
    setAutoExpandedSectionId(null);
  }, [onGraphChange, onSelectedNodeIdChange, sectionNodes]);

  const addQuestionFromQuickEntry = useCallback(
    (sectionId: string) => {
      setExpandedSectionIds((prev) => {
        const next = new Set(prev);
        next.add(sectionId);
        return next;
      });
      setAutoExpandedSectionId(null);
      const nextTitle = (quickQuestionDrafts[sectionId] ?? '').trim();
      const sectionItems = sectionQuestions.get(sectionId) ?? [];
      if (!nextTitle) {
        insertNodeInSection(sectionId, sectionItems.length, 'question');
        return;
      }
      const createdId = insertNodeInSection(sectionId, sectionItems.length, 'question', nextTitle);
      if (createdId) {
        setQuickQuestionDrafts((prev) => ({ ...prev, [sectionId]: '' }));
      }
    },
    [insertNodeInSection, quickQuestionDrafts, sectionQuestions]
  );

  const resolveDropPayload = useCallback((event: React.DragEvent) => {
    const existingItem = readDraggedSectionItem(event);
    if (existingItem && SECTION_DROP_KINDS.has(existingItem.kind)) {
      return { existingItem };
    }
    const toolboxKind = peekDraggedKind(event);
    if (toolboxKind && SECTION_DROP_KINDS.has(toolboxKind)) {
      return { toolboxKind };
    }
    return null;
  }, []);

  const outlineSections = useMemo(() => {
    const q = outlineQuery.trim().toLowerCase();
    return sectionNodes
      .map((section, idx) => {
        const items = sectionQuestions.get(section.id) ?? [];
        return {
          id: section.id,
          index: idx,
          title: section.title || `Section ${idx + 1}`,
          helpText: section.helpText ?? '',
          count: items.length,
        };
      })
      .filter((row) => {
        if (!q) return true;
        return `${row.title} ${row.helpText}`.toLowerCase().includes(q);
      });
  }, [outlineQuery, sectionNodes, sectionQuestions]);

  return (
    <Box
      className="questionnaire-simple-journey"
      sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}
    >
      <Box
        className="journey-toolbar"
        sx={{
          px: 1.1,
          py: 0.75,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 1,
          borderBottom: '1px solid',
          borderColor: 'divider',
          bgcolor: '#f8fbff',
        }}
      >
        <Stack direction="row" spacing={0.6} alignItems="center">
          <Button size="sm" variant="soft" onClick={() => setOutlineOpen(true)}>
            Outline
          </Button>
          {sectionNodes.length > 0 ? (
            <Typography level="body-xs" sx={{ color: 'text.tertiary' }}>
              {sectionNodes.length} sections
            </Typography>
          ) : null}
        </Stack>
        <Stack direction="row" spacing={1} alignItems="center">
          <Button
            size="sm"
            variant="plain"
            disabled={sectionNodes.length === 0}
            onClick={() => {
              setExpandedSectionIds(new Set(sectionNodes.map((s) => s.id)));
              setAutoExpandedSectionId(null);
            }}
          >
            Expand all
          </Button>
          {expandedSectionIds.size > 0 ? (
            <Button
              size="sm"
              variant="plain"
              onClick={() => {
                setExpandedSectionIds(new Set());
                setAutoExpandedSectionId(null);
              }}
            >
              Collapse all
            </Button>
          ) : null}
        </Stack>
      </Box>

      <Drawer open={outlineOpen} onClose={() => setOutlineOpen(false)}>
        <ModalClose />
        <Box sx={{ p: 1.5 }}>
          <Typography level="title-md">Sections</Typography>
          <Typography level="body-sm" sx={{ color: 'text.tertiary', mt: 0.25 }}>
            Jump to a section without scrolling.
          </Typography>
          <Input
            size="sm"
            value={outlineQuery}
            onChange={(event) => setOutlineQuery(event.target.value)}
            placeholder="Search sections"
            sx={{ mt: 1 }}
          />
        </Box>
        <ListDivider />
        <Box sx={{ p: 1.25, pt: 1, overflow: 'auto' }}>
          <List size="sm" sx={{ '--List-gap': '0.35rem' }}>
            {outlineSections.map((row) => (
              <ListItem key={row.id} sx={{ p: 0 }}>
                <ListItemButton
                  onClick={() => {
                    setOutlineOpen(false);
                    setExpandedSectionIds((prev) => {
                      const next = new Set(prev);
                      next.add(row.id);
                      return next;
                    });
                    setAutoExpandedSectionId(null);
                    sectionRefs.current[row.id]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }}
                  sx={{
                    borderRadius: 'md',
                    border: '1px solid',
                    borderColor: expandedSectionIds.has(row.id) ? 'primary.300' : 'divider',
                    bgcolor: 'background.surface',
                  }}
                >
                  <ListItemContent>
                    <Typography level="body-sm" sx={{ fontWeight: 800 }}>
                      {row.index + 1}. {row.title}
                    </Typography>
                    <Typography level="body-xs" sx={{ color: 'text.tertiary' }}>
                      {row.count} prompts
                    </Typography>
                  </ListItemContent>
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        </Box>
      </Drawer>
      <Box
        className="journey-scroll"
        sx={{
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          px: 1.1,
          pb: 1.1,
          display: 'flex',
          flexDirection: 'column',
          gap: 1.05,
        }}
        ref={journeyScrollRef}
        onDragOver={(event) => {
          maybeAutoScroll(event.clientY);
          const payload = resolveDropPayload(event);
          if (payload) {
            event.preventDefault();
            setDropTarget(null);
          }
          const sectionDrag = readDraggedSection(event);
          if (sectionDrag) {
            event.preventDefault();
            setRootDropActive(false);
            setDropTarget(null);
            setSectionDropIndex(sectionNodes.length);
          }
          const kind = peekDraggedKind(event);
          if (kind === 'section') {
            event.preventDefault();
            setRootDropActive(true);
          }
        }}
        onDragLeave={() => {
          setRootDropActive(false);
          setSectionDropIndex(null);
        }}
        onDrop={(event) => {
          const draggedSection = readDraggedSection(event);
          if (draggedSection && sectionDropIndex != null) {
            event.preventDefault();
            moveSection(draggedSection, sectionDropIndex);
            setSectionDropIndex(null);
            return;
          }
          const kind = consumeDroppedKind(event);
          if (kind !== 'section') return;
          event.preventDefault();
          setRootDropActive(false);
          addSection();
        }}
      >
        {sectionDropIndex === 0 ? <Box className="journey-drop-gap is-active" /> : null}
        {sectionNodes.map((section, index) => {
          const sectionNumber = index + 1;
          const draft = sectionDrafts[section.id] ?? { title: section.title, helpText: section.helpText ?? '' };
          const sectionItems = sectionQuestions.get(section.id) ?? [];
          const quickDraft = quickQuestionDrafts[section.id] ?? '';
          const branchItems = sectionItems.filter((item) => item.kind === 'decision').length;
          const docItems = sectionItems.filter((item) => item.kind === 'doc_request').length;
          const isExpanded = expandedSectionIds.has(section.id);
          const isSectionDropBefore = sectionDropIndex === index && sectionDropIndex !== 0;

          return (
            <Box key={`section-wrap-${section.id}`}>
              {isSectionDropBefore ? <Box className="journey-drop-gap is-active" /> : null}
              <Sheet
                key={section.id}
                ref={(node) => {
                  sectionRefs.current[section.id] = node;
                }}
                variant="outlined"
                className={`journey-section-card ${isExpanded ? 'is-expanded' : 'is-collapsed'}`}
                onDragOver={(event) => {
                  event.stopPropagation();
                  maybeAutoScroll(event.clientY);
                  const draggedSection = readDraggedSection(event);
                  if (draggedSection) {
                    event.preventDefault();
                    setSectionDropIndex(index);
                    return;
                  }
                  const payload = resolveDropPayload(event);
                  if (!payload) return;
                  event.preventDefault();
                  cancelAutoCollapse();
                  if (!isExpanded) scheduleAutoExpand(section.id);
                  setDropTarget({ sectionId: section.id, index: sectionItems.length });
                }}
                onDragLeave={(event) => {
                  event.stopPropagation();
                  const related = event.relatedTarget as Node | null;
                  if (related && (event.currentTarget as HTMLElement).contains(related)) {
                    return;
                  }
                  cancelAutoExpand();
                  if (dropTarget?.sectionId === section.id) {
                    setDropTarget(null);
                  }
                  if (sectionDropIndex != null) setSectionDropIndex(null);
                  if (autoExpandedSectionIdRef.current === section.id) {
                    scheduleAutoCollapse(section.id);
                  }
                }}
                onDrop={(event) => {
                  event.stopPropagation();
                  const draggedSection = readDraggedSection(event);
                  if (draggedSection && sectionDropIndex != null) {
                    event.preventDefault();
                    moveSection(draggedSection, sectionDropIndex);
                    setSectionDropIndex(null);
                    return;
                  }
                  const payload = resolveDropPayload(event);
                  if (!payload) return;
                  event.preventDefault();
                  const targetIndex =
                    dropTarget?.sectionId === section.id ? dropTarget.index : sectionItems.length;
                  setDropTarget(null);
                  setAutoExpandedSectionId(null);
                  cancelAutoExpand();
                  cancelAutoCollapse();
                  if (payload.existingItem) {
                    moveNodeToSection(payload.existingItem, section.id, targetIndex);
                    setExpandedSectionIds((prev) => new Set(prev).add(section.id));
                    return;
                  }
                  if (payload.toolboxKind) {
                    insertNodeInSection(section.id, targetIndex, payload.toolboxKind);
                    clearLastDraggedQuestionnaireKind();
                    setExpandedSectionIds((prev) => new Set(prev).add(section.id));
                  }
                }}
                sx={{
                  p: 1.35,
                  borderRadius: 'lg',
                  border: '1px solid',
                  borderColor: 'neutral.outlinedBorder',
                  bgcolor: index % 2 === 0 ? '#ffffff' : '#f8fbff',
                  boxShadow: '0 3px 14px rgba(15,23,42,0.06)',
                  cursor: 'default',
                }}
              >
                <Stack direction="row" spacing={0.8} alignItems="flex-start" justifyContent="space-between">
                  <Stack spacing={0.45} sx={{ minWidth: 0 }}>
                    <Stack direction="row" spacing={0.75} alignItems="center">
                      <Typography
                        level="body-xs"
                        draggable
                        onDragStart={(event) => {
                          event.stopPropagation();
                          event.dataTransfer.effectAllowed = 'move';
                          event.dataTransfer.setData(
                            sectionDragMimeType,
                            JSON.stringify({ sectionId: section.id, fromIndex: index } satisfies DraggedSection)
                          );
                        }}
                        onDragEnd={() => setSectionDropIndex(null)}
                        className="journey-section-drag-handle nodrag nopan nowheel"
                        title="Drag to reorder sections"
                        sx={{
                          color: 'text.tertiary',
                          letterSpacing: '-0.12em',
                          cursor: 'grab',
                          userSelect: 'none',
                        }}
                      >
                        ⋮⋮
                      </Typography>
                      <Typography level="body-xs" sx={{ color: 'text.tertiary' }}>
                        Section {sectionNumber} · {sectionItems.length} questions
                        {branchItems > 0 ? ` · ${branchItems} conditions` : ''}
                        {docItems > 0 ? ` · ${docItems} upload steps` : ''}
                      </Typography>
                    </Stack>
                    {isExpanded ? (
                      <>
                        <Input
                          variant="plain"
                          size="sm"
                          value={draft.title}
                          onChange={(event) => updateSectionDraft(section.id, { title: event.target.value })}
                          onBlur={() => {
                            commitSectionDraft(section.id);
                            setEditingFieldId(null);
                          }}
                          onFocus={() => setEditingFieldId(`section-title-${section.id}`)}
                          placeholder="Section title"
                          className={`journey-inline-input journey-inline-title nodrag nopan nowheel ${editingFieldId === `section-title-${section.id}` ? 'is-editing' : ''
                            }`}
                          sx={{ width: '100%' }}
                          onClick={(event) => event.stopPropagation()}
                        />
                        <Textarea
                          variant="plain"
                          minRows={1}
                          maxRows={6}
                          value={draft.helpText}
                          onChange={(event) => updateSectionDraft(section.id, { helpText: event.target.value })}
                          onBlur={() => {
                            commitSectionDraft(section.id);
                            setEditingFieldId(null);
                          }}
                          onFocus={() => setEditingFieldId(`section-help-${section.id}`)}
                          placeholder="Add section guidance for what the client should provide."
                          className={`journey-inline-textarea journey-inline-subtext nodrag nopan nowheel ${editingFieldId === `section-help-${section.id}` ? 'is-editing' : ''
                            }`}
                          sx={{ width: '100%' }}
                          onClick={(event) => event.stopPropagation()}
                        />
                      </>
                    ) : (
                      <>
                        <Typography level="title-sm" sx={{ color: 'text.primary' }}>
                          {draft.title || `Section ${sectionNumber}`}
                        </Typography>
                        {draft.helpText ? (
                          <Typography level="body-xs" sx={{ color: 'text.tertiary' }}>
                            {draft.helpText}
                          </Typography>
                        ) : null}
                      </>
                    )}
                  </Stack>
                  <Button
                    size="sm"
                    variant={isExpanded ? 'soft' : 'outlined'}
                    color={isExpanded ? 'primary' : 'neutral'}
                    className="journey-section-toggle"
                    onClick={(event) => {
                      event.stopPropagation();
                      setExpandedSectionIds((prev) => {
                        const next = new Set(prev);
                        if (next.has(section.id)) {
                          next.delete(section.id);
                        } else {
                          next.add(section.id);
                        }
                        return next;
                      });
                      setAutoExpandedSectionId(null);
                      onSelectedNodeIdChange(section.id);
                    }}
                  >
                    {isExpanded ? 'Collapse' : 'Expand'}
                  </Button>
                </Stack>

                {isExpanded ? (
                  <Stack spacing={0.5} sx={{ mt: 1 }}>
                    {sectionItems.length === 0 ? (
                      <Typography level="body-sm" sx={{ color: 'text.tertiary' }}>
                        No questions yet. Drag a step here or add a question below.
                      </Typography>
                    ) : (
                      sectionItems.map((item, itemIndex) => {
                        const questionDraft = questionTitleDrafts[item.id] ?? item.title;
                        const itemRequired = item.required === true;
                        const editableInputType = item.kind === 'question' || item.kind === 'doc_request';
                        const itemSelected = selectedNodeId === item.id;
                        const isDropBefore =
                          dropTarget?.sectionId === section.id && dropTarget.index === itemIndex;
                        return (
                          <Box key={item.id}>
                            {isDropBefore ? <Box className="journey-drop-gap is-active" /> : null}
                            <Stack
                              spacing={0.45}
                              className={`journey-prompt-row${itemSelected ? ' is-selected' : ''}`}
                              draggable
                              sx={{
                                p: 0.65,
                                border: '1px solid',
                                borderColor: 'divider',
                                borderRadius: 'md',
                                bgcolor: '#ffffff',
                              }}
                              onDragStart={(event) => {
                                const target = event.target as HTMLElement | null;
                                if (target?.closest('textarea, input, button, [role="button"]')) {
                                  event.preventDefault();
                                  return;
                                }
                                event.dataTransfer.effectAllowed = 'move';
                                event.dataTransfer.setData(
                                  sectionItemDragMimeType,
                                  JSON.stringify({
                                    nodeId: item.id,
                                    fromSectionId: section.id,
                                    fromIndex: itemIndex,
                                    kind: item.kind,
                                  } satisfies DraggedSectionItem)
                                );
                              }}
                              onDragEnd={() => {
                                setDropTarget(null);
                              }}
                              onClick={(event) => {
                                event.stopPropagation();
                                onSelectedNodeIdChange(item.id);
                              }}
                              onDragOver={(event) => {
                                event.stopPropagation();
                                maybeAutoScroll(event.clientY);
                                const payload = resolveDropPayload(event);
                                if (!payload) return;
                                event.preventDefault();
                                setDropTarget({ sectionId: section.id, index: itemIndex });
                              }}
                              onDrop={(event) => {
                                event.stopPropagation();
                                const payload = resolveDropPayload(event);
                                if (!payload) return;
                                event.preventDefault();
                                setDropTarget(null);
                                if (payload.existingItem) {
                                  moveNodeToSection(payload.existingItem, section.id, itemIndex);
                                  return;
                                }
                                if (payload.toolboxKind) {
                                  insertNodeInSection(section.id, itemIndex, payload.toolboxKind);
                                  clearLastDraggedQuestionnaireKind();
                                }
                              }}
                            >
                              <Textarea
                                variant="plain"
                                minRows={1}
                                maxRows={4}
                                value={questionDraft}
                                onChange={(event) => updateQuestionDraft(item.id, event.target.value)}
                                onBlur={() => {
                                  commitQuestionDraft(item.id);
                                  setEditingFieldId(null);
                                }}
                                onFocus={() => setEditingFieldId(`question-${item.id}`)}
                                sx={{ flex: 1 }}
                                className={`journey-inline-textarea nodrag nopan nowheel ${editingFieldId === `question-${item.id}` ? 'is-editing' : ''
                                  }`}
                              />
                              <Stack
                                direction="row"
                                spacing={0.55}
                                alignItems="center"
                                className="journey-prompt-meta"
                                useFlexGap
                                sx={{ flexWrap: 'wrap' }}
                              >
                                <Typography
                                  level="body-xs"
                                  sx={{ color: 'text.tertiary', letterSpacing: '-0.1em', cursor: 'grab' }}
                                  title="Drag to reorder"
                                >
                                  ⋮⋮
                                </Typography>
                                {editableInputType ? (
                                  <Select
                                    size="sm"
                                    value={item.inputType ?? 'text'}
                                    onChange={(_, next) =>
                                      setQuestionInputType(item.id, (next ?? 'text') as QuestionInputType)
                                    }
                                    sx={{ minWidth: 122 }}
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
                                  <Typography level="body-xs" sx={{ color: 'text.tertiary' }}>
                                    {item.kind === 'decision' ? 'Condition' : item.kind.replace(/_/g, ' ')}
                                  </Typography>
                                )}
                                <Button
                                  size="sm"
                                  variant={itemRequired ? 'solid' : 'soft'}
                                  color={itemRequired ? 'primary' : 'neutral'}
                                  onClick={() => toggleQuestionRequired(item.id, itemRequired)}
                                >
                                  {itemRequired ? 'Required' : 'Optional'}
                                </Button>
                                <Dropdown>
                                  <MenuButton size="sm" variant="plain" color="neutral">
                                    •••
                                  </MenuButton>
                                  <Menu size="sm">
                                    <MenuItem color="danger" onClick={() => removeNode(item.id)}>
                                      Delete step
                                    </MenuItem>
                                  </Menu>
                                </Dropdown>
                              </Stack>
                            </Stack>
                          </Box>
                        );
                      })
                    )}

                    {dropTarget?.sectionId === section.id && dropTarget.index === sectionItems.length ? (
                      <Box className="journey-drop-gap is-active" />
                    ) : null}

                    <Stack direction="row" spacing={0.6} sx={{ mt: 0.45 }}>
                      <Input
                        size="sm"
                        value={quickDraft}
                        placeholder="Type a question and press Enter"
                        className="journey-quick-add-input"
                        onChange={(event) =>
                          setQuickQuestionDrafts((prev) => ({ ...prev, [section.id]: event.target.value }))
                        }
                        onKeyDown={(event) => {
                          if (event.key !== 'Enter') return;
                          event.preventDefault();
                          event.stopPropagation();
                          addQuestionFromQuickEntry(section.id);
                        }}
                      />
                      <Button
                        size="sm"
                        variant="soft"
                        color="primary"
                        onClick={() => addQuestionFromQuickEntry(section.id)}
                      >
                        Add question
                      </Button>
                    </Stack>
                    <Typography level="body-xs" sx={{ color: 'text.tertiary' }}>
                      Drag steps into this section to place them between questions.
                    </Typography>
                  </Stack>
                ) : (
                  <Typography level="body-xs" sx={{ color: 'text.tertiary', mt: 0.65 }}>
                    Expand to edit questions and drag steps into this section.
                  </Typography>
                )}
              </Sheet>
            </Box>
          );
        })}

        {sectionDropIndex === sectionNodes.length && sectionNodes.length > 0 ? (
          <Box className="journey-drop-gap is-active" />
        ) : null}

        {rootDropActive ? (
          <Sheet
            variant="soft"
            sx={{
              p: 1.1,
              borderRadius: 'lg',
              border: '1px dashed',
              borderColor: 'primary.400',
              bgcolor: '#eff6ff',
            }}
          >
            <Typography level="body-sm" sx={{ color: 'primary.700', fontWeight: 700 }}>
              Drop here to add a new section.
            </Typography>
          </Sheet>
        ) : null}

        {sectionNodes.length === 0 ? (
          <Sheet variant="soft" sx={{ p: 1.2, borderRadius: 'lg' }}>
            <Typography level="body-sm" sx={{ color: 'text.tertiary' }}>
              No sections yet. Add a `Section` step or drag one into the journey area.
            </Typography>
          </Sheet>
        ) : null}
      </Box>
    </Box>
  );
}
