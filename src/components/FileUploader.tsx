import { useCallback, useRef, useState, type ChangeEvent, type DragEvent, type KeyboardEvent } from "react";
import { Upload } from "lucide-react";
import { getAdapterForFile } from "../adapters/fileAdapter";

interface FileUploaderProps {
  onTextExtracted: (text: string, fileName: string, fileSize: number) => void;
}

export default function FileUploader({ onTextExtracted }: FileUploaderProps) {
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const handleFile = useCallback(
    async (file: File) => {
      setError(null);
      setLoading(true);
      try {
        const adapter = getAdapterForFile(file);
        const text = await adapter.extractText(file);
        onTextExtracted(text, file.name, file.size);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    },
    [onTextExtracted]
  );

  const onInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const onDragOver = (e: DragEvent) => {
    e.preventDefault();
    setDragging(true);
  };

  const onDragLeave = () => setDragging(false);

  const openPicker = () => {
    if (!loading) inputRef.current?.click();
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      openPicker();
    }
  };

  return (
    <div
      className={`dropzone ${dragging ? "dropzone--active" : ""}`}
      role="button"
      tabIndex={0}
      aria-label="Upload a text file"
      onClick={openPicker}
      onKeyDown={onKeyDown}
      onDrop={onDrop}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
    >
      <div className="dropzone__inner">
        <Upload className="dropzone__icon" size={48} strokeWidth={1.5} />

        <p className="dropzone__label">
          {loading
            ? "Reading file…"
            : "Drag & drop a .txt file here, or click to browse"}
        </p>

        <input
          ref={inputRef}
          className="dropzone__input"
          type="file"
          accept=".txt,text/plain"
          onChange={onInputChange}
          disabled={loading}
        />
      </div>

      {error && <p className="dropzone__error">{error}</p>}
    </div>
  );
}
