import { useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import { chevronIcon, ICON_SIZES } from '@apc/tokens/icons'
import { headerKeyTarget, toggleSection, type AccordionSection } from '@apc/ui-spec/accordion'
import { Icon } from '../Icon/Icon.tsx'
import { accordion } from './Accordion.styles.ts'

// Sections that open and close under their headers, any number at once, e.g. the tutorials of each feature. A header
// is a button inside a heading that says whether its section is open, its chevron turning; Enter or Space opens or
// closes it, and the arrows, Home and End move between the headers (see @apc/ui-spec/accordion). A closed section's
// content is out of the tab order and of what a screen reader reads.

type AccordionProps = {
  /** The sections, each with what it holds. */
  sections: (AccordionSection & { content: ReactNode })[]
  /** Ids of the sections open at first; none by default. */
  defaultOpen?: string[]
  /** The level of the headings the headers sit in, under the screen's own heading; 3 by default. */
  level?: 2 | 3 | 4
}

export function Accordion({ sections, defaultOpen = [], level = 3 }: AccordionProps) {
  const id = useId()
  const [open, setOpen] = useState(defaultOpen)
  const headers = useRef<(HTMLButtonElement | null)[]>([])
  const { classes, ids } = accordion()
  const Heading = `h${level}` as const

  /** Moves the focus between the headers with the arrows, Home and End. */
  const onKeyDown = (event: KeyboardEvent, index: number) => {
    const target = headerKeyTarget(event.key, index, sections.length)
    if (target !== null) {
      event.preventDefault()
      headers.current[target]?.focus()
    }
  }

  return (
    <div className={classes.base()} data-testid={ids.base}>
      {sections.map((section, index) => {
        const isOpen = open.includes(section.id)
        const parts = accordion({ separated: index > 0, open: isOpen }).classes
        const header = `${id}-${section.id}-header`
        const content = `${id}-${section.id}-content`
        return (
          <div key={section.id} className={parts.section()} data-testid={ids.section}>
            <Heading className={classes.heading()} data-testid={ids.heading}>
              <button
                ref={(node) => {
                  headers.current[index] = node
                }}
                id={header}
                type="button"
                aria-expanded={isOpen}
                aria-controls={content}
                className={classes.header()}
                data-testid={ids.header}
                onClick={() => setOpen((current) => toggleSection(current, section.id))}
                onKeyDown={(event) => onKeyDown(event, index)}
              >
                <Icon icon={chevronIcon} size={ICON_SIZES.caret} className={parts.chevron()} />
                <span className={classes.title()} data-testid={ids.title}>
                  {section.title}
                </span>
                {section.detail && (
                  <span className={classes.detail()} data-testid={ids.detail}>
                    {section.detail}
                  </span>
                )}
              </button>
            </Heading>
            <div className={parts.panel()} data-testid={ids.panel}>
              <div className={classes.clip()} data-testid={ids.clip}>
                <div id={content} role="region" aria-labelledby={header} className={classes.content()} data-testid={ids.content}>
                  {section.content}
                </div>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
