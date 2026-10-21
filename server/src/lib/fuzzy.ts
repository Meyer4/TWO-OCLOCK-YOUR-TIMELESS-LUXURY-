/** Lightweight typo-tolerant matching used for search suggestions. */

export function normalizeText(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

export function tokenize(input: string): string[] {
  return normalizeText(input)
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}

export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const curr = [i];
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(curr[j - 1]! + 1, prev[j]! + 1, prev[j - 1]! + cost);
    }
    prev = curr;
  }
  return prev[b.length]!;
}

/** Allowed edit distance grows with token length so short words must match closely. */
function allowedDistance(length: number): number {
  if (length <= 3) return 0;
  if (length <= 6) return 1;
  return 2;
}

/** True when a single query token matches a candidate token, allowing typos and prefixes. */
export function tokenMatches(queryToken: string, candidateToken: string): boolean {
  if (candidateToken.startsWith(queryToken)) return true;
  const allowed = allowedDistance(queryToken.length);
  if (allowed === 0) return false;
  if (levenshtein(queryToken, candidateToken) <= allowed) return true;
  // Compare against a prefix of the candidate so "rolx" can match "rolex" and "rolexs".
  const prefix = candidateToken.slice(0, queryToken.length);
  return levenshtein(queryToken, prefix) <= allowed;
}

/** Fraction (0..1) of query tokens that match at least one token in the candidate text. */
export function fuzzyScore(query: string, candidateText: string): number {
  const queryTokens = tokenize(query);
  if (queryTokens.length === 0) return 0;
  const candidateTokens = tokenize(candidateText);
  let matched = 0;
  for (const q of queryTokens) {
    if (candidateTokens.some((c) => tokenMatches(q, c))) matched += 1;
  }
  return matched / queryTokens.length;
}
