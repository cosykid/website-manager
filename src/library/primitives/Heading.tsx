import type { ReactNode } from "react";
import styles from "./Heading.module.css";

type HeadingProps = {
  /** The heading's place in the page outline. Pages have one h1, so components start at 2. */
  level: 2 | 3;
  /** How big it looks, which is separate from its level. */
  size: "large" | "medium" | "small";
  children: ReactNode;
};

/** A heading in the site's own typeface, weight and letter case. */
export function Heading({ level, size, children }: HeadingProps) {
  const Tag = level === 2 ? "h2" : "h3";
  return (
    <Tag className={styles.heading} data-size={size}>
      {children}
    </Tag>
  );
}
