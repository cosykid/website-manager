"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  MAX_PAGE_FILE_BYTES,
  PAGE_FILE_ACCEPT,
  PAGE_FILE_TOO_LARGE,
} from "@/page-model/file";
import { importPageAction } from "./actions";
import { FileButton } from "./FileButton";
import { ImportProblems, type RefusedFile } from "./ImportProblems";

/** Creates a page on a site from a JSON file, then opens it in the editor. */
export function ImportPageForm({ siteId }: { siteId: string }) {
  const router = useRouter();
  const [importing, setImporting] = useState(false);
  const [refused, setRefused] = useState<RefusedFile | null>(null);

  async function importFile(file: File) {
    setRefused(null);

    // Checked here because a request that is too large never reaches the
    // action, so the action could not say what was wrong.
    if (file.size > MAX_PAGE_FILE_BYTES) {
      setRefused({ fileName: file.name, problems: [PAGE_FILE_TOO_LARGE] });
      return;
    }

    setImporting(true);
    try {
      const result = await importPageAction({ siteId, fileText: await file.text() });
      if (result.ok) {
        router.push(`/sites/${siteId}/pages/${result.pageId}`);
        return;
      }
      setRefused({ fileName: file.name, problems: result.problems });
    } catch {
      setRefused({
        fileName: file.name,
        problems: ["Check that the database is running, then try again."],
      });
    }
    setImporting(false);
  }

  return (
    <section className="new-page" aria-labelledby="import-heading">
      <h2 id="import-heading" className="section-heading">
        Import a page
      </h2>
      <p className="help">
        Add a page from a JSON file: one exported from a page&apos;s editor, or
        written by hand. The file gives the page its title, path and components.
      </p>

      <div>
        <FileButton
          className="button"
          accept={PAGE_FILE_ACCEPT}
          disabled={importing}
          onFile={importFile}
        >
          {importing ? "Importing page…" : "Choose a JSON file"}
        </FileButton>
      </div>

      {refused && <ImportProblems refused={refused} />}
    </section>
  );
}
