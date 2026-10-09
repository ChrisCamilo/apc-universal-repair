import { useRef, useState, type KeyboardEvent } from 'react'
import { arrowTarget } from './radioKeys.ts'
import { selectableTileGroup } from './SelectableTile.styles.ts'

// The brand tiles stacked in the Catalog tab's left rail. Each tile shows the brand's logo, or its name when
// there is no logo yet or the logo doesn't load. The chosen tile takes the accent on its frame and text over a
// tinted fill, glowing where the style has a glow. The group is a radio group: exactly one tile is chosen,
// it is the only Tab stop, and every arrow key moves the choice to the next or previous tile, wrapping around.
// The owner lays the tiles out through className, e.g. one column in the rail and more on narrow screens.

type TileOption = {
  value: string
  /** The brand's name: the tile's accessible name, and its text when there is no logo. */
  label: string
  /** URL of the brand's logo; leave it out until real logo assets exist. */
  logo?: string
}
type SelectableTileProps = {
  ref: (node: HTMLButtonElement | null) => void
  option: TileOption
  checked: boolean
  onSelect: () => void
  onKeyDown: (event: KeyboardEvent) => void
}
type SelectableTileGroupProps = {
  /** Accessible name of the group, e.g. "Marcas". */
  label: string
  options: TileOption[]
  value: string
  onValueChange: (value: string) => void
  /** Layout of the tiles, e.g. "grid-cols-2"; the group is a grid with a small gap. */
  className?: string
}

export function SelectableTileGroup({ label, options, value, onValueChange, className }: SelectableTileGroupProps) {
  const tiles = useRef<(HTMLButtonElement | null)[]>([])
  const { classes, ids } = selectableTileGroup()

  /** Moves the choice with the arrows and follows it with the focus. */
  const onKeyDown = (event: KeyboardEvent, index: number) => {
    const target = arrowTarget(event.key, index, options.length)
    if (target === null) {
      return
    }
    event.preventDefault()
    onValueChange(options[target].value)
    tiles.current[target]?.focus()
  }

  return (
    <div role="radiogroup" aria-label={label} className={classes.base({ class: className })} data-testid={ids.base}>
      {options.map((option, index) => (
        <SelectableTile
          key={option.value}
          ref={(node) => {
            tiles.current[index] = node
          }}
          option={option}
          checked={option.value === value}
          onSelect={() => onValueChange(option.value)}
          onKeyDown={(event) => onKeyDown(event, index)}
        />
      ))}
    </div>
  )
}

function SelectableTile({ ref, option, checked, onSelect, onKeyDown }: SelectableTileProps) {
  // The logo that failed to load, so the tile falls back to the name; a new logo URL tries again.
  const [failed, setFailed] = useState<string | null>(null)
  const showLogo = option.logo !== undefined && failed !== option.logo
  const { classes, ids } = selectableTileGroup()
  return (
    <button
      ref={ref}
      type="button"
      role="radio"
      aria-checked={checked}
      tabIndex={checked ? 0 : -1}
      className={classes.tile()}
      data-testid={ids.tile}
      onClick={onSelect}
      onKeyDown={onKeyDown}
    >
      {showLogo ? (
        <img
          src={option.logo}
          alt={option.label}
          className={classes.logo()}
          data-testid={ids.logo}
          onError={() => setFailed(option.logo!)}
        />
      ) : (
        <span className={classes.name()} data-testid={ids.name}>
          {option.label}
        </span>
      )}
    </button>
  )
}
