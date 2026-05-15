import type { ParsedParagraph } from "@/lib/document/parser";
import type { RewriteModelAdapter } from "@/lib/rewrite/model-adapter";
import { expandProtectedTerms } from "@/lib/rewrite/protected-elements";

const BATCH_SIZE = 24;
export async function detectProtectedTermsForParagraphs(
  paragraphs: readonly ParsedParagraph[],
  adapter: RewriteModelAdapter | null
) {
  const byIndex = new Map<number, string[]>();
  if (!adapter) return byIndex;

  const selected = paragraphs.filter((paragraph) => paragraph.selected);
  if (selected.length === 0) return byIndex;

  if (adapter.detectProtectedTermsBatch) {
    try {
      for (const chunk of chunkArray(selected, BATCH_SIZE)) {
        const results = await adapter.detectProtectedTermsBatch(chunk.map((paragraph) => paragraph.text));
        const normalized = chunk.map((_, index) => results[index] ?? []);
        chunk.forEach((paragraph, offset) => {
          const terms = expandProtectedTerms(paragraph.text, normalized[offset] ?? []);
          if (terms.length > 0) byIndex.set(paragraph.index, terms);
        });
      }
      return byIndex;
    } catch {
      byIndex.clear();
    }
  }

  if (!adapter.detectProtectedTerms) return byIndex;

  for (const paragraph of selected) {
    const terms = expandProtectedTerms(
      paragraph.text,
      await safeDetectProtectedTerms(adapter, paragraph.text)
    );
    if (terms.length > 0) byIndex.set(paragraph.index, terms);
  }

  return byIndex;
}

async function safeDetectProtectedTerms(adapter: RewriteModelAdapter, text: string) {
  if (!adapter.detectProtectedTerms) return [];
  try {
    return await adapter.detectProtectedTerms(text);
  } catch {
    return [];
  }
}

function chunkArray<T>(items: readonly T[], size: number) {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}
