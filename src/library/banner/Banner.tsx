import { Button } from "../primitives/Button";
import { Heading } from "../primitives/Heading";
import styles from "./Banner.module.css";

/** Keep in step with ./definition.ts. */
export type BannerProps = {
  heading: string;
  message: string;
  button?: { label: string; href: string };
};

export function Banner({ heading, message, button }: BannerProps) {
  return (
    <div className={styles.banner}>
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
  );
}
