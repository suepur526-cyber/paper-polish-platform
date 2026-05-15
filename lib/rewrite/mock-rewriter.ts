const replacements: Array<[RegExp, string]> = [
  [/本研究/g, "这项研究"],
  [/阐述/g, "说明"],
  [/依据/g, "根据"],
  [/呈现/g, "表现出"],
  [/导致/g, "使得"],
  [/首先/g, "一方面"],
  [/其次/g, "另一方面"]
];

export async function createMockRewriteCandidates(text: string) {
  const variants = [text, text, text].map((candidate, index) => {
    let next = candidate;
    for (const [pattern, replacement] of replacements.slice(0, index + 3)) {
      next = next.replace(pattern, replacement);
    }
    return next;
  });
  return variants;
}
