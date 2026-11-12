"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Alerta, avisar, Badge, Button, Dialog } from "@opai/ds";

import { ETIQUETA_ROL } from "@/app/_components/portales";
import { useCapacidad } from "@/app/_components/use-capacidad";
import { fechaHora } from "@/lib/formato";

type Invitacion = { id: string; email: string; rol: string; venceEn: string };

/** Invitaciones pendientes de la empresa (CAR-323): reenviar con enlace nuevo o revocar con confirmación. */
export function Invitaciones({
  tenantId,
  invitaciones,
}: {
  tenantId: string;
  invitaciones: Invitacion[];
}) {
  const router = useRouter();
  const { ejecutar, pendiente, error } = useCapacidad("platform");
  const [revocar, setRevocar] = useState<Invitacion | null>(null);

  async function reenviar(i: Invitacion) {
    if (!(await ejecutar("platform.invitaciones.reenviar", { tenantId, invitacionId: i.id })))
      return;
    avisar.exito(`Invitación reenviada a ${i.email}`);
    router.refresh();
  }
  async function confirmarRevocar() {
    if (!revocar) return;
    if (!(await ejecutar("platform.invitaciones.revocar", { tenantId, invitacionId: revocar.id })))
      return;
    avisar.exito("Invitación revocada");
    setRevocar(null);
    router.refresh();
  }

  if (!invitaciones.length) return null;
  return (
    <section className="flex flex-col gap-2">
      <h2 className="t-heading text-fg">Invitaciones pendientes ({invitaciones.length})</h2>
      {error && !revocar ? <Alerta tono="danger" titulo={error} /> : null}
      <ul className="divide-y divide-border">
        {invitaciones.map((i) => (
          <li
            key={i.id}
            className="flex min-h-14 flex-wrap items-center justify-between gap-3 py-2"
          >
            <span className="min-w-0">
              <span className="block truncate text-base font-medium text-fg">{i.email}</span>
              <span className="t-caption block">Vence el {fechaHora(i.venceEn)}</span>
            </span>
            <span className="flex items-center gap-2">
              <Badge tono="info">{ETIQUETA_ROL[i.rol] ?? i.rol}</Badge>
              <Button variant="secondary" disabled={pendiente} onClick={() => void reenviar(i)}>
                Reenviar
              </Button>
              <Button variant="ghost" disabled={pendiente} onClick={() => setRevocar(i)}>
                Revocar
              </Button>
            </span>
          </li>
        ))}
      </ul>
      <Dialog
        abierto={Boolean(revocar)}
        onCerrar={() => setRevocar(null)}
        titulo="¿Revocar la invitación?"
        descripcion={`El enlace enviado a ${revocar?.email ?? ""} deja de servir.`}
        acciones={
          <>
            <Button variant="secondary" onClick={() => setRevocar(null)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              disabled={pendiente}
              onClick={() => void confirmarRevocar()}
            >
              Revocar
            </Button>
          </>
        }
      >
        {error ? <p className="text-sm font-medium text-danger-fg">{error}</p> : null}
      </Dialog>
    </section>
  );
}
