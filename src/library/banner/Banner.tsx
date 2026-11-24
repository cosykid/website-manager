import { Button } from "../primitives/Button";
import { Heading } from "../primitives/Heading";
import { Image } from "../primitives/Image";
import styles from "./Banner.module.css";

/** Keep in step with ./definition.ts. */
export type BannerProps = {
  heading: string;
  message: string;
  button?: { label: string; href: string };
  image?: { url: string; alt: string };
};

export function Banner({ heading, message, button, image }: BannerProps) {
  return (
    <div className={styles.banner}>
      <div className={styles.words}>
        <Heading level={2} size="large">
          {heading}
        </Heading>
        {message && <p className={styles.message}>{message}</p>}
        {button && (
          <Button href={button.href} variant="solid">
            {button.label}
          </Button>
        )}
      </div>

      {image && (
        // Its own surface, as a card is, so that an image with see-through
        // parts looks the same wherever the banner is placed.
        <div className={styles.picture} data-surface="base">
          <Image src={image.url} alt={image.alt} />
        </div>
      )}
    </div>
  );
}
