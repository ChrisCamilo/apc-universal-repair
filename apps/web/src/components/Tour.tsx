import { useEffect, useEffectEvent, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  cardPlacement,
  spotlightRect,
  stepHeader,
  stepIndex,
  TOUR_ADVANCE_DELAY_MS,
  TOUR_CHECK_MS,
  type TourRect,
  type TourStep,
} from '@apc/shared/tour'
import { Button } from './Button.tsx'
import { Panel } from './Panel.tsx'
import { tour } from './Tour.styles.ts'
import { Heading, Label, NumericReadout, Text } from './Typography.tsx'

// A step-by-step guide that points at parts of the screen. A spotlight rings the step's target and dims the
// rest of the screen; it lets clicks through, so the user does the step on the target itself. A card next to
// the target (below or above, whichever fits; beside the dialog the target is in, when there is room; across the
// bottom at phone width) shows the part and the step count, the title, the text and the actions: Skip, "Fazer por
// mim" when the step can do itself, and Next on info-only steps. A step moves on by itself once its check passes,
// and goes back to the step it names when the user leaves it. With a modal dialog open, the tour renders inside the
// dialog, the only part of the page that stays clickable, so it stays on top. It follows the target on scroll and
// resize, and its scrolling and sliding respect prefers-reduced-motion.

type TourProps = {
  open: boolean
  /** Called on Skip and on Finish; the owner closes the tour by setting `open` to false. */
  onClose: () => void
  /** Steps in order; each one's target is a DOM element. */
  steps: readonly TourStep<Element>[]
  /** Names of the tour's parts, for the card header, e.g. ["Criar um item", "Procurar e filtrar"]. */
  parts?: readonly string[]
}
type Layout = {
  /** Where the tour renders: the open modal dialog, or the body. */
  host: Element
  spot: TourRect | null
  card: { x: number; y: number; width: number }
}

/**
 * Measures where the tour goes this frame: inside the open modal dialog if there is one, the spotlight
 * around the target if it is on the page, and the card next to it.
 * @param step Current step.
 * @param cardHeight Height of the card as last drawn, in px.
 * @returns The layout.
 */
function measure(step: TourStep<Element>, cardHeight: number): Layout {
  const target = step.target?.()
  const box = target && target.getClientRects().length ? target.getBoundingClientRect() : null
  const rect = box && { x: box.x, y: box.y, width: box.width, height: box.height }
  const { clientWidth, clientHeight } = document.documentElement
  const dialog = document.querySelector('dialog[open]')
  const dialogBox = dialog && target && dialog.contains(target) ? dialog.getBoundingClientRect() : null
  return {
    host: dialog ?? document.body,
    spot: rect && spotlightRect(rect),
    card: cardPlacement(rect, cardHeight, { width: clientWidth, height: clientHeight }, dialogBox),
  }
}

/**
 * Tells whether two layouts draw the same, so an unchanged frame doesn't render again.
 * @param a One layout.
 * @param b The other.
 * @returns True when the host and every box match.
 */
function sameLayout(a: Layout, b: Layout): boolean {
  return a.host === b.host && JSON.stringify([a.spot, a.card]) === JSON.stringify([b.spot, b.card])
}

export function Tour({ open, ...rest }: TourProps) {
  // Mounted only while open, so every opening starts again at the first step.
  return open ? <TourRun {...rest} /> : null
}

function TourRun({ onClose, steps, parts = [] }: Omit<TourProps, 'open'>) {
  const titleId = useId()
  const textId = useId()
  const [index, setIndex] = useState(0)
  const card = useRef<HTMLDivElement>(null)
  const [layout, setLayout] = useState<Layout>(() => measure(steps[0], 0))
  const step = steps[index]
  const last = index === steps.length - 1
  const header = stepHeader(steps, index, parts)

  /** Moves on to the next step, or finishes after the last one. */
  const next = () => {
    if (last) {
      onClose()
    } else {
      setIndex(index + 1)
    }
  }

  // Reads the current step and props inside the timers without restarting them on every render.
  const check = useEffectEvent((advance: () => void) => {
    if (step.done?.()) {
      advance()
      return
    }
    const back = step.lost?.()
    if (back) {
      setIndex(stepIndex(steps, back))
    }
  })
  const finishStep = useEffectEvent(next)
  const scrollToTarget = useEffectEvent(() => {
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches
    step.target?.()?.scrollIntoView({ block: 'center', behavior: reduce ? 'auto' : 'smooth' })
  })
  const place = useEffectEvent(() => {
    const measured = measure(step, card.current?.offsetHeight ?? 0)
    setLayout((prev) => (sameLayout(prev, measured) ? prev : measured))
  })

  // Start where the screen reader and the keyboard can find the tour.
  useEffect(() => {
    card.current?.focus({ preventScroll: true })
  }, [])

  // Bring each step's target into view, smoothly unless the user asked for reduced motion.
  useEffect(() => {
    scrollToTarget()
  }, [index])

  // Follow the target every frame: scrolling, resizing and dialogs opening all move it.
  useEffect(() => {
    let frame = 0
    const loop = () => {
      place()
      frame = requestAnimationFrame(loop)
    }
    loop()
    return () => cancelAnimationFrame(frame)
  }, [])

  // Check the step: once it is done, wait a moment so the user sees it worked, then move on; once the user
  // has left it, go back to the step it names.
  useEffect(() => {
    let advance: ReturnType<typeof setTimeout> | undefined
    const timer = setInterval(() => {
      if (advance === undefined) {
        check(() => {
          advance = setTimeout(finishStep, TOUR_ADVANCE_DELAY_MS)
        })
      }
    }, TOUR_CHECK_MS)
    return () => {
      clearInterval(timer)
      clearTimeout(advance)
    }
  }, [index])

  const { classes, ids } = tour()
  return createPortal(
    <>
      {layout.spot && (
        <div
          aria-hidden="true"
          className={classes.spotlight()}
          data-testid={ids.spotlight}
          style={{ left: layout.spot.x, top: layout.spot.y, width: layout.spot.width, height: layout.spot.height }}
        >
          <div className={classes.glow()} data-testid={ids.glow} />
        </div>
      )}
      <div
        ref={card}
        role="dialog"
        aria-labelledby={titleId}
        aria-describedby={textId}
        tabIndex={-1}
        className={classes.card()}
        data-testid={ids.card}
        style={{ left: layout.card.x, top: layout.card.y, width: layout.card.width }}
      >
        <Panel className={classes.panel()}>
          <div className={classes.header()} data-testid={ids.header}>
            <Label tone="accent">{header.part}</Label>
            <NumericReadout tone="muted">{header.count}</NumericReadout>
          </div>
          <Heading id={titleId} level={4}>
            {step.title}
          </Heading>
          <Text id={textId} size="sm" tone="muted" aria-live="polite">
            {step.text}
          </Text>
          <div className={classes.actions()} data-testid={ids.actions}>
            {!last && (
              <Button variant="link" size="sm" onClick={onClose}>
                Pular tutorial
              </Button>
            )}
            <span className={classes.buttons()} data-testid={ids.buttons}>
              {step.auto && (
                <Button variant="secondary" size="sm" onClick={step.auto}>
                  Fazer por mim
                </Button>
              )}
              {!step.done && (
                <Button size="sm" onClick={next}>
                  {last ? 'Concluir' : 'Próximo'}
                </Button>
              )}
            </span>
          </div>
        </Panel>
      </div>
    </>,
    layout.host,
  )
}
