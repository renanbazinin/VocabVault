import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import FileUploader from "./components/FileUploader";
import WordCountSlider from "./components/WordCountSlider";
import Filters from "./components/Filters";
import ExportPanel from "./components/ExportPanel";
import WordList from "./components/WordList";
import { FileText, Lightbulb } from "lucide-react";
import ThemeToggle from "./components/ThemeToggle";
import Instructions from "./components/Instructions";
import type { ScoredWord, DifficultyLabel } from "./lib/nlpWorker";
import NlpWorker from "./lib/nlpWorker?worker";
import "./App.css";

export interface FilterState {
  hideUnknown: boolean;       // hide "not in dictionary"
  hideLikelyNames: boolean;   // hide capitalisation-detected names
  hideCommon: boolean;        // hide "common" words
  minLength: number;          // minimum word length
  minOccurrences: number;     // appeared at least N times in text
  search: string;             // free-text search
  difficulties: DifficultyLabel[];
}

const DEFAULT_FILTERS: FilterState = {
  hideUnknown: false,
  hideLikelyNames: true,
  hideCommon: true,
  minLength: 2,
  minOccurrences: 1,
  search: "",
  difficulties: [],
};

export default function App() {
  const [allScored, setAllScored] = useState<ScoredWord[]>([]);
  const [totalUnique, setTotalUnique] = useState(0);
  const [limit, setLimit] = useState(100);
  const [fileName, setFileName] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [statusMsg, setStatusMsg] = useState("Analyzing text…");
  const [estimatedTime, setEstimatedTime] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const workerRef = useRef<Worker | null>(null);
  const startTimeRef = useRef<number>(0);

  // Live elapsed-time counter while processing
  useEffect(() => {
    if (!processing) return;
    const id = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000));
    }, 1000);
    return () => clearInterval(id);
  }, [processing]);

  const handleText = useCallback((text: string, name: string, _fileSize: number) => {
    setProcessing(true);
    setStatusMsg("Starting analysis…");
    startTimeRef.current = Date.now();
    setElapsed(0);
    setEstimatedTime(null);

    workerRef.current?.terminate();

    const worker = new NlpWorker();
    workerRef.current = worker;

    worker.onmessage = (e: MessageEvent) => {
      const data = e.data;

      if (data.type === "status") {
        setStatusMsg(data.message);
      } else if (data.type === "uniqueCount") {
        // Better ETA: ~6ms per unique word for compromise batches
        const estSec = Math.max(3, Math.round((data.count * 6) / 1000));
        if (estSec < 60) {
          setEstimatedTime(`~${estSec}s`);
        } else {
          const mins = Math.floor(estSec / 60);
          const secs = estSec % 60;
          setEstimatedTime(`~${mins}m${secs > 0 ? ` ${secs}s` : ""}`);
        }
      } else if (data.type === "result") {
        setAllScored(data.scored);
        setTotalUnique(data.words.length);
        setFileName(name);
        setProcessing(false);
        worker.terminate();
        workerRef.current = null;
      } else if (data.type === "error") {
        setStatusMsg(`Error: ${data.message}`);
        setProcessing(false);
        worker.terminate();
        workerRef.current = null;
      }
    };

    worker.postMessage({ type: "process", text });
  }, []);

  // Apply filters then slice to limit
  const filtered = useMemo(() => {
    if (!allScored.length) return [];
    const q = filters.search.toLowerCase().trim();
    return allScored.filter((w) => {
      if (filters.hideUnknown && w.frequency === 0) return false;
      if (filters.hideLikelyNames && w.likelyName) return false;
      if (filters.hideCommon && w.difficulty === "common") return false;
      if (w.word.length < filters.minLength) return false;
      if (w.occurrences < filters.minOccurrences) return false;
      if (filters.difficulties.length > 0 && !filters.difficulties.includes(w.difficulty)) return false;
      if (q && !w.word.includes(q)) return false;
      return true;
    });
  }, [allScored, filters]);

  const ranked = useMemo(() => filtered.slice(0, limit), [filtered, limit]);

  const handleReset = () => {
    workerRef.current?.terminate();
    workerRef.current = null;
    setAllScored([]);
    setTotalUnique(0);
    setFileName(null);
    setProcessing(false);
    setEstimatedTime(null);
    setElapsed(0);
    setFilters(DEFAULT_FILTERS);
  };

  return (
    <div className="app">
      <header className="app__header">
        <div className="app__brand">
          <h1 className="app__title">
            <img src="/logo.svg" alt="" className="app__logo" aria-hidden="true" />
            <span>Word Extract</span>
          </h1>
        </div>
        <p className="app__subtitle">
          Pre-reader study guide — find the hardest vocabulary in any text
        </p>
        <div className="app__header-actions">
          <Instructions />
          <ThemeToggle />
        </div>
      </header>

      <main className="app__main">
        {!fileName && !processing && (
          <FileUploader onTextExtracted={handleText} />
        )}

        {processing && (
          <div className="app__processing">
            <div className="spinner" />
            <p>{statusMsg}</p>
            <div className="app__estimate">
              {estimatedTime && (
                <span className="app__estimate-badge">Est. {estimatedTime}</span>
              )}
              <span className="app__elapsed">{elapsed}s elapsed</span>
            </div>
          </div>
        )}

        {fileName && !processing && (
          <>
            <div className="app__toolbar">
              <span className="app__file">
                <FileText size={16} style={{ verticalAlign: '-2px' }} />{" "}
                <strong>{fileName}</strong> — {totalUnique.toLocaleString()}{" "}
                unique words found
              </span>
              <button className="app__reset" onClick={handleReset}>
                Upload another file
              </button>
            </div>

            <Filters filters={filters} onChange={setFilters} />

            <WordCountSlider
              value={limit}
              max={Math.min(filtered.length, 2000)}
              onChange={setLimit}
            />

            <ExportPanel words={ranked} />

            <div className="vocab-tip">
              <span className="vocab-tip__icon"><Lightbulb size={18} /></span>
              <p>
                Paste your exported list into{" "}
                <a
                  href="https://www.vocabulary.com/lists/"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  vocabulary.com/lists
                </a>{" "}
                to get definitions and interactive study activities — or import
                into <strong>Anki</strong> / <strong>Quizlet</strong> for flashcards.
              </p>
            </div>

            <WordList words={ranked} total={filtered.length} />
          </>
        )}
      </main>

    </div>
  );
}
