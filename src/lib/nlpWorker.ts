/**
 * Web Worker – runs NLP processing & frequency scoring OFF the main thread.
 *
 * Messages IN  → { type: "process", text: string }
 * Messages OUT → { type: "status",  message: string }
 *              → { type: "uniqueCount", count: number }
 *              → { type: "result",  words: string[], scored: ScoredWord[] }
 *              → { type: "error",   message: string }
 */

import nlp from "compromise";
import dictionary from "../dictionary.json";
import { COMMON_NAMES } from "./commonNames";

const freq = dictionary as Record<string, number>;

export type DifficultyLabel = "unknown" | "very rare" | "rare" | "uncommon" | "common";

export interface ScoredWord {
  word: string;
  frequency: number;
  difficulty: DifficultyLabel;
  occurrences: number;          // how many times in the original text
  likelyName: boolean;          // flagged by capitalisation heuristic
}

const EXCLUDED_TAGS = [
  "#ProperNoun",
  "#Person",
  "#Place",
  "#City",
  "#Organization",
] as const;

/** Classify frequency into a human label */
function labelDifficulty(f: number): DifficultyLabel {
  if (f === 0) return "unknown";
  if (f < 50_000) return "very rare";
  if (f < 500_000) return "rare";
  if (f < 5_000_000) return "uncommon";
  return "common";
}

/**
 * Single-pass scan: counts occurrences AND detects likely proper nouns.
 *
 * Detection layers:
 *  1. Capitalisation heuristic — words capitalised ≥80% of the time
 *     (excluding sentence-starts) are flagged.
 *  2. Common-names dictionary — ~1000 first/last names + places.
 *  3. Possessive stripping ("Darcy's" → "darcy") so names aren't missed.
 *  4. Suffix patterns — words ending in common name suffixes like -ston,
 *     -bury, -wick, -shire, -ford (likely place names).
 */

// Place-name suffixes common in English
const PLACE_SUFFIXES = /(?:burg|burgh|bury|shire|minster|bridge|field|ford|gate|haven|land|mouth|port|stead|ston|stone|ton|ville|wick|wood|worth)$/;

// All-caps abbreviations or Roman numerals → skip
const ROMAN_OR_ABBR = /^(?:[IVXLCDM]+|[A-Z]{2,})$/;

