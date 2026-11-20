import { Eye } from "lucide-react";

import { Button } from "@opai/ds";

import { accionSalirVerComo } from "@/app/_acciones/ver-como";

const PORTAL = {
  terreno: "Terreno",
  trabajador: "Portal del trabajador",
  cliente: "Portal Cliente",
};

/** Banda fija de «ver como» (CAR-528): a quién se mira, que es solo lectura y la salida. */
export function BannerVerComo({ portal, nombre }: { portal: keyof typeof PORTAL; nombre: string }) {
  return (
    <div
      role="status"
      data-ver-como
      className="sticky top-0 z-50 flex flex-wrap items-center gap-x-3 gap-y-1 bg-fg px-4 py-2 text-sm text-bg pt-safe"
    >
      <Eye aria-hidden className="size-4 flex-none" />
      <span className="min-w-0 flex-1">
        Estás viendo como{" "}
        <strong className="font-semibold">
          {PORTAL[portal]} · {nombre}
        </strong>
        <span className="block text-xs opacity-80">
          Solo lectura: los botones que guardan están desactivados.
        </span>
      </span>
      <form action={accionSalirVerComo}>
        <Button type="submit" variant="secondary">
          Salir
        </Button>
      </form>
    </div>
  );
}
