export type ReviewParagraph = {
  id: string;
  index: number;
  type: string;
  outlinePath: string;
  originalText: string;
  selected: boolean;
  status: string;
  skipReason: string | null;
  riskLevel: string;
  citationCount: number;
  numberingPrefix: string | null;
};

export type OutlineSection = {
  id: string;
  title: string;
  paragraphIds: string[];
  totalCount: number;
  selectedCount: number;
  skippedCount: number;
  level: number;
};

export type OutlineTreeNode = OutlineSection & {
  children: OutlineTreeNode[];
};

const SELECTABLE_TYPES = new Set(["body", "abstract"]);

export function canSelectParagraph(paragraph: Pick<ReviewParagraph, "type">) {
  return SELECTABLE_TYPES.has(paragraph.type);
}

export function buildOutlineSections(paragraphs: readonly ReviewParagraph[]) {
  const sections: OutlineSection[] = [];
  let current: OutlineSection | null = null;

  for (const paragraph of [...paragraphs].sort((a, b) => a.index - b.index)) {
    if (paragraph.type === "heading") {
      current = createSection(paragraph.id, paragraph.originalText);
      if (!isHiddenOutlineHeading(paragraph.originalText)) sections.push(current);
    } else if (!current) {
      current = createSection("intro", "未分章节");
      sections.push(current);
    }

    current.paragraphIds.push(paragraph.id);
    current.totalCount += 1;
    if (paragraph.selected && canSelectParagraph(paragraph)) current.selectedCount += 1;
    if (!canSelectParagraph(paragraph)) current.skippedCount += 1;
  }

  return sections;
}

export function getParagraphsForSection(
  paragraphs: readonly ReviewParagraph[],
  sectionId: string | null
) {
  const sections = buildOutlineSections(paragraphs);
  const activeSection = sections.find((section) => section.id === sectionId) ?? sections[0];
  if (!activeSection) return [];
  const ids = new Set(activeSection.paragraphIds);
  return [...paragraphs]
    .sort((a, b) => a.index - b.index)
    .filter((paragraph) => ids.has(paragraph.id));
}

export function countReviewStats(paragraphs: readonly ReviewParagraph[]) {
  return paragraphs.reduce(
    (stats, paragraph) => {
      stats.total += 1;
      if (canSelectParagraph(paragraph)) stats.selectable += 1;
      if (paragraph.selected && canSelectParagraph(paragraph)) stats.selected += 1;
      if (!canSelectParagraph(paragraph)) stats.skipped += 1;
      if (paragraph.status === "needs_manual_decision") stats.manualDecision += 1;
      return stats;
    },
    { total: 0, selected: 0, skipped: 0, manualDecision: 0, selectable: 0 }
  );
}

export function buildOutlineTree(sections: readonly OutlineSection[]) {
  const roots: OutlineTreeNode[] = [];
  const stack: OutlineTreeNode[] = [];

  for (const section of sections) {
    const node: OutlineTreeNode = { ...section, children: [] };
    const level = Math.max(0, section.level);

    while (stack.length > 0 && stack[stack.length - 1].level >= level) {
      stack.pop();
    }

    const parent = level > 0 ? stack[stack.length - 1] : null;
    if (parent) {
      parent.children.push(node);
    } else {
      roots.push(node);
    }

    if (level > 0) stack.push(node);
  }

  return roots;
}

function createSection(id: string, title: string): OutlineSection {
  return {
    id,
    title,
    paragraphIds: [],
    totalCount: 0,
    selectedCount: 0,
    skippedCount: 0,
    level: getOutlineLevel(title)
  };
}

function isHiddenOutlineHeading(title: string) {
  return /^(目录|Contents?)$/i.test(title.replace(/\s/g, "").trim());
}

export function getOutlineLevel(title: string) {
  const normalized = title.trim();
  const numeric = normalized.match(/^(\d+(?:\.\d+)*)\b/);
  if (numeric) return numeric[1].split(".").length;
  if (/^第[一二三四五六七八九十\d]+章(?:\s|$)/.test(normalized)) return 1;
  if (/^第[一二三四五六七八九十\d]+节(?:\s|$)/.test(normalized)) return 2;
  return 0;
}
