import { validateNumberingPrefix, validateRewriteLength } from "@/lib/document/validators";
import { createMockRewriteCandidates } from "@/lib/rewrite/mock-rewriter";
import { getRewriteModelAdapter } from "@/lib/rewrite/model-adapter";
import { extractProtectedTerms, protectedTermsValid } from "@/lib/rewrite/protected-elements";

export type QualityPipelineInput = {
  text: string;
  numberingPrefix: string | null;
  citationCount: number;
};

export async function rewriteParagraphWithQualityPipeline(input: QualityPipelineInput) {
  const adapter = getRewriteModelAdapter();
  const modelProtectedTerms = adapter ? await detectModelProtectedTerms(adapter, input.text) : [];
  const protectedTerms = extractProtectedTerms(input.text, modelProtectedTerms);
  let retryCount = 0;
  let lastCandidate = input.text;

  while (retryCount < 5) {
    const candidates = await createCandidates({
      text: input.text,
      protectedTerms,
      numberingPrefix: input.numberingPrefix,
      adapter
    });
    const bestCandidate = adapter
      ? await adapter.chooseBestCandidate(input.text, candidates)
      : candidates[0];
    const orderedCandidates = [
      bestCandidate,
      ...candidates.filter((candidate) => candidate !== bestCandidate)
    ].filter(Boolean);

    const valid = orderedCandidates.find((candidate) => {
      lastCandidate = candidate;
      return (
        validateNumberingPrefix(input.numberingPrefix, candidate) &&
        validateRewriteLength(input.text, candidate) &&
        protectedTermsValid(protectedTerms, candidate)
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
          protectedTermsOk: protectedTermsValid(protectedTerms, valid)
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
      protectedTermsOk: protectedTermsValid(protectedTerms, lastCandidate)
    }
  };
}

async function detectModelProtectedTerms(adapter: ReturnType<typeof getRewriteModelAdapter>, text: string) {
  if (!adapter?.detectProtectedTerms) return [];
  try {
    return await adapter.detectProtectedTerms(text);
  } catch {
    return [];
  }
}

async function createCandidates(params: {
  text: string;
  protectedTerms: string[];
  numberingPrefix: string | null;
  adapter: ReturnType<typeof getRewriteModelAdapter>;
}) {
  if (!params.adapter) return createMockRewriteCandidates(params.text);

  try {
    const candidates = await params.adapter.createCandidates({
      text: params.text,
      protectedTerms: params.protectedTerms,
      numberingPrefix: params.numberingPrefix
    });
    return candidates.length > 0 ? candidates : createMockRewriteCandidates(params.text);
  } catch {
    return createMockRewriteCandidates(params.text);
  }
}
