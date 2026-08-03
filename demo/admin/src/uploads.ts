/**
 * `localStorage`-backed registry of images uploaded from the user's computer.
 *
 * The demo has no backend or object store, so a file picked in the image block's
 * "Upload from computer" mode is read into a data URL and (a) written straight
 * into the content as the image `value`, and (b) recorded here so it can be
 * re-selected later via the block's "Recently uploaded" mode without re-picking
 * the file. The registry is capped to bound `localStorage` usage (data URLs are
 * large) and is newest-first.
 */

const UPLOADS_KEY = "stardust-demo-uploads";

/** Max uploads retained; oldest beyond this are dropped to bound storage. */
const MAX_UPLOADS = 20;

/** A single previously-uploaded image, addressable by its data URL. */
export interface DemoUpload {
  /** The original file name shown in the "Recently uploaded" dropdown. */
  name: string;
  /** The full `data:` URL used directly as the image `src`/content value. */
  dataUrl: string;
  /** Epoch ms the file was added; used only for newest-first ordering. */
  addedAt: number;
}

function storage(): Storage | null {
  try {
    return typeof localStorage === "undefined" ? null : localStorage;
  } catch {
    return null;
  }
}

/** All recorded uploads, newest first. Empty when none / storage unavailable. */
export function listUploads(): DemoUpload[] {
  const store = storage();
  if (!store) return [];
  const raw = store.getItem(UPLOADS_KEY);
  if (raw === null) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return (parsed as DemoUpload[])
      .filter((u) => typeof u.dataUrl === "string" && typeof u.name === "string")
      .sort((a, b) => b.addedAt - a.addedAt);
  } catch {
    return [];
  }
}

/**
 * Record an uploaded file (deduping by data URL) and return the updated list,
 * newest first. Swallows quota errors — the image still lands in content even if
 * the recent-uploads registry can't grow.
 */
export function addUpload(name: string, dataUrl: string): DemoUpload[] {
  const existing = listUploads().filter((u) => u.dataUrl !== dataUrl);
  const next = [{ name, dataUrl, addedAt: Date.now() }, ...existing].slice(0, MAX_UPLOADS);
  const store = storage();
  if (store) {
    try {
      store.setItem(UPLOADS_KEY, JSON.stringify(next));
    } catch {
      // Over quota — keep the in-memory list; content already holds the data URL.
    }
  }
  return next;
}

/** Read a picked `File` into a `data:` URL suitable for an image `src`/value. */
export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      resolve(typeof reader.result === "string" ? reader.result : "");
    };
    reader.onerror = () => {
      reject(reader.error ?? new Error("Failed to read file"));
    };
    reader.readAsDataURL(file);
  });
}
