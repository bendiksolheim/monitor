import { cn } from '~/lib/utils';

type CardProps = {
  children: React.ReactNode;
  withBorder?: boolean;
  shadow?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
};

export function Card({
  children,
  withBorder = false,
  shadow = 'xs',
  className
}: CardProps) {
  const shadowClasses = {
    xs: 'shadow-md',
    sm: 'shadow-lg',
    md: 'shadow-xl',
    lg: 'shadow-2xl',
  };

  return (
    <div
      className={cn(
        'card bg-base-100 rounded-lg',
        withBorder && 'border border-base-300/50',
        shadowClasses[shadow],
        'hover:shadow-xl transition-shadow duration-200',
        className
      )}
    >
      <div className="card-body p-4">
        {children}
      </div>
    </div>
  );
}
