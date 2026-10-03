import { useId, useState, type DragEvent } from 'react'
import { closeIcon, imageIcon } from '@apc/shared/icons'
import { PHOTO_TYPES, photoCount, takePhotos } from '@apc/shared/photos'
import { Icon } from './Icon.tsx'
import { Label } from './Typography.tsx'

// The photo field of the item form. Photos show as thumbnails, the first one marked as the cover, each with
// an × to remove it. Under them, a drop area that is also clickable takes several files at once and says how
// many more fit; it disappears once the limit is reached. Only JPG, PNG and WebP up to 3 MB are taken: files
// that break the rule or go past the limit are left out, and a message names each one and says why.

const CHIP = 'absolute rounded-pill bg-backdrop text-text'

/** A photo the field holds: one already saved has only its URL; one just chosen also has its file. */
export type UploadPhoto = { url: string; file?: File }
type ImageUploadProps = {
  label: string
  photos: readonly UploadPhoto[]
  onPhotosChange: (photos: UploadPhoto[]) => void
  /** Most photos the field holds, e.g. ITEM_PHOTO_LIMIT. */
  limit: number
}

export function ImageUpload({ label, photos, onPhotosChange, limit }: ImageUploadProps) {
  const labelId = useId()
  const inputId = useId()
  const [problems, setProblems] = useState<string[]>([])
  const [dragging, setDragging] = useState(false)
  const left = limit - photos.length

  /** Takes the files that pass the rules and fit, and says which were left out and why. */
  const add = (files: File[]) => {
    const { accepted, problems: leftOut } = takePhotos(files, photos.length, limit)
    setProblems(leftOut)
    if (accepted.length > 0) {
      onPhotosChange([...photos, ...accepted.map((file) => ({ url: URL.createObjectURL(file), file }))])
    }
  }

  /** Removes a photo, letting go of the preview made for a file just chosen. */
  const remove = (index: number) => {
    const photo = photos[index]
    if (photo.file) {
      URL.revokeObjectURL(photo.url)
    }
    setProblems([])
    onPhotosChange(photos.filter((_, i) => i !== index))
  }

  /** Takes the files dropped on the area. */
  const onDrop = (event: DragEvent) => {
    event.preventDefault()
    setDragging(false)
    add([...event.dataTransfer.files])
  }

  return (
    <div role="group" aria-labelledby={labelId} className="grid gap-1.5">
      <Label id={labelId}>{label}</Label>
      {photos.length > 0 && (
        <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
          {photos.map((photo, index) => (
            <li
              key={photo.url}
              className="relative size-18 max-w-full overflow-hidden rounded-tile border border-hairline-soft bg-panel-raised"
            >
              <img src={photo.url} alt={`Foto ${index + 1}${index === 0 ? ', capa' : ''}`} className="size-full object-cover" />
              {index === 0 && (
                <span aria-hidden="true" className={`${CHIP} bottom-1 left-1 px-1.5 font-mono text-xs leading-normal`}>
                  capa
                </span>
              )}
              <button
                type="button"
                aria-label={`Remover foto ${index + 1}`}
                className={`${CHIP} top-1 right-1 grid size-5.5 cursor-pointer place-items-center outline-none transition-colors hover:bg-danger hover:text-on-danger focus-visible:shadow-ring`}
                onClick={() => remove(index)}
              >
                <Icon icon={closeIcon} size={10} />
              </button>
            </li>
          ))}
        </ul>
      )}
      {left > 0 && (
        <label
          htmlFor={inputId}
          data-dragging={dragging || undefined}
          className="grid cursor-pointer grid-cols-[calc(var(--spacing)*18)_minmax(0,1fr)] items-center gap-3 rounded-tile border border-dashed border-hairline bg-panel-raised p-3 font-body text-sm text-text transition-colors hover:border-accent hover:bg-accent-soft has-[input:focus-visible]:shadow-ring data-dragging:border-accent data-dragging:bg-accent-soft"
          onDragOver={(event) => {
            event.preventDefault()
            setDragging(true)
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
        >
          <span className="grid size-18 place-items-center rounded-tile border border-hairline-soft bg-panel text-text-muted">
            <Icon icon={imageIcon} size={22} />
          </span>
          <span className="grid gap-0.5">
            <span>
              {photos.length > 0
                ? `Arraste mais ${photoCount(left)} ou clique para escolher`
                : `Arraste até ${photoCount(limit)} ou clique para escolher`}
            </span>
            <small className="text-xs text-text-muted">JPG, PNG ou WebP, até 3 MB cada. A primeira vira a capa na lista.</small>
          </span>
          <input
            id={inputId}
            type="file"
            accept={PHOTO_TYPES.join(',')}
            multiple
            className="sr-only"
            onChange={(event) => {
              add([...(event.target.files ?? [])])
              // Let the same file be chosen again after it is removed.
              event.target.value = ''
            }}
          />
        </label>
      )}
      {problems.length > 0 && (
        <ul role="alert" className="m-0 grid list-none gap-0.5 p-0 font-body text-sm text-danger">
          {problems.map((problem) => (
            <li key={problem}>{problem}</li>
          ))}
        </ul>
      )}
    </div>
  )
}
