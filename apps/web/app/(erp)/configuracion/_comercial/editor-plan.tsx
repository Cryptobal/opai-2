"use client";

import { useState } from "react";

import { Alerta, avisar, Button, Campo, Input, Select, Sheet, Switch, Textarea } from "@opai/ds";

import { useCapacidad } from "@/app/_components/use-capacidad";

import type { ConfigPlan, EtapaOpcion, PasoConfig } from "./planes-seguimiento";

type Props = { id?: string; plan: { nombre: string; porDefecto: boolean; activo: boolean; config: ConfigPlan }; etapas: EtapaOpcion[]; onCerrar: () => void };
const NINGUNA = "ninguna";
const CANALES = [{ valor: "correo", etiqueta: "Correo" }, { valor: "whatsapp", etiqueta: "WhatsApp" }, { valor: "llamada", etiqueta: "Llamada" }, { valor: "interno", etiqueta: "Interno" }];
const EJECUTORES = [{ valor: "persona", etiqueta: "Una persona" }, { valor: "opai_automatico", etiqueta: "Automático" }, { valor: "agente", etiqueta: "Agente" }];

/** Fija (o quita) una de las etapas del plan; `ninguna` la borra de la configuración. */
function conEtapa(c: ConfigPlan, campo: "etapaAlResponder" | "noCerrarDesdeEtapa", valor: string): ConfigPlan {
  const { [campo]: _quitada, ...resto } = c;
  return valor === NINGUNA ? resto : { ...resto, [campo]: valor };
}

