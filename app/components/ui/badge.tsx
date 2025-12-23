import { cn } from '~/lib/utils';

type BadgeVariant = 'success' | 'error' | 'warning' | 'neutral' | 'info';
type BadgeSize = 'sm' | 'md' | 'lg';

type BadgeProps = {
  children: React.ReactNode;
  variant?: BadgeVariant;
  size?: BadgeSize;
  className?: string;
};

export function Badge({
  children,
  variant = 'neutral',
  size = 'md',
  className
}: BadgeProps) {
  const variantClasses: Record<BadgeVariant, string> = {
    success: 'badge-success',
    error: 'badge-error',
    warning: 'badge-warning',
    neutral: 'badge-neutral',
    info: 'badge-info',
  };

  const sizeClasses: Record<BadgeSize, string> = {
    sm: 'badge-sm',
    md: 'badge-md',
    lg: 'badge-lg',
  };

  return (
    <div className={cn(
      'badge font-medium shadow-sm',
      variantClasses[variant],
      sizeClasses[size],
      className
    )}>
      {children}
    </div>
  );
}
