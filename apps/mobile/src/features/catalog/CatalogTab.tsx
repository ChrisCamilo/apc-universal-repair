import { useEffect, useRef, useState, type ComponentRef } from 'react';
import { BackHandler, Pressable, ScrollView, Text as RNText, View } from 'react-native';
import {
  brandSummary,
  CATALOG,
  CATALOG_HOME,
  ENGINE_SHEETS,
  ENGINE_SPEC_LABELS,
  enginePath,
  findParts,
  modelsNamed,
  NO_SHEET_MESSAGE,
  partScreen,
  screenBack,
  screenHeader,
  type CatalogScreen,
  type FoundPart,
} from '@apc/shared/catalog';
import { chevronIcon, ICON_SIZES } from '@apc/shared/icons';
import { EmptyState } from '../../components/EmptyState';
import { FieldScrollView } from '../../components/FieldScrollView';
import { Icon } from '../../components/Icon';
import { ImageFrame } from '../../components/ImageFrame';
import { Panel } from '../../components/Panel';
import { SearchField } from '../../components/TextField';
import { useTheme } from '../../app/theme';
import { TreeView } from '../../components/TreeView';
import { Heading, NumericReadout, Text } from '../../components/Typography';
import { useItems } from '../inventory/useItems';
import { useStyles } from './CatalogTab.styles';
import { PartResults } from './PartResults';
import { usePhoneHeader } from '../dashboard/phoneHeaderContext';

// The Catalog tab, the same as the web's on a phone: a stack of screens, as in the "Catálogo no celular" mockup (see
// CatalogScreen in @apc/shared/catalog). The brands, each on a line with how many models and sheets it has; a brand's
// models, as a tree whose engines say "Ver ficha"; and an engine's sheet under the path to it, with its photo and its
// readouts. A screen past the brands puts its brand's name and a ← in the header, opens at its top, and Android's back
// button goes back a screen too, before it leaves the tab. The search above the brands and the models looks for the
// inventory parts with that code (3+ letters or digits), listed as the Inventory's cards, and a press on one clears it
// and opens the part's engine sheet, or its brand's models with its model pointed out and a note when the catalog has
// no sheet for it. Otherwise it narrows the brands to the ones with a model of that name, and the tree to those models.
// The data is the mocked catalog of @apc/shared/catalog.

