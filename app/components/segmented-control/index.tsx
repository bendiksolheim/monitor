"use client";

import { SegmentedControl as MantineSegmentedControl } from "@mantine/core";
import classes from "./segmented-control.module.css";
import { ReactNode } from "react";

export const SegmentedControl = (
  props: Parameters<typeof MantineSegmentedControl>[0]
): ReactNode => (
  <MantineSegmentedControl
    radius="sm"
    size="sm"
    color="cyan"
    classNames={classes}
    {...props}
  />
);
