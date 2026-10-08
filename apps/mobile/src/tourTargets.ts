import type { HostInstance } from 'react-native';

// Where the parts of the screen a guided tour points at are, on mobile: there is no document to search, so each
// part marks its view by name (ref={tourTarget('form-save')}) and the tour finds it while it is on screen.

const refs = new Map<string, (view: HostInstance | null) => void>();
const views = new Map<string, HostInstance>();

/**
 * Finds a marked view, while it is on screen.
 * @param name The name it was marked with.
 * @returns The view, or null.
 */
export function findTourTarget(name: string): HostInstance | null {
  return views.get(name) ?? null;
}

/**
 * Marks a view for the tour, as its ref; the same name always gives the same ref.
 * @param name The part of the screen, e.g. "form-save".
 * @returns The ref callback.
 */
export function tourTarget(name: string): (view: HostInstance | null) => void {
  let ref = refs.get(name);
  if (!ref) {
    ref = (view) => {
      if (view) {
        views.set(name, view);
      } else {
        views.delete(name);
      }
    };
    refs.set(name, ref);
  }
  return ref;
}
