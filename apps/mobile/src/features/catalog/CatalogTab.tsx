import { useEffect, useRef, useState, type ComponentRef } from 'react';
import { BackHandler, Pressable, ScrollView, Text as RNText, View } from 'react-native';
import {
  brandSummary,
  CATALOG_HOME,
  ENGINE_SPEC_LABELS,
  enginePath,
  findParts,
  modelsNamed,
  NO_SHEET_MESSAGE,
  partScreen,
  screenBack,
  screenHeader,
  type Catalog,
  type CatalogScreen,
  type FoundPart,
} from '@apc/domain/catalog';
import { chevronIcon, ICON_SIZES } from '@apc/tokens/icons';
import { EmptyState, ErrorState } from '../../components/EmptyState';
import { FieldScrollView } from '../../components/FieldScrollView';
import { Icon } from '../../components/Icon';
import { ImageFrame } from '../../components/ImageFrame';
import { Panel } from '../../components/Panel';
import { Spinner } from '../../components/Spinner';
import { SearchField } from '../../components/TextField';
import { useTheme } from '../../app/theme';
import { TreeView } from '../../components/TreeView';
import { Heading, NumericReadout, Text } from '../../components/Typography';
import { useItems } from '../inventory/useItems';
import { useStyles } from './CatalogTab.styles';
import { PartResults } from './PartResults';
import { useCatalog } from './useCatalog';
import { usePhoneHeader } from '../dashboard/phoneHeaderContext';

// The Catalog tab, the same as the web's on a phone: a stack of screens, as in the "Catálogo no celular" mockup (see
// CatalogScreen in @apc/domain/catalog). The brands, each on a line with how many models and sheets it has; a brand's
// models, as a tree whose engines say "Ver ficha"; and an engine's sheet under the path to it, with its photo and its
// readouts. A screen past the brands puts its brand's name and a ← in the header, opens at its top, and Android's back
// button goes back a screen too, before it leaves the tab. The search above the brands and the models looks for the
// inventory parts with that code (3+ letters or digits), listed as the Inventory's cards, and a press on one clears it
// and opens the part's engine sheet, or its brand's models with its model pointed out and a note when the catalog has
// no sheet for it. Otherwise it narrows the brands to the ones with a model of that name, and the tree to those models.
// The catalog comes from the API (useCatalog): while it loads the tab shows a spinner, and when it can't be loaded, why,
// with a button to try again.

export function CatalogTab() {
  const state = useCatalog();
  const { styles, ids } = useStyles();
  if (state.status === 'ready' && state.catalog.brands.length > 0) {
    return <CatalogScreens catalog={state.catalog} />;
  }
  return (
    <View style={styles.status} testID={ids.status}>
      {state.status === 'loading' && <Spinner label="Carregando o catálogo" />}
      {state.status === 'error' && (
        <ErrorState
          title="Não foi possível carregar o catálogo"
          message="Verifique a conexão com o servidor e tente de novo."
          action={{ label: 'Tentar de novo', onPress: state.reload }}
        />
      )}
      {state.status === 'ready' && <EmptyState title="Nenhuma marca no catálogo" message="As marcas do catálogo aparecem aqui." />}
    </View>
  );
}

/** The Catalog's screens, one at a time: the brands, a brand's models or an engine's sheet. */
function CatalogScreens({ catalog }: { catalog: Catalog }) {
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
    const { title, back } = screenHeader(catalog, screen);
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
  }, [catalog, screen, setHeader]);

  /** Opens the screen a part leads to, its engine's sheet or its brand's models, done with the search. */
  const choosePart = (part: FoundPart) => {
    const next = partScreen(catalog, part.item);
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
      const sheet = catalog.sheets[screen.engineId];
      return (
        <>
          <RNText style={styles.path} testID={ids.path}>
            {enginePath(catalog, screen.brandId, screen.engineId)}
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
      const brand = catalog.brands.find((b) => b.id === brandId)!;
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
    const brands = catalog.brands.filter((brand) => modelsNamed(brand.models, modelQuery).length > 0);
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
                accessibilityLabel={`${brand.name}, ${brandSummary(catalog, brand)}`}
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
                    {brandSummary(catalog, brand)}
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
