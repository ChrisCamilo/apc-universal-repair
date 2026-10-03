import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { toggleExclusive, toggleValue } from '@apc/shared/filters'

// Toggle chips for quick filters. A chip says whether it is on with aria-pressed and lights up in the
// accent. In a single-choice group, turning one chip on turns the others off and pressing the chip that is
// on turns it off, leaving none selected; in a multiple group each chip turns on and off on its own.

const CHIP =
  'cursor-pointer rounded-pill border border-hairline-soft bg-transparent font-display text-xs font-semibold uppercase ' +
  'tracking-display text-text-muted outline-none transition-[color,border-color,background-color,box-shadow] ' +
  'not-aria-pressed:hover:border-hairline not-aria-pressed:hover:text-text focus-visible:shadow-ring ' +
  'aria-pressed:border-accent aria-pressed:bg-accent-soft aria-pressed:text-accent'
const SIZE_CLASSES = { md: 'px-3 py-1', sm: 'px-2.5 py-0.5' }

type ChipOption = {
  value: string
  label: string
  /** Full name in a tooltip, for short labels such as "LD". */
  title?: string
}
type FilterChipGroupProps = {
  /** Accessible name of the group, e.g. "Situação do estoque". */
  label: string
  options: ChipOption[]
  size?: keyof typeof SIZE_CLASSES
} & (
  | { multiple: true; value: string[]; onValueChange: (value: string[]) => void }
  | { multiple?: false; value: string | null; onValueChange: (value: string | null) => void }
)
type FilterChipProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children' | 'onChange'> & {
  pressed: boolean
  onPressedChange: (pressed: boolean) => void
  size?: keyof typeof SIZE_CLASSES
  children: ReactNode
}

export function FilterChip({ pressed, onPressedChange, size = 'md', className, children, ...rest }: FilterChipProps) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      className={[CHIP, SIZE_CLASSES[size], className].filter(Boolean).join(' ')}
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
  return (
    <span role="group" aria-label={label} className="inline-flex flex-wrap gap-1.5">
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
