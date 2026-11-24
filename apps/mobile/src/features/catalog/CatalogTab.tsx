import { useEffect, useRef, useState, type ComponentRef } from 'react';
import { BackHandler, Pressable, ScrollView, Text as RNText, View } from 'react-native';
import {
  belowBrand,
  belowNode,
  brandSummary,
  carFilters,
  carParts,
  carSheet,
  CATALOG_CHILDREN,
  CATALOG_HOME,
  catalogNodes,
  catalogSiblings,
  catalogValuesOf,
  catalogYearLimits,
  ENGINE_CLIPBOARD,
  catalogWithParts,
  engineSheetNames,
  ENGINE_SPEC_LABELS,
  enginePath,
  findParts,
  hasCarSheet,
  modelsNamed,
  NO_SHEET_MESSAGE,
  partScreen,
  screenBack,
  screenHeader,
  treePath,
  type Catalog,
  type CatalogEditing,
  type CatalogEditLevel,
  type CatalogBrand,
  type CatalogNode,
  type CatalogScreen,
  type CatalogSheetEditing,
  type FoundPart,
} from '@apc/domain/catalog';
import type { Item } from '@apc/domain/items';
import { copyNotice } from '@apc/domain/sync-copy';
import { chevronIcon, closeIcon, copyIcon, ICON_SIZES, importIcon, moreIcon, pencilIcon, plusIcon, sortIcon, trashIcon } from '@apc/tokens/icons';
import { ActionSheet } from '../../components/ActionSheet';
import { Button } from '../../components/Button';
import { RowAction } from '../../components/DataTable';
import { Dialog } from '../../components/Dialog';
import { EmptyState, ErrorState } from '../../components/EmptyState';
import { FieldScrollView } from '../../components/FieldScrollView';
import { Icon } from '../../components/Icon';
import { ImageFrame } from '../../components/ImageFrame';
import { Panel } from '../../components/Panel';
import { Spinner } from '../../components/Spinner';
import { Switch } from '../../components/Switch';
import { SearchField } from '../../components/TextField';
import { useTheme } from '../../app/theme';
import { TreeView } from '../../components/TreeView';
import { Heading, NumericReadout, Text } from '../../components/Typography';
import { usePhotoCache } from '../inventory/photoCache';
import { useInventoryCopy } from '../inventory/useInventoryCopy';
import { CarParts, CarSheet } from './CarSheet';
import { useStyles } from './CatalogTab.styles';
import { EngineSheetForm } from './EngineSheetForm';
import { NodeForm } from './NodeForm';
import { PartResults } from './PartResults';
import { useCopyCatalog } from './useCopyCatalog';
import { useCatalogEditing } from './useCatalogEditing';
import { usePartsOnly } from './usePartsOnly';
import { useInventoryLink } from '../dashboard/inventoryLinkContext';
import { usePhoneHeader } from '../dashboard/phoneHeaderContext';

