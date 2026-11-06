import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { toggleExclusive, toggleValue } from '@apc/shared/filters'
import { filterChip, filterChipGroup } from './FilterChip.styles.ts'

// Toggle chips for quick filters. A chip says whether it is on with aria-pressed and lights up in the
// accent. In a single-choice group, turning one chip on turns the others off and pressing the chip that is
// on turns it off, leaving none selected; in a multiple group each chip turns on and off on its own.

type ChipOption = {
  value: string
  label: string
  /** Full name in a tooltip, for short labels such as "LD". */
  title?: string
}
type ChipSize = 'md' | 'sm'
type FilterChipGroupProps = {
  /** Accessible name of the group, e.g. "Situação do estoque". */
  label: string
  options: ChipOption[]
  size?: ChipSize
} & (
  | { multiple: true; value: string[]; onValueChange: (value: string[]) => void }
  | { multiple?: false; value: string | null; onValueChange: (value: string | null) => void }
)
type FilterChipProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children' | 'onChange'> & {
  pressed: boolean
  onPressedChange: (pressed: boolean) => void
  size?: ChipSize
  children: ReactNode
}

export function FilterChip({ pressed, onPressedChange, size = 'md', className, children, ...rest }: FilterChipProps) {
  const { classes, ids } = filterChip({ size })
  return (
    <button
      type="button"
      aria-pressed={pressed}
      className={classes.base({ class: className })}
      data-testid={ids.base}
      onClick={() => onPressedChange(!pressed)}
      {...rest}
    >
      {children}
    </button>
  )
}

export function FilterChipGroup(props: FilterChipGroupProps) {
  const { label, options, size = 'md' } = props
  const order = options.map((o) => o.value)
  const { classes, ids } = filterChipGroup()
  return (
    <span role="group" aria-label={label} className={classes.base()} data-testid={ids.base}>
      {options.map((option) => (
        <FilterChip
          key={option.value}
          size={size}
          title={option.title}
          pressed={props.multiple ? props.value.includes(option.value) : props.value === option.value}
          onPressedChange={() =>
            props.multiple
              ? props.onValueChange(toggleValue(props.value, option.value, order))
              : props.onValueChange(toggleExclusive(props.value, option.value))
          }
        >
          {option.label}
        </FilterChip>
      ))}
    </span>
  )
}
