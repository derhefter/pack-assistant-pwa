import { BigButton } from '../../components/BigButton';
import type { OrderRecord } from '../orders/types';

type Props = {
  archive: OrderRecord[];
  searchTerm: string;
  onSearchTermChange: (value: string) => void;
  onRestore: (order: OrderRecord) => void;
};

export function ArchiveView({ archive, searchTerm, onSearchTermChange, onRestore }: Props) {
  if (archive.length === 0) {
    return (
      <div className="archive-empty">
        <strong>Noch nichts archiviert.</strong>
        <p>Fertige Auftraege landen hier und koennen spaeter wieder geoeffnet werden.</p>
      </div>
    );
  }

  return (
    <div className="archive-list">
      <label className="archive-search">
        <span>Archiv durchsuchen</span>
        <input
          type="search"
          value={searchTerm}
          placeholder="Titel oder Produkt"
          onChange={(event) => onSearchTermChange(event.target.value)}
        />
      </label>
      {archive.map((order) => (
        <article key={order.id} className="archive-item">
          <div>
            <strong>{order.title}</strong>
            <p>
              {order.items.length} Positionen
              {order.archivedAt ? ` - ${new Date(order.archivedAt).toLocaleDateString('de-DE')}` : ''}
            </p>
          </div>
          <BigButton variant="ghost" onClick={() => onRestore(order)}>
            Wieder oeffnen
          </BigButton>
        </article>
      ))}
    </div>
  );
}
