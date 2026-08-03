/**
 * `ImageField` — the image block's side-panel editor.
 *
 * Replaces the plain URL text box with a source picker offering three ways to set
 * the image:
 *
 *  - **URL** — a text input bound to the content `value` (the original behavior).
 *  - **Upload from computer** — a file button; the picked file is read into a
 *    `data:` URL, recorded in the {@link listUploads recent-uploads registry}, and
 *    written to the content `value` (so it renders immediately and, via the store's
 *    `localStorage` persistence, survives reloads).
 *  - **Recently uploaded** — a dropdown of previously-uploaded file names; picking
 *    one restores its data URL as the value without re-picking the file.
 *
 * All edits flow through the same `onEdit({ value })` the block's `renderField`
 * received, so they travel the normal op → VCE store → iframe re-inject path.
 */

import { useEffect, useState, type ReactNode } from "react";
import type { CmsContent } from "@stardust-cms/iframe-adapter/protocol";
import { addUpload, listUploads, readFileAsDataUrl, type DemoUpload } from "./uploads";

type ImageSource = "url" | "upload" | "recent";

export interface ImageFieldProps {
  content: CmsContent;
  onEdit: (patch: { value: string }) => void;
}

/** Choose the initial source mode: "recent" if the current value is a stored
 * upload, "url" otherwise (a plain URL, an empty value, or an inline data URL). */
function initialSource(value: string, uploads: readonly DemoUpload[]): ImageSource {
  if (value && uploads.some((u) => u.dataUrl === value)) return "recent";
  return "url";
}

export function ImageField({ content, onEdit }: ImageFieldProps): ReactNode {
  const value = content.value ?? "";
  const [uploads, setUploads] = useState<DemoUpload[]>(() => listUploads());
  const [source, setSource] = useState<ImageSource>(() => initialSource(value, uploads));
  const [error, setError] = useState<string | null>(null);

  // If the value becomes one of our stored uploads (e.g. just uploaded), keep the
  // picker in sync so the matching mode's control reflects the selection.
  useEffect(() => {
    if (source === "url" && value && uploads.some((u) => u.dataUrl === value)) {
      setSource("recent");
    }
  }, [value, uploads, source]);

  const handleFile = async (file: File | undefined): Promise<void> => {
    if (!file) return;
    setError(null);
    try {
      const dataUrl = await readFileAsDataUrl(file);
      if (!dataUrl) throw new Error("empty file");
      setUploads(addUpload(file.name, dataUrl));
      onEdit({ value: dataUrl });
    } catch {
      setError("Could not read that file. Try another image.");
    }
  };

  return (
    <label className="panel__field">
      <span>Image</span>
      <select
        className="panel__select"
        data-testid="image-source"
        value={source}
        onChange={(e) => {
          setSource(e.target.value as ImageSource);
        }}
      >
        <option value="url">URL</option>
        <option value="upload">Upload from computer</option>
        <option value="recent">Recently uploaded</option>
      </select>

      {source === "url" && (
        <input
          type="text"
          className="panel__control"
          data-testid="panel-image"
          placeholder="https://example.com/image.png"
          value={value}
          onChange={(e) => {
            onEdit({ value: e.target.value });
          }}
        />
      )}

      {source === "upload" && (
        <input
          type="file"
          accept="image/*"
          className="panel__control"
          data-testid="panel-image-upload"
          onChange={(e) => {
            void handleFile(e.target.files?.[0]);
          }}
        />
      )}

      {source === "recent" &&
        (uploads.length > 0 ? (
          <select
            className="panel__control panel__select"
            data-testid="panel-image-recent"
            value={uploads.some((u) => u.dataUrl === value) ? value : ""}
            onChange={(e) => {
              if (e.target.value) onEdit({ value: e.target.value });
            }}
          >
            <option value="" disabled>
              Choose an uploaded image…
            </option>
            {uploads.map((u) => (
              <option key={u.dataUrl} value={u.dataUrl}>
                {u.name}
              </option>
            ))}
          </select>
        ) : (
          <p className="panel__hint" data-testid="panel-image-recent-empty">
            No uploads yet — use “Upload from computer” first.
          </p>
        ))}

      {error && (
        <p className="panel__hint" role="alert">
          {error}
        </p>
      )}
    </label>
  );
}
