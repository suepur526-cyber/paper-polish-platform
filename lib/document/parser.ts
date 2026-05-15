import mammoth from "mammoth";
import {
  classifyParagraph,
  isAbstractHeading,
  isBackMatterHeading,
  isKeywordsLine,
  isLikelyHeading,
  isReferenceEntry,
  isReferenceHeading,
  isStructuralHeading,
  isTocEntry,
  isTocHeading,
  type DocumentPhase
} from "@/lib/document/classifier";

export type ParsedParagraph = {
  outlinePath: string;
  index: number;
  text: string;
  type: string;
  selected: boolean;
  skipReason: string | null;
  riskLevel: string;
  citationCount: number;
  numberingPrefix: string | null;
};

export function countCitationMarkers(text: string) {
  const bracketRefs = text.match(/\[[0-9,\-\s]+\]/g) ?? [];
  const cnRefs = text.match(/〔[0-9,\-\s]+〕/g) ?? [];
  return bracketRefs.length + cnRefs.length;
}

export async function parseDocxParagraphs(filePath: string): Promise<ParsedParagraph[]> {
  const result = await mammoth.extractRawText({ path: filePath });
  const lines = result.value
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);

  return parseParagraphLines(lines);
}

export function parseParagraphLines(lines: readonly string[]): ParsedParagraph[] {
  let phase: DocumentPhase = "frontMatter";
  let currentHeading = "未分章节";

  return lines.map((text, index) => {
    if (isTocHeading(text)) {
      phase = "toc";
    } else if (phase === "toc" && isLikelyHeading(text) && !isTocEntry(text)) {
      phase = "body";
    } else if (isReferenceHeading(text)) {
      phase = "references";
    } else if (isBackMatterHeading(text)) {
      phase = "backMatter";
    } else if (phase === "body" && isReferenceEntry(text)) {
      phase = "references";
    } else if (isAbstractHeading(text)) {
      phase = "abstract";
    } else if (phase === "abstract" && isKeywordsLine(text)) {
      phase = "frontMatter";
    } else if (phase === "frontMatter" && isLikelyHeading(text) && !isTocEntry(text)) {
      phase = "body";
    }

    const classification = classifyParagraph({ text, index, phase });
    if (isStructuralHeading(text)) {
      currentHeading = text.slice(0, 60);
    }
    if (
      classification.type === "heading" &&
      !isTocHeading(text) &&
      !isAbstractHeading(text) &&
      !isReferenceHeading(text) &&
      !isBackMatterHeading(text)
    ) {
      currentHeading = text.slice(0, 60);
    }

    return {
      outlinePath: buildOutlinePath(text, index, classification.type, currentHeading),
      index,
      text,
      type: classification.type,
      selected: classification.selected,
      skipReason: classification.skipReason,
      riskLevel: classification.riskLevel,
      citationCount: countCitationMarkers(text),
      numberingPrefix: classification.numberingPrefix
    };
  });
}

function buildOutlinePath(text: string, index: number, type: string, currentHeading: string) {
  if (type === "heading") return text.slice(0, 60);
  return currentHeading || `段落 ${index + 1}`;
}
