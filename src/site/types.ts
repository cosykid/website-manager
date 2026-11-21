/**
 * A website and its theme. Sites are seeded (see seed/sites.json), not edited
 * in the manager.
 */

export type Site = {
  /** A short, permanent name such as "ironbarks". Pages point at it. */
  id: string;
  name: string;
  /** The hostnames this site answers on, e.g. "ironbarks.localhost". */
  domains: string[];
  navigation: { label: string; href: string }[];
  theme: Theme;
};

/**
 * A site's design tokens: the values that make the same components look
 * different on each site. Components never read these directly. The site
 * layout turns them into CSS variables (see theme-css.ts).
 */
export type Theme = {
  /** Whether the browser's own controls and scrollbars should be light or dark. */
  scheme: "light" | "dark";
  colors: {
    /** The page background. */
    surface: string;
    /** The background of a Section set to "Subtle". */
    surfaceAlt: string;
    text: string;
    textMuted: string;
    border: string;
    /** The background of a Section set to "Brand". */
    brand: string;
    /** Text on a brand background. */
    onBrand: string;
    /** Buttons. */
    accent: string;
    /** Text on a button. */
    onAccent: string;
  };
  fonts: {
    /** CSS font-family lists. System fonts only, so nothing is downloaded. */
    heading: string;
    body: string;
  };
  heading: {
    weight: string;
    transform: "none" | "uppercase";
    letterSpacing: string;
  };
  radius: {
    card: string;
    button: string;
  };
};
