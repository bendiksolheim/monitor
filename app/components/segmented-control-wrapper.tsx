'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { SegmentedControl } from './segmented-control';

interface SegmentedControlWrapperProps {
  data: Array<{ value: string; label: string }>;
  defaultValue: string;
}

export function SegmentedControlWrapper({
  data,
  defaultValue
}: SegmentedControlWrapperProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleChange = (value: string) => {
    const params = new URLSearchParams(searchParams?.toString());
    params.set('show', value);
    router.push(`?${params.toString()}`);
  };

  return (
    <div className="flex justify-center mb-4">
      <SegmentedControl
        data={data}
        value={defaultValue}
        onChange={handleChange}
      />
    </div>
  );
}
