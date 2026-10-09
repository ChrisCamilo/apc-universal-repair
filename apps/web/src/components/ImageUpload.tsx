import { useId, useState, type DragEvent } from 'react'
import { closeIcon, ICON_SIZES, imageIcon } from '@apc/shared/icons'
import { PHOTO_TYPES, photoCount, takePhotos } from '@apc/shared/photos'
import { Icon } from './Icon.tsx'
import { imageUpload } from './ImageUpload.styles.ts'
import { Label, Text } from './Typography.tsx'

// The photo field of the item form. Photos show as thumbnails, the first one marked as the cover, each with
// an × to remove it. Under them, a drop area that is also clickable takes several files at once and says how
// many more fit; it disappears once the limit is reached. Only JPG, PNG and WebP up to 3 MB are taken: files
// that break the rule or go past the limit are left out, and a message names each one and says why. Read-only,
// as in the item details, it only shows the photos, or says there are none: no ×, no drop area.


/** A photo the field holds: one already saved has only its URL; one just chosen also has its file. */
export type UploadPhoto = { url: string; file?: File }
type ImageUploadProps = {
  label: string
  photos: readonly UploadPhoto[]
  onPhotosChange: (photos: UploadPhoto[]) => void
  /** Most photos the field holds, e.g. ITEM_PHOTO_LIMIT. */
  limit: number
  /** Only shows the photos; nothing can be added or removed. */
  readOnly?: boolean
}

export function ImageUpload({ label, photos, onPhotosChange, limit, readOnly = false }: ImageUploadProps) {
  const labelId = useId()
  const inputId = useId()
  const [problems, setProblems] = useState<string[]>([])
  const [dragging, setDragging] = useState(false)
  const { classes, ids } = imageUpload()
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
    <div role="group" aria-labelledby={labelId} className={classes.base()} data-testid={ids.base}>
      <Label id={labelId}>{label}</Label>
      {photos.length > 0 && (
        <ul className={classes.photos()} data-testid={ids.photos}>
          {photos.map((photo, index) => (
            <li key={photo.url} className={classes.photo()} data-testid={ids.photo}>
              <img
                src={photo.url}
                alt={`Foto ${index + 1}${index === 0 ? ', capa' : ''}`}
                className={classes.image()}
                data-testid={ids.image}
              />
              {index === 0 && (
                <span aria-hidden="true" className={classes.cover()} data-testid={ids.cover}>
                  capa
                </span>
              )}
              {!readOnly && (
                <button
                  type="button"
                  aria-label={`Remover foto ${index + 1}`}
                  className={classes.remove()}
                  data-testid={ids.remove}
                  onClick={() => remove(index)}
                >
                  <Icon icon={closeIcon} size={ICON_SIZES.mark} />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      {readOnly && photos.length === 0 && <Text tone="muted">Sem fotos</Text>}
      {!readOnly && left > 0 && (
        <label
          htmlFor={inputId}
          data-dragging={dragging || undefined}
          className={classes.drop()}
          data-testid={ids.drop}
          onDragOver={(event) => {
            event.preventDefault()
            setDragging(true)
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
        >
          <span className={classes.picture()} data-testid={ids.picture}>
            <Icon icon={imageIcon} size={ICON_SIZES.dropZone} />
          </span>
          <span className={classes.text()} data-testid={ids.text}>
            <span>
              {photos.length > 0
                ? `Arraste mais ${photoCount(left)} ou clique para escolher`
                : `Arraste até ${photoCount(limit)} ou clique para escolher`}
            </span>
            <small className={classes.hint()} data-testid={ids.hint}>
              JPG, PNG ou WebP, até 3 MB cada. A primeira vira a capa na lista.
            </small>
          </span>
          <input
            id={inputId}
            type="file"
            accept={PHOTO_TYPES.join(',')}
            multiple
            className={classes.input()}
            data-testid={ids.input}
            onChange={(event) => {
              add([...(event.target.files ?? [])])
              // Let the same file be chosen again after it is removed.
              event.target.value = ''
            }}
          />
        </label>
      )}
      {problems.length > 0 && (
        <ul role="alert" className={classes.problems()} data-testid={ids.problems}>
          {problems.map((problem) => (
            <li key={problem}>{problem}</li>
          ))}
        </ul>
      )}
    </div>
  )
}
