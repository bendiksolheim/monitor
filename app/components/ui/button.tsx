import Link from 'next/link';
import { cn } from '~/lib/utils';

type ButtonVariant = 'primary' | 'ghost' | 'outline';

type ButtonProps = {
  children: React.ReactNode;
  href?: string;
  variant?: ButtonVariant;
  leftSection?: React.ReactNode;
  className?: string;
  component?: typeof Link;
};

export function Button({
  children,
  href,
  variant = 'primary',
  leftSection,
  className,
  component,
}: ButtonProps) {
  const variantClasses: Record<ButtonVariant, string> = {
    primary: 'btn-primary shadow-md hover:shadow-lg',
    ghost: 'btn-ghost hover:bg-base-200',
    outline: 'btn-outline hover:shadow-md',
  };

  const classes = cn('btn transition-all duration-200', variantClasses[variant], className);

  // If href is provided or component is Link, render as Link
  if (href || component === Link) {
    return (
      <Link href={href!} className={classes}>
        {leftSection && <span className="mr-1">{leftSection}</span>}
        {children}
      </Link>
    );
  }

  // Otherwise render as button
  return (
    <button className={classes}>
      {leftSection && <span className="mr-1">{leftSection}</span>}
      {children}
    </button>
  );
}
