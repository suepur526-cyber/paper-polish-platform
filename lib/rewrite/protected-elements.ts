export function extractProtectedTerms(text: string) {
  const english = text.match(/[A-Z][A-Za-z0-9-]{1,}/g) ?? [];
  const citations = text.match(/\[[0-9,\-\s]+\]|〔[0-9,\-\s]+〕/g) ?? [];
  return [...new Set([...english, ...citations])];
}

export function protectedTermsRetained(terms: string[], rewritten: string) {
  return terms.every((term) => rewritten.includes(term));
}
