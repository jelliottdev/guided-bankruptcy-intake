import type { QuestionnaireGraph, QuestionnaireNode } from '../../../questionnaires/types';

export interface ProjectedSection {
  section: QuestionnaireNode | null;
  nodes: QuestionnaireNode[];
}

export function projectGraphToSections(graph: QuestionnaireGraph): ProjectedSection[] {
  const sections = graph.nodes
    .filter((node) => node.kind === 'section' && node.clientVisible)
    .sort((a, b) => {
      const av = a.sectionOrder ?? a.order ?? a.ui?.y ?? 0;
      const bv = b.sectionOrder ?? b.order ?? b.ui?.y ?? 0;
      if (av !== bv) return av - bv;
      return a.id.localeCompare(b.id);
    });

  const sectionById = new Map(sections.map((section) => [section.id, section]));

  const buckets = new Map<string, QuestionnaireNode[]>();
  for (const section of sections) {
    buckets.set(section.id, []);
  }

  const noneBucket: QuestionnaireNode[] = [];
  const orderValue = (node: QuestionnaireNode): number => node.order ?? node.ui?.y ?? 0;

  for (const node of graph.nodes) {
    if (!node.clientVisible) continue;
    if (node.kind === 'start' || node.kind === 'end' || node.kind === 'section' || node.kind === 'note') continue;

    if (node.sectionId && sectionById.has(node.sectionId)) {
      buckets.get(node.sectionId)?.push(node);
    } else {
      noneBucket.push(node);
    }
  }

  const projected: ProjectedSection[] = sections.map((section) => {
    const nodes = (buckets.get(section.id) ?? []).sort((a, b) => {
      const av = orderValue(a);
      const bv = orderValue(b);
      if (av !== bv) return av - bv;
      return a.id.localeCompare(b.id);
    });
    return { section, nodes };
  });

  if (noneBucket.length > 0) {
    projected.push({
      section: null,
      nodes: noneBucket.sort((a, b) => {
        const av = orderValue(a);
        const bv = orderValue(b);
        if (av !== bv) return av - bv;
        return a.id.localeCompare(b.id);
      }),
    });
  }

  return projected;
}
