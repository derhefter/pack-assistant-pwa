import type { ButtonHTMLAttributes, PropsWithChildren } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost';

type Props = PropsWithChildren<
  ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: Variant;
  }
>;

export function BigButton({ variant = 'primary', className = '', children, ...props }: Props) {
  return (
    <button {...props} className={`big-button big-button--${variant} ${className}`.trim()}>
      {children}
    </button>
  );
}
