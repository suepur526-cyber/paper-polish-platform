export type ParagraphClassification = {
  type: "heading" | "abstract" | "keywords" | "reference" | "body" | "skipped";
  selected: boolean;
  skipReason: string | null;
  riskLevel: "low" | "medium" | "high";
  numberingPrefix: string | null;
};

export type DocumentPhase =
  | "frontMatter"
  | "abstract"
  | "toc"
  | "body"
  | "references"
  | "backMatter";

export function detectNumberingPrefix(text: string) {
  const match = text.match(/^(\s*(?:（\d+）|\(\d+\)|\d+[.)）]|[①②③④⑤⑥⑦⑧⑨⑩]))/);
  return match?.[1].trim() ?? null;
}

export function normalizeParagraphText(text: string) {
  return text.replace(/\s+/g, " ").trim();
}

export function isAbstractHeading(text: string) {
  const normalized = normalizeParagraphText(text).replace(/\s/g, "");
  return /^(摘要|Abstract)$/i.test(normalized);
}

export function isKeywordsLine(text: string) {
  return /^(关键词|关键字|Keywords?)\s*[:：]/i.test(normalizeParagraphText(text));
}

export function isTocHeading(text: string) {
  const normalized = normalizeParagraphText(text).replace(/\s/g, "");
  return /^(目录|Contents?)$/i.test(normalized);
}

export function isReferenceHeading(text: string) {
  const normalized = normalizeParagraphText(text).replace(/\s/g, "");
  return /^(参考文献|References)$/i.test(normalized);
}

export function isBackMatterHeading(text: string) {
  const normalized = normalizeParagraphText(text).replace(/\s/g, "");
  return /^(致谢|谢辞|附录|Appendix|Acknowledgements?)$/i.test(normalized);
}

export function isStructuralHeading(text: string) {
  return isTocHeading(text) || isReferenceHeading(text) || isBackMatterHeading(text);
}

export function isReferenceEntry(text: string) {
  const normalized = normalizeParagraphText(text);
  return (
    /^\[\d+\]\s*\S+/.test(normalized) ||
    /^[\u4e00-\u9fa5A-Za-z][^。！？!?]{0,40}(?:,|，).+\[(?:J|D|M|C|OL|J\/OL|EB\/OL)\]/i.test(
      normalized
    ) ||
    /^[A-Z][A-Za-z-]+(?:\s+[A-Z]\.?|,\s*[A-Z][A-Za-z-]+).+\[(?:J|D|M|C|OL|J\/OL|EB\/OL)\]/i.test(
      normalized
    )
  );
}

export function isCaptionLine(text: string) {
  const normalized = normalizeParagraphText(text);
  return /^(图|表)\s*\d+(?:[.\-－—]\d+)*\s*[\s　]+\S.{0,60}$/.test(normalized);
}

export function isTocEntry(text: string) {
  const normalized = normalizeParagraphText(text);
  return (
    /^[\d.]+\s+.+(?:\s|\.{2,}|…+)\d+$/.test(normalized) ||
    /^第[一二三四五六七八九十\d]+章\s+.+(?:\s|\.{2,}|…+)\d+$/.test(normalized) ||
    /^(摘要|Abstract|参考文献|致谢|附录)\s*(?:\.{2,}|…+|\s)\s*[IVXLCDM\d]+$/i.test(normalized)
  );
}

export function isFrontMatterLine(text: string) {
  const normalized = normalizeParagraphText(text);
  if (!normalized) return true;
  if (
    /^(本科毕业论文（设计）|本科毕业论文|毕业论文|学位论文|原创性声明|毕业论文原创性声明|使用授权声明)/.test(
      normalized
    )
  ) {
    return true;
  }
  if (/^(学院名称|学院|专业|班级|学号|姓名|学生姓名|作者|指导教师|教师姓名|题目|论文题目)\s*[:：]/.test(normalized)) {
    return true;
  }
  if (/(论文作者|作者|指导教师).{0,12}签名|签字日期|声明人|本人郑重声明/.test(normalized)) {
    return true;
  }
  if (/^\d{4}\s*年\s*\d{1,2}\s*月\s*\d{1,2}\s*日$/.test(normalized)) {
    return true;
  }
  return false;
}

