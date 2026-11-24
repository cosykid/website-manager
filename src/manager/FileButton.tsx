"use client";

import { useRef, type ReactNode } from "react";

type FileButtonProps = {
  className: string;
  disabled?: boolean;
  children: ReactNode;
  /** Called with the file the editor chose. */
  onFile: (file: File) => void;
};

/**
 * A button that asks for a JSON file.
 *
 * The browser's own file input cannot be styled and words itself ("Choose
 * file, no file chosen"). So it is kept out of sight and opened from an
 * ordinary button, which the keyboard and screen readers use like any other.
 */
export function FileButton({ className, disabled, children, onFile }: FileButtonProps) {
  const input = useRef<HTMLInputElement>(null);

  return (
    <>
      <input
        ref={input}
        type="file"
        accept="application/json,.json"
        hidden
        onChange={(event) => {
          const file = event.target.files?.[0];
          // Emptied, so that choosing the same file again, once it has been
          // fixed, still counts as a change.
          event.target.value = "";
          if (file) onFile(file);
        }}
      />
      <button
        type="button"
        className={className}
        disabled={disabled}
        onClick={() => input.current?.click()}
      >
        {children}
      </button>
    </>
  );
}
