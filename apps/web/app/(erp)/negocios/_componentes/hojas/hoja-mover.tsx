"use client";

import { usePathname } from "next/navigation";
import { useState } from "react";

import { Alerta, avisar, Button, Campo, InputFecha, Sheet } from "@opai/ds";

import { EnlaceBoton } from "@/app/_components/maestros/enlace-boton";
import { InputPesos } from "@/app/_components/maestros/input-pesos";
import { useCapacidad } from "@/app/_components/use-capacidad";

import type { NegocioDetalle } from "../datos";
import { camposFaltantes } from "./requisitos";
import type { ConfigComercial } from "./tipos";
import { useHojaNegocio } from "./use-hoja";

/**
 * Mover a una etapa abierta que exige datos (R9) o una instalación (R10): pide lo que falta, lo
 * guarda con `comercial.negocios.update` y mueve con `comercial.negocios.mover`.
 */
export function HojaMover({ n, config }: { n: NegocioDetalle; config: ConfigComercial }) {
  const hoja = useHojaNegocio("mover");
  const ruta = usePathname();
  const { ejecutar, pendiente, error } = useCapacidad("erp");
  const etapas = config.embudo.etapas;
  const destino = etapas.find((e) => e.id === hoja.valor && e.tipo === "abierta");
  const actual = etapas.find((e) => e.id === n.etapaId);
  const faltan = destino ? camposFaltantes(destino.exige, n) : [];
  const sinInstalacion =
    !!destino && !!actual && actual.orden === 0 && destino.orden > 0 && !n.instalaciones.length;
  const [monto, setMonto] = useState("");
  const [cierre, setCierre] = useState("");
  const [inicio, setInicio] = useState("");
  const completo =
    (!faltan.includes("monto") || !!monto) &&
    (!faltan.includes("fecha_cierre") || !!cierre) &&
    (!faltan.includes("inicio_servicio") || !!inicio);
  async function mover() {
    if (!destino) return;
    if (faltan.length) {
      const ok = await ejecutar("comercial.negocios.update", {
        id: n.id,
        ...(faltan.includes("monto") ? { montoEstimadoMensual: Number(monto) } : {}),
        ...(faltan.includes("fecha_cierre") ? { cierreEstimado: cierre } : {}),
        ...(faltan.includes("inicio_servicio") ? { inicioServicioEstimado: inicio } : {}),
      });
      if (!ok) return;
    }
    if (!(await ejecutar("comercial.negocios.mover", { id: n.id, etapaId: destino.id }))) return;
    avisar.exito(`Movido a ${destino.nombre}`);
    hoja.cerrar();
  }
  const vincular = `${ruta.startsWith("/negocios/") ? ruta : "/negocios"}?negocio=${n.id}&instalaciones=1`;
  return (
    <Sheet
      abierto={hoja.abierta}
      onCerrar={hoja.cerrar}
      titulo={destino ? `Mover a ${destino.nombre}` : "Mover negocio"}
      descripcion={`${n.titulo} · ${n.cuentaNombre}`}
      acciones={
        <>
          <Button variant="secondary" onClick={hoja.cerrar}>
            Cancelar
          </Button>
          <Button
            disabled={pendiente || !destino || !completo || sinInstalacion}
            onClick={() => void mover()}
          >
            {pendiente ? "Moviendo…" : "Mover"}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {!destino ? (
          <Alerta tono="danger" titulo="Esa etapa no es una etapa abierta del embudo." />
        ) : null}
        {error ? <Alerta tono="danger" titulo={error} /> : null}
        {sinInstalacion ? (
          <Alerta
            tono="warning"
            titulo="Vincula una instalación antes de avanzar"
            accion={
              <EnlaceBoton href={vincular} variante="secondary">
                Vincular
              </EnlaceBoton>
            }
          >
            Para salir de la primera etapa el negocio necesita al menos una instalación.
          </Alerta>
        ) : null}
        {faltan.length ? (
          <p className="t-body-sm text-fg-muted">Esta etapa pide estos datos antes de entrar.</p>
        ) : null}
        {faltan.includes("monto") ? (
          <Campo etiqueta="Valor mensual estimado" htmlFor="mov-monto">
            <InputPesos id="mov-monto" valor={monto} onCambiar={setMonto} />
          </Campo>
        ) : null}
        {faltan.includes("fecha_cierre") ? (
          <Campo etiqueta="Cierre estimado" htmlFor="mov-cierre">
            <InputFecha id="mov-cierre" valor={cierre} onCambiar={setCierre} />
          </Campo>
        ) : null}
        {faltan.includes("inicio_servicio") ? (
          <Campo etiqueta="Inicio del servicio" htmlFor="mov-inicio">
            <InputFecha id="mov-inicio" valor={inicio} onCambiar={setInicio} />
          </Campo>
        ) : null}
      </div>
    </Sheet>
  );
}
