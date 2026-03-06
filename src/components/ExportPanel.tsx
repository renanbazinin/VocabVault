import { useState } from "react";
import type { ScoredWord } from "../lib/nlpWorker";

interface ExportPanelProps {
  words: ScoredWord[];
}

type ExportFormat = "lines" | "comma" | "numbered" | "tsv";

const FORMAT_LABELS: Record<ExportFormat, string> = {
  lines: "One per line",
  comma: "Comma-separated",
  numbered: "Numbered list",
  tsv: "TSV (word + freq)",
};

function formatWords(words: ScoredWord[], fmt: ExportFormat): string {
  switch (fmt) {
    case "lines":
      return words.map((w) => w.word).join("\n");
    case "comma":
      return words.map((w) => w.word).join(", ");
    case "numbered":
      return words.map((w, i) => `${i + 1}. ${w.word}`).join("\n");
    case "tsv":
      return ["word\tfrequency\tdifficulty", ...words.map((w) => `${w.word}\t${w.frequency}\t${w.difficulty}`)].join("\n");
  }
}

export default function ExportPanel({ words }: ExportPanelProps) {
  const [format, setFormat] = useState<ExportFormat>("lines");
  const [copied, setCopied] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const text = formatWords(words, format);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const ext = format === "tsv" ? "tsv" : "txt";
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `vocabulary.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (words.length === 0) return null;

  return (
    <div className="export">
      <div className="export__header">
        <h3 className="export__title">Export List</h3>
        <div className="export__actions">
          <select
            className="export__select"
            value={format}
            onChange={(e) => setFormat(e.target.value as ExportFormat)}
          >
            {(Object.entries(FORMAT_LABELS) as [ExportFormat, string][]).map(
              ([k, v]) => (
                <option key={k} value={k}>{v}</option>
              )
            )}
          </select>

          <button className="export__btn" onClick={handleCopy}>
            {copied ? "✓ Copied!" : "Copy"}
          </button>
          <button className="export__btn" onClick={handleDownload}>
            Download
          </button>
          <button
            className="export__btn export__btn--ghost"
            onClick={() => setShowPreview((p) => !p)}
          >
            {showPreview ? "Hide preview" : "Preview"}
          </button>
        </div>
      </div>

      {showPreview && (
        <pre className="export__preview">{text}</pre>
      )}
    </div>
  );
}
