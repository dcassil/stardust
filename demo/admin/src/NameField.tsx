/**
 * `NameField` — the top-of-sidebar per-tab display-name input (presence only).
 *
 * Local state while typing; commits the value to the `colab` identity ONLY on
 * Enter or blur (never per keystroke), so a name change triggers exactly one
 * identity re-join rather than one per key. Extracted from `App` when the demo
 * moved onto the default App Shell (the old custom top-bar that hosted it was
 * dropped with `renderLayout`); it now rides in the sidebar panel stack.
 */

import { useState, type ReactNode } from "react";

export interface NameFieldProps {
  initialName: string;
  onCommit: (name: string) => void;
}

export function NameField({ initialName, onCommit }: NameFieldProps): ReactNode {
  const [value, setValue] = useState(initialName);

  const commit = (): void => {
    if (value.trim() !== initialName.trim()) {
      onCommit(value);
    }
  };

  return (
    <label className="admin-name">
      <span className="admin-name__label">You</span>
      <input
        type="text"
        className="admin-name__input"
        data-testid="display-name-input"
        placeholder="Your name"
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
        }}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.currentTarget.blur();
          }
        }}
      />
    </label>
  );
}
