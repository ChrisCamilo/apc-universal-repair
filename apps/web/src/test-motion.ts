import { expect } from 'vitest'
import { commands } from 'vitest/browser'

// Checks how an overlay opens and closes, for the tests of the dialogs, the menus and the lists. Motion is slowed to a
// minute, so a transition is still running when a test reads it, and a test ends it when it says so, never on the
// clock: test-setup.ts turns motion off before each test, and these helpers put it back after.

/** Where each move starts: the motion token's enterScale, enterShift px above, or a full height below. */
const ENTRIES = { scale: /^0\.98$/, translate: /-4px$/, rise: /100%$/ } as const
/** How long transitions take while a test reads them: long enough that none ends on its own. */
const SLOW = '60s'

/** An overlay under test: how to open and close it, its element that moves, and whether it has left the page. */
type Overlay = {
  open: () => Promise<unknown>
  close: () => Promise<unknown>
  /** The element that fades and moves: a dialog's window, a menu's popover, a field's list. */
  find: () => Element
  /** Whether it has gone: the element itself, or a dialog's content, which leaves while the window stays. */
  gone: () => boolean
  /**
   * How it moves besides fading: a dialog grows ("scale"), a popover or a list slides from its trigger ("translate"),
   * a bottom sheet rises from the bottom edge ("rise").
   */
  move: 'scale' | 'translate' | 'rise'
  /** Whether it has a backdrop, as a modal dialog does, which fades in and out with it. */
  backdrop?: boolean
}

/** A transition running on an element or one of its pseudo-elements, with the value it goes from and to. */
type Running = { property: string; from: string; to: string }

/**
 * Opens and closes an overlay with reduced motion, as every test starts, and checks it shows with no transition and
 * goes at once, with nothing left behind to wait for.
 * @param overlay The overlay under test.
 */
export async function expectOverlayAtOnce(overlay: Omit<Overlay, 'move' | 'backdrop'>): Promise<void> {
  await overlay.open()
  const element = overlay.find()
  expect(getComputedStyle(element).transitionProperty).toBe('none')
  expect(running(element)).toEqual([])
  await overlay.close()
  expect(overlay.gone()).toBe(true)
}

/**
 * Opens and closes an overlay with motion on, and checks it comes in from its entry in the motion token, fading and
 * moving, stays on the page inert while it leaves, going back the same way, and goes once its transitions end.
 * @param overlay The overlay under test.
 */
export async function expectOverlayMotion(overlay: Overlay): Promise<void> {
  const root = document.documentElement
  await commands.reduceMotion(false)
  root.style.setProperty('--motion-duration', SLOW)
  try {
    await overlay.open()
    const element = overlay.find()
    const entering = running(element)
    expect(entering).toContainEqual({ property: 'opacity', from: '0', to: '1' })
    expect(entering.find(({ property }) => property === (overlay.move === 'scale' ? 'scale' : 'translate'))?.from).toMatch(
      ENTRIES[overlay.move],
    )
    if (overlay.backdrop) {
      expect(entering).toContainEqual({ property: '::backdrop opacity', from: '0', to: '1' })
    }
    // Without the slowing, the transitions take the motion token's 180ms.
    root.style.removeProperty('--motion-duration')
    expect(getComputedStyle(element).transitionDuration).toMatch(/^0\.18s(, 0\.18s)*$/)
    root.style.setProperty('--motion-duration', SLOW)

    // Closing right after opening would only reverse the entry's first instant: let it end first, as the user's eye does.
    finish(element)
    await overlay.close()
    await expect.poll(() => element.closest('[inert]')).not.toBeNull()
    expect(overlay.gone()).toBe(false)
    const leaving = running(element)
    expect(leaving).toContainEqual({ property: 'opacity', from: expect.any(String), to: '0' })
    if (overlay.backdrop) {
      expect(leaving).toContainEqual({ property: '::backdrop opacity', from: expect.any(String), to: '0' })
    }
    finish(element)
    await expect.poll(overlay.gone).toBe(true)
  } finally {
    root.style.removeProperty('--motion-duration')
    await commands.reduceMotion(true)
  }
}

/**
 * Ends the transitions running on an element, its pseudo-elements and its children, as if their time had passed.
 * @param element The element.
 */
function finish(element: Element): void {
  for (const animation of element.getAnimations({ subtree: true })) {
    animation.finish()
  }
}

/**
 * Lists the transitions running on an element and its pseudo-elements, such as a dialog's backdrop.
 * @param element The element.
 * @returns Each transition's property, prefixed by its pseudo-element, and the values it goes from and to.
 */
function running(element: Element): Running[] {
  return element
    .getAnimations({ subtree: true })
    .filter((animation) => animation instanceof CSSTransition)
    .filter((transition) => (transition.effect as KeyframeEffect).target === element)
    .map((transition) => {
      const effect = transition.effect as KeyframeEffect
      const frames = effect.getKeyframes()
      const key = transition.transitionProperty.replace(/-([a-z])/g, (_, letter: string) => letter.toUpperCase())
      return {
        property: effect.pseudoElement ? `${effect.pseudoElement} ${transition.transitionProperty}` : transition.transitionProperty,
        from: String(frames[0][key]),
        to: String(frames.at(-1)![key]),
      }
    })
}
