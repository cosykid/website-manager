"use client";

import { useState } from "react";
import {
  MAX_PAGE_FILE_BYTES,
  PAGE_FILE_ACCEPT,
  PAGE_FILE_TOO_LARGE,
  pageFileName,
  readPageFile,
  writePageFile,
} from "@/page-model/file";
import type { ComponentInstance, PageDocument } from "@/page-model/types";
import { Dialog } from "./Dialog";
import styles from "./Dialog.module.css";
import { FileButton } from "./FileButton";
import { ImportProblems, type RefusedFile } from "./ImportProblems";

type PageJsonDialogProps = {
  open: boolean;
  /** The page as it is in the editor right now. */
  page: PageDocument;
  hasUnsavedChanges: boolean;
  /** Called with the components of a file that was read without a problem. */
  onImport: (fileName: string, content: ComponentInstance[]) => void;
  onClose: () => void;
};

/**
 * The "Page JSON" dialog: takes the page out of the editor as a file, or
 * brings the components of a file in.
 *
 * Both happen here in the browser. An export is the editor's own copy of the
 * page written out as text. An import only changes that copy, so it reaches
 * the server the usual way, through "Save page".
 */
export function PageJsonDialog({
  open,
  page,
  hasUnsavedChanges,
  onImport,
  onClose,
}: PageJsonDialogProps) {
  const [refused, setRefused] = useState<RefusedFile | null>(null);

  function close() {
    // So an old problem is not there the next time the dialog opens.
    setRefused(null);
    onClose();
  }

  function exportPage() {
    downloadTextFile(pageFileName(page.siteId, page.path), writePageFile(page));
    close();
  }

  async function importFile(file: File) {
    const read =
      file.size > MAX_PAGE_FILE_BYTES
        ? { ok: false as const, problems: [PAGE_FILE_TOO_LARGE] }
        : readPageFile(await file.text());

    if (!read.ok) {
      setRefused({ fileName: file.name, problems: read.problems });
      return;
    }
    setRefused(null);
    onImport(file.name, read.page.content);
  }

  return (
    <Dialog
      open={open}
      title="Page JSON"
      titleId="page-json-title"
      closeLabel="Close"
      onClose={close}
    >
      <ul className={styles.choices}>
        <li>
          <button type="button" className={styles.choice} onClick={exportPage}>
            <span className={styles.choiceLabel}>Export</span>{" "}
            <span className={styles.choiceDescription}>
              Download this page as a file
              {hasUnsavedChanges ? ", with the changes you have not saved yet" : ""}.
              Keep it, edit it by hand, or import it into another site.
            </span>
          </button>
        </li>
        <li>
          <FileButton
            className={styles.choice}
            accept={PAGE_FILE_ACCEPT}
            onFile={importFile}
          >
            <span className={styles.choiceLabel}>Import</span>{" "}
            <span className={styles.choiceDescription}>
              Replace this page&apos;s components with the ones in a file. The
              title and path stay as they are, and nothing is saved until you
              choose Save page.
            </span>
          </FileButton>
        </li>
      </ul>

      {refused && <ImportProblems refused={refused} />}

      <p className="help">
        To add a file as a new page instead, use &quot;Import a page&quot; under
        the site&apos;s list of pages.
      </p>
    </Dialog>
  );
}

/** Has the browser save text as a file, the way it saves a download. */
function downloadTextFile(fileName: string, text: string): void {
  const address = URL.createObjectURL(new Blob([text], { type: "application/json" }));

  const link = document.createElement("a");
  link.href = address;
  link.download = fileName;
  link.click();

  // The address is only needed until the download has started.
  setTimeout(() => URL.revokeObjectURL(address), 1000);
}
