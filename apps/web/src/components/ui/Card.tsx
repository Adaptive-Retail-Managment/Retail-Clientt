import type { HTMLAttributes, ReactNode } from 'react';

export function Card({
  children,
  className,
  ...rest
}: HTMLAttributes<HTMLElement> & { children: ReactNode }) {
  return (
    <section className={`ui-card${className ? ` ${className}` : ''}`} {...rest}>
      {children}
    </section>
  );
}
