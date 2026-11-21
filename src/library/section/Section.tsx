import type { ReactNode } from "react";
import styles from "./Section.module.css";

/** Keep in step with ./definition.ts. */
export type SectionProps = {
  layout: "full" | "two-column";
  background: "none" | "light" | "brand";
  children?: ReactNode;
};

// The surface each background choice uses. Surfaces are defined in
// src/renderer/site.css and take their colours from the site's theme, so the
// same choice looks different on every site.
const surfaces = { none: undefined, light: "alt", brand: "brand" } as const;

export function Section({ layout, background, children }: SectionProps) {
  return (
    <section className={styles.section} data-surface={surfaces[background]}>
      <div className={styles.inner} data-layout={layout}>
        {children}
      </div>
    </section>
  );
}
