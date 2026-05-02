import mammoth from "mammoth";
import { classifyParagraph } from "@/lib/document/classifier";

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

  return lines.map((text, index) => {
    const classification = classifyParagraph({ text, index });
    return {
      outlinePath: buildOutlinePath(text, index, classification.type),
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

function buildOutlinePath(text: string, index: number, type: string) {
  if (type === "heading") return text.slice(0, 60);
  return `段落 ${index + 1}`;
}
