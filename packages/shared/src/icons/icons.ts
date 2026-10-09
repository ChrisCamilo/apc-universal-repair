// Icon geometry shared by the web and mobile renderers. Each icon is a list of stroke-only shapes on a
// 16×16 grid with no color of its own: renderers draw them with the current text color.
// Import only the icons you use, so the others are left out of the bundle.

export const alertIcon: IconShape[] = [
  { kind: "path", d: "M8 2.2l6.2 10.9H1.8L8 2.2z" },
  { kind: "path", d: "M8 6.4v3.2M8 11.4v.1" },
];
export const checkIcon: IconShape[] = [{ kind: "path", d: "M3.5 8.4l3 3 6-6.4" }];
export const chevronIcon: IconShape[] = [{ kind: "path", d: "M6 3.5l4.5 4.5L6 12.5" }];
export const closeIcon: IconShape[] = [{ kind: "path", d: "M3.5 3.5l9 9M12.5 3.5l-9 9" }];
// A traffic cone: the mark of a part of the app still being built.
export const coneIcon: IconShape[] = [
  { kind: "path", d: "M6.6 2.5h2.8l2.6 9.5H4z" },
  { kind: "path", d: "M5.6 6.2h4.8M4.8 9h6.4M2.5 12h11" },
];
export const cubeIcon: IconShape[] = [
  { kind: "path", d: "M2.5 5L8 2.4 13.5 5v6L8 13.6 2.5 11V5z" },
  { kind: "path", d: "M2.5 5L8 7.6 13.5 5M8 7.6v6" },
];
export const documentIcon: IconShape[] = [
  { kind: "path", d: "M4 1.8h5.5l3 3v9.4H4z" },
  { kind: "path", d: "M9.5 1.8v3h3M6 8.5h4.5M6 11h4.5" },
];
export const eyeIcon: IconShape[] = [
  { kind: "path", d: "M1.5 8S4 3.6 8 3.6 14.5 8 14.5 8 12 12.4 8 12.4 1.5 8 1.5 8z" },
  { kind: "circle", cx: 8, cy: 8, r: 2.1 },
];
export const filterIcon: IconShape[] = [{ kind: "path", d: "M2 3h12l-4.6 5.4v4.4l-2.8 1.4V8.4L2 3z" }];
// Six dots in two columns: the handle a reorderable tab is dragged by.
export const gripIcon: IconShape[] = [6, 10].flatMap((cx) =>
  [4, 8, 12].map((cy) => ({ kind: "circle" as const, cx, cy, r: 0.6 })),
);
export const imageIcon: IconShape[] = [
  { kind: "rect", x: 2, y: 3, width: 12, height: 10, rx: 1.6 },
  { kind: "circle", cx: 5.8, cy: 6.4, r: 1.2 },
  { kind: "path", d: "M2.5 11.6l3.6-3.4 2.6 2.4 2-1.8 2.8 2.6" },
];
/** The sizes icons are drawn at, in px, by what the icon does; `body` is the size when none is given. */
export const ICON_SIZES = {
  /** A mark inside a small control: a thumbnail's remove ×, a checkbox's check. */
  mark: 10,
  /** A caret, chevron or check beside a control's text: Select, Combobox, Menu, Pagination. */
  caret: 12,
  /** The icon of a compact button, such as Filtros. */
  compact: 13,
  /** A small icon in a line of text: a link button's icon, a tab's drag grip. */
  inline: 14,
  /** An icon beside a label: a tab's icon, a table row's action. */
  label: 15,
  /** An icon beside body text, the size when none is given. */
  body: 16,
  /** An icon that leads its line: a menu item's, the photo viewer's arrows. */
  prominent: 18,
  /** The picture of a list row's empty thumbnail. */
  thumbnail: 20,
  /** The picture of an upload area. */
  dropZone: 22,
  /** The picture of an empty image frame. */
  frame: 28,
  /** The picture of an empty state. */
  emptyState: 40,
  /** The picture of the photo viewer when an item has no photos. */
  viewer: 56,
} as const;
/** Stroke width on the 16×16 grid. */
export const ICON_STROKE = 1.3;
/** Size of the grid every icon is drawn on. */
export const ICON_VIEWBOX = 16;
export const lockIcon: IconShape[] = [
  { kind: "rect", x: 3, y: 7, width: 10, height: 7, rx: 1.6 },
  { kind: "path", d: "M5.4 7V5.2a2.6 2.6 0 015.2 0V7" },
];
// A mechanic leaning over the open hood of a car, wrench in hand: the illustration of a screen still being built.
export const mechanicIcon: IconShape[] = [
  { kind: "path", d: "M1.9 12.5H.9V10l1.5-2.6h3.4l1.6 2.2h3.2c.5 0 .9.4.9.9v2h-1.2M4.3 12.5h3.6" },
  { kind: "path", d: "M7.4 9.6L9 6.2" },
  { kind: "circle", cx: 3.1, cy: 12.5, r: 1.2 },
  { kind: "circle", cx: 9.1, cy: 12.5, r: 1.2 },
  { kind: "circle", cx: 12.4, cy: 3.6, r: 1.1 },
  { kind: "path", d: "M13 4.8c.6 1 1.3 2.2 1.6 3.5M14.6 8.3l-.9 4.5M14.6 8.3l.9 4.5M13.4 6l-1.6 1.6-1 1.6M10.4 8.6l.8.5" },
];
export const pencilIcon: IconShape[] = [{ kind: "path", d: "M10.6 2.8l2.6 2.6-7.7 7.7-3.2.6.6-3.2 7.7-7.7z" }];
export const searchIcon: IconShape[] = [
  { kind: "circle", cx: 7, cy: 7, r: 4.6 },
  { kind: "path", d: "M10.4 10.4L14 14" },
];
export const trashIcon: IconShape[] = [{ kind: "path", d: "M2.8 4.4h10.4M6.4 4.4V2.9h3.2v1.5M4.2 4.4l.7 8.7h6.2l.7-8.7" }];
export const userIcon: IconShape[] = [
  { kind: "circle", cx: 8, cy: 5.2, r: 2.8 },
  { kind: "path", d: "M2.6 14c.5-3 2.7-4.5 5.4-4.5S12.9 11 13.4 14" },
];
/** Every icon by name, for catalogs such as Storybook and tests; app code imports single icons. */
export const ICONS = {
  alert: alertIcon,
  check: checkIcon,
  chevron: chevronIcon,
  close: closeIcon,
  cone: coneIcon,
  cube: cubeIcon,
  document: documentIcon,
  eye: eyeIcon,
  filter: filterIcon,
  grip: gripIcon,
  image: imageIcon,
  lock: lockIcon,
  mechanic: mechanicIcon,
  pencil: pencilIcon,
  search: searchIcon,
  trash: trashIcon,
  user: userIcon,
};

export type IconShape =
  | { kind: "path"; d: string }
  | { kind: "circle"; cx: number; cy: number; r: number }
  | { kind: "rect"; x: number; y: number; width: number; height: number; rx?: number };
export type IconName = keyof typeof ICONS;
