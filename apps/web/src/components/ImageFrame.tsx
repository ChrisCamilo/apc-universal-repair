import { useState, type HTMLAttributes } from 'react'
import { imageIcon } from '@apc/shared/icons'
import { Icon } from './Icon.tsx'
import { useInPanel } from './panelContext.ts'

// The car photo frame. It keeps its aspect ratio whatever the photo's size and never stretches the photo:
// the whole photo shows, letterboxed on the raised fill. While the photo loads the frame shows a spinner
// and is marked busy; with no photo, or one that fails to load, it says so instead.

const DEFAULT_RATIO = 16 / 9

type ImageFrameProps = Omit<HTMLAttributes<HTMLDivElement>, 'children'> & {
  /** Photo URL; null or empty shows the missing state. */
  src?: string | null
  /** The photo URL is still on its way, e.g. while the item loads: shows the loading state. */
  loading?: boolean
  /** Describes the photo, e.g. "Chevrolet Opala 1980, de frente". */
  alt: string
  /** Width divided by height; defaults to 16 / 9. */
  ratio?: number
  /** Shown when there is no photo. */
  emptyLabel?: string
}
type LoadState = { src: string; state: 'loaded' | 'failed' }

export function ImageFrame({ src, loading = false, alt, ratio = DEFAULT_RATIO, emptyLabel = 'Sem foto', className, style, ...rest }: ImageFrameProps) {
  const nested = useInPanel()
  // The result belongs to one URL, so a new src starts loading again without an effect.
  const [load, setLoad] = useState<LoadState | null>(null)
  const state = loading ? 'loading' : !src ? 'missing' : load?.src === src ? load.state : 'loading'
  const missing = state === 'missing' || state === 'failed'

  return (
    <div
      aria-busy={state === 'loading' || undefined}
      className={[
        'relative grid place-items-center overflow-hidden border border-hairline-soft bg-panel-raised text-text-muted',
        nested ? 'rounded-tile' : 'rounded-panel',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      style={{ aspectRatio: ratio, ...style }}
      {...rest}
    >
      {src && !loading && state !== 'failed' && (
        <img
          key={src}
          src={src}
          alt={alt}
          className={`absolute inset-0 size-full object-contain transition-opacity ${state === 'loaded' ? 'opacity-100' : 'opacity-0'}`}
          onLoad={() => setLoad({ src, state: 'loaded' })}
          onError={() => setLoad({ src, state: 'failed' })}
        />
      )}
      {state === 'loading' && (
        <span
          data-testid="image-spinner"
          aria-hidden="true"
          className="absolute size-6 rounded-pill border-2 border-current border-r-transparent motion-safe:animate-spin"
        />
      )}
      {missing && (
        <span className="grid justify-items-center gap-2 p-4 text-center font-body text-sm">
          <Icon icon={imageIcon} size={28} />
          {emptyLabel}
        </span>
      )}
    </div>
  )
}
