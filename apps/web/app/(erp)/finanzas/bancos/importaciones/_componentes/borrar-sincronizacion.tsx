"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Alerta, avisar, Button, Campo, Dialog, InputFecha } from "@opai/ds";

import { useCapacidad } from "@/app/_components/use-capacidad";

type Vista = { movimientos: number; conciliados: number };

/**
 * Borrar los movimientos que llegaron por la sincronización con el banco entre dos fechas (CAR-341), para volver a
 * cargarlos limpios desde la cartola. Primero cuenta (vista previa) y después borra; los conciliados se conservan.
 */
export function BorrarSincronizacion({ cuentaId }: { cuentaId: string }) {
  const router = useRouter();
  const { ejecutar, pendiente, error } = useCapacidad("erp");
  const [abierto, setAbierto] = useState(false);
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [vista, setVista] = useState<Vista | null>(null);
  const rangoValido = Boolean(desde && hasta && desde <= hasta);
  const entrada = { cuentaId, desde, hasta, origen: "web4leads", motivo: "Borrado por fechas desde Bancos › Importaciones" };

  const cerrar = () => {
    setAbierto(false);
    setVista(null);
  };
  async function contar() {
    const r = await ejecutar<Vista>("finanzas.movimientos_bancarios.borrar_rango", entrada, true);
    if (r) setVista(r);
  }
  async function borrar() {
    const r = await ejecutar<Vista>("finanzas.movimientos_bancarios.borrar_rango", entrada);
    if (!r) return;
    avisar.exito(`Se borraron ${r.movimientos} movimientos de la sincronización`);
    cerrar();
    router.refresh();
  }

  return (
    <section className="rowcard flex flex-wrap items-center justify-between gap-3 p-3">
      <div className="min-w-0">
        <p className="t-body-sm font-medium">Movimientos de la sincronización con el banco</p>
        <p className="t-caption text-fg-muted">No aparecen como importación. Si quedaron mal, bórralos por fechas y carga la cartola.</p>
      </div>
      <Button variant="secondary" onClick={() => setAbierto(true)}>
        Borrar por fechas
      </Button>
      <Dialog
        abierto={abierto}
        onCerrar={cerrar}
        titulo="Borrar movimientos de la sincronización"
        descripcion="Solo los que llegaron por el banco en línea. Las cartolas se deshacen en su fila."
        acciones={
          <>
            <Button variant="secondary" onClick={cerrar}>
              Cancelar
            </Button>
            {vista ? (
              <Button variant="destructive" disabled={pendiente || vista.movimientos === 0} onClick={() => void borrar()}>
                Borrar {vista.movimientos} movimientos
              </Button>
            ) : (
              <Button disabled={pendiente || !rangoValido} onClick={() => void contar()}>
                Ver cuántos son
              </Button>
            )}
          </>
        }
      >
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Campo etiqueta="Desde" htmlFor="borrar-desde">
              <InputFecha id="borrar-desde" valor={desde} onCambiar={(v) => { setDesde(v); setVista(null); }} />
            </Campo>
            <Campo etiqueta="Hasta" htmlFor="borrar-hasta">
              <InputFecha id="borrar-hasta" valor={hasta} invalido={Boolean(desde && hasta && hasta < desde)} onCambiar={(v) => { setHasta(v); setVista(null); }} />
            </Campo>
          </div>
          {error ? <Alerta tono="danger" titulo={error} /> : null}
          {vista ? (
            <Alerta tono={vista.movimientos ? "warning" : "info"} titulo={vista.movimientos ? `Se borrarán ${vista.movimientos} movimientos` : "No hay movimientos para borrar"}>
              {`${vista.conciliados ? `${vista.conciliados} conciliados se conservan. ` : ""}Esta acción no se puede revertir y queda en la auditoría.`}
            </Alerta>
          ) : null}
        </div>
      </Dialog>
    </section>
  );
}
