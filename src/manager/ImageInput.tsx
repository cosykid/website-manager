"use client";

import { useEffect, useRef, useState } from "react";
import {
  IMAGE_TOO_LARGE,
  imageTypes,
  MAX_IMAGE_BYTES,
  NOT_AN_IMAGE,
} from "@/images/image-file";
import type { ImageField } from "@/library/types";
import { isSafeAddress } from "@/library/validate";
import { uploadImageAction, type UploadImageResult } from "./actions";
import { Dialog } from "./Dialog";
import type { FieldEditorProps } from "./FieldEditor";
import { FileButton } from "./FileButton";
import { Icon } from "./Icon";
import styles from "./ImageInput.module.css";
import { shrinkImage } from "./shrink-image";

/**
 * The input for an image: its address, the picture that is there, and a button
 * that uploads a new one and fills the address in.
 *
 * A dialog covers the page while a file uploads. Nothing else can be edited
 * until it is done, so the address always lands in the form it was chosen
 * from, as that form was left.
 */
export function ImageInput({
  field,
  value,
  onChange,
  path,
  shared,
}: FieldEditorProps<ImageField>) {
  const address = typeof value === "string" ? value : "";
  // The name of the file being uploaded, for the dialog.
  const [uploading, setUploading] = useState<string | null>(null);
  const [uploaded, setUploaded] = useState(false);
  // Why the last file chosen was not uploaded.
  const [failure, setFailure] = useState("");
  // The last address that turned out to have no picture.
  const [missing, setMissing] = useState("");

  // The file whose address is wanted. Null when there is none: the upload was
  // called off, or the editor has gone back to another page.
  const wanted = useRef<File | null>(null);
  useEffect(() => {
    return () => {
      wanted.current = null;
    };
  }, []);

  async function upload(file: File) {
    wanted.current = file;
    setFailure("");
    setUploaded(false);
    setUploading(file.name);

    const result = await sendImage(file);
    if (wanted.current !== file) return;

    wanted.current = null;
    setUploading(null);
    if (result.ok) {
      onChange(result.address);
      setUploaded(true);
    } else {
      setFailure(result.message);
    }
  }

  function callOff() {
    wanted.current = null;
    setUploading(null);
  }

  const id = `${shared.idPrefix}-${path}`;
  const error = shared.issues.find((issue) => issue.path === path)?.message;
  const isMissing = address !== "" && address === missing;
  const describedBy = [`${id}-help`, error && `${id}-error`].filter(Boolean).join(" ");

  return (
    <div className="field">
      <label className="label" htmlFor={id}>
        {field.label}
        {!field.required && <span className="optional"> (optional)</span>}
      </label>

      <input
        id={id}
        className="input"
        type="text"
        // The URL keyboard on phones, and no autocorrect.
        inputMode="url"
        autoCapitalize="none"
        spellCheck={false}
        value={address}
        placeholder="https://…"
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        onChange={(event) => {
          setFailure("");
          onChange(event.target.value);
        }}
      />

      <div className={styles.image}>
        <div className={styles.picture}>
          {isSafeAddress(address) && !isMissing ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={address} alt="" onError={() => setMissing(address)} />
          ) : (
            <Icon name="image" size={20} />
          )}
        </div>

        <div className={styles.upload}>
          <FileButton
            className="button"
            accept={Object.keys(imageTypes).join()}
            onFile={upload}
          >
            Upload image
          </FileButton>
          <p className="help" id={`${id}-help`}>
            {isMissing
              ? "There is no picture at this address."
              : (field.help ?? "Or enter the address of one.")}
          </p>
        </div>
      </div>

      {/* For screen readers, which are not told that the picture changed. */}
      <p className="visually-hidden" role="status">
        {uploaded && "Image uploaded"}
      </p>

      {error && (
        <p className="error" id={`${id}-error`}>
          <Icon name="problem" />
          {error}
        </p>
      )}
      {failure && (
        <p className="error" role="alert">
          <Icon name="problem" />
          {failure}
        </p>
      )}

      <Dialog
        open={uploading !== null}
        title="Uploading image"
        titleId={`${id}-uploading`}
        closeLabel="Cancel"
        busy
        onClose={callOff}
      >
        <p className={`muted ${styles.fileName}`}>{uploading}</p>
      </Dialog>
    </div>
  );
}

/** Makes an image smaller, then uploads it. */
async function sendImage(file: File): Promise<UploadImageResult> {
  // Checked here for an answer straight away. The server checks again.
  const image = file.type in imageTypes ? await shrinkImage(file) : null;
  if (!image) return { ok: false, message: NOT_AN_IMAGE };
  // A request that is too large never reaches the action, so the action could
  // not say what was wrong.
  if (image.size > MAX_IMAGE_BYTES) return { ok: false, message: IMAGE_TOO_LARGE };

  const form = new FormData();
  form.set("image", image);
  try {
    return await uploadImageAction(form);
  } catch {
    return {
      ok: false,
      message:
        "The image could not be uploaded. Check that the database is running, then try again.",
    };
  }
}
