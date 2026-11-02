"use client";

import { useRouter } from "next/navigation";
import { MoreHorizontal } from "lucide-react";

import { Button, Menu } from "@opai/ds";

import { EnlaceBoton } from "@/app/_components/maestros/enlace-boton";

type Props = {
  configura: boolean;
  onImportar: () => void;
};

export function AccionesFlujoEscritorio({ configura, onImportar }: Props) {
  return (
    <div className="hidden flex-wrap gap-2 xl:flex">
      <EnlaceBoton href="/finanzas/flujo?vista=movil" variante="secondary">
        Vista celular
      </EnlaceBoton>
      {configura ? (
        <EnlaceBoton href="/configuracion/modulo/finanzas?seccion=flujo-caja" variante="secondary">
          Configurar
        </EnlaceBoton>
      ) : null}
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
            id: "movil",
            etiqueta: "Vista celular",
            onSelect: () => router.push("/finanzas/flujo?vista=movil"),
          },
          {
            id: "config",
            etiqueta: "Configurar",
            onSelect: () => router.push("/configuracion/modulo/finanzas?seccion=flujo-caja"),
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

export function MetasRendimientoFlujo({
  metaCeldaMs,
  metaGuardadoP95Ms,
  metaCargaInicialS,
}: {
  metaCeldaMs: number;
  metaGuardadoP95Ms: number;
  metaCargaInicialS: number;
}) {
  return (
    <div className="grid gap-2 rounded-lg border border-border bg-surface p-3 text-sm md:grid-cols-3">
      <Meta titulo="Celda" meta={`${metaCeldaMs} ms`} real="—" />
      <Meta titulo="Guardado p95" meta={`${metaGuardadoP95Ms} ms`} real="—" />
      <Meta titulo="Carga inicial" meta={`${metaCargaInicialS} s`} real="—" />
    </div>
  );
}

function Meta({ titulo, meta, real }: { titulo: string; meta: string; real: string }) {
  return (
    <div>
      <div className="font-medium text-fg">{titulo}</div>
      <div className="text-fg-muted">
        Meta {meta} · Real {real}
      </div>
    </div>
  );
}
