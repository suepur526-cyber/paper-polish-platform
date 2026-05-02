export type ParagraphClassification = {
  type: "heading" | "abstract" | "keywords" | "reference" | "body" | "skipped";
  selected: boolean;
  skipReason: string | null;
  riskLevel: "low" | "medium" | "high";
  numberingPrefix: string | null;
};

export function detectNumberingPrefix(text: string) {
  const match = text.match(/^(\s*(?:（\d+）|\(\d+\)|\d+[.)）]|[①②③④⑤⑥⑦⑧⑨⑩]))/);
  return match?.[1].trim() ?? null;
}

export function shouldSkipParagraph(text: string) {
  const normalized = text.trim();
  if (!normalized) return "空段落默认跳过";
  if (/^(目录|参考文献|References)$/i.test(normalized)) return "参考文献或目录内容默认跳过";
  if (/^(关键词|关键字)[:：]/.test(normalized)) return "关键词行需在摘要润色后确认更新";
  if (normalized.length < 12) return "疑似标题或短标签，默认跳过";
  return null;
}

export function classifyParagraph(input: {
  text: string;
  styleName?: string | null;
  index: number;
}): ParagraphClassification {
  const text = input.text.trim();
  const styleName = input.styleName ?? "";
  const numberingPrefix = detectNumberingPrefix(text);

  if (/heading/i.test(styleName) || /^第[一二三四五六七八九十\d]+[章节]/.test(text)) {
    return {
      type: "heading",
      selected: false,
      skipReason: "标题默认跳过",
      riskLevel: "medium",
      numberingPrefix
    };
  }

  const skipReason = shouldSkipParagraph(text);
  if (skipReason) {
    return {
      type: "skipped",
      selected: false,
      skipReason,
      riskLevel: "medium",
      numberingPrefix
    };
  }

  if (/^摘要[:：]?/.test(text) || input.index < 2) {
    return {
      type: "abstract",
      selected: true,
      skipReason: null,
      riskLevel: "low",
      numberingPrefix
    };
  }

  return {
    type: "body",
    selected: true,
    skipReason: null,
    riskLevel: "low",
    numberingPrefix
  };
}
