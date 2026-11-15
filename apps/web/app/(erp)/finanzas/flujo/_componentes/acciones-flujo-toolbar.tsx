"use client";

import { useRouter } from "next/navigation";
import { MoreHorizontal, Settings } from "lucide-react";

import { Button, Menu } from "@opai/ds";

import { EnlaceBoton } from "@/app/_components/maestros/enlace-boton";

const RUTA_AJUSTES = "/configuracion/modulo/finanzas?seccion=flujo-caja";

type Props = {
  configura: boolean;
  onImportar: () => void;
};

/** Siempre visible: la pantalla de gastos recurrentes y el ajuste de filas. */
export function AccesoRecurrentes({ gestiona }: { gestiona: boolean }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <EnlaceBoton href="/finanzas/flujo/recurrentes" variante="secondary">
        Gastos recurrentes
      </EnlaceBoton>
      {gestiona ? (
        <EnlaceBoton
          href={RUTA_AJUSTES}
          variante="secondary"
          icono={Settings}
          etiqueta="Filas y ajustes"
          className="size-11 px-0"
        >
          {null}
        </EnlaceBoton>
      ) : null}
    </div>
  );
}

export function AccionesFlujoEscritorio({ configura, onImportar }: Props) {
  return (
    <div className="hidden flex-wrap gap-2 xl:flex">
      <EnlaceBoton href="/finanzas/flujo/resumen" variante="secondary">
        Resumen por mes
      </EnlaceBoton>
      <EnlaceBoton href="/finanzas/flujo?vista=movil" variante="secondary">
        Vista celular
      </EnlaceBoton>
      {configura ? (
        <Button variant="secondary" onClick={onImportar}>
          Importar CSV…
        </Button>
      ) : null}
    </div>
  );
}

export function AccionesFlujoMovil({ configura, onImportar }: Props) {
  const router = useRouter();
  if (!configura) return null;
  return (
    <div className="xl:hidden">
      <Menu
        etiqueta="Acciones del flujo"
        lado="abajo-derecha"
        className="relative inline-flex"
        disparador={<MoreHorizontal className="size-5" aria-hidden />}
        items={[
          {
            id: "resumen",
            etiqueta: "Resumen por mes",
            onSelect: () => router.push("/finanzas/flujo/resumen"),
          },
          {
            id: "movil",
            etiqueta: "Vista celular",
            onSelect: () => router.push("/finanzas/flujo?vista=movil"),
          },
          {
            id: "import",
            etiqueta: "Importar CSV…",
            onSelect: onImportar,
          },
        ]}
      />
    </div>
  );
}
