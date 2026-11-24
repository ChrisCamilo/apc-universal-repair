import { useState } from 'react';
import { View } from 'react-native';
import type { ConflictCard, ConflictSide } from '@apc/domain/sync-conflicts';
import { Button } from '../../components/Button';
import { Dialog } from '../../components/Dialog';
import { Heading, Label, Text } from '../../components/Typography';
import { useStyles } from './ConflictsDialog.styles';

// The changes made on the phone that conflict with what changed on the computer meanwhile (see
// @apc/domain/sync-conflicts), each in a card: the item and the field or the brand, the computer's value and the
// phone's, or what happened on each side to the whole item or a brand, and a button for each side to keep. A choice
// settles that conflict and syncs, and its card leaves; the change goes out once its last conflict is settled. Fechar
// and the back button close it with what is left still waiting.

type ConflictsDialogProps = {
  open: boolean;
  /** The conflicts waiting. */
  conflicts: ConflictCard[];
  /** Settles a conflict, keeping a side. */
  onSettle: (card: ConflictCard, keep: ConflictSide) => Promise<void>;
  onClose: () => void;
};

export function ConflictsDialog({ open, conflicts, onSettle, onClose }: ConflictsDialogProps) {
  const { styles, ids } = useStyles();
  // The conflict being settled, so its card's buttons wait and the others don't run meanwhile.
  const [settling, setSettling] = useState<string | null>(null);

  /** Keeps a side of a conflict. */
  const keep = async (card: ConflictCard, side: ConflictSide) => {
    setSettling(card.key);
    await onSettle(card, side).finally(() => setSettling(null));
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Conflitos com o computador"
      closable
      actions={
        <Button variant="secondary" size="sm" onPress={onClose}>
          Fechar
        </Button>
      }
    >
      <Text size="sm" tone="muted">
        {conflicts.length > 0
          ? 'Estas alterações feitas no celular conflitam com o que mudou no computador. Escolha o que manter em cada uma.'
          : 'Nenhum conflito para resolver.'}
      </Text>
      <View style={styles.list} testID={ids.list}>
        {conflicts.map((card) => (
          <View key={card.key} role="group" accessibilityLabel={card.title} style={styles.card} testID={ids.card}>
            <Heading level={3}>{card.title}</Heading>
            {card.text ? (
              <Text size="sm">{card.text}</Text>
            ) : (
              <View style={styles.sides} testID={ids.sides}>
                <View style={styles.side} testID={ids.side}>
                  <Label>No computador</Label>
                  <Text size="sm">{card.theirs}</Text>
                </View>
                <View style={styles.side} testID={ids.side}>
                  <Label>No celular</Label>
                  <Text size="sm">{card.mine}</Text>
                </View>
              </View>
            )}
            <View style={styles.choices} testID={ids.choices}>
              <Button
                variant="secondary"
                size="sm"
                loading={settling === card.key}
                disabled={settling !== null && settling !== card.key}
                onPress={() => keep(card, 'theirs')}
              >
                {card.keepTheirs}
              </Button>
              <Button
                variant="secondary"
                size="sm"
                loading={settling === card.key}
                disabled={settling !== null && settling !== card.key}
                onPress={() => keep(card, 'mine')}
              >
                {card.keepMine}
              </Button>
            </View>
          </View>
        ))}
      </View>
    </Dialog>
  );
}
