"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { formatearFechaHora } from "@opai/domain";
import { Alerta, avisar, Badge, Button, Dialog } from "@opai/ds";

import { useCapacidad } from "@/app/_components/use-capacidad";

import { fechaDdMmAaaa } from "../../../flujo/_componentes/datos";
import type { DescarteMovimientos, VistaRestaurar } from "./tipos";

/**
 * Movimientos sacados con «Borrar por fechas» (CAR-412). Cada descarte se puede restaurar, con vista previa: vuelven a
 * la cuenta tal como estaban, salvo los que ya volvieron por una cartola o por la sincronización.
 */
export function ListaDescartes({ descartes, gestiona }: { descartes: DescarteMovimientos[]; gestiona: boolean }) {
  const router = useRouter();
  const { ejecutar, pendiente, error } = useCapacidad("erp");
  const [vista, setVista] = useState<VistaRestaurar | null>(null);

  async function preparar(d: DescarteMovimientos) {
    const r = await ejecutar<VistaRestaurar>("finanzas.descartes_bancarios.restaurar", { descarteId: d.id }, true);
    if (r) setVista(r);
  }
  async function restaurar() {
    if (!vista) return;
    const r = await ejecutar<VistaRestaurar>("finanzas.descartes_bancarios.restaurar", { descarteId: vista.descarteId });
    if (!r) return;
    avisar.exito(`Se restauraron ${r.restaurados} movimientos`);
    setVista(null);
    router.refresh();
  }

  if (descartes.length === 0) return null;
  return (
    <section aria-labelledby="descartes-titulo" className="flex flex-col gap-2">
      <h2 id="descartes-titulo" className="t-subheading text-fg">Movimientos borrados por fechas</h2>
      {error && !vista ? <Alerta tono="danger" titulo={error} /> : null}
      <ul className="flex flex-col gap-2">
        {descartes.map((d) => (
          <li key={d.id} className="rowcard grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 p-3">
            <div className="min-w-0">
              <p className="t-body-sm font-medium">
                {`${fechaDdMmAaaa(d.desde)} al ${fechaDdMmAaaa(d.hasta)} · ${d.movimientos} movimientos`}
              </p>
              <p className="t-caption text-fg-muted">{`Borrados el ${formatearFechaHora(d.descartadoEn)}`}</p>
            </div>
            {d.restauradoEn ? (
              <Badge tono="success">Restaurados</Badge>
            ) : gestiona ? (
              <Button variant="secondary" disabled={pendiente} onClick={() => void preparar(d)}>
                Restaurar
              </Button>
            ) : (
              <Badge tono="neutro">Borrados</Badge>
            )}
          </li>
        ))}
      </ul>
      {vista ? (
        <Dialog
          abierto
          onCerrar={() => setVista(null)}
          titulo="¿Restaurar estos movimientos?"
          descripcion="Vuelven a la cuenta tal como estaban y se pueden conciliar de nuevo."
          acciones={
            <>
              <Button variant="secondary" onClick={() => setVista(null)}>
                Cancelar
              </Button>
              <Button disabled={pendiente || vista.restaurados === 0} onClick={() => void restaurar()}>
                Restaurar {vista.restaurados} movimientos
              </Button>
            </>
          }
        >
          {error ? <Alerta tono="danger" titulo={error} /> : null}
          {vista.yaPresentes ? (
            <Alerta tono="info" titulo={`${vista.yaPresentes} ya están de vuelta`}>
              Volvieron por una cartola o por la sincronización con el banco; no se duplican.
            </Alerta>
          ) : null}
        </Dialog>
      ) : null}
    </section>
  );
}
