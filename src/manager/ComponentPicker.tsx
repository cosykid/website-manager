"use client";

import type { ComponentDefinition } from "@/library/types";
import { Dialog } from "./Dialog";
import styles from "./Dialog.module.css";

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
 */
export function ComponentPicker({
  open,
  destination,
  definitions,
  onPick,
  onClose,
}: ComponentPickerProps) {
  return (
    <Dialog
      open={open}
      title={`Add a component to ${destination}`}
      titleId="component-picker-title"
      closeLabel="Cancel"
      onClose={onClose}
    >
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
    </Dialog>
  );
}
