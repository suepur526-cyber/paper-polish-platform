export function validateRewriteLength(original: string, rewritten: string) {
  const originalLength = original.length;
  if (originalLength === 0) return rewritten.length === 0;
  const ratio = Math.abs(rewritten.length - originalLength) / originalLength;
  return ratio <= 0.05;
}

export function validateNumberingPrefix(originalPrefix: string | null, rewritten: string) {
  if (!originalPrefix) return true;
  return rewritten.trimStart().startsWith(originalPrefix);
}
