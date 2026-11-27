import { useId } from 'react'
import { COMMON_TEXTS } from '@apc/domain/app-texts'
import { TUTORIAL_TEXTS, tutorialSections, tutorialTitle, type Tutorial, type TutorialId } from '@apc/domain/tutorials'
import { useLocale } from '../../app/useLocale.ts'
import { Accordion } from '../../components/Accordion'
import { Button } from '../../components/Button'
import { Dialog } from '../../components/Dialog'
import { Heading, Text } from '../../components/Typography'
import { usePhone } from '../../components/usePhone.ts'
import { desktopBridge } from '../desktop/desktopBridge.ts'
import { tutorialsDialog } from './TutorialsDialog.styles.ts'

// "Tutoriais", opened from the user menu: the tutorials of the app it is in (the desktop app's, or the web's in a
// browser), by feature, each feature a section of an accordion that opens and closes, all open at first (see
// @apc/domain/tutorials). Each tutorial is a button named by its title, which says its one-line description, its kind
// (a guided tour or an explanation) and how many steps it has; pressing it starts it (see tutorialsContext.ts), and the
// dialog closes. Fechar, the × and Escape close it. On a phone (below `card:`) it fills the screen, with a ← in place of
// the ×, and its title heads it.

type TutorialsDialogProps = {
  open: boolean
  onClose: () => void
  /** Starts a tutorial; the owner closes the dialog. */
  onStart: (id: TutorialId) => void
}

export function TutorialsDialog({ open, onClose, onStart }: TutorialsDialogProps) {
  const { classes, ids } = tutorialsDialog()
  const { locale } = useLocale()
  const texts = TUTORIAL_TEXTS[locale]
  const phone = usePhone()
  const sections = tutorialSections(desktopBridge() ? 'desktop' : 'web', locale)
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={texts.title}
      closable={!phone}
      back={phone ? texts.back : undefined}
      actions={
        <Button variant="secondary" size="sm" onClick={onClose}>
          {COMMON_TEXTS[locale].close}
        </Button>
      }
    >
      {/* The ← leaves the dialog's title to screen readers, which already name the dialog by it. */}
      {phone && (
        <Heading level={3} aria-hidden="true">
          {texts.title}
        </Heading>
      )}
      <Text size="sm" tone="muted" className={classes.intro()} data-testid={ids.intro}>
        {texts.intro}
      </Text>
      <Accordion
        level={4}
        defaultOpen={sections.map((section) => section.feature)}
        sections={sections.map((section) => ({
          id: section.feature,
          title: section.title,
          detail: texts.count(section.tutorials.length),
          content: (
            <ul className={classes.list()} data-testid={ids.list}>
              {section.tutorials.map((tutorial) => (
                <TutorialButton key={tutorial.id} tutorial={tutorial} onStart={onStart} />
              ))}
            </ul>
          ),
        }))}
      />
    </Dialog>
  )
}

function TutorialButton({ tutorial, onStart }: { tutorial: Tutorial; onStart: (id: TutorialId) => void }) {
  const { classes, ids } = tutorialsDialog()
  const { locale } = useLocale()
  const texts = TUTORIAL_TEXTS[locale]
  const id = useId()
  return (
    <li>
      <button
        type="button"
        aria-labelledby={`${id}-title`}
        aria-describedby={`${id}-description ${id}-meta`}
        className={classes.tutorial()}
        data-testid={ids.tutorial}
        onClick={() => onStart(tutorial.id)}
      >
        <span id={`${id}-title`} className={classes.title()} data-testid={ids.title}>
          {tutorialTitle(tutorial.id, locale)}
        </span>
        <span id={`${id}-description`} className={classes.description()} data-testid={ids.description}>
          {texts.descriptions[tutorial.id]}
        </span>
        <span id={`${id}-meta`} className={classes.meta()} data-testid={ids.meta}>
          {`${texts.kinds[tutorial.kind]} · ${texts.steps(tutorial.steps)}`}
        </span>
      </button>
    </li>
  )
}
