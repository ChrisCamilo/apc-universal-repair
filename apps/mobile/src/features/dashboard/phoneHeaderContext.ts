import { createContext, useContext } from 'react';

// The title row of the header, which the Dashboard draws, the same as the web on a phone: the open tab's name under the
// APC mark, unless the tab has gone a screen deeper, such as the Catalog's models of a brand. Then the tab hands over
// the screen's title and a ← in place of the mark, named for where it goes, and takes them back when it returns or
// closes.

/** A deeper screen's title row: its title and the ← that goes back a screen. */
export type PhoneHeader = { title: string; back: { label: string; onPress: () => void } };

/** Hands the Dashboard the open tab's title row, or null for the tab's name under the mark. */
export const PhoneHeaderContext = createContext<(header: PhoneHeader | null) => void>(() => {});

/**
 * Reads how the open tab sets the header's title row.
 * @returns Takes the title row of a deeper screen, or null.
 */
export function usePhoneHeader(): (header: PhoneHeader | null) => void {
  return useContext(PhoneHeaderContext);
}
