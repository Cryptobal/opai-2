"use client";

import { useState } from "react";

import { Alerta, avisar, Badge, Button, Campo, Dialog, Empty, InputFecha, SeccionTarjeta, Switch } from "@opai/ds";

import { useCapacidad } from "@/app/_components/use-capacidad";
import { fechaCorta } from "@/lib/formato";

import { ESTADO_OBLIGACION, ETIQUETA_OBLIGACION, MES_LARGO } from "./etiquetas";
import type { Obligacion } from "./tipos";

/**
 * Calendario de obligaciones (diseño 10): LRE, Previred y retención F29 por mes; DJ y certificados al
 * año. La fecha límite solo se muestra verificada; si no, «Plazo por verificar». OPAI no envía nada:
 * el responsable sube el archivo y aquí queda su avance.
 */
export function ListaObligaciones({ obligaciones, anio, gestiona }: { obligaciones: Obligacion[]; anio: number; gestiona: boolean }) {
  const { ejecutar, pendiente, error, limpiarError } = useCapacidad("erp");
  const [editar, setEditar] = useState<Obligacion | null>(null);
  const [limite, setLimite] = useState("");
  const [verificado, setVerificado] = useState(false);

  async function generar() {
    const r = await ejecutar<{ creadas: number }>("nomina.obligaciones.generar_calendario", { anio });
    if (r) avisar.exito(r.creadas === 0 ? "El calendario ya estaba completo" : `${r.creadas} obligaciones creadas`);
  }
  async function avanzar(o: Obligacion, estado: string) {
    if (await ejecutar("nomina.obligaciones.actualizar", { id: o.id, estado })) avisar.exito("Obligación actualizada");
  }
  async function guardarPlazo() {
    if (!editar) return;
    const r = await ejecutar("nomina.obligaciones.actualizar", { id: editar.id, fechaLimite: limite || null, plazoVerificado: limite ? verificado : false });
    if (r) setEditar(null);
  }
  const abrir = (o: Obligacion) => {
    limpiarError();
    setLimite(o.fechaLimite ?? "");
    setVerificado(o.plazoVerificado);
    setEditar(o);
  };
  const grupos = [...new Set(obligaciones.map((o) => o.mes ?? 0))].sort((a, b) => b - a);
  if (obligaciones.length === 0)
    return (
      <Empty
        titulo={`Sin calendario para ${anio}`}
        descripcion="Genera las obligaciones mensuales y anuales del año."
        {...(gestiona ? { accion: <Button disabled={pendiente} onClick={() => void generar()}>Generar calendario {anio}</Button> } : {})}
      />
    );
  return (
    <div className="flex flex-col gap-4">
      <Alerta tono="info" titulo="Formatos y plazos por verificar">
        Previred, LRE, SII y banco: el formato oficial y los plazos se confirman con las fuentes y el contador antes de generar archivos. OPAI genera y valida; sube el representante.
      </Alerta>
      {gestiona ? <div><Button variant="secondary" disabled={pendiente} onClick={() => void generar()}>Completar calendario {anio}</Button></div> : null}
      {error && !editar ? <Alerta tono="danger" titulo={error} /> : null}
      {grupos.map((m) => (
        <SeccionTarjeta key={m} titulo={m === 0 ? `Anuales · año tributario ${anio + 1}` : MES_LARGO[m - 1] ?? ""}>
          <ul className="flex flex-col">
            {obligaciones.filter((o) => (o.mes ?? 0) === m).map((o) => {
              const est = ESTADO_OBLIGACION[o.estado];
              return (
                <li key={o.id} className="flex flex-wrap items-center gap-2 border-b border-border py-2">
                  <span className="min-w-0 flex-1">{ETIQUETA_OBLIGACION[o.tipo]}</span>
                  <Badge tono="neutro">Formato por verificar</Badge>
                  <span className="t-caption">{o.plazo ? `Plazo ${fechaCorta(o.plazo)}` : "Plazo por verificar"}</span>
                  <Badge tono={est.tono}>{est.etiqueta}</Badge>
                  {gestiona && o.estado !== "pagado" ? (
                    <>
                      <Button variant="ghost" disabled={pendiente} onClick={() => abrir(o)}>Plazo</Button>
                      {o.estado !== "cargado" ? <Button variant="ghost" disabled={pendiente} onClick={() => void avanzar(o, "cargado")}>Marcar cargado</Button> : null}
                      <Button variant="ghost" disabled={pendiente} onClick={() => void avanzar(o, "pagado")}>Marcar pagado</Button>
                    </>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </SeccionTarjeta>
      ))}
      <Dialog
        abierto={editar !== null}
        onCerrar={() => setEditar(null)}
        titulo="Plazo de la obligación"
        descripcion="Marca el plazo como verificado solo cuando lo hayas confirmado con la fuente oficial."
        acciones={<Button disabled={pendiente} onClick={() => void guardarPlazo()}>Guardar</Button>}
      >
        <div className="flex flex-col gap-3">
          <Campo etiqueta="Fecha límite" htmlFor="obl-limite"><InputFecha id="obl-limite" valor={limite} onCambiar={setLimite} /></Campo>
          <Switch etiqueta="Plazo verificado" activo={verificado} disabled={!limite} onCambiar={setVerificado} />
          {error ? <Alerta tono="danger" titulo={error} /> : null}
        </div>
      </Dialog>
    </div>
  );
}
