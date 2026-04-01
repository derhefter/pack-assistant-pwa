import { forwardRef, type PropsWithChildren } from 'react';

type Props = PropsWithChildren<{
  title: string;
  subtitle?: string;
  accent?: boolean;
}>;

export const SectionCard = forwardRef<HTMLElement, Props>(function SectionCard(
  { title, subtitle, accent = false, children },
  ref
) {
  return (
    <section ref={ref} className={`section-card ${accent ? 'section-card--accent' : ''}`.trim()}>
      <div className="section-card__head">
        <div>
          <span className="eyebrow">{title}</span>
          {subtitle ? <p>{subtitle}</p> : null}
        </div>
      </div>
      {children}
    </section>
  );
});
