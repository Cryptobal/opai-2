"use client";

import { useState } from "react";

import { Alerta, avisar, Badge, Button, Campo, Dialog, Empty, Input, Select, SeccionTarjeta } from "@opai/ds";

import { useCapacidad } from "@/app/_components/use-capacidad";

import { CampoPersona } from "./campo-persona";
import { pesos } from "./etiquetas";
import type { ReglaAnticipo } from "./tipos";

/** Reglas de anticipo quincenal por persona (B2): una por persona; el monto fijo se genera cada mes. */
export function ReglasAnticipo({ reglas, gestiona }: { reglas: ReglaAnticipo[]; gestiona: boolean }) {
  const { ejecutar, pendiente, error, limpiarError } = useCapacidad("erp");
  const [abierto, setAbierto] = useState(false);
  const [persona, setPersona] = useState<string | null>(null);
  const [modo, setModo] = useState("monto_fijo");
  const [valor, setValor] = useState("");
  const [dia, setDia] = useState("");

  async function guardar() {
    const r = await ejecutar("nomina.anticipos.fijar_regla", { personaId: persona, modo, valor: Number(valor), ...(dia ? { diaMes: Number(dia) } : {}) });
    if (r) {
      avisar.exito("Regla de anticipo guardada");
      setAbierto(false);
    }
  }
  const alternar = (r: ReglaAnticipo) =>
    ejecutar("nomina.anticipos.fijar_regla", { personaId: r.personaId, modo: r.modo, valor: r.valor, diaMes: r.diaMes, activa: !r.activa });

  return (
    <SeccionTarjeta titulo="Anticipo quincenal">
      <p className="t-caption mb-3">Quien tiene una regla activa recibe su anticipo el día indicado de cada mes. Se genera desde el período.</p>
      {gestiona ? <Button className="mb-3" variant="secondary" onClick={() => (limpiarError(), setAbierto(true))}>Agregar o cambiar regla</Button> : null}
      {error && !abierto ? <Alerta tono="danger" titulo={error} className="mb-3" /> : null}
      {reglas.length === 0 ? (
        <Empty titulo="Sin reglas de anticipo" descripcion="Define quién recibe anticipo quincenal y de cuánto." />
      ) : (
        <ul className="flex flex-col">
          {reglas.map((r) => (
            <li key={r.id} className="flex flex-wrap items-center gap-2 border-b border-border py-2">
              <span className="min-w-0 flex-1 truncate">{r.personaNombre}</span>
              <span className="t-mono">{r.modo === "monto_fijo" ? pesos(r.valor) : `${r.valor / 100} % del sueldo base`}</span>
              <span className="t-caption">día {r.diaMes}</span>
              {r.modo === "porcentaje_base" ? <Badge tono="warning">Espera al motor</Badge> : null}
              <Badge tono={r.activa ? "success" : "neutro"}>{r.activa ? "Activa" : "Pausada"}</Badge>
              {gestiona ? <Button variant="ghost" disabled={pendiente} onClick={() => void alternar(r)}>{r.activa ? "Pausar" : "Activar"}</Button> : null}
            </li>
          ))}
        </ul>
      )}
      <Dialog
        abierto={abierto}
        onCerrar={() => setAbierto(false)}
        titulo="Regla de anticipo quincenal"
        descripcion="Hay una sola regla por persona: si ya existe, se actualiza."
        acciones={<Button disabled={pendiente || !persona || !valor} onClick={() => void guardar()}>Guardar</Button>}
      >
        <div className="flex flex-col gap-3">
          <Campo etiqueta="Persona" htmlFor="ant-persona"><CampoPersona id="ant-persona" valor={persona} onCambiar={setPersona} /></Campo>
          <Campo etiqueta="Modo" htmlFor="ant-modo">
            <Select id="ant-modo" valor={modo} onCambiar={setModo} opciones={[{ valor: "monto_fijo", etiqueta: "Monto fijo ($)" }, { valor: "porcentaje_base", etiqueta: "Porcentaje del sueldo base (puntos base)" }]} />
          </Campo>
          <Campo etiqueta={modo === "monto_fijo" ? "Monto ($)" : "Puntos base (1 % = 100)"} htmlFor="ant-valor"><Input id="ant-valor" inputMode="numeric" value={valor} onChange={(e) => setValor(e.target.value)} /></Campo>
          <Campo etiqueta="Día del mes (vacío: el de Configuración)" htmlFor="ant-dia"><Input id="ant-dia" inputMode="numeric" value={dia} onChange={(e) => setDia(e.target.value)} /></Campo>
          {error ? <Alerta tono="danger" titulo={error} /> : null}
        </div>
      </Dialog>
    </SeccionTarjeta>
  );
}