// The Catalog tab, the same as the web's on a phone: a stack of screens, as in the "Catálogo no celular" mockup (see
// CatalogScreen in @apc/domain/catalog). The brands, each on a line with how many models and sheets it has; a brand's
// models, as a tree whose engines say "Ver ficha"; and an engine's sheet under the path to it, with its photo and its
// readouts. A screen past the brands puts its brand's name and a ← in the header, opens at its top, and Android's back
// button goes back a screen too, before it leaves the tab. The search above the brands and the models looks for the
// inventory parts with that code (3+ letters or digits), listed as the Inventory's cards, and a press on one clears it
// and opens the part's engine sheet, or its brand's models with its model pointed out and a note when the catalog has
// no sheet for it. Otherwise it narrows the brands to the ones with a model of that name, and the tree to those models.
// The catalog and the parts come from the phone's copy of the inventory (useInventoryCopy, useCopyCatalog), so the tab
// works with the server off, saying then that it shows the copy, and from when: while the phone has no copy yet the
// tab shows a spinner, and when it can't get one, why, with a button to try again. Editing needs the server, and a
// change made while it can't be reached says so.
// The catalog is edited in sheets, the same as the web on a phone (see useCatalogEditing): "Nova marca" beside the
// brands' heading and "Novo modelo" beside the models' open a bottom sheet with the new node's fields (see NodeForm).
// Each row has a "⋯", always in view, opening an action sheet with its name: add the level under it, rename it (a
// generation, with its years; a period, with De and Até), move it up or down (only where it can go), delete it after
// confirming, or close; a period's has "Colar motor" while an engine is copied, and an engine's has "Copiar motor",
// which copies it with its sheet to paste into any period, a toast saying each. A period's engines end with "Novo motor
// em <período>", and an empty branch with the button adding its first; a brand's models
// end with "Excluir marca", which deletes the brand from the catalog after confirming, its vehicle brand staying in the
// lists, and goes back to the brands. A catalog with no brand says so and adds the first with "Nova marca". A new engine's
// sheet, and "Editar ficha" under an engine's sheet, open the sheet's form in a full-screen dialog (see
// EngineSheetForm); a new brand opens its models, and a new engine its sheet. Every change answers the whole catalog,
// which the tab takes as it is, while the copy syncs to bring it in.
// A press on a model's or a version's name opens its sheet (see CarSheet) under the path to it, whose engines open
// their sheets, and under it the parts in stock that fit it: a press on one opens its details in the Inventory tab, and
// "Ver todas as peças" opens the Inventory with the filters that list them (see inventoryLinkContext.ts). ← goes back
// to the models, open on it.
// "Só com peças", under the brands' search, shows only the models some part in stock fits, and the brands with
// one (catalogWithParts), as on the web; the device remembers it (usePartsOnly). It can't be turned on while no part
// fits a vehicle, and adding a brand or a model turns it off, so the new one, with no part yet, shows. The tab reads the
// items from the copy, for this and for the parts the search and the sheets list, and waits for them when it is on.

/**
 * What the screens take: the whole catalog, the items in stock, whether to show only the vehicles they fit, the change
 * handlers, and, away from the server, the copy's notice.
 */
type CatalogProps = {
  catalog: Catalog;
  items: readonly Item[];
  partsOnly: boolean;
  onPartsOnly: (on: boolean) => void;
  onChanged: (catalog: Catalog) => void;
  /** Whether the server couldn't be reached at the last sync. */
  offline: boolean;
  /** What the tab says while it shows the copy, from when. */
  notice?: string;
};

export function CatalogTab() {
  const copy = useInventoryCopy();
  const state = useCopyCatalog(copy);
  const stock = copy.items ? { status: 'ready' as const, items: copy.items } : { status: 'loading' as const };
  // The photos kept on the phone, which the parts' thumbnails show once kept.
  usePhotoCache();
  const [partsOnly, setPartsOnly] = usePartsOnly();
  const { styles, ids } = useStyles();
  const waiting = partsOnly === null || (partsOnly && stock.status === 'loading');
  if (state.status === 'ready' && state.catalog.brands.length > 0 && !waiting) {
    return (
      <CatalogScreens
        catalog={state.catalog}
        items={stock.status === 'ready' ? stock.items : []}
        partsOnly={partsOnly}
        onPartsOnly={setPartsOnly}
        onChanged={state.replace}
        offline={copy.offline}
        notice={copy.offline && copy.syncedAt ? copyNotice(copy.syncedAt) : undefined}
      />
    );
  }
  return (
    <View style={styles.status} testID={ids.status}>
      {(state.status === 'loading' || (state.status === 'ready' && waiting)) && <Spinner label="Carregando o catálogo" />}
      {state.status === 'error' && (
        <ErrorState
          title="Não foi possível carregar o catálogo"
          message="Verifique a conexão com o servidor e tente de novo."
          action={{ label: 'Tentar de novo', onPress: state.reload }}
        />
      )}
      {state.status === 'ready' && !waiting && <EmptyCatalog onChanged={state.replace} offline={copy.offline} />}
    </View>
  );
}

