import type { ReactNode } from "react";
import styles from "./Button.module.css";

type ButtonProps = {
  href: string;
  /**
   * "solid" is filled with the site's accent colour, for the one main action.
   * "outline" is quieter, for when several buttons sit together, as in a
   * card grid.
   */
  variant: "solid" | "outline";
  children: ReactNode;
  /** Read out after the button text by screen readers, e.g. the card it belongs to. */
  context?: string;
};

/**
 * A button in the site's own colours, corner shape and typeface.
 *
 * Every button on a public page takes the visitor somewhere, so it is a link
 * (<a>) that looks like a button, not a <button>.
 */
export function Button({ href, variant, children, context }: ButtonProps) {
  return (
    <a className={styles.button} data-variant={variant} href={href}>
      {children}
      {context && <span className="visually-hidden">: {context}</span>}
    </a>
  );
}
