"use client";

import { useState } from "react";

import { Alerta, avisar, Badge, Button, Campo, Dialog, Empty, Input, SeccionTarjeta } from "@opai/ds";

import { useCapacidad } from "@/app/_components/use-capacidad";

import { CampoPersona } from "./campo-persona";
import { DialogoMotivo } from "./dialogo-motivo";
import { MES_CORTO, pesos } from "./etiquetas";
import type { Prestamo } from "./tipos";

const TONO = { activo: "info", pagado: "success", cancelado: "neutro" } as const;

/** Préstamos con plan de cuotas (B3): crear, ver el plan y cancelar. Sin interés, cuotas en pesos enteros. */
export function Prestamos({ prestamos, gestiona, hoy }: { prestamos: Prestamo[]; gestiona: boolean; hoy: { anio: number; mes: number } }) {
  const { ejecutar, pendiente, error, limpiarError } = useCapacidad("erp");
  const [nuevo, setNuevo] = useState(false);
  const [aCancelar, setACancelar] = useState<Prestamo | null>(null);
  const [persona, setPersona] = useState<string | null>(null);
  const [monto, setMonto] = useState("");
  const [cuotas, setCuotas] = useState("3");
  const [mes, setMes] = useState(String(hoy.mes));
  const [anio, setAnio] = useState(String(hoy.anio));

  async function crear() {
    const r = await ejecutar("nomina.prestamos.crear", {
      personaId: persona, montoTotal: Number(monto), cuotas: Number(cuotas), primeraCuotaAnio: Number(anio), primeraCuotaMes: Number(mes),
    });
    if (r) {
      avisar.exito("Préstamo creado con su plan de cuotas");
      setNuevo(false);
    }
  }
  async function cancelar(motivo: string) {
    if (aCancelar && (await ejecutar("nomina.prestamos.cancelar", { id: aCancelar.id, motivo }))) {
      avisar.exito("Préstamo cancelado");
      setACancelar(null);
    }
  }
  return (
    <SeccionTarjeta titulo="Préstamos">
      <p className="t-caption mb-3">Cada cuota se descuenta en su mes. Se aplican al período con «Aplicar cuotas de préstamos» y quedan descontadas al cerrarlo.</p>
      {gestiona ? <Button className="mb-3" variant="secondary" onClick={() => (limpiarError(), setNuevo(true))}>Nuevo préstamo</Button> : null}
      {error && !nuevo && !aCancelar ? <Alerta tono="danger" titulo={error} className="mb-3" /> : null}
      {prestamos.length === 0 ? <Empty titulo="Sin préstamos" descripcion="Crea un préstamo para armar su plan de cuotas." /> : (
        <ul className="flex flex-col gap-3">
          {prestamos.map((p) => (
            <li key={p.id} className="rounded-md border border-border p-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="min-w-0 flex-1 truncate font-medium">{p.personaNombre}</span>
                <span className="t-mono">{pesos(p.montoTotal)} en {p.cuotas} cuotas</span>
                <Badge tono={TONO[p.estado]}>{p.estado === "activo" ? "Activo" : p.estado === "pagado" ? "Pagado" : "Cancelado"}</Badge>
                {gestiona && p.estado === "activo" ? <Button variant="ghost" disabled={pendiente} onClick={() => (limpiarError(), setACancelar(p))}>Cancelar</Button> : null}
              </div>
              <p className="t-caption mt-1">Saldo por descontar: {pesos(p.saldo)}</p>
              <ol className="mt-2 flex flex-wrap gap-2">
                {p.plan.map((c) => (
                  <li key={c.id}><Badge tono={c.estado === "descontada" ? "success" : c.estado === "condonada" ? "neutro" : "info"}>{c.numero}. {MES_CORTO[c.mes - 1]} {c.anio} · {pesos(c.monto)}</Badge></li>
                ))}
              </ol>
            </li>
          ))}
        </ul>
      )}
      <Dialog
        abierto={nuevo}
        onCerrar={() => setNuevo(false)}
        titulo="Nuevo préstamo"
        descripcion="Sin interés. La última cuota absorbe el resto para que la suma sea exacta."
        acciones={<Button disabled={pendiente || !persona || !monto} onClick={() => void crear()}>Crear préstamo</Button>}
      >
        <div className="flex flex-col gap-3">
          <Campo etiqueta="Persona" htmlFor="pre-persona"><CampoPersona id="pre-persona" valor={persona} onCambiar={setPersona} /></Campo>
          <Campo etiqueta="Monto total ($)" htmlFor="pre-monto"><Input id="pre-monto" inputMode="numeric" value={monto} onChange={(e) => setMonto(e.target.value)} /></Campo>
          <div className="grid grid-cols-3 gap-3">
            <Campo etiqueta="Cuotas" htmlFor="pre-cuotas"><Input id="pre-cuotas" inputMode="numeric" value={cuotas} onChange={(e) => setCuotas(e.target.value)} /></Campo>
            <Campo etiqueta="Mes inicial" htmlFor="pre-mes"><Input id="pre-mes" inputMode="numeric" value={mes} onChange={(e) => setMes(e.target.value)} /></Campo>
            <Campo etiqueta="Año" htmlFor="pre-anio"><Input id="pre-anio" inputMode="numeric" value={anio} onChange={(e) => setAnio(e.target.value)} /></Campo>
          </div>
          {error ? <Alerta tono="danger" titulo={error} /> : null}
        </div>
      </Dialog>
      <DialogoMotivo
        key={aCancelar?.id ?? "ninguno"}
        abierto={aCancelar !== null}
        titulo="Cancelar préstamo"
        descripcion="Las cuotas pendientes quedan condonadas y se anulan sus novedades abiertas."
        confirmar="Cancelar préstamo"
        pendiente={pendiente}
        error={error}
        onCerrar={() => setACancelar(null)}
        onConfirmar={(m) => void cancelar(m)}
      />
    </SeccionTarjeta>
  );
}
