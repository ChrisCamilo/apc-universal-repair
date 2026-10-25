import { Button } from '../components/Button.tsx'
import { Dialog } from '../components/Dialog.tsx'
import { Markdown } from '../components/Markdown.tsx'
import { NumericReadout, Text } from '../components/Typography.tsx'
import { aboutDialog } from './AboutDialog.styles.ts'
import { portugueseNotes, RELEASES_URL } from './releaseNotes.ts'

// "Sobre esta versão", opened from the user menu: the version in use, its release notes in Portuguese, and a link to
// every release on GitHub, which opens in a new window (the computer's browser, in the desktop app). The version and
// the notes come with the build (see vite.config.ts), so they show offline; a version with no notes yet says so.
// Fechar, the × and Escape close it.

type AboutDialogProps = {
  open: boolean
  onClose: () => void
  /** The version in use, e.g. "0.6.5". */
  version: string
  /** Its release notes, docs/releases/v<version>.md; undefined while it has none. */
  notes?: string
}

export function AboutDialog({ open, onClose, version, notes }: AboutDialogProps) {
  const { classes, ids } = aboutDialog()
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Sobre esta versão"
      closable
      actions={
        <Button variant="secondary" size="sm" onClick={onClose}>
          Fechar
        </Button>
      }
    >
      <div className={classes.version()} data-testid={ids.version}>
        <Text>
          APC Universal Repair <NumericReadout>{version}</NumericReadout>
        </Text>
        <Button variant="link" size="sm" onClick={() => window.open(RELEASES_URL, '_blank')}>
          Ver todas as versões no GitHub
        </Button>
      </div>
      {notes === undefined ? (
        <Text size="sm" tone="muted">
          Esta versão não tem notas.
        </Text>
      ) : (
        <Markdown>{portugueseNotes(notes)}</Markdown>
      )}
    </Dialog>
  )
}
