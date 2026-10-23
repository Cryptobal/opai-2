"use client";

import { Bell } from "lucide-react";

import { Button, Popover } from "@opai/ds";

/** Campana de muestra: Popover con dos avisos ficticios. */
export function Campana({ n }: { n: number }) {
  return (
    <Popover
      etiqueta="Notificaciones"
      disparador={
        <Button variant="ghost" size="icon" aria-label={`${n} notificaciones`} className="relative">
          <Bell className="size-5" />
          <span className="t-numeric absolute top-1.5 right-1.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-danger-fg px-1 text-[11px] leading-none font-semibold text-white dark:bg-danger dark:text-inverse-fg">
            {n}
          </span>
        </Button>
      }
    >
      <div className="flex flex-col divide-y divide-border">
        <p className="px-4 py-3 text-base">
          Certificado OS-10 de María Fernanda Soto vence en 22 días
        </p>
        <p className="px-4 py-3 text-base">Grokbot pide aprobar: Quitar a Beto Rojas (admin)</p>
      </div>
    </Popover>
  );
}
