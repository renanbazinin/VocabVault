import type { FilterState } from "../App";
import type { DifficultyLabel } from "../lib/nlpWorker";

interface FiltersProps {
  filters: FilterState;
  onChange: (f: FilterState) => void;
}

const DIFFICULTIES: DifficultyLabel[] = [
  "unknown",
  "very rare",
  "rare",
  "uncommon",
  "common",
];

export default function Filters({ filters, onChange }: FiltersProps) {
  const set = <K extends keyof FilterState>(key: K, val: FilterState[K]) =>
    onChange({ ...filters, [key]: val });

  const toggleDifficulty = (difficulty: DifficultyLabel) => {
    const active = filters.difficulties.includes(difficulty);
    set(
      "difficulties",
      active
        ? filters.difficulties.filter((d) => d !== difficulty)
        : [...filters.difficulties, difficulty]
    );
  };

  return (
    <div className="filters">
      <h3 className="filters__title">Filters</h3>

      <div className="filters__body">
        {/* Search */}
        <div className="filters__field">
          <label className="filters__label" htmlFor="fSearch">Search</label>
          <input
            id="fSearch"
            className="filters__input"
            type="text"
            placeholder="Type to filter…"
            value={filters.search}
            onChange={(e) => set("search", e.target.value)}
          />
        </div>

        {/* Difficulty multi-select */}
        <div className="filters__field">
          <div className="filters__label-row">
            <label className="filters__label">Difficulty</label>
            {filters.difficulties.length > 0 && (
              <button
                type="button"
                className="filters__clear"
                onClick={() => set("difficulties", [])}
              >
                Clear
              </button>
            )}
          </div>
          <div className="filters__choices" aria-label="Difficulty filters">
            {DIFFICULTIES.map((d) => {
              const active = filters.difficulties.includes(d);
              return (
                <button
                  key={d}
                  type="button"
                  className={`filters__choice ${active ? "filters__choice--active" : ""}`}
                  onClick={() => toggleDifficulty(d)}
                  aria-pressed={active}
                >
                  {d[0].toUpperCase() + d.slice(1)}
                </button>
              );
            })}
          </div>
        </div>

        {/* Min word length */}
        <div className="filters__field">
          <label className="filters__label" htmlFor="fLen">
            Min length: <strong>{filters.minLength}</strong>
          </label>
          <input
            id="fLen"
            className="filters__range"
            type="range"
            min={2}
            max={12}
            value={filters.minLength}
            onChange={(e) => set("minLength", Number(e.target.value))}
          />
        </div>

        {/* Min occurrences */}
        <div className="filters__field">
          <label className="filters__label" htmlFor="fOcc">
            Min occurrences: <strong>{filters.minOccurrences}</strong>
          </label>
          <input
            id="fOcc"
            className="filters__range"
            type="range"
            min={1}
            max={20}
            value={filters.minOccurrences}
            onChange={(e) => set("minOccurrences", Number(e.target.value))}
          />
        </div>

        {/* Checkboxes */}
        <div className="filters__checks">
          <label className="filters__check">
            <input
              type="checkbox"
              checked={filters.hideLikelyNames}
              onChange={(e) => set("hideLikelyNames", e.target.checked)}
            />
            Hide likely names / places
          </label>

          <label className="filters__check">
            <input
              type="checkbox"
              checked={filters.hideUnknown}
              onChange={(e) => set("hideUnknown", e.target.checked)}
            />
            Hide "not in dictionary"
          </label>

          <label className="filters__check">
            <input
              type="checkbox"
              checked={filters.hideCommon}
              onChange={(e) => set("hideCommon", e.target.checked)}
            />
            Hide common words
          </label>
        </div>
      </div>
    </div>
  );
}
