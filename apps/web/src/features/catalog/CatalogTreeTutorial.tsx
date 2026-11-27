import { CATALOG_ADD, type CatalogEditLevel, type CatalogNode } from '@apc/domain/catalog'
import { CATALOG_SCREEN_TEXTS } from '@apc/domain/catalog-texts'
import {
  catalogTreeTutorialSteps,
  catalogTreeTutorialTitle,
  type CatalogTreeScreen,
  type CatalogTreeTarget,
} from '@apc/domain/catalog-tree-tutorial'
import type { Locale } from '@apc/domain/locale'
import { Tour } from '../../components/Tour'
import { BOTTOM_BAR_HEIGHT } from '../dashboard/DashboardLayout.styles.ts'
import { useLocale } from '../../app/useLocale.ts'
import { WEB_TEXTS } from '../../app/webTexts.ts'

// The Catalog tree tour on the web: the shared steps (see catalogTreeTutorialSteps) run by the Tour over the Catalog tab,
// which hands its screen over on every render. A step points at the form open (data-tour="catalog-form"), the one adding
// a level or a new engine's sheet, by its save button when it has one; otherwise at what does the step: Novo modelo, the row's button that adds the level
// under a node, or the dashed one of an empty branch, and the row's Mover para cima; on a phone, the action sheet's
// action while it is open, or else the node's "⋯". A node folded away in the tree leaves the card in the middle of the
// screen. On a phone the card keeps clear of the Dashboard's bottom bar.

type CatalogTreeTutorialProps = {
  open: boolean
  /** Called on Skip and on Finish. */
  onClose: () => void
  /** The Catalog tab as it is now; its target is filled in here. */
  screen: Omit<CatalogTreeScreen<Element>, 'target'>
}

/**
 * Finds a button on screen by its accessible name or its text; one folded away in the tree isn't.
 * @param name The name.
 * @param within Where to look.
 * @returns The button, or undefined.
 */
function button(name: string, within: ParentNode = document): Element | undefined {
  return [...within.querySelectorAll('button')].find(
    (each) => (each.getAttribute('aria-label') === name || each.textContent?.trim() === name) && each.checkVisibility({ visibilityProperty: true }),
  )
}

/**
 * Finds a part of the screen the tour points at.
 * @param name The part.
 * @param node The node a level is added under, or the one moved.
 * @param locale The language the page is in.
 * @returns The element, or null when it isn't on the page.
 */
function treeTarget(name: CatalogTreeTarget, node: CatalogNode | undefined, locale: Locale): Element | null {
  const texts = CATALOG_SCREEN_TEXTS[locale]
  // A tall form, such as an engine's sheet, by its save button, so the card leaves it in view.
  const form = document.querySelector('[data-tour="catalog-form"]')
  if (form) {
    return form.querySelector('button[type="submit"]') ?? form
  }
  if (name === 'new-model') {
    return button(texts.newModel) ?? null
  }
  if (!node) {
    return null
  }
  const sheet = document.querySelector('dialog[open]')
  const action = name === 'add-under' ? CATALOG_ADD[locale][node.level as CatalogEditLevel] : texts.moveUp
  const own = name === 'add-under' ? texts.addIn(action, node.label) : WEB_TEXTS[locale].catalog.moveUp(node.label)
  return (sheet && button(action, sheet)) ?? button(own) ?? button(texts.actionsOf(node.label)) ?? null
}

export function CatalogTreeTutorial({ open, onClose, screen }: CatalogTreeTutorialProps) {
  const { locale } = useLocale()
  const steps = catalogTreeTutorialSteps(() => ({ ...screen, target: (name, node) => treeTarget(name, node, locale) }), locale)
  return (
    <Tour
      open={open}
      onClose={onClose}
      steps={steps}
      parts={[catalogTreeTutorialTitle(locale)]}
      bottomInset={screen.phone && !document.querySelector('dialog[open]') ? BOTTOM_BAR_HEIGHT : 0}
    />
  )
}
