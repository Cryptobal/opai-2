"use client";

import { useEffect, useState } from "react";

import { Alerta, avisar, Button, Campo, Checkbox, InputFecha, Sheet } from "@opai/ds";

import { useCapacidad } from "@/app/_components/use-capacidad";
import { pesos } from "@/lib/fechas";

import type { NegocioDetalle } from "../datos";
import { useHojaNegocio } from "./use-hoja";

type Ganado = { aviso: string | null };

/**
 * Ganar (irreversible): inicio del servicio y, sin cotización enviada, la casilla «Entiendo que gano
 * este negocio sin cotización» con el aviso que devuelve la vista previa de `comercial.negocios.ganar`.
 */
export function HojaGanar({ n }: { n: NegocioDetalle }) {
  const hoja = useHojaNegocio("ganar");
  const { ejecutar, pendiente, error } = useCapacidad("erp");
  const previa = useCapacidad("erp");
  const [inicio, setInicio] = useState(n.inicioServicioEstimado ?? "");
  const [entiendo, setEntiendo] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const sinCotizacion = !n.cotizacionEnviadaEn;
  const vistaPrevia = previa.ejecutar;
  useEffect(() => {
    // Con el inicio ya guardado, la vista previa dice si gana y con qué aviso (sin escribir).
    if (!n.inicioServicioEstimado) return;
    void vistaPrevia<Ganado>("comercial.negocios.ganar", { id: n.id }, true).then((r) =>
      setAviso(r?.aviso ?? null),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps -- una vez por negocio
  }, [n.id, n.inicioServicioEstimado]);
  async function ganar() {
    if (inicio !== (n.inicioServicioEstimado ?? "")) {
      const ok = await ejecutar("comercial.negocios.update", {
        id: n.id,
        inicioServicioEstimado: inicio,
      });
      if (!ok) return;
    }
    const r = await ejecutar<Ganado>("comercial.negocios.ganar", { id: n.id });
    if (!r) return;
    avisar.exito(r.aviso ? `Negocio ganado · ${r.aviso}` : "Negocio ganado");
    hoja.cerrar();
  }
  const monto = n.valorMensual ?? n.montoEstimadoMensual;
  return (
    <Sheet
      abierto={hoja.abierta}
      onCerrar={hoja.cerrar}
      titulo="Ganar negocio"
      descripcion={`${n.titulo}${monto != null ? ` · ${pesos(monto)} mensuales` : ""}`}
      acciones={
        <>
          <Button variant="secondary" onClick={hoja.cerrar}>
            Cancelar
          </Button>
          <Button
            disabled={pendiente || !inicio || (sinCotizacion && !entiendo)}
            onClick={() => void ganar()}
          >
            {pendiente ? "Ganando…" : "Ganar negocio"}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {error ? <Alerta tono="danger" titulo={error} /> : null}
        {!error && previa.error ? <Alerta tono="warning" titulo={previa.error} /> : null}
        {sinCotizacion ? (
          <Alerta tono="warning" titulo={aviso ?? "Ganarás sin cotización"}>
            Mientras CPQ no esté disponible se puede ganar sin cotización; queda en el historial.
          </Alerta>
        ) : null}
        <Campo
          etiqueta="Inicio del servicio"
          htmlFor="ganar-inicio"
          ayuda="Desde cuándo se presta el servicio."
        >
          <InputFecha id="ganar-inicio" valor={inicio} onCambiar={setInicio} />
        </Campo>
        {sinCotizacion ? (
          <Checkbox
            marcado={entiendo}
            onCambiar={setEntiendo}
            etiqueta="Entiendo que gano este negocio sin cotización"
            descripcion="Queda registrado en el historial con tu nombre."
          />
        ) : null}
        <p className="t-caption">Ganar no se deshace: el negocio queda cerrado como ganado.</p>
      </div>
    </Sheet>
  );
}
