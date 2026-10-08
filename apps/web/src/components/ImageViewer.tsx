import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react'
import { DIALOG_SCREEN_INSET, DIALOG_WIDTHS } from '@apc/shared/dialog'
import { chevronIcon, imageIcon } from '@apc/shared/icons'
import { PHOTO_TYPES, photoCount, takePhotos } from '@apc/shared/photos'
import { Button } from './Button.tsx'
import { CloseButton } from './CloseButton.tsx'
import { Dialog } from './Dialog.tsx'
import { Icon } from './Icon.tsx'
import type { UploadPhoto } from './ImageUpload.tsx'
import { ToastProvider } from './Toast.tsx'
import { useToast } from './toastContext.ts'
import { Heading, NumericReadout, Text } from './Typography.tsx'

// A large view of an item's photos, opened from its thumbnail: one photo at a time, as large as the screen
// allows and never cropped, under the item's name and code. With more than one photo, arrows over the photo
// and the Left and Right keys move through them, wrapping around, and dots under it show which one is on
// screen and jump to a photo. It closes on the ×, on Escape and on a click outside, over the blurred backdrop.
// "Remover esta foto" asks first, naming the item and warning when the photo is the cover; the next photo
// takes its place. "Trocar esta foto" replaces the one on screen and "Adicionar foto" shows while there is
// room, both with the ImageUpload rules and messages. The owner may save each change as it happens: when it says
// the change couldn't be saved, the toast says so instead of confirming it. Toasts show inside the viewer, the only
// part of the page that stays visible and announced while it is open.

const NAV_BUTTON =
  'absolute top-1/2 grid size-10 -translate-y-1/2 cursor-pointer place-items-center rounded-pill border border-hairline bg-panel text-text outline-none transition-[border-color,color,box-shadow] hover:border-accent hover:text-accent hover:shadow-glow focus-visible:shadow-ring'

type ImageViewerProps = {
  open: boolean
  /** Called on the ×, on Escape and on a click outside; the owner closes the viewer by setting `open` to false. */
  onClose: () => void
  /** Item name, shown above the photo and named in the remove confirmation. */
  name: string
  /** Item code, shown under the name. */
  code: string
  photos: readonly UploadPhoto[]
  /** Takes the changed photos; resolving to false says they couldn't be saved. */
  onPhotosChange: (photos: UploadPhoto[]) => void | Promise<boolean>
  /** Most photos the item holds, e.g. ITEM_PHOTO_LIMIT. */
  limit: number
}
type ViewerBodyProps = Omit<ImageViewerProps, 'open'> & { titleId: string }

/**
 * Lets go of the preview made for a file just chosen; a saved photo's URL is left alone.
 * @param photo Photo leaving the viewer.
 */
function release(photo: UploadPhoto) {
  if (photo.file) {
    URL.revokeObjectURL(photo.url)
  }
}

export function ImageViewer({ open, onClose, ...rest }: ImageViewerProps) {
  const titleId = useId()
  const dialog = useRef<HTMLDialogElement>(null)

  // Open and close the native dialog as `open` changes.
  useEffect(() => {
    const element = dialog.current
    if (open && element && !element.open) {
      element.showModal()
    } else if (!open && element?.open) {
      element.close()
    }
  }, [open])

  return (
    <dialog
      ref={dialog}
      aria-labelledby={titleId}
      className="m-auto max-w-none overflow-y-auto rounded-panel border border-hairline bg-panel p-0 text-text shadow-pop backdrop:bg-backdrop backdrop:backdrop-blur-backdrop"
      // The browser caps a modal dialog at 100% - 6px - 2em; max-w-none lets this width rule apply instead.
      style={{
        width: `min(${DIALOG_WIDTHS.viewer}px, calc(100vw - ${DIALOG_SCREEN_INSET}px))`,
        maxHeight: `calc(100dvh - ${DIALOG_SCREEN_INSET}px)`,
      }}
      onCancel={(event) => {
        // A file picker closed without a choice also fires "cancel", which bubbles up to here: only the
        // dialog's own Escape closes it, and the owner does, so `open` stays the one source of truth.
        if (event.target === dialog.current) {
          event.preventDefault()
          onClose()
        }
      }}
      // A click on the dialog itself, not on its content, landed on the backdrop.
      onClick={(event) => {
        if (event.target === dialog.current) {
          onClose()
        }
      }}
    >
      {open && (
        <ToastProvider>
          <ViewerBody titleId={titleId} onClose={onClose} {...rest} />
        </ToastProvider>
      )}
    </dialog>
  )
}

