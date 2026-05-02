export type RewriteCandidateRequest = {
  text: string;
  protectedTerms: string[];
  numberingPrefix: string | null;
};

export interface RewriteModelAdapter {
  createCandidates(request: RewriteCandidateRequest): Promise<string[]>;
  chooseBestCandidate(original: string, candidates: string[]): Promise<string>;
}
