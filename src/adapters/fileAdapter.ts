/**
 * Adapter Pattern for file parsing.
 *
 * To add a new format (e.g., PDF, EPUB), implement the FileAdapter interface
 * and register the adapter in the ADAPTER_REGISTRY below.
 */

import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";

function normalizeText(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function dirname(path: string): string {
  const idx = path.lastIndexOf("/");
  return idx >= 0 ? path.slice(0, idx) : "";
}

function resolveZipPath(baseDir: string, relativePath: string): string {
  const sanitized = relativePath.split("#")[0].split("?")[0];
  const input = sanitized.startsWith("/") ? sanitized.slice(1) : sanitized;
  const segments = `${baseDir ? `${baseDir}/` : ""}${input}`.split("/");
  const resolved: string[] = [];

  for (const segment of segments) {
    if (!segment || segment === ".") continue;
    if (segment === "..") {
      resolved.pop();
      continue;
    }
    resolved.push(segment);
  }

  return resolved.join("/");
}

function parseXml(xml: string, type: DOMParserSupportedType = "application/xml"): Document {
  return new DOMParser().parseFromString(xml, type);
}

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

// ── PDF Adapter ──────────────────────────────────────────────────────────────

export class PdfAdapter implements FileAdapter {
  readonly supportedTypes = ["application/pdf", ".pdf"];

  async extractText(file: File): Promise<string> {
    const pdfjs = await import("pdfjs-dist");
    pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
    const buffer = await file.arrayBuffer();
    const pdf = await pdfjs.getDocument({
      data: new Uint8Array(buffer),
      isEvalSupported: false,
      useWorkerFetch: false,
    }).promise;

    const pages: string[] = [];

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const text = content.items
        .map((item) => ("str" in item ? item.str : ""))
        .join(" ")
        .trim();

      const normalized = normalizeText(text);
      if (normalized) pages.push(normalized);
    }

    const result = pages.join("\n\n").trim();
    if (!result) {
      throw new Error("Could not extract text from this PDF.");
    }

    return result;
  }
}

// ── EPUB Adapter ─────────────────────────────────────────────────────────────

export class EpubAdapter implements FileAdapter {
  readonly supportedTypes = ["application/epub+zip", ".epub"];

  async extractText(file: File): Promise<string> {
    const { default: JSZip } = await import("jszip");
    const zip = await JSZip.loadAsync(await file.arrayBuffer());

    const containerFile = zip.file("META-INF/container.xml");
    if (!containerFile) {
      throw new Error("Invalid EPUB: missing META-INF/container.xml.");
    }

    const containerXml = await containerFile.async("string");
    const containerDoc = parseXml(containerXml);
    const rootFile = containerDoc.querySelector("rootfile")?.getAttribute("full-path");

    if (!rootFile) {
      throw new Error("Invalid EPUB: package document not found.");
    }

    const opfPath = resolveZipPath("", rootFile);
    const opfFile = zip.file(opfPath);
    if (!opfFile) {
      throw new Error(`Invalid EPUB: missing package file at ${opfPath}.`);
    }

    const opfXml = await opfFile.async("string");
    const opfDoc = parseXml(opfXml);
    const opfDir = dirname(opfPath);

    const manifest = new Map<string, string>();
    for (const item of Array.from(opfDoc.querySelectorAll("manifest > item"))) {
      const id = item.getAttribute("id");
      const href = item.getAttribute("href");
      if (id && href) manifest.set(id, href);
    }

    const spineRefs = Array.from(opfDoc.querySelectorAll("spine > itemref"))
      .map((item) => item.getAttribute("idref"))
      .filter((id): id is string => Boolean(id));

    const sections: string[] = [];

    for (const idRef of spineRefs) {
      const href = manifest.get(idRef);
      if (!href) continue;

      const contentPath = resolveZipPath(opfDir, href);
      const contentFile = zip.file(contentPath);
      if (!contentFile) continue;

      const markup = await contentFile.async("string");
      const doc = parseXml(markup, "application/xhtml+xml");
      const text = doc.querySelector("body")?.textContent ?? doc.documentElement?.textContent ?? "";
      const normalized = normalizeText(text);
      if (normalized) sections.push(normalized);
    }

    const result = sections.join("\n\n").trim();
    if (!result) {
      throw new Error("Could not extract text from this EPUB.");
    }

    return result;
  }
}

// ── Registry ─────────────────────────────────────────────────────────────────

const ADAPTER_REGISTRY: FileAdapter[] = [
  new TxtAdapter(),
  new PdfAdapter(),
  new EpubAdapter(),
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
