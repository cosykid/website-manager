import type { CSSProperties } from "react";
import type { Theme } from "./types";

/**
 * Turns a theme into CSS variables for the site's <body>.
 *
 * This is the only place theme tokens meet CSS. Component styles use the
 * variables and never see the theme object, which is how one Card grid can
 * look different on every site. A new token is added in three places: the
 * Theme type, this list, and the stylesheet that uses it.
 */
export function themeToCssVariables(theme: Theme): CSSProperties {
  const variables: Record<string, string> = {
    "--theme-surface": theme.colors.surface,
    "--theme-surface-alt": theme.colors.surfaceAlt,
    "--theme-text": theme.colors.text,
    "--theme-text-muted": theme.colors.textMuted,
    "--theme-border": theme.colors.border,
    "--theme-brand": theme.colors.brand,
    "--theme-on-brand": theme.colors.onBrand,
    "--theme-accent": theme.colors.accent,
    "--theme-on-accent": theme.colors.onAccent,
    "--font-heading": theme.fonts.heading,
    "--font-body": theme.fonts.body,
    "--heading-weight": theme.heading.weight,
    "--heading-transform": theme.heading.transform,
    "--heading-letter-spacing": theme.heading.letterSpacing,
    "--radius-card": theme.radius.card,
    "--radius-button": theme.radius.button,
  };

  return { colorScheme: theme.scheme, ...variables };
}
