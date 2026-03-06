/**
 * NLP processing pipeline using the `compromise` library.
 *
 * Responsibilities:
 *   1. Parse raw text into tokens.
 *   2. Filter out proper nouns, people, places, cities, and organisations.
 *   3. Lemmatize remaining words (plurals → singular, verbs → infinitive).
 *   4. Strip punctuation, lowercase, and deduplicate.
 */

import nlp from "compromise";

/** Tags that mark tokens we want to discard */
const EXCLUDED_TAGS = [
  "#ProperNoun",
  "#Person",
  "#Place",
  "#City",
  "#Organization",
] as const;

/**
 * Process raw text and return an array of unique, cleaned, lemmatized words.
 */
export function processText(rawText: string): string[] {
  const doc = nlp(rawText);

  // ── 1. Remove unwanted tags ──────────────────────────────────────────────
  for (const tag of EXCLUDED_TAGS) {
    doc.remove(tag);
  }

  // ── 2. Lemmatize ─────────────────────────────────────────────────────────
  // Convert nouns to singular
  doc.nouns().toSingular();
  // Convert verbs to infinitive form
  doc.verbs().toInfinitive();

  // ── 3. Extract individual terms ──────────────────────────────────────────
  const terms: string[] = doc
    .terms()
    .out("array") as string[];

  // ── 4. Clean: lowercase, strip punctuation, dedup, remove empties ────────
  const seen = new Set<string>();
  const result: string[] = [];

  for (const raw of terms) {
    // strip everything that isn't a letter (keeps unicode letters too)
    const word = raw.replace(/[^a-zA-Z\u00C0-\u024F]/g, "").toLowerCase();
    if (word.length < 2) continue; // skip single-char artifacts
    if (seen.has(word)) continue;
    seen.add(word);
    result.push(word);
  }

  return result;
}
