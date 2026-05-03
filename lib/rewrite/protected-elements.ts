const STRUCTURAL_PREFIX_PATTERNS = [
  /^\s*第[一二三四五六七八九十百千万\d]+[章节篇部分]\s*[^：:。；;，,\n]{1,32}[：:]/,
  /^\s*\d+(?:\.\d+){0,5}\s+[^：:。；;，,\n]{1,32}[：:]/,
  /^\s*[一二三四五六七八九十]+[、.．]\s*[^：:。；;，,\n]{1,32}[：:]/,
  /^\s*[（(]\s*[一二三四五六七八九十\d]+\s*[）)]/,
  /^\s*\d+[.)）]\s*/,
  /^\s*[①②③④⑤⑥⑦⑧⑨⑩]/
];

const STRUCTURAL_LABEL_PREFIX_PATTERNS = STRUCTURAL_PREFIX_PATTERNS.slice(0, 3);

export function extractProtectedTerms(text: string, modelTerms: string[] = []) {
  const structuralPrefixes = extractStructuralPrefixes(text);
  const english = text.match(/[A-Z][A-Za-z0-9-]{1,}/g) ?? [];
  const citations = text.match(/\[[0-9,\-\s]+\]|〔[0-9,\-\s]+〕/g) ?? [];
  return uniqueTerms([...structuralPrefixes, ...modelTerms, ...english, ...citations], text);
}

export function extractVisibleProtectedPrefixes(text: string) {
  return extractStructuralPrefixes(text, STRUCTURAL_LABEL_PREFIX_PATTERNS);
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
  return terms;
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
