"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { MoreHorizontal, Settings } from "lucide-react";

import { Button, type ItemMenu, Menu } from "@opai/ds";

import { EnlaceBoton } from "@/app/_components/maestros/enlace-boton";
import { HojaImportar } from "./hoja-importar";

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

/** ⋯ de la cabecera. En la planilla se esconde desde xl; en las tarjetas del teléfono va siempre. */
export function AccionesFlujoMovil({ configura, onImportar, enMovil = false }: Props & { enMovil?: boolean }) {
  const router = useRouter();
  const items: ItemMenu[] = [
    { id: "resumen", etiqueta: "Resumen por mes", onSelect: () => router.push("/finanzas/flujo/resumen") },
    enMovil
      ? { id: "planilla", etiqueta: "Vista de planilla", onSelect: () => router.push("/finanzas/flujo") }
      : { id: "movil", etiqueta: "Vista celular", onSelect: () => router.push("/finanzas/flujo?vista=movil") },
  ];
  if (configura) {
    items.push(
      { id: "config", etiqueta: "Filas y ajustes", onSelect: () => router.push(RUTA_AJUSTES) },
      { id: "import", etiqueta: "Importar CSV…", onSelect: onImportar },
    );
  }
  return (
    <div className={enMovil ? "shrink-0" : "shrink-0 xl:hidden"}>
      <Menu
        etiqueta="Acciones del flujo"
        lado="abajo-derecha"
        disparador={<MoreHorizontal className="size-5" aria-hidden />}
        claseDisparador="border border-border-strong bg-surface"
        items={items}
      />
    </div>
  );
}

/** Cabecera de la vista de tarjetas: título, gastos recurrentes y el menú ⋯ (CAR-570). */
export function CabeceraVistaMovil({ gestiona, configura }: { gestiona: boolean; configura: boolean }) {
  const [importar, setImportar] = useState(false);
  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="t-title text-fg">Flujo de caja</h2>
        <div className="flex items-center gap-2">
          <AccesoRecurrentes gestiona={gestiona} />
          <AccionesFlujoMovil configura={configura} enMovil onImportar={() => setImportar(true)} />
        </div>
      </div>
      {configura ? <HojaImportar abierta={importar} onAbiertaChange={setImportar} ocultarDisparador /> : null}
    </>
  );
}
