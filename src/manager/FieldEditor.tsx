"use client";

import { useState } from "react";
import {
  unhandledKind,
  type Field,
  type GroupField,
  type ListField,
  type SelectField,
  type TextField,
  type UrlField,
} from "@/library/types";
import { emptyValue, fillGroup, type Issue } from "@/library/validate";
import { isPlainObject } from "@/page-model/shape";
import { Gap, Held } from "./Dragging";
import styles from "./FieldEditor.module.css";
import { Icon } from "./Icon";
import { useDragToMove } from "./useDragToMove";

/**
 * The generated form.
 *
 * Every component's editing form comes from here: one input per field in the
 * component's definition, chosen by the field's `kind`. Groups and lists call
 * back into the same code for the fields inside them, which is how a list of
 * cards, each with an image and an optional link, needs no code of its own.
 *
 * A new kind of field needs one more case in `FieldEditor` below. TypeScript
 * reports an error there until it has one.
 */

/**
 * Reports a new value. `removed` names anything the change took away
 * ("Card", "Link"), so the page editor can offer to undo it.
 */
type Change = (value: unknown, removed?: string) => void;

/** What every input needs to know, passed down unchanged. */
type Shared = {
  /** Every problem on the component being edited. Each input shows its own. */
  issues: Issue[];
  /** Keeps input ids unique when two components share field names. */
  idPrefix: string;
};

type FieldEditorProps<F extends Field = Field> = {
  field: F;
  value: unknown;
  onChange: Change;
  /** Where the value sits in the component's props, e.g. "cards.2.heading". */
  path: string;
  shared: Shared;
};

/** The inputs for a set of named fields: a whole component, or one group. */
export function GroupFields({
  fields,
  value,
  onChange,
  path,
  shared,
}: {
  fields: Record<string, Field>;
  value: Record<string, unknown>;
  onChange: Change;
  path: string;
  shared: Shared;
}) {
  return (
    <div className={styles.fields}>
      {Object.entries(fields).map(([name, field]) => (
        <FieldEditor
          key={name}
          field={field}
          value={value[name]}
          path={path ? `${path}.${name}` : name}
          shared={shared}
          onChange={(next, removed) => {
            const changed = { ...value };
            // An optional group that has been removed leaves no key behind.
            if (next === undefined) delete changed[name];
            else changed[name] = next;
            onChange(changed, removed);
          }}
        />
      ))}
    </div>
  );
}

function FieldEditor(props: FieldEditorProps) {
  const { field } = props;
  switch (field.kind) {
    case "text":
    case "url":
      return <TextInput {...props} field={field} />;
    case "select":
      return <SelectInput {...props} field={field} />;
    case "group":
      return <GroupEditor {...props} field={field} />;
    case "list":
      return <ListEditor {...props} field={field} />;
    default:
      return unhandledKind(field);
  }
}

function TextInput({
  field,
  value,
  onChange,
  path,
  shared,
}: FieldEditorProps<TextField | UrlField>) {
  const id = `${shared.idPrefix}-${path}`;
  const error = shared.issues.find((issue) => issue.path === path)?.message;
  const describedBy = [field.help && `${id}-help`, error && `${id}-error`]
    .filter(Boolean)
    .join(" ");

  const inputProps = {
    id,
    className: "input",
    value: typeof value === "string" ? value : "",
    placeholder: field.placeholder,
    "aria-invalid": error ? true : undefined,
    "aria-describedby": describedBy || undefined,
  };

  return (
    <div className="field">
      <label className="label" htmlFor={id}>
        {field.label}
        {!field.required && <span className="optional"> (optional)</span>}
      </label>

      {field.kind === "text" && field.multiline ? (
        <textarea
          {...inputProps}
          rows={4}
          onChange={(event) => onChange(event.target.value)}
        />
      ) : (
        <input
          {...inputProps}
          type="text"
          // Addresses get the URL keyboard on phones and no autocorrect.
          inputMode={field.kind === "url" ? "url" : undefined}
          autoCapitalize={field.kind === "url" ? "none" : undefined}
          spellCheck={field.kind === "url" ? false : undefined}
          onChange={(event) => onChange(event.target.value)}
        />
      )}

      {field.help && (
        <p className="help" id={`${id}-help`}>
          {field.help}
        </p>
      )}
      {error && (
        <p className="error" id={`${id}-error`}>
          <Icon name="problem" />
          {error}
        </p>
      )}
    </div>
  );
}