/** A catalog with no brand: says so, and adds the first. */
function EmptyCatalog({ onChanged, offline }: { onChanged: (catalog: Catalog) => void; offline: boolean }) {
  const editor = useCatalogEditing({ onChanged, offline });
  return (
    <>
      <EmptyState
        title="Nenhuma marca no catálogo"
        message="As marcas do catálogo aparecem aqui."
        action={{ label: 'Nova marca', onPress: () => editor.edit({ kind: 'add', level: 'brand', parent: { level: 'brand', id: '' } }) }}
      />
      {editor.editing && (
        <NodeForm
          open
          title="Nova marca"
          level="brand"
          submitLabel="Adicionar"
          error={editor.error}
          saving={editor.saving}
          onSave={editor.save}
          onClose={() => editor.edit(null)}
        />
      )}
    </>
  );
}

/**
 * Keeps what a sheet or dialog last showed, so it keeps it while it closes, and counts each time it shows something
 * new, for the form inside to open afresh.
 * @param value What it shows, or null once it closes.
 * @returns What it last showed, and how many times it opened.
 */
function useShown<T>(value: T | null): { last: T | null; session: number } {
  const [shown, setShown] = useState({ last: value, session: 0 });
  if (value !== null && value !== shown.last) {
    setShown({ last: value, session: shown.session + 1 });
  }
  return shown;
}

