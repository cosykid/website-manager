import type { ReactNode } from "react";
import styles from "./TextLink.module.css";

type TextLinkProps = {
  href: string;
  children: ReactNode;
  /** Read out after the link text by screen readers, e.g. the card it belongs to. */
  context?: string;
};

/** An underlined link that is tall enough to tap comfortably. */
export function TextLink({ href, children, context }: TextLinkProps) {
  return (
    <a className={styles.link} href={href}>
      {children}
      {context && <span className="visually-hidden">: {context}</span>}
    </a>
  );
}
