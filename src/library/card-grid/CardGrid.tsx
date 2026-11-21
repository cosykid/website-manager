import { Button } from "../primitives/Button";
import { Heading } from "../primitives/Heading";
import { Image } from "../primitives/Image";
import styles from "./CardGrid.module.css";

/** Keep in step with ./definition.ts. */
export type CardGridProps = {
  title: string;
  cards: {
    heading: string;
    image: { url: string; alt: string };
    link?: { label: string; href: string };
  }[];
};

export function CardGrid({ title, cards }: CardGridProps) {
  return (
    <div className={styles.cardGrid}>
      <Heading level={2} size="medium">
        {title}
      </Heading>

      <ul className={styles.grid} role="list">
        {cards.map((card, index) => (
          // A card is its own surface, so its text stays readable even when
          // the grid sits inside a brand-coloured section.
          <li key={index} className={styles.card} data-surface="base">
            <Image src={card.image.url} alt={card.image.alt} />
            <div className={styles.body}>
              <Heading level={3} size="small">
                {card.heading}
              </Heading>
              {card.link && (
                // Several cards often share the same link text. The hidden
                // heading tells screen reader users which card a link is for.
                <Button href={card.link.href} variant="outline" context={card.heading}>
                  {card.link.label}
                </Button>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