/** The Catalog's screens, one at a time: the brands, a brand's models or an engine's sheet, edited in sheets. */
function CatalogScreens({ catalog: all, items, partsOnly: wanted, onPartsOnly, onChanged, offline, notice }: CatalogProps) {
  const { colors } = useTheme();
  const { styles, ids } = useStyles();
  const setHeader = usePhoneHeader();
  const scroll = useRef<ComponentRef<typeof ScrollView>>(null);
  const withParts = catalogWithParts(all, items);
  const partsOnly = wanted && withParts.brands.length > 0;
  const catalog = partsOnly ? withParts : all;
  const [screen, setScreen] = useState<CatalogScreen>(CATALOG_HOME);
  const [query, setQuery] = useState('');
  const links = useInventoryLink();
  // The node whose actions are open in a sheet.
  const [acting, setActing] = useState<CatalogNode>();
  const editor = useCatalogEditing({
    onChanged,
    offline,
    onBrandAdded: (changed) => setScreen({ view: 'models', brandId: changed.brands.at(-1)!.id }),
    onEngineAdded: (changed, yearId) => {
      if (screen.view !== 'brands') {
        const engineId = catalogNodes(changed.brands.find((b) => b.id === screen.brandId)!.models).get(yearId)?.children?.at(-1)?.id;
        setScreen(engineId ? { view: 'sheet', brandId: screen.brandId, engineId } : screen);
      }
    },
    onBrandRemoved: () => setScreen(CATALOG_HOME),
  });
  const editing = useShown<CatalogEditing>(editor.editing);
  const sheetEditing = useShown<CatalogSheetEditing>(editor.sheet);
  const removing = useShown<CatalogNode>(editor.removing ?? null);
  const removingBrand = useShown<CatalogBrand>(editor.removingBrand ?? null);
  const results = findParts(items, query);
  const searchingParts = results.parts.length > 0;
  const modelQuery = searchingParts ? '' : query;
  const brand = screen.view === 'brands' ? undefined : catalog.brands.find((b) => b.id === screen.brandId);
  const nodes = catalogNodes(brand?.models ?? []);

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

  /**
   * The actions of the node whose sheet is open: add under it, paste the engine copied into a period, rename it (a
   * period: change its years), move it up or down, delete it, close; an engine's copy it.
   */
  const actions = () => {
    if (!acting || !brand) {
      return [];
    }
    if (acting.level === 'engine') {
      return [
        { icon: copyIcon, label: ENGINE_CLIPBOARD.copy, onSelect: () => editor.copyEngine(acting) },
        { icon: closeIcon, label: 'Fechar', onSelect: () => {} },
      ];
    }
    const siblings = catalogSiblings(brand.models, acting.id);
    const at = siblings.findIndex((each) => each.id === acting.id);
    return [
      { icon: plusIcon, label: CATALOG_CHILDREN[acting.level as CatalogEditLevel].add, onSelect: () => editor.addUnder(acting) },
      ...(acting.level === 'year' && editor.copied ? [{ icon: importIcon, label: ENGINE_CLIPBOARD.paste, onSelect: () => editor.pasteEngine(acting) }] : []),
      {
        icon: pencilIcon,
        label: acting.level === 'generation' ? 'Renomear e mudar os anos' : acting.level === 'year' ? 'Mudar os anos' : 'Renomear',
        onSelect: () => editor.edit({ kind: 'rename', node: acting }),
      },
      ...(at > 0 ? [{ icon: sortIcon, label: 'Mover para cima', onSelect: () => editor.move(acting, 'up') }] : []),
      ...(at < siblings.length - 1 ? [{ icon: sortIcon, label: 'Mover para baixo', onSelect: () => editor.move(acting, 'down') }] : []),
      { icon: trashIcon, label: 'Excluir…', onSelect: () => editor.askRemove(acting) },
      { icon: closeIcon, label: 'Fechar', onSelect: () => {} },
    ];
  };

  /** A row's "⋯", which opens its actions: an engine's copy it. */
  const rowActions = (id: string) => {
    const node = nodes.get(id);
    return node ? <RowAction icon={moreIcon} label={`Ações de ${node.label}`} onPress={() => setActing(node)} /> : null;
  };

  /** The line after a branch's children: a year's "Novo motor", or the button to add an empty branch's first. */
  const after = (id: string) => {
    const node = nodes.get(id);
    if (!node || node.level === 'engine' || (node.level !== 'year' && node.children?.length !== 0)) {
      return null;
    }
    return (
      <Button variant="dashed" size="sm" icon={plusIcon} onPress={() => editor.addUnder(node)}>
        {`${CATALOG_CHILDREN[node.level].add} em ${node.label}`}
      </Button>
    );
  };

  /** What the sheet of what is being added or renamed is titled. */
  const editTitle = (shown: CatalogEditing | null) => {
    if (!shown) {
      return '';
    }
    if (shown.kind === 'rename') {
      return `Renomear ${shown.node.label}`;
    }
    const parent = shown.parent.level === 'brand' ? undefined : nodes.get(shown.parent.id);
    const add = shown.level === 'brand' ? 'Nova marca' : CATALOG_CHILDREN[shown.parent.level].add;
    return parent ? `${add} em ${parent.label}` : shown.level === 'model' && brand ? `${add} em ${brand.name}` : add;
  };

  /** What the engine sheet's dialog is titled. */
  const sheetTitle = (shown: CatalogSheetEditing) => (shown.kind === 'add' ? `Novo motor em ${shown.year.label}` : `Ficha do ${shown.engine.label}`);

  const search = (
    <>
      <SearchField label="Procure modelo ou código da peça" value={query} onValueChange={setQuery} />
      {searchingParts && <PartResults results={results} onChoose={choosePart} />}
    </>
  );

  /** The screen on show. */
  const content = () => {
    if (screen.view === 'car') {
      const path = enginePath(catalog, screen.brandId, screen.nodeId);
      return (
        <>
          {path !== '' && (
            <RNText style={styles.path} testID={ids.path}>
              {path}
            </RNText>
          )}
          <ImageFrame alt={`Foto do ${carSheet(catalog, screen.brandId, screen.nodeId).title}`} emptyLabel="Sem foto do modelo" />
          <CarSheet
            catalog={catalog}
            brandId={screen.brandId}
            nodeId={screen.nodeId}
            onEngine={(engineId) => setScreen({ view: 'sheet', brandId: screen.brandId, engineId })}
          />
          <CarParts
            parts={carParts(catalog, screen.brandId, screen.nodeId, items)}
            onPart={(item) => links.open({ itemId: item.id })}
            onAll={() => links.open({ filters: carFilters(catalog, screen.brandId, screen.nodeId, items) })}
          />
        </>
      );
    }

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
          <Button variant="secondary" icon={pencilIcon} onPress={() => editor.editSheet({ kind: 'edit', engine: nodes.get(screen.engineId)! })}>
            Editar ficha
          </Button>
        </>
      );
    }

    if (screen.view === 'models') {
      const { brandId, modelId, nodeId, missing } = screen;
      const models = modelsNamed(brand!.models, modelQuery);
      return (
        <>
          {search}
          {missing && (
            <Panel>
              <EmptyState title={missing} message={NO_SHEET_MESSAGE} />
            </Panel>
          )}
          <View style={styles.screenHead} testID={ids.screenHead}>
            <RNText accessibilityRole="header" style={styles.heading} testID={ids.heading}>
              {`Modelos · ${models.length}`}
            </RNText>
            <Button
              variant="ghost"
              size="sm"
              icon={plusIcon}
              onPress={() => {
                onPartsOnly(false);
                editor.edit({ kind: 'add', level: 'model', parent: { level: 'brand', id: brandId } });
              }}
            >
              Novo modelo
            </Button>
          </View>
          {models.length > 0 ? (
            <TreeView
              key={`${brandId}-${modelId}-${nodeId}`}
              label={`Modelos ${brand!.name}`}
              nodes={models}
              selected={nodeId}
              onSelect={(id) => setScreen(hasCarSheet(nodes.get(id)) ? { view: 'car', brandId, nodeId: id } : { view: 'sheet', brandId, engineId: id })}
              selectable={(id) => hasCarSheet(nodes.get(id))}
              highlighted={modelId}
              defaultExpanded={nodeId ? treePath(catalog, brandId, nodeId).map((node) => node.id) : modelId ? [modelId] : undefined}
              leafTag="Ver ficha"
              rowActions={rowActions}
              after={after}
              reveal={editor.editing?.kind === 'add' && editor.editing.parent.level !== 'brand' ? editor.editing.parent.id : undefined}
              style={styles.tree}
            />
          ) : (
            <NoModel none={brand!.models.length === 0} />
          )}
          <Button variant="secondary" icon={trashIcon} onPress={() => editor.askRemoveBrand(brand)}>
            Excluir marca
          </Button>
        </>
      );
    }

    // The brands that have a model with the name searched, every brand without a search.
    const brands = catalog.brands.filter((each) => modelsNamed(each.models, modelQuery).length > 0);
    return (
      <>
        {search}
        <Switch checked={partsOnly} onCheckedChange={onPartsOnly} disabled={withParts.brands.length === 0}>
          Só com peças
        </Switch>
        <View style={styles.screenHead} testID={ids.screenHead}>
          <RNText accessibilityRole="header" style={styles.heading} testID={ids.heading}>
            {`Marcas · ${brands.length}`}
          </RNText>
          <Button
            variant="ghost"
            size="sm"
            icon={plusIcon}
            onPress={() => {
              onPartsOnly(false);
              editor.edit({ kind: 'add', level: 'brand', parent: { level: 'brand', id: '' } });
            }}
          >
            Nova marca
          </Button>
        </View>
        {brands.length > 0 ? (
          <View style={styles.brandList} testID={ids.brandList}>
            {brands.map((each) => (
              <Pressable
                key={each.id}
                accessibilityRole="button"
                accessibilityLabel={`${each.name}, ${brandSummary(catalog, each)}`}
                onPress={() => setScreen({ view: 'models', brandId: each.id })}
                style={({ pressed }) => [styles.brand, pressed && styles.brandPressed]}
                testID={ids.brand}
              >
                <View style={styles.mark} testID={ids.mark}>
                  <RNText style={styles.markText} testID={ids.markText}>
                    {each.mark}
                  </RNText>
                </View>
                <View style={styles.brandText} testID={ids.brandText}>
                  <RNText numberOfLines={1} style={styles.brandName} testID={ids.brandName}>
                    {each.name}
                  </RNText>
                  <RNText style={styles.brandMeta} testID={ids.brandMeta}>
                    {brandSummary(catalog, each)}
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

  const shownEditing = editing.last;
  const shownSheet = sheetEditing.last;
  // The node the engine sheet's form belongs to, while the tree still has it.
  const sheetNode = shownSheet && (shownSheet.kind === 'add' ? shownSheet.year.id : shownSheet.engine.id);
  return (
    <>
      <FieldScrollView ref={scroll} style={styles.scroll} contentContainerStyle={styles.tab} testID={ids.tab}>
        {notice && (
          <View accessibilityLiveRegion="polite" style={styles.copy} testID={ids.copy}>
            <Text size="sm">{notice}</Text>
          </View>
        )}
        {content()}
      </FieldScrollView>
      <ActionSheet open={acting !== undefined} onClose={() => setActing(undefined)} title={acting?.label ?? ''} actions={actions()} />
      {shownEditing && (
        <NodeForm
          key={`node-${editing.session}`}
          open={editor.editing !== null}
          title={editTitle(shownEditing)}
          level={shownEditing.kind === 'rename' ? (shownEditing.node.level as CatalogEditLevel) : shownEditing.level}
          initial={shownEditing.kind === 'rename' ? catalogValuesOf(shownEditing.node) : undefined}
          limits={catalogYearLimits(brand?.models ?? [], shownEditing)}
          submitLabel={shownEditing.kind === 'rename' ? 'Salvar' : 'Adicionar'}
          error={editor.error}
          saving={editor.saving}
          onSave={editor.save}
          onClose={() => editor.edit(null)}
        />
      )}
      {shownSheet && brand && sheetNode && nodes.has(sheetNode) && (
        <EngineSheetForm
          key={`sheet-${sheetEditing.session}`}
          open={editor.sheet !== null}
          title={sheetTitle(shownSheet)}
          names={engineSheetNames(catalog, brand.id, sheetNode)}
          initial={shownSheet.kind === 'edit' ? shownSheet.engine.sheet : undefined}
          saving={editor.saving}
          onSave={editor.saveSheet}
          onClose={() => editor.editSheet(null)}
        />
      )}
      <DeleteDialog
        open={editor.removing !== undefined}
        name={removing.last?.label ?? ''}
        below={removing.last && belowNode(removing.last)}
        saving={editor.saving}
        onCancel={() => editor.askRemove(undefined)}
        onConfirm={editor.remove}
      />
      <DeleteDialog
        open={editor.removingBrand !== undefined}
        name={removingBrand.last?.name ?? ''}
        below={removingBrand.last && belowBrand(removingBrand.last)}
        saving={editor.saving}
        onCancel={() => editor.askRemoveBrand(undefined)}
        onConfirm={editor.removeBrand}
      />
    </>
  );
}

/** Asks to confirm deleting a node or a brand of the catalog, saying what goes with it and that the inventory's parts stay. */
function DeleteDialog({
  open,
  name,
  below,
  saving,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  name: string;
  below: string | null;
  saving: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <Dialog
      open={open}
      onClose={onCancel}
      title={`Excluir “${name}”?`}
      size="confirm"
      actions={
        <>
          <Button variant="secondary" size="sm" onPress={onCancel}>
            Cancelar
          </Button>
          <Button variant="danger" size="sm" loading={saving} onPress={onConfirm}>
            Excluir
          </Button>
        </>
      }
    >
      <Text size="sm" tone="muted">
        {below ? `Vão junto ${below}. ` : ''}As peças do estoque continuam cadastradas. Isso não pode ser desfeito.
      </Text>
    </Dialog>
  );
}

/** Says no model has the name searched, or, for a brand with none yet, where to add the first. */
function NoModel({ none = false }: { none?: boolean }) {
  return none ? (
    <EmptyState title="Nenhum modelo nessa marca" message="Adicione o primeiro em Novo modelo." />
  ) : (
    <EmptyState title="Nenhum modelo com esse nome" message="Procure por outro nome ou pelo código de uma peça do estoque." />
  );
}
