"use client";

import { useEffect, useState } from "react";

import { Alerta, avisar, Button, Campo, Checkbox, InputFecha, Sheet } from "@opai/ds";

import { EnlaceBoton } from "@/app/_components/maestros/enlace-boton";
import { useCapacidad } from "@/app/_components/use-capacidad";
import { pesos } from "@/lib/fechas";

import type { NegocioDetalle } from "../datos";
import { EfectosGanarLista, type EfectosGanar } from "./efectos-ganar";
import { useHojaNegocio } from "./use-hoja";

type Ganado = { aviso: string | null; efectos: EfectosGanar };

/**
 * Ganar (irreversible, R18): inicio del servicio, «Qué va a pasar» con los efectos que devuelve la
 * vista previa de `comercial.negocios.ganar` (cuenta, instalaciones, cotización y puestos) y, sin
 * cotización enviada, la casilla «Entiendo…». Tras ganar, el éxito enlaza a las instalaciones.
 */
export function HojaGanar({ n }: { n: NegocioDetalle }) {
  const hoja = useHojaNegocio("ganar");
  const { ejecutar, pendiente, error } = useCapacidad("erp");
  const previa = useCapacidad("erp");
  const [inicio, setInicio] = useState(n.inicioServicioEstimado ?? "");
  const [entiendo, setEntiendo] = useState(false);
  const [vista, setVista] = useState<Ganado | null>(null);
  const [ganado, setGanado] = useState<Ganado | null>(null);
  const sinCotizacion = !n.cotizacionEnviadaEn;
  const vistaPrevia = previa.ejecutar;
  useEffect(() => {
    // Con el inicio ya guardado, la vista previa dice si gana, con qué aviso y qué efectos (sin escribir).
    if (!n.inicioServicioEstimado) return;
    void vistaPrevia<Ganado>("comercial.negocios.ganar", { id: n.id }, true).then(setVista);
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
    setGanado(r);
  }
  const monto = n.valorMensual ?? n.montoEstimadoMensual;
  if (ganado) return <ExitoGanar abierta={hoja.abierta} cerrar={hoja.cerrar} r={ganado} />;
  return (
    <Sheet
      abierto={hoja.abierta}
      onCerrar={hoja.cerrar}
      titulo="Ganar negocio"
      descripcion={`${n.titulo}${monto != null ? ` · ${pesos(monto)} mensuales` : ""}`}
      acciones={
        <>
          <Button variant="secondary" onClick={hoja.cerrar} disabled={pendiente}>
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
        {error ? (
          <Alerta tono="danger" titulo="No se pudo ganar el negocio">
            {error}
          </Alerta>
        ) : null}
        {!error && previa.error ? <Alerta tono="warning" titulo={previa.error} /> : null}
        {pendiente ? (
          <Alerta tono="info" titulo="Aplicando los cambios en Cuentas, Operaciones y CPQ…" />
        ) : null}
        {sinCotizacion ? (
          <Alerta tono="warning" titulo={vista?.aviso ?? "Ganarás sin cotización"}>
            Se puede ganar sin cotización enviada; queda en el historial.
          </Alerta>
        ) : null}
        <Campo
          etiqueta="Inicio del servicio"
          htmlFor="ganar-inicio"
          ayuda="Desde cuándo se presta el servicio."
        >
          <InputFecha id="ganar-inicio" valor={inicio} onCambiar={setInicio} />
        </Campo>
        {n.inicioServicioEstimado && !previa.error ? (
          <EfectosGanarLista efectos={vista?.efectos ?? null} inicio={inicio || null} />
        ) : null}
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

/** Éxito: qué quedó y enlaces a las instalaciones activadas (GanarNegocio · éxito). */
function ExitoGanar(p: { abierta: boolean; cerrar: () => void; r: Ganado }) {
  const { cuenta, instalaciones } = p.r.efectos;
  const partes = [
    cuenta ? `${cuenta.nombre} ya es cliente activo.` : null,
    instalaciones.length
      ? `Operaciones recibe ${instalaciones.length === 1 ? "la instalación" : `las ${instalaciones.length} instalaciones`} activas.`
      : null,
  ].filter(Boolean);
  return (
    <Sheet
      abierto={p.abierta}
      onCerrar={p.cerrar}
      titulo="Negocio ganado"
      acciones={<Button onClick={p.cerrar}>Cerrar</Button>}
    >
      <div className="flex flex-col gap-4">
        <Alerta tono="success" titulo="Negocio ganado">
          {partes.length ? partes.join(" ") : "La cuenta y las instalaciones ya estaban activas."}
        </Alerta>
        {instalaciones.length ? (
          <div className="flex flex-col gap-2">
            {instalaciones.map((i) => (
              <EnlaceBoton key={i.id} href={`/instalaciones/${i.id}`} variante="secondary">
                Ver instalación {i.nombre}
              </EnlaceBoton>
            ))}
          </div>
        ) : null}
        {p.r.efectos.puestosPorOfrecer && p.r.efectos.cotizacion ? (
          <div className="flex flex-col gap-2">
            <EnlaceBoton href={`/cotizaciones/${p.r.efectos.cotizacion.id}`}>Crear puestos</EnlaceBoton>
            <p className="t-caption">
              Se ofrece{p.r.efectos.puestosPorOfrecer === 1 ? " 1 puesto" : `n ${p.r.efectos.puestosPorOfrecer} puestos`} de la cotización; RRHH confirma antes de
              crearlos.
            </p>
          </div>
        ) : null}
      </div>
    </Sheet>
  );
}
