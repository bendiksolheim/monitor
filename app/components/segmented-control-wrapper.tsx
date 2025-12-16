'use client';

import { Center } from '@mantine/core';
import { useRouter, useSearchParams } from 'next/navigation';
import { SegmentedControl } from './segmented-control';

interface SegmentedControlWrapperProps {
  data: Array<{ value: string; label: string }>;
  defaultValue: string;
}

export function SegmentedControlWrapper({ data, defaultValue }: SegmentedControlWrapperProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const value = searchParams.get('show') || defaultValue;

  return (
    <Center mb="lg">
      <SegmentedControl
        data={data}
        value={value}
        onChange={(value) => {
          const params = new URLSearchParams(searchParams);
          params.set('show', value);
          router.push(`/?${params.toString()}`);
        }}
      />
    </Center>
  );
}