export function isLikelyHeading(text: string, styleName = "") {
  const normalized = normalizeParagraphText(text);
  if (!normalized || isTocEntry(normalized) || isKeywordsLine(normalized)) return false;
  if (
    isAbstractHeading(normalized) ||
    isTocHeading(normalized) ||
    isReferenceHeading(normalized) ||
    isBackMatterHeading(normalized)
  ) {
    return true;
  }

  const hasSentencePunctuation = /[，,。；;：:？！?!]$/.test(normalized);
  const tooLong = normalized.length > 36;
  if (/heading/i.test(styleName) && !tooLong && !hasSentencePunctuation) return true;
  if (tooLong || hasSentencePunctuation) return false;

  if (/^第[一二三四五六七八九十\d]+[章节]\s*\S{1,24}$/.test(normalized)) return true;
  if (/^\d+(?:\.\d+)*\s+\S.{0,28}$/.test(normalized)) return true;
  return false;
}

export function shouldSkipParagraph(text: string, phase: DocumentPhase = "body") {
  const normalized = text.trim();
  if (!normalized) return "空段落默认跳过";
  if (phase === "toc" || isTocHeading(normalized) || isTocEntry(normalized)) return "目录内容默认跳过";
  if (phase === "references" || isReferenceHeading(normalized)) return "参考文献默认跳过";
  if (phase === "backMatter" || isBackMatterHeading(normalized)) return "致谢、附录等后置内容默认跳过";
  if (isReferenceEntry(normalized)) return "疑似参考文献条目默认跳过";
  if (isCaptionLine(normalized)) return "图表题注默认跳过";
  if (phase === "frontMatter" || isFrontMatterLine(normalized)) return "封面、声明或论文元数据默认跳过";
  if (isKeywordsLine(normalized)) return "关键词行需在摘要润色后确认更新";
  if (normalized.length < 12) return "疑似标题或短标签，默认跳过";
  return null;
}

export function classifyParagraph(input: {
  text: string;
  styleName?: string | null;
  index: number;
  phase?: DocumentPhase;
}): ParagraphClassification {
  const text = input.text.trim();
  const styleName = input.styleName ?? "";
  const phase = input.phase ?? "body";
  const numberingPrefix = detectNumberingPrefix(text);

  if (isReferenceHeading(text) || phase === "references" || isReferenceEntry(text)) {
    return {
      type: "reference",
      selected: false,
      skipReason: "参考文献默认跳过",
      riskLevel: "medium",
      numberingPrefix
    };
  }

  if (phase === "backMatter" || isBackMatterHeading(text)) {
    return {
      type: "skipped",
      selected: false,
      skipReason: "致谢、附录等后置内容默认跳过",
      riskLevel: "medium",
      numberingPrefix
    };
  }

  if (isAbstractHeading(text) || isTocHeading(text) || isLikelyHeading(text, styleName)) {
    return {
      type: "heading",
      selected: false,
      skipReason: isTocHeading(text) ? "目录标题默认跳过" : "标题默认跳过",
      riskLevel: "medium",
      numberingPrefix
    };
  }

  if (isKeywordsLine(text)) {
    return {
      type: "keywords",
      selected: false,
      skipReason: "关键词行需在摘要润色后确认更新",
      riskLevel: "medium",
      numberingPrefix
    };
  }

  const skipReason = shouldSkipParagraph(text, phase);
  if (skipReason) {
    return {
      type: "skipped",
      selected: false,
      skipReason,
      riskLevel: "medium",
      numberingPrefix
    };
  }

  if (phase === "abstract") {
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
