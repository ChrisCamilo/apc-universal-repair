// Arrow-key movement shared by the radio groups (Segmented, SelectableTileGroup): every arrow moves the
// choice to the next or previous option, wrapping around the ends, whatever the layout.

/**
 * Finds the option an arrow key moves the choice to in a radio group; the arrows wrap around the ends.
 * @param key Pressed key.
 * @param index Index of the chosen option.
 * @param count Number of options.
 * @returns Index of the option to choose, or null when the key doesn't move the choice.
 */
export function arrowTarget(key: string, index: number, count: number): number | null {
  if (key === 'ArrowRight' || key === 'ArrowDown') {
    return (index + 1) % count
  }
  if (key === 'ArrowLeft' || key === 'ArrowUp') {
    return (index - 1 + count) % count
  }
  return null
}
