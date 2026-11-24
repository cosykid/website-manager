type SiteMarkProps = {
  /** Three colours from the site's theme. */
  colors: { brand: string; accent: string; surface: string };
  /** "small" sits in a line of text. "large" leads a row or a title. */
  size?: "small" | "large";
};

/**
 * A site's own colours as the hoops of a jersey.
 *
 * The manager itself is black and white, so this mark is how an editor tells
 * at a glance which site they are working on. It is decoration beside the
 * site's name, never instead of it, so screen readers skip it.
 */
export function SiteMark({ colors, size = "large" }: SiteMarkProps) {
  return (
    <span className="site-mark" data-size={size} aria-hidden="true">
      <span style={{ background: colors.brand }} />
      <span style={{ background: colors.surface }} />
      <span style={{ background: colors.accent }} />
      <span style={{ background: colors.surface }} />
    </span>
  );
}