/** Edita un plan: nombre, conteo de días y cada paso. Guardar publica una versión nueva si cambió. */
export function EditorPlan({ id, plan, etapas, onCerrar }: Props) {
  const conNinguna = [{ valor: NINGUNA, etiqueta: "No cambiar la etapa" }, ...etapas];
  const [nombre, setNombre] = useState(plan.nombre);
  const [porDefecto, setPorDefecto] = useState(plan.porDefecto);
  const [activo, setActivo] = useState(plan.activo);
  const [c, setC] = useState<ConfigPlan>(plan.config);
  const { ejecutar, pendiente, error } = useCapacidad("erp");
  const paso = (i: number, cambio: Partial<PasoConfig>) => setC({ ...c, pasos: c.pasos.map((p, j) => (j === i ? { ...p, ...cambio } : p)) });
  async function guardar() {
    const r = await ejecutar("comercial.seguimiento_planes.guardar", { ...(id ? { id } : {}), nombre: nombre.trim(), disparador: "cotizacion_enviada", porDefecto, activo, config: c });
    if (!r) return;
    avisar.exito("Plan guardado");
    onCerrar();
  }
  return (
    <Sheet
      abierto
      onCerrar={onCerrar}
      titulo={id ? "Editar plan" : "Nuevo plan"}
      descripcion="Los seguimientos en curso conservan la versión con la que empezaron."
      acciones={
        <>
          <Button variant="secondary" onClick={onCerrar}>Cancelar</Button>
          <Button disabled={pendiente || nombre.trim().length < 3 || !c.pasos.length} onClick={() => void guardar()}>{pendiente ? "Guardando…" : "Guardar"}</Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {error ? <Alerta tono="danger" titulo={error} /> : null}
        <Campo etiqueta="Nombre" htmlFor="plan-nombre"><Input id="plan-nombre" maxLength={60} value={nombre} onChange={(e) => setNombre(e.target.value)} /></Campo>
        <Campo etiqueta="Cómo se cuentan los días" htmlFor="plan-conteo">
          <Select id="plan-conteo" valor={c.conteo} onCambiar={(v) => setC({ ...c, conteo: v === "corridos" ? "corridos" : "habiles" })} opciones={[{ valor: "habiles", etiqueta: "Días hábiles (sin fines de semana ni feriados)" }, { valor: "corridos", etiqueta: "Días corridos" }]} />
        </Campo>
        <Campo etiqueta="Hora de los pasos" htmlFor="plan-hora"><Input id="plan-hora" type="time" value={c.hora} onChange={(e) => setC({ ...c, hora: e.target.value })} /></Campo>
        <Campo etiqueta="Si el cliente responde" htmlFor="plan-resp">
          <Select id="plan-resp" valor={c.alResponder} onCambiar={(v) => setC({ ...c, alResponder: v === "detener" ? "detener" : "pausar" })} opciones={[{ valor: "pausar", etiqueta: "Pausar (se puede reanudar)" }, { valor: "detener", etiqueta: "Detener el seguimiento" }]} />
        </Campo>
        {etapas.length ? (
          <Campo etiqueta="Al responder, el negocio pasa a" htmlFor="plan-etapa-resp" ayuda="Nunca baja un negocio que ya está en esa etapa o más adelante, ni lo mueve si no cumple los requisitos de entrada.">
            <Select id="plan-etapa-resp" valor={c.etapaAlResponder ?? NINGUNA} onCambiar={(v) => setC(conEtapa(c, "etapaAlResponder", v))} opciones={conNinguna} />
          </Campo>
        ) : null}
        <Campo etiqueta="Si termina sin respuesta" htmlFor="plan-terminar" ayuda="«Cerrar solo» pierde el negocio con el motivo «Sin respuesta», lo deja anotado y avisa; se puede reabrir.">
          <Select id="plan-terminar" valor={c.alTerminar} onCambiar={(v) => setC({ ...c, alTerminar: v === "aplicar_cierre_propuesto" || v === "solo_avisar" ? v : "proponer_cierre" })} opciones={[{ valor: "proponer_cierre", etiqueta: "Proponer el cierre a una persona" }, { valor: "aplicar_cierre_propuesto", etiqueta: "Cerrar solo (perder el negocio)" }, { valor: "solo_avisar", etiqueta: "Solo avisar" }]} />
        </Campo>
        {c.alTerminar === "aplicar_cierre_propuesto" && etapas.length ? (
          <Campo etiqueta="No cerrar solo desde la etapa" htmlFor="plan-no-cerrar" ayuda="Desde esa etapa en adelante, el plan nunca cierra el negocio.">
            <Select id="plan-no-cerrar" valor={c.noCerrarDesdeEtapa ?? NINGUNA} onCambiar={(v) => setC(conEtapa(c, "noCerrarDesdeEtapa", v))} opciones={[{ valor: NINGUNA, etiqueta: "Sin límite" }, ...etapas]} />
          </Campo>
        ) : null}
        <Switch activo={porDefecto} onCambiar={setPorDefecto} etiqueta="Plan por defecto" descripcion="Es el que se inicia al enviar una cotización." />
        <Switch activo={activo} onCambiar={setActivo} etiqueta="Plan activo" />
        <h3 className="t-heading">Pasos</h3>
        {c.pasos.map((p, i) => (
          <div key={i} className="flex flex-col gap-3 rounded-md border border-border p-3">
            <Campo etiqueta={`Paso ${i + 1}`} htmlFor={`paso-t-${i}`}><Input id={`paso-t-${i}`} maxLength={60} value={p.titulo} onChange={(e) => paso(i, { titulo: e.target.value })} /></Campo>
            <Campo etiqueta="Días" htmlFor={`paso-d-${i}`}><Input id={`paso-d-${i}`} type="number" min={0} max={365} value={p.dias} onChange={(e) => paso(i, { dias: Math.max(0, Number(e.target.value) || 0) })} /></Campo>
            <Campo etiqueta="Canal" htmlFor={`paso-c-${i}`}><Select id={`paso-c-${i}`} valor={p.canal} onCambiar={(v) => paso(i, { canal: v as PasoConfig["canal"] })} opciones={CANALES} /></Campo>
            <Campo etiqueta="Quién lo ejecuta" htmlFor={`paso-e-${i}`}><Select id={`paso-e-${i}`} valor={p.ejecutor} onCambiar={(v) => paso(i, { ejecutor: v as PasoConfig["ejecutor"] })} opciones={EJECUTORES} /></Campo>
            <Campo etiqueta="Texto o guion" htmlFor={`paso-g-${i}`}><Textarea id={`paso-g-${i}`} rows={3} maxLength={2000} value={p.guion ?? ""} onChange={(e) => paso(i, { guion: e.target.value })} /></Campo>
            <Button variant="ghost" onClick={() => setC({ ...c, pasos: c.pasos.filter((_, j) => j !== i) })}>Quitar paso</Button>
          </div>
        ))}
        <Button variant="secondary" disabled={c.pasos.length >= 20} onClick={() => setC({ ...c, pasos: [...c.pasos, { dias: 3, canal: "correo", ejecutor: "persona", titulo: `Seguimiento ${c.pasos.length + 1}` }] })}>Agregar paso</Button>
      </div>
    </Sheet>
  );
}
