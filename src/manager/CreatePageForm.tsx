"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import {
  checkPageDetails,
  suggestPath,
  type PageDetailErrors,
} from "@/page-model/details";
import { createPageAction } from "./actions";
import { Icon } from "./Icon";

/** Creates an empty page on a site, then opens it in the editor. */
export function CreatePageForm({ siteId }: { siteId: string }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [path, setPath] = useState("");
  // Until the editor types a path of their own, one is suggested from the title.
  const [pathWasTyped, setPathWasTyped] = useState(false);
  const [errors, setErrors] = useState<PageDetailErrors>({});
  const [failure, setFailure] = useState("");
  const [creating, setCreating] = useState(false);

  function changeTitle(value: string) {
    setTitle(value);
    if (!pathWasTyped) setPath(value.trim() === "" ? "" : suggestPath(value));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFailure("");

    const found = checkPageDetails(title, path);
    setErrors(found);
    if (found.title || found.path) return;

    setCreating(true);
    try {
      const result = await createPageAction({ siteId, title, path });
      if (result.ok) {
        router.push(`/sites/${siteId}/pages/${result.pageId}`);
        return;
      }
      setErrors(result.errors);
    } catch {
      setFailure(
        "The page could not be created. Check that the database is running, then try again.",
      );
    }
    setCreating(false);
  }

  return (
    <form className="new-page" onSubmit={handleSubmit} noValidate>
      <h2 className="section-heading">New page</h2>

      <div className="form-grid">
        <div className="field">
          <label className="label" htmlFor="new-page-title">
            Title
          </label>
          <input
            id="new-page-title"
            className="input"
            value={title}
            onChange={(event) => changeTitle(event.target.value)}
            placeholder="About us"
            aria-invalid={errors.title ? true : undefined}
            aria-describedby={errors.title ? "new-page-title-error" : undefined}
          />
          {errors.title && (
            <p className="error" id="new-page-title-error" role="alert">
              <Icon name="problem" />
              {errors.title}
            </p>
          )}
        </div>

        <div className="field">
          <label className="label" htmlFor="new-page-path">
            Path
          </label>
          <input
            id="new-page-path"
            className="input"
            value={path}
            onChange={(event) => {
              setPath(event.target.value);
              setPathWasTyped(true);
            }}
            placeholder="/about-us"
            autoCapitalize="none"
            spellCheck={false}
            aria-invalid={errors.path ? true : undefined}
            aria-describedby={
              errors.path ? "new-page-path-error" : "new-page-path-help"
            }
          />
          {errors.path ? (
            <p className="error" id="new-page-path-error" role="alert">
              <Icon name="problem" />
              {errors.path}
            </p>
          ) : (
            <p className="help" id="new-page-path-help">
              The address of the page on the site. The home page is &quot;/&quot;.
            </p>
          )}
        </div>
      </div>

      {failure && (
        <p className="error" role="alert">
          <Icon name="problem" />
          {failure}
        </p>
      )}

      <div>
        <button className="button" disabled={creating}>
          {creating ? "Creating page…" : "Create page"}
        </button>
      </div>
    </form>
  );
}
