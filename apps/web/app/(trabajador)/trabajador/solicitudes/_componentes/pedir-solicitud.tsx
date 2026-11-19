"use client";

import { useState } from "react";

import { avisar, Button, Campo, Dialog, Input, InputFecha, Select } from "@opai/ds";

import { useCapacidad } from "@/app/_components/use-capacidad";

const TIPOS = [
  { valor: "permiso", etiqueta: "Permiso" },
  { valor: "vacaciones", etiqueta: "Vacaciones" },
] as const;

/** «Pedir permiso o vacaciones» (CAR-464): la solicitud queda pendiente hasta que la jefatura responda. */
export function PedirSolicitud({ hoy }: { hoy: string }) {
  const { ejecutar, pendiente, error } = useCapacidad("trabajador");
  const [abierto, setAbierto] = useState(false);
  const [tipo, setTipo] = useState<string>("permiso");
  const [desde, setDesde] = useState(hoy);
  const [hasta, setHasta] = useState(hoy);
  const [motivo, setMotivo] = useState("");
  const listo = desde >= hoy && hasta >= desde && motivo.trim().length >= 3;

  async function enviar() {
    const r = await ejecutar("portal_trabajador.solicitudes.crear", { tipo, desde, hasta, motivo: motivo.trim() });
    if (!r) return;
    setAbierto(false);
    setMotivo("");
    avisar.exito("Listo. Tu jefatura la revisará y te avisaremos.");
  }

  return (
    <>
      <Button type="button" onClick={() => setAbierto(true)}>
        Pedir permiso o vacaciones
      </Button>
      <Dialog
        abierto={abierto}
        onCerrar={() => setAbierto(false)}
        titulo="Pedir permiso o vacaciones"
        descripcion="Tu jefatura la revisa. Mientras tanto, tus turnos no cambian."
        acciones={
          <>
            <Button type="button" variant="ghost" onClick={() => setAbierto(false)}>
              Cancelar
            </Button>
            <Button type="button" disabled={pendiente || !listo} onClick={() => void enviar()}>
              {pendiente ? "Enviando…" : "Enviar solicitud"}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <Campo etiqueta="Qué necesitas" htmlFor="sol-tipo">
            <Select id="sol-tipo" valor={tipo} onCambiar={setTipo} opciones={TIPOS} />
          </Campo>
          <Campo etiqueta="Desde" htmlFor="sol-desde">
            <InputFecha id="sol-desde" valor={desde} onCambiar={setDesde} />
          </Campo>
          <Campo etiqueta="Hasta" htmlFor="sol-hasta" ayuda="El mismo día si es solo uno.">
            <InputFecha id="sol-hasta" valor={hasta} onCambiar={setHasta} />
          </Campo>
          <Campo etiqueta="Motivo" htmlFor="sol-motivo" ayuda="Breve. No escribas diagnósticos ni datos médicos.">
            <Input id="sol-motivo" value={motivo} maxLength={200} onChange={(e) => setMotivo(e.target.value)} />
          </Campo>
          {error ? <p className="t-body-sm text-danger-fg">{error}</p> : null}
        </div>
      </Dialog>
    </>
  );
}
