import type { HTMLAttributes } from "react";

import { cn } from "../cn";

export function Skeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div aria-hidden className={cn("ds-shimmer rounded-sm bg-fill", className)} {...props} />;
}