function SelectInput({
  field,
  value,
  onChange,
  path,
  shared,
}: FieldEditorProps<SelectField>) {
  const id = `${shared.idPrefix}-${path}`;
  const error = shared.issues.find((issue) => issue.path === path)?.message;
  const describedBy = [field.help && `${id}-help`, error && `${id}-error`]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="field">
      <label className="label" htmlFor={id}>
        {field.label}
      </label>
      <select
        id={id}
        className="input"
        value={typeof value === "string" ? value : field.default}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy || undefined}
        onChange={(event) => onChange(event.target.value)}
      >
        {field.options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {field.help && (
        <p className="help" id={`${id}-help`}>
          {field.help}
        </p>
      )}
      {error && (
        <p className="error" id={`${id}-error`}>
          <Icon name="problem" />
          {error}
        </p>
      )}
    </div>
  );
}

function GroupEditor({
  field,
  value,
  onChange,
  path,
  shared,
}: FieldEditorProps<GroupField>) {
  const name = field.label.toLowerCase();

  // An optional group that hasn't been added yet is a single button.
  if (field.optional && value === undefined) {
    return (
      <div>
        <button
          type="button"
          className="button"
          onClick={() => onChange(fillGroup(field.fields, {}))}
        >
          <Icon name="add" />
          Add {name}
        </button>
      </div>
    );
  }

  return (
    <fieldset className={styles.group}>
      <legend className={styles.groupLabel}>{field.label}</legend>
      <GroupFields
        fields={field.fields}
        value={isPlainObject(value) ? value : {}}
        onChange={onChange}
        path={path}
        shared={shared}
      />
      {field.optional && (
        <div>
          <button
            type="button"
            className="button"
            data-variant="quiet"
            onClick={() => onChange(undefined, field.label)}
          >
            Remove {name}
          </button>
        </div>
      )}
    </fieldset>
  );
}

