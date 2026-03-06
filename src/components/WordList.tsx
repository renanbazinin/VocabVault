import type { ScoredWord } from "../lib/nlpWorker";
import { User } from "lucide-react";

interface WordListProps {
  words: ScoredWord[];
  total: number;
}

const DIFF_COLORS: Record<string, string> = {
  unknown: "#f87171",
  "very rare": "#fb923c",
  rare: "#fbbf24",
  uncommon: "#a78bfa",
  common: "#34d399",
};

export default function WordList({ words, total }: WordListProps) {
  if (words.length === 0) return null;

  return (
    <section className="wordlist">
      <h2 className="wordlist__heading">
        Showing {words.length} of {total.toLocaleString()} filtered words
      </h2>

      <div className="wordlist__grid">
        <div className="wordlist__row wordlist__row--header">
          <span className="wordlist__rank">#</span>
          <span className="wordlist__word">Word</span>
          <span className="wordlist__diff">Difficulty</span>
          <span className="wordlist__occ">Uses</span>
          <span className="wordlist__freq">Frequency</span>
        </div>

        {words.map((w, i) => (
          <div
            className={`wordlist__row ${w.likelyName ? "wordlist__row--name" : ""}`}
            key={w.word}
          >
            <span className="wordlist__rank">{i + 1}</span>
            <span className="wordlist__word">
              {w.word}
              {w.likelyName && <span className="wordlist__name-flag" title="Likely a name / place"><User size={12} /></span>}
            </span>
            <span className="wordlist__diff">
              <span
                className="wordlist__diff-dot"
                style={{ background: DIFF_COLORS[w.difficulty] ?? "#888" }}
              />
              {w.difficulty}
            </span>
            <span className="wordlist__occ">{w.occurrences}×</span>
            <span className="wordlist__freq">
              {w.frequency === 0 ? (
                <span className="wordlist__badge">not in dict</span>
              ) : (
                w.frequency.toLocaleString()
              )}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
