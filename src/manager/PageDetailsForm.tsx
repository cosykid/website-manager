"use client";

import { Icon } from "./Icon";

type PageDetailsFormProps = {
  siteName: string;
  title: string;
  path: string;
  /** What is wrong with each, or empty. */
  titleError?: string;
  pathError?: string;
  onChange: (change: { title?: string; path?: string }) => void;
};

/** The form for the page itself: its title and path. */
export function PageDetailsForm({
  siteName,
  title,
  path,
  titleError,
  pathError,
  onChange,
}: PageDetailsFormProps) {
  return (
    <>
      <div className="field">
        <label className="label" htmlFor="page-title">
          Title
        </label>
        <input
          id="page-title"
          className="input"
          value={title}
          aria-invalid={titleError ? true : undefined}
          aria-describedby={titleError ? "page-title-error" : undefined}
          onChange={(event) => onChange({ title: event.target.value })}
        />
        {titleError && (
          <p className="error" id="page-title-error">
            <Icon name="problem" />
            {titleError}
          </p>
        )}
      </div>

      <div className="field">
        <label className="label" htmlFor="page-path">
          Path
        </label>
        <input
          id="page-path"
          className="input"
          value={path}
          autoCapitalize="none"
          spellCheck={false}
          aria-invalid={pathError ? true : undefined}
          aria-describedby={pathError ? "page-path-error" : "page-path-help"}
          onChange={(event) => onChange({ path: event.target.value })}
        />
        {pathError ? (
          <p className="error" id="page-path-error">
            <Icon name="problem" />
            {pathError}
          </p>
        ) : (
          <p className="help" id="page-path-help">
            The address of the page on {siteName}. The home page is &quot;/&quot;.
          </p>
        )}
      </div>
    </>
  );
}
