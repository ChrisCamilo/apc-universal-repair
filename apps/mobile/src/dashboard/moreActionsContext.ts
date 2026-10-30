import { createContext, useContext } from 'react';

// The "⋯" in the header, at the right of the open tab's name, the same as the web on a phone: the Dashboard draws it,
// and the open tab says what it opens, such as the Inventory's sheet of its other actions, or takes it away. A tab
// that hands nothing over has no "⋯".

/** Hands the Dashboard what its "⋯" opens, or null to take the "⋯" away. */
export const MoreActionsContext = createContext<(open: (() => void) | null) => void>(() => {});

/**
 * Reads how the open tab puts a "⋯" in the header.
 * @returns Takes what the "⋯" opens, or null.
 */
export function useMoreActions(): (open: (() => void) | null) => void {
  return useContext(MoreActionsContext);
}
