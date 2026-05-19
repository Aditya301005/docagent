import { Document } from '../types';

// ─── Tokenizer ────────────────────────────────────────────────────────────────
function tokenize(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((t) => t.length > 2)
  );
}

// ─── Jaccard Similarity ───────────────────────────────────────────────────────
function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 0;
  const intersection = new Set([...a].filter((x) => b.has(x)));
  const union = new Set([...a, ...b]);
  return intersection.size / union.size;
}

// ─── Entity similarity ────────────────────────────────────────────────────────
function entitySimilarity(
  entitiesA: Document['entities'],
  entitiesB: Document['entities']
): number {
  const a = entitiesA || [];
  const b = entitiesB || [];
  if (a.length === 0 && b.length === 0) return 0;

  const valuesA = new Set(a.map((e) => e.value.toLowerCase().trim()));
  const valuesB = new Set(b.map((e) => e.value.toLowerCase().trim()));

  return jaccardSimilarity(valuesA, valuesB);
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Computes a combined similarity score between 0 and 1.
 * Weighted: 70% raw text Jaccard + 30% entity value Jaccard.
 */
export function computeSimilarity(docA: Document, docB: Document): number {
  const textA = tokenize(docA.rawText || '');
  const textB = tokenize(docB.rawText || '');
  const textScore = jaccardSimilarity(textA, textB);

  const entityScore = entitySimilarity(docA.entities, docB.entities);

  // If both docs have essentially no text, fall back to entity-only comparison
  if (textA.size < 5 && textB.size < 5) {
    return entityScore;
  }

  return textScore * 0.7 + entityScore * 0.3;
}

/**
 * Returns the most similar existing document if similarity > threshold (default 0.80).
 * Only compares documents belonging to the same user that are NOT locked.
 */
export function findDuplicate(
  newDoc: Document,
  existingDocs: Document[],
  threshold = 0.80
): { doc: Document; score: number } | null {
  let best: { doc: Document; score: number } | null = null;

  for (const existing of existingDocs) {
    // Skip self-comparison and locked docs
    if (existing.id === newDoc.id) continue;
    if (existing.isLocked) continue;
    // Skip if no meaningful content to compare
    if (!existing.rawText && (!existing.entities || existing.entities.length === 0)) continue;

    const score = computeSimilarity(newDoc, existing);
    if (score >= threshold && (!best || score > best.score)) {
      best = { doc: existing, score };
    }
  }

  return best;
}
