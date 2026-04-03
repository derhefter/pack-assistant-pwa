import { BigButton } from './BigButton';

type Props = {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  tone?: 'default' | 'warning';
};

export function EmptyState({ title, description, actionLabel, onAction, tone = 'default' }: Props) {
  return (
    <div className={`empty-state empty-state--${tone}`}>
      <strong>{title}</strong>
      <p>{description}</p>
      {actionLabel && onAction ? <BigButton onClick={onAction}>{actionLabel}</BigButton> : null}
    </div>
  );
}
