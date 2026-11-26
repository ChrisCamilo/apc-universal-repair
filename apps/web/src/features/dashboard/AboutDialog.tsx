import { COMMON_TEXTS } from '@apc/domain/app-texts'
import { useLocale } from '../../app/useLocale.ts'
import { WEB_TEXTS } from '../../app/webTexts.ts'
import { Button } from '../../components/Button'
import { Dialog } from '../../components/Dialog'
import { Markdown } from '../../components/Markdown'
import { NumericReadout, Text } from '../../components/Typography'
import { aboutDialog } from './AboutDialog.styles.ts'
import { notesIn, RELEASES_URL } from './releaseNotes.ts'

// "Sobre esta versão", opened from the user menu: the version in use, its release notes in the language chosen, and a link to
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
  const { locale } = useLocale()
  const texts = WEB_TEXTS[locale].about
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={texts.title}
      closable
      actions={
        <Button variant="secondary" size="sm" onClick={onClose}>
          {COMMON_TEXTS[locale].close}
        </Button>
      }
    >
      <div className={classes.version()} data-testid={ids.version}>
        <Text>
          APC Universal Repair <NumericReadout>{version}</NumericReadout>
        </Text>
        <Button variant="link" size="sm" onClick={() => window.open(RELEASES_URL, '_blank')}>
          {texts.allVersions}
        </Button>
      </div>
      {notes === undefined ? (
        <Text size="sm" tone="muted">
          {texts.noNotes}
        </Text>
      ) : (
        <Markdown>{notesIn(notes, locale)}</Markdown>
      )}
    </Dialog>
  )
}
