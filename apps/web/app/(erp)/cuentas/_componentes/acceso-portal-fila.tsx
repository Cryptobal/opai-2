"use client";

import { useState } from "react";

import { avisar, Badge, Button, Dialog } from "@opai/ds";

import { useCapacidad } from "@/app/_components/use-capacidad";
import {
  type ContactoAcceso,
  mensajeDarAcceso,
  type ResultadoDarAcceso,
  vistaEstado,
} from "@/app/(erp)/configuracion/_portal_cliente/contactos-acceso";

/** Estado del portal y «Dar acceso» en la fila de un contacto de la cuenta (CAR-802). */
export function AccesoPortalFila({
  cuentaId,
  cuentaInactiva,
  esProspecto,
  puedeGestionar,
  acceso,
}: {
  cuentaId: string;
  cuentaInactiva: boolean;
  esProspecto: boolean;
  puedeGestionar: boolean;
  acceso?: ContactoAcceso;
}) {
  const { ejecutar, pendiente, error } = useCapacidad("erp");
  const [confirmar, setConfirmar] = useState(false);
  const v = vistaEstado(acceso ?? { estado: "sin_acceso" }, { cuentaInactiva, esProspecto });

  async function darAcceso() {
    if (!acceso) return;
    const r = await ejecutar<ResultadoDarAcceso>("portal_cliente.contactos.dar_acceso", {
      cuentaId,
      contactoId: acceso.contactoId,
    });
    if (r != null) {
      const m = mensajeDarAcceso(r);
      (m.exito ? avisar.exito : avisar.info)(m.texto);
      setConfirmar(false);
    }
  }

  if (!acceso) return null;

  return (
    <span className="flex flex-wrap items-center gap-1">
      <Badge tono={v.tono}>{v.etiqueta}</Badge>
      {v.nota ? <span className="t-caption text-fg-muted">{v.nota}</span> : null}
      {puedeGestionar && v.darAcceso && acceso ? (
        <Button type="button" variant="secondary" onClick={() => setConfirmar(true)}>
          Dar acceso al portal
        </Button>
      ) : null}
      <Dialog
        abierto={confirmar}
        onCerrar={() => setConfirmar(false)}
        titulo="Dar acceso al portal"
        descripcion={`Se invitará a ${acceso?.email ?? "este contacto"}. No se habilitan instalaciones todavía.`}
        acciones={
          <>
            <Button type="button" variant="secondary" onClick={() => setConfirmar(false)}>
              Cancelar
            </Button>
            <Button type="button" disabled={pendiente} onClick={() => void darAcceso()}>
              {pendiente ? "Aplicando…" : "Confirmar"}
            </Button>
          </>
        }
      >
        {error ? <p className="t-body-sm text-danger-fg">{error}</p> : null}
      </Dialog>
    </span>
  );
}