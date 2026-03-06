/**
 * Adapter Pattern for file parsing.
 *
 * To add a new format (e.g., PDF, EPUB), implement the FileAdapter interface
 * and register the adapter in the ADAPTER_REGISTRY below.
 */

// ── Interface ────────────────────────────────────────────────────────────────

export interface FileAdapter {
  /** MIME types or extensions this adapter handles */
  readonly supportedTypes: string[];
  /** Read a File and return its raw text content */
  extractText(file: File): Promise<string>;
}

// ── TXT Adapter ──────────────────────────────────────────────────────────────

export class TxtAdapter implements FileAdapter {
  readonly supportedTypes = ["text/plain", ".txt"];

  extractText(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error("Failed to read text file."));
      reader.readAsText(file);
    });
  }
}

// ── Future adapters ──────────────────────────────────────────────────────────
// export class PdfAdapter implements FileAdapter { ... }
// export class EpubAdapter implements FileAdapter { ... }

// ── Registry ─────────────────────────────────────────────────────────────────

const ADAPTER_REGISTRY: FileAdapter[] = [
  new TxtAdapter(),
  // Add new adapters here:
  // new PdfAdapter(),
  // new EpubAdapter(),
];

/**
 * Picks the correct adapter for a given file based on its MIME type or
 * file extension.  Throws if no adapter is found.
 */
export function getAdapterForFile(file: File): FileAdapter {
  const ext = "." + file.name.split(".").pop()?.toLowerCase();

  const adapter = ADAPTER_REGISTRY.find(
    (a) =>
      a.supportedTypes.includes(file.type) ||
      a.supportedTypes.includes(ext)
  );

  if (!adapter) {
    throw new Error(
      `Unsupported file type "${file.type || ext}". ` +
      `Supported: ${ADAPTER_REGISTRY.flatMap((a) => a.supportedTypes).join(", ")}`
    );
  }

  return adapter;
}
