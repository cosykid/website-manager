import type { Theme } from "./types";

/**
 * Text contrast, measured the way the Web Content Accessibility Guidelines
 * (WCAG) define it. Themes are data, so nothing stops a theme from putting
 * pale text on a pale background. This check does.
 */

/** The smallest ratio body text needs against its background (WCAG AA). */
export const MIN_TEXT_CONTRAST = 4.5;

/** How bright a "#rrggbb" colour looks, from 0 (black) to 1 (white). */
function luminance(hex: string): number {
  const [red, green, blue] = [1, 3, 5].map((start) => {
    const channel = parseInt(hex.slice(start, start + 2), 16) / 255;
    return channel <= 0.04045
      ? channel / 12.92
      : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

/** From 1 (the same colour) to 21 (black on white). */
export function contrastRatio(a: string, b: string): number {
  const [lighter, darker] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Lists every text and background pairing in a theme that is too faint to
 * read. An empty list means the theme passes.
 */
export function findContrastProblems(theme: Theme): string[] {
  const { colors } = theme;
  const pairs: [name: string, text: string, background: string][] = [
    ["text on surface", colors.text, colors.surface],
    ["text on surfaceAlt", colors.text, colors.surfaceAlt],
    ["textMuted on surface", colors.textMuted, colors.surface],
    ["textMuted on surfaceAlt", colors.textMuted, colors.surfaceAlt],
    ["onBrand on brand", colors.onBrand, colors.brand],
    ["onAccent on accent", colors.onAccent, colors.accent],
  ];

  return pairs
    .filter(([, text, background]) => contrastRatio(text, background) < MIN_TEXT_CONTRAST)
    .map(([name, text, background]) => {
      const ratio = contrastRatio(text, background).toFixed(2);
      return `${name} is ${ratio}:1 (${text} on ${background}), below ${MIN_TEXT_CONTRAST}:1`;
    });
}
