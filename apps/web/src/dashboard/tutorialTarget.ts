import type { TutorialTarget } from '@apc/shared/inventory-tutorial'

// Where each part of the Inventory tab the tutorial points at is on the page: the marked buttons and fields
// (data-tour), the Filtros menu, and the test item's row and its buttons.

/**
 * Finds a part of the Inventory tab on the page, for the tutorial to point at.
 * @param name The part.
 * @param code The test item's part code, for its row.
 * @param itemName The test item's name, which its row buttons are named after.
 * @returns The element, or null when it isn't on the page.
 */
export function tutorialTarget(name: TutorialTarget, code: string, itemName?: string): Element | null {
  const row = () => [...document.querySelectorAll('tbody tr')].find((tr) => tr.textContent?.includes(code)) ?? null
  /** The field around an input marked for the tutorial. */
  const field = (mark: string) => document.querySelector(`[data-tour="${mark}"]`)?.closest('.grid') ?? null
  switch (name) {
    case 'new':
      return document.querySelector('[data-tour="new-item"]')
    case 'search':
      return document.querySelector('[data-tour="search"]')?.parentElement ?? null
    case 'filters':
      return document.querySelector('button[aria-haspopup="dialog"][aria-controls]')
    case 'filter-panel':
      return document.querySelector('[role="dialog"][aria-label="Filtros do estoque"]')
    case 'form-identity':
      return field('form-code')
    case 'form-name':
      return field('form-name')
    case 'form-stock':
    case 'form-quantity':
      return field('form-quantity')
    case 'form-save':
    case 'form-edit':
    case 'confirm-delete':
      return document.querySelector(`[data-tour="${name}"]`)
    case 'row':
      return row()
    case 'pencil':
      return row()?.querySelector(`[aria-label="Editar ${itemName}"]`) ?? null
    case 'trash':
      return row()?.querySelector(`[aria-label="Excluir ${itemName}"]`) ?? null
  }
}
