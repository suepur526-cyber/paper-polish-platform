const STRUCTURAL_PREFIX_PATTERNS = [
  /^\s*[（(]\s*[一二三四五六七八九十\d]+\s*[）)]\s*[^：:。；;，,\n]{1,24}[：:]/,
  /^\s*\d+[.)）]\s*[^：:。；;，,\n]{1,24}[：:]/,
  /^\s*[（(]\s*[一二三四五六七八九十\d]+\s*[）)]\s*[^：:。；;，,\n\s]{2,12}(?=(?:使用|采用|需要|需|应|为|是|由|包括|支持|配置|可以|具有|具备|达到|不|能够|将|对|在|从|以|，|,))/,
  /^\s*\d+[.)）]\s*[^：:。；;，,\n\s]{2,12}(?=(?:使用|采用|需要|需|应|为|是|由|包括|支持|配置|可以|具有|具备|达到|不|能够|将|对|在|从|以|，|,))/,
  /^\s*第[一二三四五六七八九十百千万\d]+[章节篇部分]\s*[^：:。；;，,\n]{1,32}[：:]/,
  /^\s*第[一二三四五六七八九十百千万\d]+[章节篇部分](?=(?:主要|重点|详细|系统|介绍|阐述|梳理|归纳|总结|完成|对|从|围绕|结合))/,
  /^\s*\d+(?:\.\d+){0,5}\s+[^：:。；;，,\n]{1,32}[：:]/,
  /^\s*[一二三四五六七八九十]+[、.．]\s*[^：:。；;，,\n]{1,32}[：:]/,
  /^\s*[（(]\s*[一二三四五六七八九十\d]+\s*[）)]/,
  /^\s*\d+[.)）]\s*/,
  /^\s*[①②③④⑤⑥⑦⑧⑨⑩]/
];

const STRUCTURAL_LABEL_PREFIX_PATTERNS = STRUCTURAL_PREFIX_PATTERNS.slice(0, 8);
const MISSING_COLON_CONTINUATION_PATTERN =
  /^(?:使用|采用|需要|需|应|为|是|由|包括|支持|配置|可以|具有|具备|达到|不|能够|将|对|在|从|以|，|,)/;

export type VisibleProtectedSegment = {
  text: string;
  kind: "protected" | "suspectedMissingColon";
};

export function extractProtectedTerms(text: string, modelTerms: string[] = []) {
  const structuralPrefixes = extractStructuralPrefixes(text);
  const english = text.match(/[A-Z][A-Za-z0-9-]{1,}/g) ?? [];
  const citations = text.match(/\[[0-9,\-\s]+\]|〔[0-9,\-\s]+〕/g) ?? [];
  return uniqueTerms([...structuralPrefixes, ...modelTerms, ...english, ...citations], text);
}

export function extractVisibleProtectedPrefixes(text: string) {
  return extractStructuralPrefixes(text, STRUCTURAL_LABEL_PREFIX_PATTERNS);
}

export function extractVisibleProtectedSegments(text: string): VisibleProtectedSegment[] {
  return extractVisibleProtectedPrefixes(text).map((term) => ({
    text: term,
    kind: isSuspectedMissingColonTerm(text, term) ? "suspectedMissingColon" : "protected"
  }));
}

export function protectedTermsRetained(terms: string[], rewritten: string) {
  return terms.every((term) => rewritten.includes(term));
}

export function protectedTermsStayInOrder(terms: string[], rewritten: string) {
  let cursor = 0;
  for (const term of terms) {
    const index = rewritten.indexOf(term, cursor);
    if (index < 0) return false;
    cursor = index + term.length;
  }
  return true;
}

export function protectedLeadingTermsStayLeading(terms: string[], rewritten: string) {
  const leading = terms.filter((term) => isLeadingStructuralTerm(term));
  return leading.every((term) => rewritten.trimStart().startsWith(term));
}

export function protectedTermsValid(terms: string[], rewritten: string) {
  return (
    protectedTermsRetained(terms, rewritten) &&
    protectedTermsStayInOrder(terms, rewritten) &&
    protectedLeadingTermsStayLeading(terms, rewritten)
  );
}

function extractStructuralPrefixes(text: string, patterns = STRUCTURAL_PREFIX_PATTERNS) {
  const terms: string[] = [];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[0]) terms.push(match[0].trimStart());
  }
  return preferLongerLeadingTerms(terms);
}

function uniqueTerms(terms: string[], sourceText: string) {
  const seen = new Set<string>();
  const normalized = terms
    .map((term) => term.trim())
    .filter((term) => term.length > 0 && sourceText.includes(term));

  return normalized.filter((term) => {
    if (seen.has(term)) return false;
    seen.add(term);
    return true;
  });
}

function isLeadingStructuralTerm(term: string) {
  return STRUCTURAL_PREFIX_PATTERNS.some((pattern) => pattern.test(term));
}

function preferLongerLeadingTerms(terms: string[]) {
  return terms.filter((term) => {
    const trimmed = term.trim();
    return !terms.some((other) => {
      const otherTrimmed = other.trim();
      return otherTrimmed.length > trimmed.length && otherTrimmed.startsWith(trimmed);
    });
  });
}

function isSuspectedMissingColonTerm(sourceText: string, term: string) {
  if (/[：:]$/.test(term)) return false;

  const source = sourceText.trimStart();
  if (!source.startsWith(term)) return false;

  const continuation = source.slice(term.length);
  return MISSING_COLON_CONTINUATION_PATTERN.test(continuation);
}
