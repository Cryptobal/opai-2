import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "../cn";

const FONDO = {
  warning: "bg-warning-muted text-warning-fg",
  info: "bg-info-muted text-info-fg",
  danger: "bg-danger-muted text-danger-fg",
  success: "bg-success-muted text-success-fg",
} as const;

type Props = { icono: LucideIcon; tono: keyof typeof FONDO; titulo: string; children?: ReactNode };

/** Icono en un cuadro de color + título + texto (invitación vencida o usada, enlace enviado). */
export function EstadoIlustrado({ icono: Icono, tono, titulo, children }: Props) {
  return (
    <div className="flex flex-col gap-4">
      <span className={cn("flex size-14 items-center justify-center rounded-lg", FONDO[tono])}>
        <Icono className="size-6" aria-hidden />
      </span>
      <h1 className="t-title text-fg md:t-heading">{titulo}</h1>
      {children ? <div className="text-md text-fg-muted md:text-base">{children}</div> : null}
    </div>
  );
}
