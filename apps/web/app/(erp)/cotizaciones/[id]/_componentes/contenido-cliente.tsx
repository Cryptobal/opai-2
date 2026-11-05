"use client";

import { Pares } from "@opai/ds";

import { LinkNext } from "@/app/_components/link-next";

import type { DatosFichaCotizacion } from "../../_componentes/datos";

type Ficha = NonNullable<DatosFichaCotizacion["ficha"]>;

const fecha = (iso: string | null) => (iso ? iso.split("-").reverse().join("-") : "—");

/** Bloque 1: a quién se cotiza y dónde, con la vigencia de la versión. */
export function ContenidoCliente({ d }: { d: Ficha }) {
  const instalaciones = d.secciones.filter((s) => s.instalacionId).map((s) => s.nombre);
  return (
    <div className="space-y-3">
      <Pares
        items={[
          { etiqueta: "Negocio", valor: d.negocioTitulo ?? "—" },
          { etiqueta: "Instalación", valor: instalaciones.length ? instalaciones.join(", ") : "Sin instalación" },
          { etiqueta: "Válida hasta", valor: fecha(d.version.validaHasta) },
          { etiqueta: "Versión", valor: `v${d.version.numero}`, numerico: true },
        ]}
      />
      <p className="flex flex-wrap gap-x-4">
        <LinkNext href={`/negocios/${d.cotizacion.negocioId}`} className="inline-flex min-h-11 items-center text-sm font-semibold underline">
          Ver el negocio
        </LinkNext>
        {d.cuentaId ? (
          <LinkNext href={`/cuentas/${d.cuentaId}`} className="inline-flex min-h-11 items-center text-sm font-semibold underline">
            Ver la cuenta
          </LinkNext>
        ) : null}
      </p>
      {!d.cuentaId ? <p className="t-body-sm text-fg-muted">El negocio no tiene cuenta: asígnala para poder enviar.</p> : null}
    </div>
  );
}
