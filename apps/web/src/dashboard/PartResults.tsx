import { useRef, type KeyboardEvent } from 'react'
import { partFit, type PartResults as Results } from '@apc/shared/catalog'
import type { Item } from '@apc/shared/items'
import { arrowTarget } from '../components/radioKeys.ts'
import { Text } from '../components/Typography.tsx'
import { partResults } from './PartResults.styles.ts'

// The inventory parts a Catalog search by code found, in a tinted box above the tree: each with its code, its name
// and which vehicle it fits. Choosing one reveals its vehicle in the tree; the chosen part has the accent frame.
// The parts are a radio group: one is always chosen, it is the only Tab stop and the arrows move the choice. When
// more parts matched than fit, a line says how many more.

type PartResultsProps = {
  results: Results
  /** The chosen part's id. */
  chosen?: string
  onChoose: (part: Item) => void
}

export function PartResults({ results, chosen, onChoose }: PartResultsProps) {
  const buttons = useRef<(HTMLButtonElement | null)[]>([])
  const { parts, more } = results
  const ui = partResults()

  /** Moves the choice with the arrows and follows it with the focus. */
  const onKeyDown = (event: KeyboardEvent, index: number) => {
    const target = arrowTarget(event.key, index, parts.length)
    if (target === null) {
      return
    }
    event.preventDefault()
    onChoose(parts[target])
    buttons.current[target]?.focus()
  }

  return (
    <div {...ui.base()}>
      <Text size="sm" tone="muted">
        {parts.length === 1 ? 'Peça do estoque com esse código:' : 'Peças do estoque com esse código:'}
      </Text>
      <div role="radiogroup" aria-label="Peças do estoque com esse código" {...ui.list()}>
        {parts.map((part, index) => (
          <button
            key={part.id}
            ref={(node) => {
              buttons.current[index] = node
            }}
            type="button"
            role="radio"
            aria-checked={part.id === chosen}
            tabIndex={part.id === chosen ? 0 : -1}
            {...ui.part()}
            onClick={() => onChoose(part)}
            onKeyDown={(event) => onKeyDown(event, index)}
          >
            <span {...ui.line()}>
              <code {...ui.code()}>{part.code}</code>
              <span {...ui.name()}>{part.name}</span>
            </span>
            <span {...ui.fit()}>{partFit(part)}</span>
          </button>
        ))}
      </div>
      {more > 0 && (
        <Text size="sm" tone="muted">
          Mais {more}. Digite mais do código para afinar.
        </Text>
      )}
    </div>
  )
}
