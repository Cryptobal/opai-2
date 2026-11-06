"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { avisar, Button, Campo, Dialog, Textarea } from "@opai/ds";

import { ejecutarCapacidad } from "@/app/_acciones/capacidad";

import { RUTA_BANDEJA } from "./tipos";

type Accion = "aprobar" | "devolver" | "rechazar";
const TEXTO: Record<Accion, { hecho: string; titulo: string; boton: string }> = {
  aprobar: { hecho: "aprobada", titulo: "¿Aprobar esta rendición?", boton: "Aprobar" },
  devolver: { hecho: "devuelta a quien rinde", titulo: "¿Devolver para corregir?", boton: "Devolver" },
  rechazar: { hecho: "rechazada", titulo: "¿Rechazar la rendición?", boton: "Rechazar" },
};

/** Aprobar, devolver o rechazar una rendición entera. Devolver y rechazar exigen motivo; rechazar no se deshace. */
export function AccionesDecision({ id, codigo }: { id: string; codigo: string }) {
  const router = useRouter();
  const [motivo, setMotivo] = useState("");
  const [confirmar, setConfirmar] = useState<Accion | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const exige = (a: Accion) => a !== "aprobar";
  const falta = (a: Accion) => exige(a) && motivo.trim().length < 3;
  async function decidir(a: Accion) {
    setOcupado(true);
    setError(null);
    const entrada = exige(a) ? { id, motivo: motivo.trim() } : { id };
    let r;
    if (a === "aprobar") r = await ejecutarCapacidad("erp", "rendiciones.rendiciones.aprobar", entrada);
    else if (a === "devolver") r = await ejecutarCapacidad("erp", "rendiciones.rendiciones.devolver", entrada);
    else r = await ejecutarCapacidad("erp", "rendiciones.rendiciones.rechazar", entrada);
    setOcupado(false);
    if (!r.ok) return setError(r.error.message);
    avisar.exito(`${codigo} ${TEXTO[a].hecho}`);
    setConfirmar(null);
    router.push(RUTA_BANDEJA);
    router.refresh();
  }
  function pedir(a: Accion) {
    if (falta(a)) return setError("Escribe el motivo (mínimo 3 letras) para devolver o rechazar.");
    setError(null);
    setConfirmar(a);
  }
  return (
    <div className="flex flex-col gap-3">
      <Campo etiqueta="Motivo (obligatorio al devolver o rechazar)" htmlFor="motivo-decision">
        <Textarea id="motivo-decision" value={motivo} maxLength={500} onChange={(e) => setMotivo(e.target.value)} />
      </Campo>
      {error ? <p role="alert" className="text-base font-medium text-danger-fg">{error}</p> : null}
      <div className="flex flex-col gap-2 md:flex-row">
        <Button onClick={() => pedir("aprobar")}>Aprobar</Button>
        <Button variant="secondary" onClick={() => pedir("devolver")}>Devolver</Button>
        <Button variant="secondary" onClick={() => pedir("rechazar")}>Rechazar</Button>
      </div>
      <Dialog
        abierto={confirmar !== null}
        onCerrar={() => setConfirmar(null)}
        titulo={confirmar ? TEXTO[confirmar].titulo : ""}
        descripcion={`${codigo}. ${confirmar === "rechazar" ? "Rechazar es definitivo: quien rinde deberá crear una nueva." : confirmar === "aprobar" ? "Quedará lista para el lote de pago." : "Volverá a quien rinde para que la corrija."}`}
        acciones={
          <>
            <Button variant="secondary" onClick={() => setConfirmar(null)} disabled={ocupado}>Volver</Button>
            <Button onClick={() => confirmar && void decidir(confirmar)} disabled={ocupado}>
              {ocupado ? "Guardando…" : confirmar ? TEXTO[confirmar].boton : ""}
            </Button>
          </>
        }
      >
        {null}
      </Dialog>
    </div>
  );
}
