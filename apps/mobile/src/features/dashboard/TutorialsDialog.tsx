import { Pressable, Text as NativeText, View } from 'react-native';
import { COMMON_TEXTS } from '@apc/domain/app-texts';
import { TUTORIAL_TEXTS, tutorialSections, tutorialTitle, type Tutorial, type TutorialId } from '@apc/domain/tutorials';
import { useLocale } from '../../app/locale';
import { Accordion } from '../../components/Accordion';
import { Button } from '../../components/Button';
import { Dialog } from '../../components/Dialog';
import { Heading, Text } from '../../components/Typography';
import { useStyles } from './TutorialsDialog.styles';

// "Tutoriais", opened from the user menu, the same as the web's on a phone: it fills the screen, with a ← and its title
// heading it, and lists the phone's tutorials by feature, each feature a section of an accordion, all open at first (see
// @apc/domain/tutorials). Each tutorial is a press that says its title, its one-line description, its kind (a guided tour
// or an explanation) and how many steps it has; pressing it starts it (see tutorialsContext.ts), and the dialog closes.

type TutorialsDialogProps = {
  open: boolean;
  onClose: () => void;
  /** Starts a tutorial; the owner closes the dialog. */
  onStart: (id: TutorialId) => void;
};

export function TutorialsDialog({ open, onClose, onStart }: TutorialsDialogProps) {
  const { styles, ids } = useStyles();
  const { locale } = useLocale();
  const texts = TUTORIAL_TEXTS[locale];
  const sections = tutorialSections('phone', locale);
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={texts.title}
      back={texts.back}
      actions={
        <Button variant="secondary" onPress={onClose}>
          {COMMON_TEXTS[locale].close}
        </Button>
      }
    >
      <Heading level={2}>{texts.title}</Heading>
      <View style={styles.intro} testID={ids.intro}>
        <Text size="sm" tone="muted">
          {texts.intro}
        </Text>
      </View>
      <Accordion
        defaultOpen={sections.map((section) => section.feature)}
        sections={sections.map((section) => ({
          id: section.feature,
          title: section.title,
          detail: texts.count(section.tutorials.length),
          content: (
            <View style={styles.list} testID={ids.list}>
              {section.tutorials.map((tutorial) => (
                <TutorialItem key={tutorial.id} tutorial={tutorial} onStart={onStart} />
              ))}
            </View>
          ),
        }))}
      />
    </Dialog>
  );
}

function TutorialItem({ tutorial, onStart }: { tutorial: Tutorial; onStart: (id: TutorialId) => void }) {
  const { styles, ids } = useStyles();
  const { locale } = useLocale();
  const texts = TUTORIAL_TEXTS[locale];
  const title = tutorialTitle(tutorial.id, locale);
  const meta = `${texts.kinds[tutorial.kind]} · ${texts.steps(tutorial.steps)}`;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityHint={`${texts.descriptions[tutorial.id]} ${meta}`}
      onPress={() => onStart(tutorial.id)}
      style={({ pressed }) => [styles.tutorial, pressed && styles.tutorialPressed]}
      testID={ids.tutorial}
    >
      <NativeText style={styles.title} testID={ids.title}>
        {title}
      </NativeText>
      <NativeText style={styles.description} testID={ids.description}>
        {texts.descriptions[tutorial.id]}
      </NativeText>
      <NativeText style={styles.meta} testID={ids.meta}>
        {meta}
      </NativeText>
    </Pressable>
  );
}
