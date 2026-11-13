"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { formatearFechaHora } from "@opai/domain";
import { Alerta, avisar, Badge, Button, Campo, Empty, Estado, Select, type EstadoPantalla } from "@opai/ds";

import { useCapacidad } from "@/app/_components/use-capacidad";

import { clp, fechaDdMmAaaa } from "../../../flujo/_componentes/datos";
import type { CuentaBanco } from "../../_componentes/bancos-tipos";
import { DialogDeshacerImportacion } from "./dialog-deshacer-importacion";
import type { ImportacionCartola, VistaDeshacer } from "./tipos";


const periodoDe = (i: ImportacionCartola) =>
  i.fechaDesde && i.fechaHasta ? `${fechaDdMmAaaa(i.fechaDesde)} al ${fechaDdMmAaaa(i.fechaHasta)}` : "Sin período";

/** Historial de importaciones de una cuenta, con su saldo y la acción «Deshacer importación» (CAR-341). */
export function PantallaImportaciones({
  state,
  cuentas,
  cuentaId,
  importaciones,
  gestiona,
}: {
  state: EstadoPantalla;
  cuentas: CuentaBanco[];
  cuentaId: string | null;
  importaciones: ImportacionCartola[];
  gestiona: boolean;
}) {
  const router = useRouter();
  const { ejecutar, pendiente, error } = useCapacidad("erp");
  const [vista, setVista] = useState<VistaDeshacer | null>(null);
  const [elegida, setElegida] = useState<ImportacionCartola | null>(null);
  const cuenta = cuentas.find((c) => c.id === cuentaId) ?? null;

  async function preparar(i: ImportacionCartola) {
    const r = await ejecutar<VistaDeshacer>("finanzas.cartolas.deshacer", { cartolaId: i.id, motivo: "Vista previa" }, true);
    if (r) {
      setElegida(i);
      setVista(r);
    }
  }
  async function confirmar() {
    if (!elegida) return;
    const r = await ejecutar<VistaDeshacer>("finanzas.cartolas.deshacer", {
      cartolaId: elegida.id,
      motivo: "Deshecha desde Bancos › Importaciones",
    });
    if (!r) return;
    avisar.exito(`Importación deshecha: se borraron ${r.movimientos} movimientos`);
    setVista(null);
    setElegida(null);
    router.refresh();
  }

  return (
    <Estado state={state} variante="lista" textos={{ error: { titulo: "No pudimos cargar las importaciones" } }}>
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          {cuentas.length > 1 ? (
            <Campo etiqueta="Cuenta" htmlFor="importaciones-cuenta">
              <Select
                id="importaciones-cuenta"
                valor={cuentaId ?? ""}
                onCambiar={(v) => router.push(`/finanzas/bancos/importaciones?cuenta=${v}`)}
                opciones={cuentas.map((c) => ({ valor: c.id, etiqueta: `${c.banco} · ${c.numeroVisible}` }))}
              />
            </Campo>
          ) : (
            <p className="t-body-sm text-fg-muted">{cuenta ? `${cuenta.banco} · ${cuenta.numeroVisible}` : ""}</p>
          )}
          {cuenta?.saldoHoy != null ? (
            <div className="text-right">
              <p className="t-caption text-fg-muted">Saldo de hoy</p>
              <p className="t-mono t-body font-medium">{clp(cuenta.saldoHoy)}</p>
              {cuenta.saldoDesde ? (
                <p className="t-caption text-fg-muted">Último saldo conocido al {fechaDdMmAaaa(cuenta.saldoDesde)}</p>
              ) : null}
            </div>
          ) : null}
        </div>
        {error ? <Alerta tono="danger" titulo={error} /> : null}
        {importaciones.length === 0 ? (
          <Empty titulo="Sin cartolas importadas" descripcion="Las cartolas que subas en Movimientos aparecen aquí, con su período y su saldo." />
        ) : (
          <ul className="flex flex-col gap-2">
            {importaciones.map((i) => (
              <li key={i.id} className="rowcard flex flex-wrap items-center gap-3 p-3">
                <div className="min-w-0 grow basis-full sm:basis-0">
                  <p className="t-body-sm font-medium break-words">{i.nombreArchivo ?? "Cartola sin nombre"}</p>
                  <p className="t-caption text-fg-muted">
                    {periodoDe(i)} · {i.movimientos} movimientos
                    {i.conciliados > 0 ? ` (${i.conciliados} conciliados)` : ""}
                  </p>
                  <p className="t-caption text-fg-muted">
                    Importada el {formatearFechaHora(i.creadaEn)}
                    {i.creadaPor ? ` por ${i.creadaPor}` : ""}
                    {i.viaAgente ? " (vía agente)" : ""}
                  </p>
                </div>
                <div className="text-right">
                  {i.saldoFinal != null ? (
                    <>
                      <p className="t-mono t-body-sm">{clp(i.saldoFinal)}</p>
                      <p className="t-caption text-fg-muted">
                        {i.saldoInicial != null ? `desde ${clp(i.saldoInicial)}` : "saldo final"}
                      </p>
                    </>
                  ) : (
                    <Badge tono="neutro">Sin saldo</Badge>
                  )}
                </div>
                {gestiona ? (
                  <Button variant="secondary" disabled={pendiente} onClick={() => void preparar(i)}>
                    Deshacer
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>
      <DialogDeshacerImportacion
        vista={vista}
        periodo={elegida ? periodoDe(elegida) : ""}
        pendiente={pendiente}
        onCerrar={() => {
          setVista(null);
          setElegida(null);
        }}
        onConfirmar={() => void confirmar()}
      />
    </Estado>
  );
}
