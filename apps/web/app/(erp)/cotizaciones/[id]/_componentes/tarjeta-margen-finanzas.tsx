"use client";

import { Button, Pares, SeccionTarjeta } from "@opai/ds";

import { margenPctTexto } from "@/lib/cpq-presentacion";

import { MODOS_MARGEN, type ParametrosVersion, pctTexto } from "./margen-form";

/** Resumen de margen y finanzas de la versión; la edición abre la hoja (solo con `cpq:costos.ver`). */
export function TarjetaMargenFinanzas({
  parametros,
  margenEfectivoPct,
  editable,
  onEditar,
}: {
  parametros: ParametrosVersion;
  margenEfectivoPct?: number | undefined;
  editable: boolean;
  onEditar: () => void;
}) {
  const { garantia, rc, financiero } = parametros.instrumentos;
  const activos = [
    garantia.habilitada && "Póliza de garantía",
    rc.habilitada && "Responsabilidad civil",
    financiero.habilitado && "Costo financiero",
  ].filter(Boolean);
  const modo = MODOS_MARGEN.find((m) => m.id === parametros.margenModo)?.etiqueta ?? parametros.margenModo;
  const objetivo = parametros.margenObjetivoPct != null ? pctTexto(parametros.margenObjetivoPct) : "Del modelo";
  return (
    <SeccionTarjeta
      titulo="Pólizas y finanzas"
      accion={
        editable ? (
          <Button type="button" variant="secondary" size="md" className="max-md:min-h-11 max-md:text-sm" onClick={onEditar}>
            Margen y finanzas
          </Button>
        ) : undefined
      }
    >
      <Pares
        items={[
          { etiqueta: "Margen objetivo", valor: `${objetivo} · base ${modo.toLowerCase()}` },
          { etiqueta: "Margen efectivo", valor: margenPctTexto(margenEfectivoPct), numerico: true },
          { etiqueta: "Instrumentos", valor: activos.length ? activos.join(" · ") : "Ninguno" },
          {
            etiqueta: "Meses de contrato",
            valor: `${parametros.mesesContrato}${parametros.mesesPactados ? "" : " (según vigencia)"}`,
            numerico: true,
          },
        ]}
      />
    </SeccionTarjeta>
  );
}