function ListEditor({
  field,
  value,
  onChange,
  path,
  shared,
}: FieldEditorProps<ListField>) {
  const items = Array.isArray(value) ? value : [];
  // Which entry's fields are showing. One at a time, so a long list stays
  // short enough to scan and reorder.
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  // Entries and gaps both go by number. Gap 0 is in front of entry 0, and the
  // last gap is after the last entry.
  const { list, drag, startDrag } = useDragToMove((id, gap) =>
    moveEntry(Number(id), Number(gap)),
  );
  // Where a drag would drop. The gap just after an entry is where it is now.
  const target = drag && drag.gap !== String(Number(drag.id) + 1) ? drag.gap : null;

  function addEntry() {
    const entry =
      field.item.kind === "group"
        ? fillGroup(field.item.fields, {})
        : emptyValue(field.item);
    onChange([...items, entry]);
    setOpenIndex(items.length);
  }

  function removeEntry(index: number) {
    onChange(
      items.filter((_, itemIndex) => itemIndex !== index),
      capitalise(field.itemLabel),
    );
    setOpenIndex(null);
  }

  /** Moves an entry into a gap between two others. */
  function moveEntry(index: number, gap: number) {
    // The gaps on either side of an entry are both where it is now.
    if (gap === index || gap === index + 1) return;

    // The entries' numbers in their new order. Taking one out brings every gap
    // after it one place forward.
    const order = [...items.keys()].filter((number) => number !== index);
    order.splice(gap > index ? gap - 1 : gap, 0, index);

    onChange(order.map((number) => items[number]));
    // Keep the open entry open as it moves.
    if (openIndex !== null) setOpenIndex(order.indexOf(openIndex));
  }

  return (
    <div
      ref={list}
      className={styles.list}
      data-drag-list
      data-dragging={drag ? true : undefined}
    >
      <p className="label" id={`${shared.idPrefix}-${path}-label`}>
        {field.label}
      </p>

      {items.length === 0 ? (
        <p className="help">
          No {field.itemLabel}s yet. Add the first one below.
        </p>
      ) : (
        <ol
          className={styles.entries}
          aria-labelledby={`${shared.idPrefix}-${path}-label`}
        >
          {items.map((item, index) => {
            const entryPath = `${path}.${index}`;
            const title = entryTitle(field, item);
            const name = title || `${field.itemLabel} ${index + 1}`;
            const isOpen = openIndex === index;
            const problems = shared.issues.filter((issue) =>
              issue.path.startsWith(`${entryPath}.`),
            ).length;
            const panelId = `${shared.idPrefix}-${entryPath}-panel`;

            return (
              <li
                key={index}
                className={styles.entry}
                data-open={isOpen || undefined}
                data-dragged={drag?.id === String(index) || undefined}
              >
                <Gap name={String(index)} target={target} />

                <div className={styles.entryRow}>
                  {/* Drawn under the pointer, and always on a touch screen. */}
                  <span
                    className={styles.entryHandle}
                    data-drag-handle
                    onPointerDown={(press) => startDrag(press, String(index))}
                    aria-hidden="true"
                  >
                    <Icon name="grip" size={14} />
                  </span>

                  <button
                    type="button"
                    className={styles.entryToggle}
                    aria-expanded={isOpen}
                    aria-controls={isOpen ? panelId : undefined}
                    onPointerDown={(press) => startDrag(press, String(index))}
                    onClick={() => setOpenIndex(isOpen ? null : index)}
                  >
                    <span className={styles.chevron} data-open={isOpen || undefined}>
                      <Icon name="next" size={14} />
                    </span>
                    {/* The position is read out by screen readers, to tell
                        two entries with the same name apart. The spaces keep
                        the parts apart: "1 Tessa Whitlock". */}
                    <span className="visually-hidden">{index + 1}</span>{" "}
                    <span className={styles.entryTitle} data-untitled={!title || undefined}>
                      {title || `Untitled ${field.itemLabel}`}
                    </span>{" "}
                    {problems > 0 && (
                      <span className="problem-count">
                        <Icon name="problem" size={14} />
                        {problems} {problems === 1 ? "problem" : "problems"}
                      </span>
                    )}
                  </button>

                  {/* Shown for the open entry, and for an entry under the
                      pointer or holding keyboard focus: see .entryActions. */}
                  <div className={styles.entryActions}>
                    <button
                      type="button"
                      className="icon-button"
                      aria-label={`Move ${name} up`}
                      disabled={index === 0}
                      onClick={() => moveEntry(index, index - 1)}
                    >
                      <Icon name="up" />
                    </button>
                    <button
                      type="button"
                      className="icon-button"
                      aria-label={`Move ${name} down`}
                      disabled={index === items.length - 1}
                      // Past the gap after it, and the one after that.
                      onClick={() => moveEntry(index, index + 2)}
                    >
                      <Icon name="down" />
                    </button>
                    <button
                      type="button"
                      className="icon-button"
                      aria-label={`Remove ${name}`}
                      onClick={() => removeEntry(index)}
                    >
                      <Icon name="remove" />
                    </button>
                  </div>
                </div>

                {isOpen && (
                  <div className={styles.entryBody} id={panelId}>
                    {field.item.kind === "group" ? (
                      <GroupFields
                        fields={field.item.fields}
                        value={isPlainObject(item) ? item : {}}
                        path={entryPath}
                        shared={shared}
                        onChange={(next, removed) =>
                          onChange(replaceAt(items, index, next), removed)
                        }
                      />
                    ) : (
                      <FieldEditor
                        field={field.item}
                        value={item}
                        path={entryPath}
                        shared={shared}
                        onChange={(next, removed) =>
                          onChange(replaceAt(items, index, next), removed)
                        }
                      />
                    )}
                  </div>
                )}

                {/* There is one more gap after the last entry. */}
                {index === items.length - 1 && (
                  <Gap name={String(items.length)} target={target} />
                )}
              </li>
            );
          })}
        </ol>
      )}

      {drag && (
        <Held drag={drag}>
          {entryTitle(field, items[Number(drag.id)]) || `Untitled ${field.itemLabel}`}
        </Held>
      )}

      <div>
        <button type="button" className="button" onClick={addEntry}>
          <Icon name="add" />
          Add {field.itemLabel}
        </button>
      </div>
    </div>
  );
}

/** The name an entry goes by in the list, taken from the field the definition names. */
function entryTitle(field: ListField, item: unknown): string {
  if (!field.itemTitleField || !isPlainObject(item)) return "";
  const title = item[field.itemTitleField];
  return typeof title === "string" ? title.trim() : "";
}

function replaceAt(items: unknown[], index: number, value: unknown): unknown[] {
  return items.map((item, itemIndex) => (itemIndex === index ? value : item));
}

function capitalise(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}
