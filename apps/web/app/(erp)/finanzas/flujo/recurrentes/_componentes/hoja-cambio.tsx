"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Alerta, avisar, Button, Campo, Input, InputFecha, Select, Sheet } from "@opai/ds";
import { formatearFecha } from "@opai/domain";

import { useHojaUrl, useParametros } from "@/app/_components/maestros/use-url";
import { useCapacidad } from "@/app/_components/use-capacidad";
import { hoyIso } from "@/lib/fechas";

import { cuando, type FilaEgreso, FRECUENCIAS, type Recurrente } from "./tipos";

type Cambio = {
  anterior: Recurrente | null;
  nuevo: Recurrente;
  cuotas: { antes: string[]; despues: string[] };
};
const lista = (fechas: string[]) =>
  fechas.length
    ? fechas
        .slice(0, 4)
        .map((f) => formatearFecha(f))
        .join(", ")
    : "ninguna";

/** Cambiar la fila, la frecuencia o el día de pago desde una fecha (CAR-413): las cuotas anteriores no cambian. */
export function HojaCambio(p: { items: Recurrente[]; filas: FilaEgreso[] }) {
  const id = useParametros().valor("cambiar");
  const r = p.items.find((x) => x.id === id);
  const hoja = useHojaUrl("cambiar");
  const router = useRouter();
  const { ejecutar, pendiente, error, limpiarError } = useCapacidad("erp");
  const [desde, setDesde] = useState(hoyIso());
  const [fila, setFila] = useState(r?.filaId ?? "");
  const [frecuencia, setFrecuencia] = useState<Recurrente["frecuencia"]>(
    r?.frecuencia ?? "mensual",
  );
  const [dia, setDia] = useState(r ? String(r.diaDelMes ?? Number(r.inicio.slice(8, 10))) : "1");
  const [vista, setVista] = useState<Cambio | null>(null);
  if (!r) return null;

  const diaN = Number(dia);
  const diaOk = frecuencia !== "mensual" || diaN === -1 || (diaN >= 1 && diaN <= 31);
  const listo = !!desde && desde >= hoyIso() && diaOk && !!fila;
  const entrada = {
    id: r.id,
    desde,
    filaId: fila,
    frecuencia,
    diaDelMes: frecuencia === "mensual" ? diaN : null,
  };
  const cambiar =
    <T,>(f: (v: T) => void) =>
    (v: T) => {
      f(v);
      setVista(null);
      limpiarError();
    };

  async function revisar() {
    setVista(
      await ejecutar<Cambio>("finanzas.recurrentes.cambiar_desde", entrada, true, "ninguna"),
    );
  }
  async function confirmar() {
    const res = await ejecutar<Cambio>("finanzas.recurrentes.cambiar_desde", entrada);
    if (!res) return;
    avisar.exito(`Cambio guardado: rige desde el ${formatearFecha(desde)}`);
    hoja.cerrar();
    router.refresh();
  }

  return (
    <Sheet
      abierto={hoja.abierta}
      onCerrar={hoja.cerrar}
      titulo="Cambiar desde una fecha"
      descripcion={`${r.concepto} · hoy: ${cuando(r)}`}
      acciones={
        <>
          <Button variant="secondary" onClick={hoja.cerrar}>
            Cancelar
          </Button>
          {vista ? (
            <Button disabled={pendiente} onClick={() => void confirmar()}>
              {pendiente ? "Guardando…" : "Confirmar"}
            </Button>
          ) : (
            <Button disabled={pendiente || !listo} onClick={() => void revisar()}>
              Revisar cambio
            </Button>
          )}
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <p className="text-sm text-fg-muted">
          Las cuotas anteriores a la fecha, y las ya pagadas con el banco, no cambian.
        </p>
        {error ? <Alerta tono="danger" titulo={error} /> : null}
        <Campo
          etiqueta="Rige desde"
          htmlFor="rc-desde"
          {...(desde && desde < hoyIso() ? { error: "Desde hoy o una fecha futura." } : {})}
        >
          <InputFecha id="rc-desde" valor={desde} onCambiar={cambiar(setDesde)} />
        </Campo>
        <Campo etiqueta="Fila del flujo" htmlFor="rc-cambio-fila">
          <Select
            id="rc-cambio-fila"
            valor={fila}
            onCambiar={cambiar(setFila)}
            opciones={p.filas.map((f) => ({ valor: f.id, etiqueta: f.etiqueta }))}
          />
        </Campo>
        <Campo etiqueta="Frecuencia" htmlFor="rc-cambio-frecuencia">
          <Select
            id="rc-cambio-frecuencia"
            valor={frecuencia}
            onCambiar={cambiar((v: string) => setFrecuencia(v as Recurrente["frecuencia"]))}
            opciones={FRECUENCIAS}
          />
        </Campo>
        {frecuencia === "mensual" ? (
          <Campo
            etiqueta="Día de pago"
            htmlFor="rc-cambio-dia"
            ayuda="1 a 31 (se ajusta en meses cortos) o -1 para el último día."
            {...(diaOk ? {} : { error: "Del 1 al 31, o -1." })}
          >
            <Input
              id="rc-cambio-dia"
              inputMode="numeric"
              value={dia}
              onChange={(e) => cambiar(setDia)(e.target.value.replace(/[^\d-]/g, ""))}
            />
          </Campo>
        ) : null}
        {vista ? (
          <Alerta tono="info" titulo="Revisa el cambio">
            {vista.anterior
              ? `El gasto actual termina el ${formatearFecha(vista.anterior.fin ?? "")} y desde el ${formatearFecha(desde)} rige ${cuando(vista.nuevo).toLowerCase()}.`
              : `Aún no empieza: se cambia el mismo gasto, que parte el ${formatearFecha(desde)}.`}{" "}
            Próximas cuotas antes: {lista(vista.cuotas.antes)}. Después:{" "}
            {lista(vista.cuotas.despues)}.
          </Alerta>
        ) : null}
      </div>
    </Sheet>
  );
}
