import Link from "next/link";

import type { LinkComponent } from "@opai/ds";

/** next/link con la firma de enlace del DS. */
export const LinkNext: LinkComponent = ({ href, className, children, ...rest }) => (
  <Link href={href} className={className} {...rest}>
    {children}
  </Link>
);
