"use client";

import { useEffect, useRef } from "react";
import type { ComponentDefinition } from "@/library/types";
import styles from "./ComponentPicker.module.css";

type ComponentPickerProps = {
  open: boolean;
  /** Where the component will go: "the page", or the container's name. */
  destination: string;
  definitions: Record<string, ComponentDefinition>;
  onPick: (type: string) => void;
  onClose: () => void;
};

/**
 * The "Add a component" dialog. It lists whatever is in the library, so a new
 * component appears here as soon as its definition exists.
 *
 * It is a native <dialog>: the browser keeps keyboard focus inside it and
 * closes it on Escape.
 */
export function ComponentPicker({
  open,
  destination,
  definitions,
  onPick,
  onClose,
}: ComponentPickerProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  // A dialog is opened and closed by calling it, not by a prop, so follow
  // the `open` prop here.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      className={styles.dialog}
      aria-labelledby="component-picker-title"
      onClose={onClose}
      // A click on the dimmed area outside the box lands on the dialog itself.
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className={styles.content}>
        <h2 id="component-picker-title" className={styles.title}>
          Add a component to {destination}
        </h2>

        <ul className={styles.choices}>
          {Object.values(definitions).map((definition) => (
            <li key={definition.type}>
              <button
                type="button"
                className={styles.choice}
                onClick={() => onPick(definition.type)}
              >
                {/* The space keeps the name and description apart when a
                    screen reader reads the button out. */}
                <span className={styles.choiceLabel}>{definition.label}</span>{" "}
                <span className={styles.choiceDescription}>
                  {definition.description}
                </span>
              </button>
            </li>
          ))}
        </ul>

        <div className={styles.footer}>
          <button type="button" className="button" onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    </dialog>
  );
}
