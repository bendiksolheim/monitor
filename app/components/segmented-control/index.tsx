'use client';

import { cn } from '~/lib/utils';

type SegmentedControlProps = {
  data: Array<{ value: string; label: string }>;
  value: string;
  onChange: (value: string) => void;
  className?: string;
};

export function SegmentedControl({
  data,
  value,
  onChange,
  className
}: SegmentedControlProps) {
  return (
    <div
      className={cn(
        'tabs tabs-boxed bg-base-100 shadow-lg border border-base-300/50 rounded-lg',
        className
      )}
      role="tablist"
    >
      {data.map((item) => (
        <button
          key={item.value}
          role="tab"
          className={cn(
            'tab transition-all duration-200',
            value === item.value
              ? 'tab-active bg-primary text-primary-content shadow-md'
              : 'hover:bg-base-200'
          )}
          onClick={() => onChange(item.value)}
          aria-selected={value === item.value}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}
