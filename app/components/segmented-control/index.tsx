'use client';

import { SegmentedControl as MantineSegmentedControl } from "@mantine/core";
import classes from "./segmented-control.module.css";

export const SegmentedControl = (
  props: Parameters<typeof MantineSegmentedControl>[0]
): JSX.Element => (
  <MantineSegmentedControl
    radius="sm"
    size="sm"
    color="cyan"
    classNames={classes}
    {...props}
  />
);
