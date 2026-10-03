// Icon geometry shared by the web and mobile renderers. Each icon is a list of stroke-only shapes on a
// 16×16 grid with no color of its own: renderers draw them with the current text color.
// Import only the icons you use, so the others are left out of the bundle.

export const checkIcon: IconShape[] = [{ kind: "path", d: "M3.5 8.4l3 3 6-6.4" }];
export const chevronIcon: IconShape[] = [{ kind: "path", d: "M6 3.5l4.5 4.5L6 12.5" }];
export const closeIcon: IconShape[] = [{ kind: "path", d: "M3.5 3.5l9 9M12.5 3.5l-9 9" }];
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
export const imageIcon: IconShape[] = [
  { kind: "rect", x: 2, y: 3, width: 12, height: 10, rx: 1.6 },
  { kind: "circle", cx: 5.8, cy: 6.4, r: 1.2 },
  { kind: "path", d: "M2.5 11.6l3.6-3.4 2.6 2.4 2-1.8 2.8 2.6" },
];
/** Stroke width on the 16×16 grid. */
export const ICON_STROKE = 1.3;
/** Size of the grid every icon is drawn on. */
export const ICON_VIEWBOX = 16;
export const lockIcon: IconShape[] = [
  { kind: "rect", x: 3, y: 7, width: 10, height: 7, rx: 1.6 },
  { kind: "path", d: "M5.4 7V5.2a2.6 2.6 0 015.2 0V7" },
];
export const searchIcon: IconShape[] = [
  { kind: "circle", cx: 7, cy: 7, r: 4.6 },
  { kind: "path", d: "M10.4 10.4L14 14" },
];
export const userIcon: IconShape[] = [
  { kind: "circle", cx: 8, cy: 5.2, r: 2.8 },
  { kind: "path", d: "M2.6 14c.5-3 2.7-4.5 5.4-4.5S12.9 11 13.4 14" },
];
/** Every icon by name, for catalogs such as Storybook and tests; app code imports single icons. */
export const ICONS = {
  check: checkIcon,
  chevron: chevronIcon,
  close: closeIcon,
  cube: cubeIcon,
  document: documentIcon,
  eye: eyeIcon,
  filter: filterIcon,
  image: imageIcon,
  lock: lockIcon,
  search: searchIcon,
  user: userIcon,
};

export type IconShape =
  | { kind: "path"; d: string }
  | { kind: "circle"; cx: number; cy: number; r: number }
  | { kind: "rect"; x: number; y: number; width: number; height: number; rx?: number };
export type IconName = keyof typeof ICONS;
