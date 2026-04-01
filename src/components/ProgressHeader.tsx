type Props = {
  done: number;
  total: number;
};

export function ProgressHeader({ done, total }: Props) {
  const percent = total === 0 ? 0 : Math.round((done / total) * 100);

  return (
    <div className="progress-header">
      <div>
        <span className="eyebrow">Fortschritt</span>
        <strong>
          {done} von {total} gepackt
        </strong>
      </div>
      <div className="progress-track" aria-label={`Fortschritt ${percent} Prozent`}>
        <div className="progress-fill" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}
