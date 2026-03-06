/**
 * Difficulty Scoring & Ranking Engine.
 *
 * Uses a frequency dictionary (dictionary.json) to score words.
 * Lower frequency → harder word.
 * Words missing from the dictionary get a score of 0 (hardest).
 */

import dictionary from "../dictionary.json";

const freq = dictionary as Record<string, number>;

export interface ScoredWord {
  word: string;
  frequency: number;
}

/**
 * Score and rank an array of unique words from hardest to easiest.
 *
 * @param words – deduplicated, cleaned words from the NLP pipeline.
 * @param limit – how many words to return (Top N).
 * @returns the `limit` hardest words, sorted ascending by frequency.
 */
export function rankWords(words: string[], limit: number): ScoredWord[] {
  const scored: ScoredWord[] = words.map((word) => ({
    word,
    frequency: freq[word] ?? 0, // fallback: not in dictionary → 0
  }));

  // Sort ascending by frequency (rarest first).
  // If two words share the same frequency, sort alphabetically.
  scored.sort((a, b) => a.frequency - b.frequency || a.word.localeCompare(b.word));

  return scored.slice(0, limit);
}
