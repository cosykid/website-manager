"use client";

import { useEffect, useRef, useState } from "react";

type RenameInputProps = {
  /** The name as it is now. */
  value: string;
  /** What is being named, for screen readers: "Name of Section 2". */
  label: string;
  /** The HTML id of the row this stands in for while the name is typed. */
  rowId: string;
  /** Called once: with the name as typed, or with null if Escape gave it up. */
  onDone: (name: string | null) => void;
};

/**
 * A name being typed over, in the place where it is shown.
 *
 * It works the way renaming does in a file browser. The whole name starts
 * selected, so typing replaces it. Enter keeps the new name, and so does
 * clicking somewhere else. Escape leaves the name as it was.
 */
export function RenameInput({ value, label, rowId, onDone }: RenameInputProps) {
  const input = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(value);
  // Enter takes the input off the page, which can also make it lose focus.
  // Only the first of the two may answer.
  const answered = useRef(false);

  useEffect(() => {
    input.current?.focus();
    input.current?.select();
  }, []);

  function finish(result: string | null, byKey: boolean) {
    if (answered.current) return;
    answered.current = true;
    onDone(result);

    // The row is drawn again in place of this input. A frame later it is on
    // the page, and takes the keyboard focus the input had.
    if (byKey) requestAnimationFrame(() => document.getElementById(rowId)?.focus());
  }

  return (
    <input
      ref={input}
      className="tree-rename"
      value={name}
      aria-label={label}
      maxLength={60}
      autoComplete="off"
      spellCheck={false}
      onChange={(event) => setName(event.target.value)}
      onBlur={() => finish(name, false)}
      onKeyDown={(event) => {
        if (event.key === "Enter") finish(name, true);
        if (event.key === "Escape") finish(null, true);
      }}
    />
  );
}
