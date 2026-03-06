import { useState } from "react";
import { HelpCircle, X } from "lucide-react";
import "./Instructions.css";

export default function Instructions() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        className="instructions-btn"
        onClick={() => setOpen(true)}
        title="How to use"
      >
        <HelpCircle size={18} />
      </button>

      {open && (
        <div className="modal-overlay" onClick={() => setOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <button className="modal__close" onClick={() => setOpen(false)}>
              <X size={18} />
            </button>

            <h2 className="modal__title">How to Use Word Extract</h2>

            <div className="modal__body">
              <h3>Step 1 — Upload your book</h3>
              <p>
                Drag & drop a <strong>.txt</strong>, <strong>.pdf</strong>, or <strong>.epub</strong> file
                (or click to browse). The app reads the file entirely in your browser — nothing is
                uploaded to any server.
              </p>

              <h3>Step 2 — Wait for analysis</h3>
              <p>
                The app extracts every unique word, filters out names, places,
                and common words, then ranks them from rarest to most common
                using a 333,000-word frequency dictionary.
              </p>

              <h3>Step 3 — Refine your list</h3>
              <p>
                Use the <strong>Filters</strong> panel to fine-tune your results:
              </p>
              <ul>
                <li><strong>Hide likely names</strong> — removes words that only ever appear capitalised (fictional character/place names).</li>
                <li><strong>Hide "not in dictionary"</strong> — removes made-up words, archaic spellings, or typos.</li>
                <li><strong>Hide common words</strong> — removes everyday words you already know.</li>
                <li><strong>Min occurrences</strong> — increase this to focus on words the author uses repeatedly (more important to learn).</li>
                <li><strong>Difficulty choices</strong> — combine multiple levels like "very rare" + "rare" together.</li>
              </ul>

              <h3>Step 4 — Export & study</h3>
              <p>
                Use the <strong>Export</strong> panel to copy or download your word list.
                Choose "One per line" format for easy pasting.
              </p>

              <h3>How to study with your list</h3>
              <ol>
                <li>
                  <strong>Go to{" "}
                  <a href="https://www.vocabulary.com/lists/" target="_blank" rel="noopener noreferrer">
                    vocabulary.com/lists
                  </a>
                  </strong> — create a free account, then click <em>"Create a new list"</em>.
                </li>
                <li>
                  Paste your exported words into the list. Vocabulary.com will
                  automatically find definitions and create interactive study
                  activities.
                </li>
                <li>
                  Use the <strong>Learn</strong> mode to practice with adaptive
                  quizzes before you start reading the book.
                </li>
                <li>
                  Alternatively, paste the list into <strong>Anki</strong> or
                  <strong> Quizlet</strong> to create flashcards.
                </li>
              </ol>

              <div className="modal__tip">
                <strong>Pro tip:</strong> Start with the Top 50–100 rarest words.
                Learning even a handful of the hardest words before reading
                dramatically improves comprehension and flow.
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
