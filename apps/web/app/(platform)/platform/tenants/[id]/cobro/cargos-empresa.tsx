"use client";

import { useState } from "react";

import { Alerta, avisar, Badge, Button, Campo, Empty, Input, Sheet } from "@opai/ds";

import { useCapacidad } from "@/app/_components/use-capacidad";

import { type Cargo, clp, enMoneda, nombreMes } from "../../../facturacion/_componentes/cobro";

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
      <Sheet
        abierto={Boolean(anular)}
        onCerrar={() => setAnular(null)}
        titulo="Anular cargo"
        descripcion={
          anular
            ? `${nombres[anular.moduloId] ?? anular.moduloId} · ${nombreMes(anular.periodo)} · ${clp(anular.montoClp)}`
            : ""
        }
        acciones={
          <>
            <Button variant="secondary" onClick={() => setAnular(null)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              disabled={pendiente || motivo.trim().length < 3}
              onClick={() => void confirmar()}
            >
              Anular cargo
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          {error ? <Alerta tono="danger" titulo={error} /> : null}
          <p className="text-base text-fg">
            El cargo deja de estar listo para facturar. Después puedes volver a generar el mes.
          </p>
          <Campo etiqueta="Motivo" htmlFor="motivo">
            <Input id="motivo" value={motivo} onChange={(e) => setMotivo(e.target.value)} />
          </Campo>
        </div>
      </Sheet>
    </>
  );
}
