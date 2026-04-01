import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { BigButton } from '../components/BigButton';
import { EmptyState } from '../components/EmptyState';
import { ProgressHeader } from '../components/ProgressHeader';
import { SectionCard } from '../components/SectionCard';
import {
  archiveOrder,
  createOrderWithItems,
  getBestProductImage,
  initializeLocalFirstStore,
  linkImageToProduct,
  listActiveOrders,
  listArchivedOrders,
  listOrderItems,
  listProductAliases,
  listProductImages,
  listProducts,
  matchProductCandidate,
  toggleOrderItemChecked,
  updateOrderStatus
} from '../db';
import { createOrderDraftFromImport, parseOrderText } from '../features/import';
import { ArchiveView } from '../features/archive/ArchiveView';
import { mapOrderRecord } from '../features/orders/mappers';
import { OrderView } from '../features/orders/OrderView';
import { normalizeSku } from '../lib/domain';
import { prepareCapturedImage } from '../lib/imageCapture';
import type { ImportMode, OrderRecord } from '../features/orders/types';

type Screen = 'start' | 'order' | 'archive';

export function App() {
  const pdfInputRef = useRef<HTMLInputElement | null>(null);
  const photoInputRef = useRef<HTMLInputElement | null>(null);
  const [screen, setScreen] = useState<Screen>('start');
  const [currentOrder, setCurrentOrder] = useState<OrderRecord | null>(null);
  const [archive, setArchive] = useState<OrderRecord[]>([]);
  const [message, setMessage] = useState<string | null>('Bereit fuer den ersten Auftrag.');
  const [error, setError] = useState<string | null>(null);
  const [manualText, setManualText] = useState(
    "48286 Halloren Chocolate Thins Pistazie 1\n12229 Apfel Zimt-Halloren O's 2"
  );
  const [archiveSearch, setArchiveSearch] = useState('');
  const [isReady, setIsReady] = useState(false);
  const [isBusy, setIsBusy] = useState(false);

  async function refreshWorkspace(preferredOrderId?: string) {
    const [products, activeOrders, archivedOrders, images] = await Promise.all([
      listProducts(),
      listActiveOrders(),
      listArchivedOrders(),
      listProductImages()
    ]);

    const current = activeOrders.find((order) => order.id === preferredOrderId) ?? activeOrders[0] ?? null;

    if (current) {
      const items = await listOrderItems(current.id);
      setCurrentOrder(mapOrderRecord(current, items, products, images));
      setScreen('order');
    } else {
      setCurrentOrder(null);
      setScreen('start');
    }

    const archivedMapped = await Promise.all(
      archivedOrders.map(async (order) => {
        const items = await listOrderItems(order.id);
        return mapOrderRecord(order, items, products, images);
      })
    );
    setArchive(archivedMapped);
  }

  useEffect(() => {
    void (async () => {
      try {
        await initializeLocalFirstStore();
        await refreshWorkspace();
        setIsReady(true);
      } catch (nextError) {
        setError(nextError instanceof Error ? nextError.message : 'Lokaler Start fehlgeschlagen.');
      }
    })();
  }, []);

  const progress = currentOrder
    ? {
        done: currentOrder.items.filter((item) => item.packed).length,
        total: currentOrder.items.length
      }
    : { done: 0, total: 0 };

  async function saveDraftAsOrder(
    title: string,
    source: 'pdf' | 'photo' | 'manual',
    sourceFileName: string,
    sourceMimeType: string,
    rawItems: Array<{
      rawText: string;
      name: string;
      quantity: number;
      sku?: string;
      unit?: string;
      confidence?: number;
    }>
  ) {
    const [products, aliases] = await Promise.all([listProducts(), listProductAliases()]);
    const { order } = await createOrderWithItems({
      title,
      source,
      sourceFileName,
      sourceMimeType,
      items: rawItems.map((item, index) => {
        const matchedBySku = item.sku
          ? products.find((product) => normalizeSku(product.sku) === normalizeSku(item.sku ?? ''))
          : undefined;
        const match = matchedBySku ? undefined : matchProductCandidate(item.name, products, aliases);
        const matchedProduct =
          matchedBySku ??
          (match ? products.find((product) => product.id === match.productId) : undefined);

        return {
          rawText: item.rawText,
          productName: matchedProduct?.name ?? item.name,
          quantity: item.quantity,
          lineNumber: index + 1,
          productId: matchedProduct?.id,
          sku: matchedProduct?.sku ?? item.sku,
          unit: item.unit,
          confidence: item.confidence
        };
      })
    });

    await refreshWorkspace(order.id);
    setMessage(`Auftrag ${title} wurde geladen.`);
    setError(null);
  }

  const handleImport = async (mode: ImportMode, file: File | null) => {
    if (!file) {
      return;
    }

    try {
      setIsBusy(true);
      setMessage(null);
      const draft = await createOrderDraftFromImport({ file });
      await saveDraftAsOrder(
        draft.title,
        mode === 'pdf' ? 'pdf' : 'photo',
        file.name,
        file.type || 'application/octet-stream',
        draft.items
      );
    } catch (nextError) {
      const text = nextError instanceof Error ? nextError.message : 'Import fehlgeschlagen.';
      setError(text);
      setMessage(null);
      setScreen('start');
    } finally {
      setIsBusy(false);
    }
  };

  const handleImportFromInput = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    const mode =
      file?.type === 'application/pdf' || file?.name.toLowerCase().endsWith('.pdf') ? 'pdf' : 'photo';
    void handleImport(mode, file);
    event.target.value = '';
  };

  const handleManualImport = async () => {
    if (!manualText.trim()) {
      setError('Bitte Text eingeben.');
      return;
    }

    try {
      setIsBusy(true);
      const parsed = parseOrderText(manualText, 'Manueller Auftrag');
      await saveDraftAsOrder('Manueller Auftrag', 'manual', 'manuell', 'text/plain', parsed.items);
      setManualText('');
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Text konnte nicht importiert werden.');
    } finally {
      setIsBusy(false);
    }
  };

  const handleToggleItem = async (itemId: string) => {
    await toggleOrderItemChecked(itemId);
    if (currentOrder) {
      await refreshWorkspace(currentOrder.id);
    }
  };

  const handleArchiveCurrent = async () => {
    if (!currentOrder) {
      return;
    }

    await archiveOrder(currentOrder.id);
    await refreshWorkspace();
    setMessage('Auftrag archiviert.');
    setScreen('archive');
  };

  const handleRestore = async (order: OrderRecord) => {
    await updateOrderStatus(order.id, 'active');
    await refreshWorkspace(order.id);
    setMessage(`Auftrag ${order.title} wieder geoeffnet.`);
  };

  const handleCaptureImage = async (orderItemId: string, file: File) => {
    if (!currentOrder) {
      return;
    }

    const item = currentOrder.items.find((entry) => entry.orderItemId === orderItemId);
    if (!item?.productId) {
      setError('Kein Produkt zum Bildspeichern gefunden.');
      return;
    }

    const preparedImage = await prepareCapturedImage(file);
    const existingBest = await getBestProductImage(item.productId);

    await linkImageToProduct(item.productId, {
      source: 'manual',
      url: preparedImage.dataUrl,
      fileName: file.name,
      alt: `${item.name} manuell aufgenommen`,
      mimeType: preparedImage.mimeType,
      isPrimary: true,
      hash: `${file.name}-${file.size}-${file.lastModified}`,
      captureSource: 'camera',
      confidence: 1,
      thumbUrl: preparedImage.dataUrl,
      width: preparedImage.width,
      height: preparedImage.height,
      note: existingBest ? 'Manuell ersetzt vorhandenes Bild.' : 'Erstes manuelles Bild.'
    });

    await refreshWorkspace(currentOrder.id);
    setMessage(`Bild fuer ${item.name} gespeichert.`);
    setError(null);
  };

  const filteredArchive = archive.filter((entry) => {
    const query = archiveSearch.trim().toLowerCase();
    if (!query) {
      return true;
    }

    return (
      entry.title.toLowerCase().includes(query) ||
      entry.items.some((item) => item.name.toLowerCase().includes(query))
    );
  });

  return (
    <main className="app-shell">
      <section className="hero">
        <div>
          <div className="hero-brand">
            <img src="/brand/logo-halloren.png" alt="Halloren Logo" className="hero-brand__logo" />
            <span className="hero-brand__tag">Halloren</span>
          </div>
          <span className="eyebrow">Pack-Assistent</span>
          <h1>Gross, visuell, offline-first.</h1>
          <p>Weniger lesen. Mehr sehen. Ein Tap pro Artikel. Audio sagt, was zu tun ist.</p>
        </div>

        <div className="hero-actions">
          <BigButton disabled={!isReady || isBusy} onClick={() => photoInputRef.current?.click()}>
            Foto aufnehmen
          </BigButton>
          <BigButton
            variant="secondary"
            disabled={!isReady || isBusy}
            onClick={() => pdfInputRef.current?.click()}
          >
            PDF laden
          </BigButton>
          <BigButton variant="ghost" onClick={() => setScreen('archive')}>
            Archiv
          </BigButton>
        </div>
      </section>

      <input
        ref={photoInputRef}
        className="sr-only"
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleImportFromInput}
      />
      <input
        ref={pdfInputRef}
        className="sr-only"
        type="file"
        accept="application/pdf"
        onChange={handleImportFromInput}
      />

      {message ? (
        <div className="status-banner" role="status" aria-live="polite">
          {message}
        </div>
      ) : null}
      {error ? <div className="status-banner status-banner--error">{error}</div> : null}

      <div className="topline">
        <ProgressHeader done={progress.done} total={progress.total} />
        <div className="topline-actions">
          <BigButton variant="ghost" onClick={() => setScreen('start')}>
            Start
          </BigButton>
          <BigButton variant="ghost" onClick={() => setScreen('archive')}>
            Archiv
          </BigButton>
        </div>
      </div>

      <section className="dashboard">
        <SectionCard title="Import" subtitle="Start mit Foto oder PDF." accent>
          <div className="cta-stack">
            <BigButton disabled={!isReady || isBusy} onClick={() => pdfInputRef.current?.click()}>
              PDF waehlen
            </BigButton>
            <BigButton
              variant="secondary"
              disabled={!isReady || isBusy}
              onClick={() => photoInputRef.current?.click()}
            >
              Foto waehlen
            </BigButton>
            <label className="manual-import">
              <span>Text einfuegen als robuster Fallback</span>
              <textarea
                rows={5}
                value={manualText}
                placeholder={"48286 Halloren Chocolate Thins Pistazie 1\n12229 Apfel Zimt-Halloren O's 2"}
                onChange={(event) => setManualText(event.target.value)}
              />
            </label>
            <BigButton
              variant="ghost"
              disabled={!isReady || isBusy}
              onClick={() => void handleManualImport()}
            >
              Text importieren
            </BigButton>
          </div>
        </SectionCard>

        <SectionCard title="Aktiver Auftrag" subtitle="Gross, klar, mit Audio.">
          {screen === 'archive' ? (
            <ArchiveView
              archive={filteredArchive}
              searchTerm={archiveSearch}
              onSearchTermChange={setArchiveSearch}
              onRestore={handleRestore}
            />
          ) : currentOrder ? (
            <OrderView
              order={currentOrder}
              onToggleItem={handleToggleItem}
              onArchive={handleArchiveCurrent}
              onCaptureImage={handleCaptureImage}
            />
          ) : (
            <EmptyState
              title="Noch kein Auftrag aktiv"
              description="Importiere eine Packliste. Danach erscheinen grosse Karten mit Bild, Menge und Audio."
              actionLabel="Import starten"
              onAction={() => pdfInputRef.current?.click()}
            />
          )}
        </SectionCard>
      </section>

      <section className="secondary-grid">
        <SectionCard title="Startscreen" subtitle="Wenig Text, direkte Aktionen.">
          <ul className="bullet-list">
            <li>1 Tap fuer Import</li>
            <li>Audio sofort sichtbar</li>
            <li>Archiv mit Wiedereroeffnen</li>
          </ul>
        </SectionCard>
        <SectionCard title="Fehlerzustand" subtitle="Wenn etwas nicht lesbar ist, bricht nichts.">
          <EmptyState
            title="OCR nicht sauber genug"
            description="Dann bleibt der Auftrag editierbar und das Foto kann manuell nachgezogen werden."
            actionLabel="Auftrag offen halten"
            onAction={() => setScreen('order')}
            tone="warning"
          />
        </SectionCard>
      </section>
    </main>
  );
}
