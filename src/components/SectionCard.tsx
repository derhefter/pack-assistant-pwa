import type { PropsWithChildren } from 'react';

type Props = PropsWithChildren<{
  title: string;
  subtitle?: string;
  accent?: boolean;
}>;

export function SectionCard({ title, subtitle, accent = false, children }: Props) {
  return (
    <section className={`section-card ${accent ? 'section-card--accent' : ''}`.trim()}>
      <div className="section-card__head">
        <div>
          <span className="eyebrow">{title}</span>
          {subtitle ? <p>{subtitle}</p> : null}
        </div>
      </div>
      {children}
    </section>
  );
}
