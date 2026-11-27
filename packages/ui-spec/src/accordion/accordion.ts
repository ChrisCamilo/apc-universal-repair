// Accordion behavior shared by the web and mobile Accordion: sections, each a header that opens and closes the content
// under it, any number open at once, and, on the web, where the keyboard moves between the headers (the arrows, which go
// round, Home and End, as the WAI-ARIA accordion pattern has them).

/** A section of an accordion: its id, the title its header shows and a muted note after it, e.g. "3 tutoriais". */
export type AccordionSection = { id: string; title: string; detail?: string };

/**
 * Opens a section, or closes it when it is open, leaving the others as they are.
 * @param open Ids of the open sections.
 * @param id Id of the section whose header was pressed.
 * @returns Ids of the open sections afterwards, in the order they were opened.
 */
export function toggleSection(open: readonly string[], id: string): string[] {
  return open.includes(id) ? open.filter((each) => each !== id) : [...open, id];
}

/**
 * Tells which header a key moves the focus to, on the web.
 * @param key The key pressed on a header, e.g. "ArrowDown".
 * @param index Position of the header it was pressed on, from 0.
 * @param count How many headers there are.
 * @returns Position of the header to focus, or null for a key that doesn't move it.
 */
export function headerKeyTarget(key: string, index: number, count: number): number | null {
  switch (key) {
    case "ArrowDown":
      return (index + 1) % count;
    case "ArrowUp":
      return (index - 1 + count) % count;
    case "Home":
      return 0;
    case "End":
      return count - 1;
    default:
      return null;
  }
}
