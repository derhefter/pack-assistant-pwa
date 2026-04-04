import { useRef } from 'react';
import { BigButton } from '../../components/BigButton';
import { useSpeech } from '../audio';
import type { OrderRecord } from './types';

type Props = {
  order: OrderRecord;
  onToggleItem?: (itemId: string) => void;
  onComplete?: () => void;
  onCaptureImage?: (itemId: string, file: File) => void;
  onRenameOrder?: (title: string) => void;
  readOnly?: boolean;
};

export function OrderView({ order, onToggleItem, onComplete, onCaptureImage, onRenameOrder, readOnly = false }: Props) {
  const packedCount = order.items.filter((item) => item.packed).length;
  const allPacked = order.items.length > 0 && packedCount === order.items.length;
  const speech = useSpeech();
  const inputMap = useRef<Record<string, HTMLInputElement | null>>({});

  return (
    <div className="order-view">
      <header className="order-view__header">
        <div>
          <span className="eyebrow">{order.sourceLabel}</span>
          {readOnly ? (
            <h2>{order.title}</h2>
          ) : (
            <input
              key={order.id}
              className="order-view__title-input"
              type="text"
              defaultValue={order.title}
              aria-label="Auftragsname"
              onBlur={(event) => {
                const trimmed = event.currentTarget.value.trim();
                if (trimmed && trimmed !== order.title) {
                  onRenameOrder?.(trimmed);
                } else {
                  event.currentTarget.value = order.title;
                }
              }}
            />
          )}
          <p>
            {packedCount} von {order.items.length} Positionen gepackt
          </p>
        </div>
        {!readOnly && allPacked && onComplete ? (
          <BigButton variant="danger" onClick={onComplete}>
            Auftrag abschliessen
          </BigButton>
        ) : null}
      </header>

      <div className="order-grid">
        {order.items.map((item) => {
          const hasCaptureAction = Boolean(!readOnly && onCaptureImage && item.productId && item.imageSource === 'placeholder');

          return (
            <article key={item.id} className={`product-card ${item.packed ? 'product-card--done' : ''}`.trim()}>
              <button
                type="button"
                className="product-card__toggle"
                aria-pressed={item.packed}
                onClick={() => onToggleItem?.(item.orderItemId)}
                disabled={readOnly || !onToggleItem}
              >
                <div className="product-card__image">
                  <span className="product-card__badge">
                    {item.quantity}
                    {item.unit ? ` ${item.unit}` : ' x'}
                  </span>
                  <img src={item.imageUrl} alt={item.imageAlt} />
                </div>
                <div className="product-card__body">
                  {item.sku ? <span className="product-card__sku">Art.-Nr. {item.sku}</span> : null}
                  <strong>{item.name}</strong>
                  <span className={`product-card__qty ${item.packed ? 'product-card__qty--done' : ''}`.trim()}>
                    {item.packed ? 'Bereits gepackt' : 'Noch offen'}
                  </span>
                </div>
              </button>

              <div
                className={`product-card__actions ${
                  hasCaptureAction ? 'product-card__actions--double' : 'product-card__actions--single'
                }`.trim()}
              >
                <BigButton
                  variant="ghost"
                  disabled={!speech.supported}
                  onClick={() => speech.speak(item.speechText)}
                >
                  Vorlesen
                </BigButton>

                {hasCaptureAction ? (
                  <>
                    <input
                      ref={(node) => {
                        inputMap.current[item.orderItemId] = node;
                      }}
                      className="sr-only"
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                          if (file && onCaptureImage) {
                            onCaptureImage(item.orderItemId, file);
                          }
                        event.target.value = '';
                      }}
                    />
                    <BigButton
                      variant="secondary"
                      onClick={() => inputMap.current[item.orderItemId]?.click()}
                    >
                      Bild aufnehmen
                    </BigButton>
                  </>
                ) : null}
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
