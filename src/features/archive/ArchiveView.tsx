import type { OrderRecord } from '../orders/types';

type Props = {
  archive: OrderRecord[];
  selectedOrderId?: string;
  onSelect: (order: OrderRecord) => void;
};

export function ArchiveView({ archive, selectedOrderId, onSelect }: Props) {
  if (archive.length === 0) {
    return (
      <div className="archive-empty">
        <strong>Noch nichts archiviert.</strong>
        <p>Abgeschlossene Auftraege erscheinen hier als reine Leseansicht.</p>
      </div>
    );
  }

  return (
    <div className="archive-list">
      {archive.map((order) => (
        <button
          type="button"
          key={order.id}
          className={`archive-item ${selectedOrderId === order.id ? 'archive-item--active' : ''}`.trim()}
          onClick={() => onSelect(order)}
        >
          <div>
            <strong>{order.title}</strong>
            <p>
              {order.items.length} Positionen
              {order.archivedAt ? ` - ${new Date(order.archivedAt).toLocaleDateString('de-DE')}` : ''}
            </p>
          </div>
        </button>
      ))}
    </div>
  );
}
