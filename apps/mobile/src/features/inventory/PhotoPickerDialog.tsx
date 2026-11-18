import { useState } from 'react';
import { Image, Pressable, Text as NativeText, View } from 'react-native';
import { checkIcon, chevronIcon, ICON_SIZES } from '@apc/tokens/icons';
import { PHOTO_PICKER, photoPickerTexts, photoSources } from '@apc/domain/item-form';
import { itemCardCode, type Item, type ItemPhoto } from '@apc/domain/items';
import { photoAddress, photoCount, pickPhoto } from '@apc/domain/photos';
import { apiUrl } from '../../app/api';
import { useTheme } from '../../app/theme';
import { Button } from '../../components/Button';
import { Dialog } from '../../components/Dialog';
import { Icon } from '../../components/Icon';
import { SearchField } from '../../components/TextField';
import { useStyles } from './PhotoPickerDialog.styles';

// The photo picker, the same as the web: opened from "Usar fotos de outra peça" under a brand's photos in the item
// form, a search by code lists the items with photos (see photoSources), the item being edited left out. A tap on an
// item opens it in place to its photos, of every brand, each a checkbox; a second tap closes it. Photos are checked up
// to the room the brand has, from one item or several (see pickPhoto); once full, the others are disabled and the
// count says so. "Usar n fotos" hands the checked photos over in the order they were checked, and the owner adds them
// to the brand as copies, which the API makes when the item is saved; Cancelar and the back button close it with
// nothing added. Each opening starts empty: the owner mounts a new one. It fills the screen, as every form dialog does.

type PhotoPickerDialogProps = {
  open: boolean;
  onClose: () => void;
  /** Every item in stock. */
  items: readonly Item[];
  /** The item being edited, whose photos aren't offered. */
  editingId?: string;
  /** How many photos the brand still takes. */
  room: number;
  /** Takes the photos checked, in the order they were checked. */
  onPick: (photos: ItemPhoto[]) => void;
};

export function PhotoPickerDialog({ open, onClose, items, editingId, room, onPick }: PhotoPickerDialogProps) {
  const { colors } = useTheme();
  const { styles, ids } = useStyles();
  const [query, setQuery] = useState('');
  // The items opened to their photos, by id.
  const [opened, setOpened] = useState<ReadonlySet<string>>(new Set());
  const [picked, setPicked] = useState<ItemPhoto[]>([]);
  const found = photoSources(items, query, editingId);
  const texts = photoPickerTexts(picked.length, room);
  const full = picked.length >= room;

  /** Opens an item to its photos, or closes it. */
  const toggle = (id: string) =>
    setOpened((shown) => {
      const next = new Set(shown);
      if (!next.delete(id)) {
        next.add(id);
      }
      return next;
    });

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={PHOTO_PICKER.open}
      actions={
        <>
          <Button variant="secondary" size="sm" onPress={onClose}>
            {PHOTO_PICKER.cancel}
          </Button>
          <Button size="sm" disabled={picked.length === 0} onPress={() => onPick(picked)}>
            {texts.use}
          </Button>
        </>
      }
    >
      <View style={styles.base} testID={ids.base}>
        <SearchField label={PHOTO_PICKER.search} value={query} onValueChange={setQuery} />
        {found.items.length > 0 ? (
          <View style={styles.list} testID={ids.list}>
            {found.items.map((item) => {
              const shown = opened.has(item.id);
              const photos = item.brands.flatMap((brand) => brand.photos.map((photo, index) => ({ photo, index, brand: brand.partBrand })));
              return (
                <View key={item.id} style={styles.source} testID={ids.source}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={item.name}
                    accessibilityState={{ expanded: shown }}
                    onPress={() => toggle(item.id)}
                    style={({ pressed }) => [styles.head, pressed && styles.headPressed]}
                    testID={ids.head}
                  >
                    <Image source={{ uri: photoAddress(photos[0].photo.thumbUrl, apiUrl()) }} style={styles.cover} testID={ids.cover} />
                    <View style={styles.text} testID={ids.text}>
                      <NativeText numberOfLines={1} style={styles.name} testID={ids.name}>
                        {item.name}
                      </NativeText>
                      <NativeText numberOfLines={1} style={styles.code} testID={ids.code}>
                        {`${itemCardCode(item)} · ${photoCount(photos.length)}`}
                      </NativeText>
                    </View>
                    <View style={[styles.chevron, shown && styles.chevronOpen]} testID={ids.chevron}>
                      <Icon icon={chevronIcon} size={ICON_SIZES.label} color={colors.accent} />
                    </View>
                  </Pressable>
                  {shown && (
                    <View accessibilityLabel={`Fotos de ${item.name}`} style={styles.photos} testID={ids.photos}>
                      {photos.map(({ photo, index, brand }) => {
                        const checked = picked.some((each) => each.id === photo.id);
                        const disabled = full && !checked;
                        return (
                          <Pressable
                            key={photo.id}
                            accessibilityRole="checkbox"
                            accessibilityLabel={`Foto ${index + 1} de ${item.name} · ${brand}`}
                            accessibilityState={{ checked, disabled }}
                            disabled={disabled}
                            onPress={() => setPicked((held) => pickPhoto(held, photo, room))}
                            style={[styles.photo, checked && styles.photoChecked, disabled && styles.photoDisabled]}
                            testID={ids.photo}
                          >
                            <Image source={{ uri: photoAddress(photo.thumbUrl, apiUrl()) }} style={styles.image} testID={ids.image} />
                            {checked && (
                              <View style={styles.check} testID={ids.check}>
                                <Icon icon={checkIcon} size={ICON_SIZES.label} color={colors.onAccent} />
                              </View>
                            )}
                          </Pressable>
                        );
                      })}
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        ) : (
          <NativeText style={styles.note} testID={ids.note}>
            {query.trim() ? PHOTO_PICKER.none : PHOTO_PICKER.hint}
          </NativeText>
        )}
        {found.more > 0 && (
          <NativeText style={styles.note} testID={ids.note}>
            {PHOTO_PICKER.more(found.more)}
          </NativeText>
        )}
        <NativeText accessibilityLiveRegion="polite" style={[styles.count, full && styles.countFull]} testID={ids.count}>
          {texts.count}
        </NativeText>
      </View>
    </Dialog>
  );
}
