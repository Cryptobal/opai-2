import { Check } from "lucide-react";

import { cn, SeccionTarjeta } from "@opai/ds";

import { fecha, pesos } from "@/lib/fechas";
import { type EstructuraVista, GRATIFICACION } from "@/lib/tipos-sueldo";

const OCULTO = "••••";

/** Estructura base del cargo (15): un concepto por fila con su tratamiento legal. */
export function EstructuraBase({ e }: { e: EstructuraVista | undefined }) {
  if (!e)
    return (
      <SeccionTarjeta titulo="Estructura base">
        <p className="text-base text-fg-muted">
          Sin versión vigente. Crea la primera con “Crear versión”.
        </p>
      </SeccionTarjeta>
    );
  const m = (n: number | null) => (e.sensible ? OCULTO : pesos(n));
  const filas = [
    { nombre: "Sueldo base", nota: "Imponible · Tributable", valor: m(e.sueldoBase) },
    { nombre: "Colación", nota: "No imponible", valor: m(e.colacion) },
    { nombre: "Movilización", nota: "No imponible", valor: m(e.movilizacion) },
    ...e.items.map((i) => ({
      nombre: i.nombre,
      nota: i.imponible ? "Imponible" : "No imponible",
      valor: e.sensible
        ? OCULTO
        : i.monto !== null
          ? pesos(i.monto)
          : `${(i.porcentaje ?? 0) / 10_000} %`,
    })),
    {
      nombre: "Gratificación",
      nota: e.gratificacion === "legal_25" ? "Imponible · tope 4,75 IMM anual" : "",
      valor: e.sensible ? OCULTO : (GRATIFICACION[e.gratificacion ?? ""] ?? "—"),
    },
  ];
  return (
    <SeccionTarjeta
      titulo="Estructura base"
      accion={<span className="t-caption">vigente desde {fecha(e.vigenteDesde)}</span>}
      sinRelleno
    >
      <ul>
        {filas.map((f) => (
          <li
            key={f.nombre}
            className="flex items-start justify-between gap-3 border-b border-border px-4 py-3 last:border-b-0"
          >
            <span className="flex flex-col">
              <span className="text-base font-medium text-fg">{f.nombre}</span>
              {f.nota ? <span className="t-caption">{f.nota}</span> : null}
            </span>
            <span className="text-md font-semibold text-fg t-numeric">{f.valor}</span>
          </li>
        ))}
      </ul>
    </SeccionTarjeta>
  );
}

/** Versiones de la estructura (15): la vigente marcada; las anteriores con su periodo. */
export function Versiones({ versiones }: { versiones: EstructuraVista[] }) {
  if (!versiones.length) return null;
  return (
    <SeccionTarjeta titulo="Versiones">
      <ol className="flex flex-col">
        {versiones.map((v, i) => {
          const actual =
            i === versiones.findIndex((x) => x.estado === "vigente" && !x.vigenteHasta);
          return (
            <li key={v.id} className="relative flex gap-3 pb-4 last:pb-0">
              {i < versiones.length - 1 ? (
                <span aria-hidden className="absolute top-6 bottom-0 left-[11px] w-px bg-border" />
              ) : null}
              <span
                aria-hidden
                className={cn(
                  "z-10 flex size-6 flex-none items-center justify-center rounded-full border",
                  actual ? "border-fg bg-fg text-bg" : "border-border-strong bg-surface",
                )}
              >
                {actual ? <Check className="size-3.5" /> : null}
              </span>
              <span className="flex min-w-0 flex-col">
                <span className="text-base font-medium text-fg">
                  {actual ? "Vigente" : v.estado === "anulada" ? "Anulada" : "Versión"} desde{" "}
                  {fecha(v.vigenteDesde)}
                </span>
                <span className="t-caption">
                  base {v.sensible ? OCULTO : pesos(v.sueldoBase)}
                  {v.vigenteHasta ? ` · hasta ${fecha(v.vigenteHasta)}` : ""}
                  {v.motivo ? ` · ${v.motivo}` : ""}
                </span>
              </span>
            </li>
          );
        })}
      </ol>
    </SeccionTarjeta>
  );
}
