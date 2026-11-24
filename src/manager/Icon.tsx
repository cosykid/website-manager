/**
 * The handful of icons the manager uses, drawn as simple strokes so they take
 * the colour of the text around them. Icons are always decorative here: the
 * button or message they sit in carries the words.
 */
const paths = {
  up: "M12 19V5M5 12l7-7 7 7",
  down: "M12 5v14M19 12l-7 7-7-7",
  remove: "M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3",
  add: "M12 5v14M5 12h14",
  open: "M7 17 17 7M8 7h9v9",
  problem: "M12 8v5M12 16.5v.5M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18",
  next: "m9 6 6 6-6 6",
  back: "m15 6-6 6 6 6",
  page: "M6 3h8l4 4v14H6zM14 3v4h4",
  image: "M4 5h16v14H4zM4 16l5-5 8 8M14 14l2-2 4 4M15 9h.01",
  // Six dots: something that can be dragged. Drawn with a thicker line.
  grip: "M9 6h.01M15 6h.01M9 12h.01M15 12h.01M9 18h.01M15 18h.01",
} as const;

type IconProps = {
  name: keyof typeof paths;
  size?: number;
};

export function Icon({ name, size = 16 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={paths[name]} />
    </svg>
  );
}
