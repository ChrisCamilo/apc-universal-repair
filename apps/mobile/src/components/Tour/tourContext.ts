import { createContext, type ReactNode } from 'react';

// Lets a Tour draw above everything, including an open Dialog. React Native has no portals and a Modal sits
// above the rest of the app, so the TourProvider at the root holds the tour's overlay and every TourLayer
// (one at the root, one inside each open Dialog) registers itself; only the last one registered, the
// topmost, draws the overlay. The actions and the state are separate contexts, so the Tour that shows the
// overlay doesn't render again each time the layers do.

/** What the layers draw: the tour's overlay and the id of the layer on top. */
export type TourLayers = { overlay: ReactNode; top: string | null };
/** How a Tour shows its overlay and a TourLayer joins or leaves the stack. */
export type TourLayerActions = {
  show: (overlay: ReactNode) => void;
  addLayer: (id: string) => void;
  removeLayer: (id: string) => void;
};

export const TourActionsContext = createContext<TourLayerActions | null>(null);
export const TourLayersContext = createContext<TourLayers>({ overlay: null, top: null });
