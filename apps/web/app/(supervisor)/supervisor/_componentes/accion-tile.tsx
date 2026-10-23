import type { LucideIcon } from "lucide-react";

import { EnlaceBoton } from "@/app/_components/maestros/enlace-boton";

/** Acción de terreno en mosaico (Llamar, WhatsApp, Cliente): icono sobre la etiqueta, 72 px. */
export function AccionTile({
  href,
  icono: Icono,
  etiqueta,
}: {
  href: string;
  icono: LucideIcon;
  etiqueta: string;
}) {
  return (
    <EnlaceBoton
      href={href}
      variante="secondary"
      className="h-auto min-h-[72px] flex-col gap-1.5 rounded-lg bg-surface py-3"
    >
      <Icono className="size-5" aria-hidden />
      {etiqueta}
    </EnlaceBoton>
  );
}

/** Solo dígitos y "+" para enlaces tel: y wa.me. */
export const marcable = (t: string) => t.replace(/[^\d+]/g, "");
