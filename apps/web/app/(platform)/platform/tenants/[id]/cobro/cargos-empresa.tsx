"use client";

import { useState } from "react";

import dynamic from "next/dynamic";

import { avisar, Badge, Button, Empty } from "@opai/ds";

import { useCapacidad } from "@/app/_components/use-capacidad";

import {
  type Cargo,
  clp,
  enMoneda,
  nombreMes,
  textoCantidad,
} from "../../../facturacion/_componentes/cobro";

const HojaAnular = dynamic(() => import("./hoja-anular").then((m) => m.HojaAnular));

/** Cargos de la empresa, del más reciente al más antiguo; un cargo listo se puede anular con motivo. */
export function CargosEmpresa(props: {
  tenantId: string;
  cargos: Cargo[];
  nombres: Record<string, string>;
}) {
  const { tenantId, cargos, nombres } = props;
  const { ejecutar, pendiente, error, limpiarError } = useCapacidad("platform");
  const [anular, setAnular] = useState<Cargo | null>(null);
  const [motivo, setMotivo] = useState("");
  if (cargos.length === 0)
    return (
      <Empty
        titulo="Aún no hay cargos"
        descripcion="Se generan solos el mes siguiente, o desde Facturación para un mes cerrado."
      />
    );
  async function confirmar() {
    if (!anular) return;
    const r = await ejecutar("platform.cobros.cargo_anular", {
      tenantId,
      cargoId: anular.id,
      motivo,
    });
    if (r) {
      avisar.exito("Cargo anulado");
      setAnular(null);
    }
  }
  return (
    <>
      <ul className="flex flex-col rounded-lg border border-border bg-surface">
        {cargos.map((c) => (
          <li
            key={c.id}
            className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-border px-4 py-3 last:border-b-0 md:grid-cols-[minmax(0,1fr)_auto_auto]"
          >
            <span className="flex min-w-0 flex-col">
              <span className="truncate text-base font-medium text-fg">
                {nombres[c.moduloId] ?? c.moduloId} · {nombreMes(c.periodo)}
              </span>
              <span className="t-caption">
                {c.cantidad !== null ? `${textoCantidad(c.cantidad, c.unidad)} · ` : ""}
                {c.moneda === "UF" ? `${enMoneda(c.monto, "UF")} · ` : ""}
                {c.diasCobrados < c.diasMes
                  ? `${c.diasCobrados} de ${c.diasMes} días`
                  : "Mes completo"}
                {c.motivoAnulacion ? ` · Anulado: ${c.motivoAnulacion}` : ""}
              </span>
            </span>
            <span className="flex flex-col items-end gap-1">
              <span className="t-numeric text-base font-semibold text-fg">{clp(c.montoClp)}</span>
              {c.estado === "listo" ? (
                <Badge tono="success">Listo para facturar</Badge>
              ) : (
                <Badge>Anulado</Badge>
              )}
            </span>
            {c.estado === "listo" ? (
              <Button
                variant="ghost"
                className="col-span-2 md:col-span-1"
                onClick={() => {
                  limpiarError();
                  setMotivo("");
                  setAnular(c);
                }}
              >
                Anular
              </Button>
            ) : (
              <span className="hidden md:block" />
            )}
          </li>
        ))}
      </ul>
      {anular ? (
        <HojaAnular
          anular={anular}
          nombre={nombres[anular.moduloId] ?? anular.moduloId}
          motivo={motivo}
          setMotivo={setMotivo}
          pendiente={pendiente}
          error={error}
          onConfirmar={() => void confirmar()}
          onCerrar={() => setAnular(null)}
        />
      ) : null}
    </>
  );
}
