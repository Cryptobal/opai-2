"use client";

import { useState } from "react";

import { Alerta, avisar, Button, Campo, Input, Sheet, Textarea } from "@opai/ds";

import { useCapacidad } from "@/app/_components/use-capacidad";

import type { PasoSeguimiento } from "./datos";

type Modo = "hecho" | "posponer" | "correo" | null;

/** Acciones de un paso pendiente: hecho con resultado, enviar el correo, posponer u omitir. */
export function BotonesPaso({ paso }: { paso: PasoSeguimiento }) {
  const [modo, setModo] = useState<Modo>(null);
  const [resultado, setResultado] = useState("");
  const [fecha, setFecha] = useState("");
  const [asunto, setAsunto] = useState(paso.asunto ?? "");
  const [cuerpo, setCuerpo] = useState(paso.cuerpo ?? "");
  const { ejecutar, pendiente, error } = useCapacidad("erp");
  if (!["programado", "por_hacer", "por_preparar", "fallido"].includes(paso.estado)) return null;
  const cerrar = () => setModo(null);
  async function registrar(accion: "hecho" | "omitir" | "posponer") {
    const r = await ejecutar("comercial.seguimientos.registrar_paso", {
      pasoId: paso.id, accion,
      ...(resultado.trim() ? { resultado: resultado.trim() } : {}),
      ...(accion === "posponer" ? { nuevaFecha: new Date(`${fecha}T09:00:00`).toISOString() } : {}),
    });
    if (!r) return;
    avisar.exito(accion === "hecho" ? "Paso registrado" : accion === "omitir" ? "Paso omitido" : "Paso pospuesto");
    cerrar();
  }
  async function enviar() {
    const r = await ejecutar("comercial.seguimientos.enviar_paso", { pasoId: paso.id, asunto: asunto.trim(), cuerpo: cuerpo.trim() });
    if (!r) return;
    avisar.exito("Correo enviado");
    cerrar();
  }
  const pie = (texto: string, accion: () => void, ok: boolean) => (
    <>
      <Button variant="secondary" onClick={cerrar}>Cancelar</Button>
      <Button disabled={pendiente || !ok} onClick={accion}>{pendiente ? "Guardando…" : texto}</Button>
    </>
  );
  return (
    <>
      <div className="flex flex-wrap gap-2">
        {paso.canal === "correo" ? <Button onClick={() => setModo("correo")}>Enviar correo</Button> : null}
        <Button variant={paso.canal === "correo" ? "secondary" : "primary"} onClick={() => setModo("hecho")}>Hecho</Button>
        <Button variant="secondary" onClick={() => setModo("posponer")}>Posponer</Button>
        <Button variant="ghost" disabled={pendiente} onClick={() => void registrar("omitir")}>Omitir</Button>
      </div>
      <Sheet abierto={modo === "hecho"} onCerrar={cerrar} titulo={`Paso ${paso.orden} · ${paso.titulo}`} descripcion="Queda anotado en la actividad del negocio." acciones={pie("Registrar", () => void registrar("hecho"), true)}>
        <div className="flex flex-col gap-4">
          {error ? <Alerta tono="danger" titulo={error} /> : null}
          <Campo etiqueta="Resultado (opcional)" htmlFor={`seg-res-${paso.id}`}>
            <Textarea id={`seg-res-${paso.id}`} rows={3} maxLength={1000} value={resultado} onChange={(e) => setResultado(e.target.value)} />
          </Campo>
        </div>
      </Sheet>
      <Sheet abierto={modo === "posponer"} onCerrar={cerrar} titulo="Posponer paso" descripcion="Elige el día; se hará a las 09:00." acciones={pie("Posponer", () => void registrar("posponer"), Boolean(fecha))}>
        <div className="flex flex-col gap-4">
          {error ? <Alerta tono="danger" titulo={error} /> : null}
          <Campo etiqueta="Nueva fecha" htmlFor={`seg-fecha-${paso.id}`}>
            <Input id={`seg-fecha-${paso.id}`} type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
          </Campo>
        </div>
      </Sheet>
      <Sheet abierto={modo === "correo"} onCerrar={cerrar} titulo="Enviar correo al cliente" descripcion="Las respuestas llegan a este seguimiento y a tu correo." acciones={pie("Enviar", () => void enviar(), asunto.trim().length >= 3 && cuerpo.trim().length >= 3)}>
        <div className="flex flex-col gap-4">
          {error ? <Alerta tono="danger" titulo={error} /> : null}
          <Campo etiqueta="Asunto" htmlFor={`seg-asu-${paso.id}`}>
            <Input id={`seg-asu-${paso.id}`} maxLength={200} value={asunto} onChange={(e) => setAsunto(e.target.value)} />
          </Campo>
          <Campo etiqueta="Mensaje" htmlFor={`seg-cue-${paso.id}`}>
            <Textarea id={`seg-cue-${paso.id}`} rows={6} maxLength={5000} value={cuerpo} onChange={(e) => setCuerpo(e.target.value)} />
          </Campo>
        </div>
      </Sheet>
    </>
  );
}
