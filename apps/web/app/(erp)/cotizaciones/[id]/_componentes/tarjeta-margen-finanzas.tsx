"use client";

import { Button, Pares } from "@opai/ds";

import { MODOS_MARGEN, type ParametrosVersion, pctTexto } from "./margen-form";

/** Resumen de margen y finanzas de la versión; la edición abre la hoja (solo con `cpq:costos.ver`). */
export function TarjetaMargenFinanzas({
  parametros,
  editable,
  onEditar,
}: {
  parametros: ParametrosVersion;
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
  const objetivo = parametros.margenObjetivoPct != null ? pctTexto(parametros.margenObjetivoPct) : "—";
  return (
    <div className="space-y-2 border-t border-border pt-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="t-label">Margen y finanzas</h3>
        {editable ? (
          <Button type="button" variant="secondary" size="md" onClick={onEditar}>
            Cambiar margen
          </Button>
        ) : null}
      </div>
      <Pares
        items={[
          { etiqueta: "Margen objetivo", valor: `${objetivo} · base ${modo.toLowerCase()}` },
          { etiqueta: "Instrumentos", valor: activos.length ? activos.join(" · ") : "Ninguno" },
          {
            etiqueta: "Meses de contrato",
            valor: `${parametros.mesesContrato}${parametros.mesesPactados ? "" : " (según vigencia)"}`,
            numerico: true,
          },
        ]}
      />
    </div>
  );
}
