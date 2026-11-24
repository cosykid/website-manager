import styles from "./Image.module.css";

type ImageProps = {
  src: string;
  /** Empty for a decorative image, which screen readers then skip. */
  alt: string;
};

/**
 * An image cropped to a fixed 4:3 shape, so a row of cards lines up whatever
 * was uploaded.
 *
 * This is a plain <img>, not next/image. Editors can paste an address from
 * any host, and next/image only accepts hosts listed in next.config.ts. An
 * uploaded image has already been made small enough for a page.
 */
export function Image({ src, alt }: ImageProps) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img className={styles.image} src={src} alt={alt} loading="lazy" decoding="async" />
  );
}
