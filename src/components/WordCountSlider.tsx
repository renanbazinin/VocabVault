interface WordCountSliderProps {
  value: number;
  max: number;
  onChange: (n: number) => void;
}

const PRESETS = [25, 50, 100, 250, 500, 1000];

export default function WordCountSlider({
  value,
  max,
  onChange,
}: WordCountSliderProps) {
  return (
    <div className="slider">
      <label className="slider__label" htmlFor="wordCount">
        Words to show: <strong>{value}</strong>
      </label>

      <input
        id="wordCount"
        className="slider__range"
        type="range"
        min={1}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />

      <div className="slider__presets">
        {PRESETS.filter((p) => p <= max).map((p) => (
          <button
            key={p}
            className={`slider__btn ${p === value ? "slider__btn--active" : ""}`}
            onClick={() => onChange(p)}
          >
            {p}
          </button>
        ))}
      </div>
    </div>
  );
}