export function CatalogTab() {
  const { colors } = useTheme();
  const { styles, ids } = useStyles();
  const state = useItems();
  const setHeader = usePhoneHeader();
  const scroll = useRef<ComponentRef<typeof ScrollView>>(null);
  const items = state.status === 'ready' ? state.items : [];
  const [screen, setScreen] = useState<CatalogScreen>(CATALOG_HOME);
  const [query, setQuery] = useState('');
  const results = findParts(items, query);
  const searchingParts = results.parts.length > 0;
  const modelQuery = searchingParts ? '' : query;

  // Each screen opens at its top, with its title and ← in the header, and the back button goes back a screen; the
  // brands keep the tab's name and let the back button leave.
  useEffect(() => {
    scroll.current?.scrollTo({ y: 0, animated: false });
    const { title, back } = screenHeader(screen);
    const before = screenBack(screen);
    if (!back || !before) {
      setHeader(null);
      return;
    }
    setHeader({ title, back: { label: back, onPress: () => setScreen(before) } });
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      setScreen(before);
      return true;
    });
    return () => {
      subscription.remove();
      setHeader(null);
    };
  }, [screen, setHeader]);

  /** Opens the screen a part leads to, its engine's sheet or its brand's models, done with the search. */
  const choosePart = (part: FoundPart) => {
    const next = partScreen(part.item);
    if (next) {
      setQuery('');
      setScreen(next);
    }
  };

  const search = (
    <>
      <SearchField label="Procure modelo ou código da peça" value={query} onValueChange={setQuery} />
      {searchingParts && <PartResults results={results} onChoose={choosePart} />}
    </>
  );

  /** The screen on show. */
  const content = () => {
    if (screen.view === 'sheet') {
      const sheet = ENGINE_SHEETS[screen.engineId];
      return (
        <>
          <RNText style={styles.path} testID={ids.path}>
            {enginePath(screen.brandId, screen.engineId)}
          </RNText>
          <ImageFrame alt={`Foto do ${sheet.title}`} emptyLabel="Sem foto do modelo" />
          <Heading level={2}>{sheet.title}</Heading>
          <View style={styles.readouts} testID={ids.readouts}>
            {sheet.specs.map((spec, index) => (
              <View key={ENGINE_SPEC_LABELS[index]} style={styles.readout} testID={ids.readout}>
                <RNText style={styles.readoutLabel} testID={ids.readoutLabel}>
                  {ENGINE_SPEC_LABELS[index]}
                </RNText>
                <NumericReadout tone="accent">{spec}</NumericReadout>
              </View>
            ))}
          </View>
          <Text tone="muted">{sheet.summary}</Text>
        </>
      );
    }

    if (screen.view === 'models') {
      const { brandId, modelId, engineId, missing } = screen;
      const brand = CATALOG.find((b) => b.id === brandId)!;
      const models = modelsNamed(brand.models, modelQuery);
      return (
        <>
          {search}
          {missing && (
            <Panel>
              <EmptyState title={missing} message={NO_SHEET_MESSAGE} />
            </Panel>
          )}
          <RNText accessibilityRole="header" style={styles.heading} testID={ids.heading}>
            {`Modelos · ${models.length}`}
          </RNText>
          {models.length > 0 ? (
            <TreeView
              key={`${brandId}-${modelId}-${engineId}`}
              label={`Modelos ${brand.name}`}
              nodes={models}
              selected={engineId}
              onSelect={(id) => setScreen({ view: 'sheet', brandId, engineId: id })}
              highlighted={modelId}
              defaultExpanded={modelId && !engineId ? [modelId] : undefined}
              leafTag="Ver ficha"
              style={styles.tree}
            />
          ) : (
            <NoModel />
          )}
        </>
      );
    }

    // The brands that have a model with the name searched, every brand without a search.
    const brands = CATALOG.filter((brand) => modelsNamed(brand.models, modelQuery).length > 0);
    return (
      <>
        {search}
        <RNText accessibilityRole="header" style={styles.heading} testID={ids.heading}>
          {`Marcas · ${brands.length}`}
        </RNText>
        {brands.length > 0 ? (
          <View style={styles.brandList} testID={ids.brandList}>
            {brands.map((brand) => (
              <Pressable
                key={brand.id}
                accessibilityRole="button"
                accessibilityLabel={`${brand.name}, ${brandSummary(brand)}`}
                onPress={() => setScreen({ view: 'models', brandId: brand.id })}
                style={({ pressed }) => [styles.brand, pressed && styles.brandPressed]}
                testID={ids.brand}
              >
                <View style={styles.mark} testID={ids.mark}>
                  <RNText style={styles.markText} testID={ids.markText}>
                    {brand.mark}
                  </RNText>
                </View>
                <View style={styles.brandText} testID={ids.brandText}>
                  <RNText numberOfLines={1} style={styles.brandName} testID={ids.brandName}>
                    {brand.name}
                  </RNText>
                  <RNText style={styles.brandMeta} testID={ids.brandMeta}>
                    {brandSummary(brand)}
                  </RNText>
                </View>
                <View style={styles.chevron} testID={ids.chevron}>
                  <Icon icon={chevronIcon} size={ICON_SIZES.prominent} color={colors.textMuted} />
                </View>
              </Pressable>
            ))}
          </View>
        ) : (
          <NoModel />
        )}
      </>
    );
  };

  return (
    <FieldScrollView ref={scroll} style={styles.scroll} contentContainerStyle={styles.tab} testID={ids.tab}>
      {content()}
    </FieldScrollView>
  );
}

/** Says no model has the name searched. */
function NoModel() {
  return <EmptyState title="Nenhum modelo com esse nome" message="Procure por outro nome ou pelo código de uma peça do estoque." />;
}
