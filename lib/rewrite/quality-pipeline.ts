import { validateNumberingPrefix, validateRewriteLength } from "@/lib/document/validators";
import { createMockRewriteCandidates } from "@/lib/rewrite/mock-rewriter";
import { extractProtectedTerms, protectedTermsRetained } from "@/lib/rewrite/protected-elements";

export type QualityPipelineInput = {
  text: string;
  numberingPrefix: string | null;
  citationCount: number;
};

export async function rewriteParagraphWithQualityPipeline(input: QualityPipelineInput) {
  const protectedTerms = extractProtectedTerms(input.text);
  let retryCount = 0;
  let lastCandidate = input.text;

  while (retryCount < 5) {
    const candidates = await createMockRewriteCandidates(input.text);
    const valid = candidates.find((candidate) => {
      lastCandidate = candidate;
      return (
        validateNumberingPrefix(input.numberingPrefix, candidate) &&
        validateRewriteLength(input.text, candidate) &&
        protectedTermsRetained(protectedTerms, candidate)
      );
    });

    if (valid) {
      return {
        rewrittenText: valid,
        status: "validated" as const,
        retryCount,
        validation: {
          lengthOk: validateRewriteLength(input.text, valid),
          numberingOk: validateNumberingPrefix(input.numberingPrefix, valid),
          protectedTermsOk: protectedTermsRetained(protectedTerms, valid)
        }
      };
    }

    retryCount += 1;
  }

  return {
    rewrittenText: lastCandidate,
    status: "needs_manual_decision" as const,
    retryCount,
    validation: {
      lengthOk: validateRewriteLength(input.text, lastCandidate),
      numberingOk: validateNumberingPrefix(input.numberingPrefix, lastCandidate),
      protectedTermsOk: protectedTermsRetained(protectedTerms, lastCandidate)
    }
  };
}