function scanText(rawText: string): {
  occurrences: Map<string, number>;
  likelyNames: Set<string>;
} {
  const occurrences = new Map<string, number>();
  const capCount = new Map<string, number>();
  const lowerCount = new Map<string, number>();
  const totalCount = new Map<string, number>();

  const tokens = rawText.split(/\s+/);
  let afterSentenceEnd = true;

  for (let i = 0; i < tokens.length; i++) {
    const raw = tokens[i];
    if (raw.length === 0) continue;

    // Strip leading/trailing punctuation to get the core word
    let cleaned = raw.replace(/^[^a-zA-Z\u00C0-\u024F]+|[^a-zA-Z\u00C0-\u024F]+$/g, "");
    if (cleaned.length < 2) {
      if (/[.!?]/.test(raw)) afterSentenceEnd = true;
      continue;
    }

    // Strip possessive 's / ' at end ("Darcy's" → "Darcy")
    cleaned = cleaned.replace(/'s$|'s$|'$/i, "");
    if (cleaned.length < 2) {
      if (/[.!?]/.test(raw)) afterSentenceEnd = true;
      continue;
    }

    const low = cleaned.toLowerCase();

    // Count occurrences
    occurrences.set(low, (occurrences.get(low) ?? 0) + 1);
    totalCount.set(low, (totalCount.get(low) ?? 0) + 1);

    // Capitalisation tracking (skip sentence starts to reduce false positives)
    const startsUpper = cleaned[0] !== cleaned[0].toLowerCase();
    if (startsUpper && !afterSentenceEnd) {
      capCount.set(low, (capCount.get(low) ?? 0) + 1);
    } else if (!startsUpper) {
      lowerCount.set(low, (lowerCount.get(low) ?? 0) + 1);
    }

    afterSentenceEnd = /[.!?]["'\u201D\u2019)]*$/.test(raw);
  }

  // ── Build likelyNames set ───────────────────────────────────────────────
  const likelyNames = new Set<string>();

  for (const [word] of occurrences) {
    // Skip very short common words
    if (word.length <= 2) continue;
    // Skip Roman numerals / abbreviations
    if (ROMAN_OR_ABBR.test(word)) continue;

    // Layer 1: Common-names dictionary (instant hit)
    if (COMMON_NAMES.has(word)) {
      likelyNames.add(word);
      continue;
    }

    // Layer 2: Capitalisation ratio ≥ 80% → likely name
    const cc = capCount.get(word) ?? 0;
    const lc = lowerCount.get(word) ?? 0;
    const midSentenceTotal = cc + lc; // excluding sentence-start occurrences
    if (midSentenceTotal >= 2 && cc / midSentenceTotal >= 0.8) {
      likelyNames.add(word);
      continue;
    }
    // Also flag if ONLY seen capitalised (even once mid-sentence)
    if (cc >= 1 && lc === 0) {
      likelyNames.add(word);
      continue;
    }

    // Layer 3: Place-name suffix pattern (only if also capitalised)
    if (cc >= 1 && PLACE_SUFFIXES.test(word)) {
      likelyNames.add(word);
    }
  }

  return { occurrences, likelyNames };
}

function processAndScore(rawText: string): { words: string[]; scored: ScoredWord[] } {
  // ── 0. Single-pass scan for occurrences & name detection ────────────────
  self.postMessage({ type: "status", message: "Scanning text…" });
  const { occurrences, likelyNames } = scanText(rawText);

  // ── 1. Fast pre-pass: extract unique candidate words ────────────────────
  self.postMessage({ type: "status", message: "Extracting unique words…" });

  const rawTokens = rawText
    .replace(/[^a-zA-Z\u00C0-\u024F\s'-]/g, " ")
    .split(/\s+/);

  const candidateSet = new Set<string>();
  for (const t of rawTokens) {
    const w = t.replace(/^['-]+|['-]+$/g, "").toLowerCase();
    if (w.length >= 2) candidateSet.add(w);
  }

  const uniqueCandidates = [...candidateSet];

  // Send the unique count early so the UI can compute a better ETA
  self.postMessage({ type: "uniqueCount", count: uniqueCandidates.length });
  self.postMessage({
    type: "status",
    message: `Found ${uniqueCandidates.length.toLocaleString()} unique tokens — analyzing…`,
  });

  // ── 2. Process unique words through compromise in batches ───────────────
  const BATCH = 500;
  const kept: string[] = [];

  for (let i = 0; i < uniqueCandidates.length; i += BATCH) {
    const batch = uniqueCandidates.slice(i, i + BATCH);
    const sentence = batch.join(" ");
    const doc = nlp(sentence);

    for (const tag of EXCLUDED_TAGS) {
      doc.remove(tag);
    }

    doc.nouns().toSingular();
    doc.verbs().toInfinitive();

    const terms: string[] = doc.terms().out("array") as string[];
    for (const raw of terms) {
      const word = raw.replace(/[^a-zA-Z\u00C0-\u024F]/g, "").toLowerCase();
      if (word.length >= 2) kept.push(word);
    }

    if (i % (BATCH * 2) === 0) {
      const pct = Math.min(100, Math.round(((i + BATCH) / uniqueCandidates.length) * 100));
      self.postMessage({ type: "status", message: `NLP processing… ${pct}%` });
    }
  }

  // ── 3. Deduplicate ─────────────────────────────────────────────────────
  self.postMessage({ type: "status", message: "Deduplicating…" });
  const seen = new Set<string>();
  const words: string[] = [];
  for (const w of kept) {
    if (seen.has(w)) continue;
    seen.add(w);
    words.push(w);
  }

  // ── 4. Score, label, flag ──────────────────────────────────────────────
  self.postMessage({ type: "status", message: "Scoring word difficulty…" });
  const scored: ScoredWord[] = words.map((word) => {
    const frequency = freq[word] ?? 0;
    return {
      word,
      frequency,
      difficulty: labelDifficulty(frequency),
      occurrences: occurrences.get(word) ?? 0,
      likelyName: likelyNames.has(word),
    };
  });

  scored.sort((a, b) => a.frequency - b.frequency || a.word.localeCompare(b.word));

  return { words, scored };
}

// ── Listen for messages from main thread ──────────────────────────────────

self.onmessage = (e: MessageEvent) => {
  if (e.data?.type === "process") {
    try {
      const result = processAndScore(e.data.text);
      self.postMessage({ type: "result", words: result.words, scored: result.scored });
    } catch (err) {
      self.postMessage({ type: "error", message: (err as Error).message });
    }
  }
};