function ViewerBody({ titleId, onClose, name, code, photos, onPhotosChange, limit }: ViewerBodyProps) {
  const toast = useToast()
  const input = useRef<HTMLInputElement>(null)
  const [index, setIndex] = useState(0)
  const [replacing, setReplacing] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [problems, setProblems] = useState<string[]>([])
  const count = photos.length
  // After a removal the index may point past the end; the last photo shows instead.
  const current = Math.min(index, Math.max(0, count - 1))
  const full = count >= limit

  /** Moves to the previous or the next photo, wrapping around the ends. */
  const step = (delta: number) => {
    if (count > 1) {
      setIndex((current + delta + count) % count)
    }
  }

  /** Moves through the photos with the Left and Right keys, unless the confirmation is open over the viewer. */
  const onKeyDown = (event: KeyboardEvent) => {
    if (confirming || (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight')) {
      return
    }
    event.preventDefault()
    step(event.key === 'ArrowLeft' ? -1 : 1)
  }

  /** Opens the file picker to add a photo, or to replace the one on screen. */
  const choose = (replace: boolean) => {
    setReplacing(replace)
    input.current?.click()
  }

  /** Hands the changed photos over, then confirms the change or says it couldn't be saved. */
  const change = async (next: UploadPhoto[], done: string) => {
    const saved = await onPhotosChange(next)
    toast(saved === false ? 'Não foi possível salvar as fotos. Tente de novo.' : done)
  }

  /** Checks the chosen file and adds it, or puts it in place of the photo on screen. */
  const take = (file: File) => {
    const { accepted, problems: leftOut } = replacing ? takePhotos([file], 0, 1) : takePhotos([file], count, limit)
    setProblems(leftOut)
    if (accepted.length === 0) {
      return
    }
    const photo = { url: URL.createObjectURL(file), file }
    if (replacing) {
      release(photos[current])
      change(
        photos.map((p, i) => (i === current ? photo : p)),
        'Foto trocada',
      )
    } else {
      setIndex(count)
      change([...photos, photo], 'Foto adicionada')
    }
  }

  /** Removes the photo on screen after the confirmation; the next one takes its place. */
  const remove = () => {
    release(photos[current])
    setConfirming(false)
    setProblems([])
    change(
      photos.filter((_, i) => i !== current),
      'Foto removida',
    )
  }

  return (
    <div className="grid gap-3 p-4" onKeyDown={onKeyDown}>
      <div className="flex items-start justify-between gap-3">
        <div className="grid min-w-0 gap-0.5">
          <Heading id={titleId} level={3}>
            {name}
          </Heading>
          <NumericReadout tone="muted">{code}</NumericReadout>
        </div>
        <CloseButton onClick={onClose} />
      </div>
      <div className="relative">
        <div className="relative grid aspect-4/3 max-h-[62dvh] w-full place-items-center overflow-hidden rounded-tile border border-hairline-soft bg-canvas text-text-muted">
          {count > 0 ? (
            <img src={photos[current].url} alt={`Foto ${current + 1} de ${count} · ${name}`} className="absolute inset-0 size-full object-contain" />
          ) : (
            <div className="grid justify-items-center gap-2 p-6 text-center">
              <Icon icon={imageIcon} size={56} />
              <Heading level={4}>Este item ainda não tem fotos</Heading>
              <Text size="sm" tone="muted">
                Adicione até {photoCount(limit)}. A primeira vira a capa na lista.
              </Text>
            </div>
          )}
        </div>
        {count > 1 && (
          <>
            <button type="button" aria-label="Foto anterior" className={`${NAV_BUTTON} left-2.5`} onClick={() => step(-1)}>
              <Icon icon={chevronIcon} size={18} className="rotate-180" />
            </button>
            <button type="button" aria-label="Próxima foto" className={`${NAV_BUTTON} right-2.5`} onClick={() => step(1)}>
              <Icon icon={chevronIcon} size={18} />
            </button>
          </>
        )}
      </div>
      {count > 1 && (
        <div className="flex items-center justify-center gap-2">
          {photos.map((photo, i) => (
            <button
              key={photo.url}
              type="button"
              aria-label={`Foto ${i + 1}`}
              aria-current={i === current}
              className="size-2.5 cursor-pointer rounded-pill bg-hairline outline-none focus-visible:shadow-ring aria-current:bg-accent aria-current:shadow-glow"
              onClick={() => setIndex(i)}
            />
          ))}
        </div>
      )}
      {problems.length > 0 && (
        <ul role="alert" className="m-0 grid list-none gap-0.5 p-0 font-body text-sm text-danger">
          {problems.map((problem) => (
            <li key={problem}>{problem}</li>
          ))}
        </ul>
      )}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Text size="sm" tone="muted">
          {full
            ? `Limite de ${photoCount(limit)} atingido. Troque ou remova uma para adicionar outra.`
            : `JPG, PNG ou WebP, até 3 MB · ${count} de ${photoCount(limit)}`}
        </Text>
        <span className="flex flex-wrap gap-2">
          {count > 0 && (
            <>
              <Button variant="secondary" size="sm" onClick={() => setConfirming(true)}>
                Remover esta foto
              </Button>
              <Button variant="secondary" size="sm" onClick={() => choose(true)}>
                Trocar esta foto
              </Button>
            </>
          )}
          {!full && (
            <Button size="sm" onClick={() => choose(false)}>
              Adicionar foto
            </Button>
          )}
        </span>
        <input
          ref={input}
          type="file"
          accept={PHOTO_TYPES.join(',')}
          tabIndex={-1}
          aria-hidden="true"
          className="sr-only"
          onChange={(event) => {
            const file = event.target.files?.[0]
            // Let the same file be chosen again later.
            event.target.value = ''
            if (file) {
              take(file)
            }
          }}
        />
      </div>
      <Dialog
        open={confirming}
        onClose={() => setConfirming(false)}
        title="Remover esta foto?"
        size="confirm"
        actions={
          <>
            <Button variant="secondary" size="sm" onClick={() => setConfirming(false)}>
              Cancelar
            </Button>
            <Button variant="danger" size="sm" onClick={remove}>
              Remover
            </Button>
          </>
        }
      >
        <Text size="sm" tone="muted">
          Esta foto sai de {name} ({code}). Essa ação não pode ser desfeita.
          {current === 0 && count > 1 && ' Ela é a capa; a próxima foto passa a ser a capa na lista.'}
        </Text>
      </Dialog>
    </div>
  )
}
