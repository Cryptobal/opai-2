import Link from "next/link";

import { Badge, ParesGrid, SeccionTarjeta } from "@opai/ds";

import { fecha, pesos } from "@/lib/fechas";

import type { NegocioDetalle } from "./datos";

const TIPO_VINCULO: Record<string, string> = {
  nueva: "Nueva",
  ampliacion: "Ampliación",
  renovacion: "Renovación",
  reemplazo: "Reemplazo",
};
const ROL: Record<string, string> = {
  decisor: "Decisor",
  tecnico: "Técnico",
  compras: "Compras",
  usuario: "Usuario",
};

/** Tab Resumen de un negocio: datos, instalaciones vinculadas y contactos con su rol (ADR-041). */
export function ResumenNegocio({ n }: { n: NegocioDetalle }) {
  const monto = n.valorMensual ?? n.montoEstimadoMensual;
  return (
    <div className="flex flex-col gap-4">
      <SeccionTarjeta titulo="Oportunidad">
        <ParesGrid
          items={[
            { etiqueta: "Cuenta", valor: <Link href={`/cuentas/${n.cuentaId}`} className="text-accent underline">{n.cuentaNombre}</Link> },
            { etiqueta: "Etapa", valor: n.etapaNombre },
            { etiqueta: "Monto mensual", valor: monto != null ? `${pesos(monto)}/mes` : null },
            { etiqueta: "Probabilidad", valor: `${n.probabilidad}%` },
            { etiqueta: "Cierre estimado", valor: n.cierreEstimado ? fecha(n.cierreEstimado) : null },
            { etiqueta: "Inicio de servicio", valor: n.inicioServicioEstimado ? fecha(n.inicioServicioEstimado) : null },
            ...(n.estado === "perdido"
              ? [{ etiqueta: "Competidor", valor: n.competidor }, { etiqueta: "Detalle", valor: n.motivoPerdidaDetalle, ancho: true }]
              : []),
          ]}
        />
      </SeccionTarjeta>
      <SeccionTarjeta titulo={`Instalaciones (${n.instalaciones.length})`}>
        {n.instalaciones.length ? (
          <div className="flex flex-col gap-2">
            {n.instalaciones.map((i) => (
              <div key={i.id} className="flex items-center justify-between">
                <Link href={`/instalaciones/${i.instalacionId}`} className="text-accent underline">
                  {i.nombre}
                </Link>
                <Badge punto={false}>{TIPO_VINCULO[i.tipo] ?? i.tipo}</Badge>
              </div>
            ))}
          </div>
        ) : (
          <p className="t-caption">Sin instalaciones vinculadas.</p>
        )}
      </SeccionTarjeta>
      <SeccionTarjeta titulo={`Contactos (${n.contactos.length})`}>
        {n.contactos.length ? (
          <div className="flex flex-col gap-2">
            {n.contactos.map((c) => (
              <div key={c.id} className="flex items-center justify-between">
                <span>{c.nombre}</span>
                <span className="flex gap-1">
                  {c.esPrincipal ? <Badge punto={false}>Principal</Badge> : null}
                  <Badge punto={false}>{ROL[c.rol] ?? c.rol}</Badge>
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="t-caption">Sin contactos en el negocio.</p>
        )}
      </SeccionTarjeta>
    </div>
  );
}
