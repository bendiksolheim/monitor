import { cn } from "~/lib/utils";

type CardProps = {
  title?: string;
  indicator?: React.ReactNode;
  children: React.ReactNode;
  shadow?: "xs" | "sm" | "md" | "lg";
  className?: string;
};

export function Card({ title, indicator, children, shadow = "xs", className }: CardProps) {
  const shadowClasses = {
    xs: "shadow-md",
    sm: "shadow-lg",
    md: "shadow-xl",
    lg: "shadow-2xl",
  };

  return (
    <div
      className={cn(
        "card bg-base-100 card-border border-base-300 card-sm",
        shadowClasses[shadow],
        "hover:shadow-xl transition-shadow duration-200",
        className,
      )}
    >
      <div className="card-body p-4">
        {title && (
          <div className="border-base-300 border-b border-dashed">
            <div className="flex items-center justify-between gap-2 pb-4">
              {title}
              {indicator}
            </div>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
