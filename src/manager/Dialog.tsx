"use client";

import { useEffect, useRef, type ReactNode } from "react";
import styles from "./Dialog.module.css";

type DialogProps = {
  open: boolean;
  title: string;
  /** The HTML id of the title. No two dialogs on a screen may share one. */
  titleId: string;
  /** What the button that closes the dialog says, such as "Cancel". */
  closeLabel: string;
  /**
   * The dialog is open while something is under way, and closes when it is
   * done. A click beside it then does nothing, so that it is not called off by
   * accident.
   */
  busy?: boolean;
  onClose: () => void;
  children: ReactNode;
};

/**
 * The box the manager's dialogs share: a title, what the dialog offers, and a
 * button that closes it.
 *
 * It is a native <dialog>: the browser keeps keyboard focus inside it, closes
 * it on Escape, and puts focus back where it was afterwards.
 */
export function Dialog({
  open,
  title,
  titleId,
  closeLabel,
  busy = false,
  onClose,
  children,
}: DialogProps) {
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
      data-busy={busy || undefined}
      aria-labelledby={titleId}
      // The browser can report a close late, once the dialog is open again.
      onClose={(event) => {
        if (!event.currentTarget.open) onClose();
      }}
      // A click on the dimmed area outside the box lands on the dialog itself.
      onClick={(event) => {
        if (event.target === event.currentTarget && !busy) onClose();
      }}
    >
      <div className={styles.content}>
        <h2 id={titleId} className={styles.title}>
          {title}
        </h2>

        {children}

        <div className={styles.footer}>
          <button type="button" className="button" onClick={onClose}>
            {closeLabel}
          </button>
        </div>
      </div>
    </dialog>
  );
}
