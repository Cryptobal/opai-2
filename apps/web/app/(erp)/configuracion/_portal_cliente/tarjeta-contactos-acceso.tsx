"use client";

import { useState } from "react";

import { Alerta, avisar, Badge, Button, Dialog, SeccionTarjeta } from "@opai/ds";

import { useCapacidad } from "@/app/_components/use-capacidad";

import { type ContactoAcceso, vistaEstado } from "./contactos-acceso";

type Pendiente = { tipo: "dar" | "suspender" | "revocar"; contacto: ContactoAcceso } | null;

/** Contactos de la cuenta con el estado de su acceso al Portal Cliente y las acciones que corresponden (CAR-218). */
export function TarjetaContactosAcceso({ cuentaId, contactos, puedeGestionar }: { cuentaId: string; contactos: ContactoAcceso[]; puedeGestionar: boolean }) {
  const { ejecutar, pendiente, error } = useCapacidad("erp");
  const [confirmar, setConfirmar] = useState<Pendiente>(null);

  async function aplicar() {
    if (!confirmar) return;
    const { tipo, contacto } = confirmar;
    const r =
      tipo === "dar"
        ? await ejecutar("portal_cliente.contactos.dar_acceso", { cuentaId, contactoId: contacto.contactoId })
        : await ejecutar("portal_cliente.accesos.actualizar", { accesoId: contacto.accesoId, estado: tipo === "suspender" ? "suspendido" : "revocado" });
    if (r != null) {
      avisar.exito(tipo === "dar" ? "Invitación enviada" : tipo === "suspender" ? "Acceso suspendido" : "Acceso revocado");
      setConfirmar(null);
    }
  }
  const titulo = confirmar?.tipo === "dar" ? "Dar acceso al portal" : confirmar?.tipo === "suspender" ? "Suspender el acceso" : "Revocar el acceso";

  return (
    <SeccionTarjeta titulo="Contactos y acceso al portal" sinRelleno>
      {contactos.length === 0 ? <p className="t-body-sm p-4">La cuenta no tiene contactos: agrega uno para poder darle acceso.</p> : null}
      <ul className="divide-y divide-border">
        {contactos.map((c) => {
          const v = vistaEstado(c);
          return (
            <li key={c.contactoId} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
              <span className="min-w-0">
                <span className="t-label">{c.nombre}{c.esPrincipal ? " · principal" : ""}</span>
                <span className="t-caption block text-fg-muted">{[c.cargo, c.email].filter(Boolean).join(" · ") || "Sin cargo ni correo"}</span>
                {v.nota ? <span className="t-caption block text-fg-muted">{v.nota}</span> : null}
              </span>
              <span className="flex flex-wrap items-center gap-1">
                <Badge tono={v.tono}>{v.etiqueta}</Badge>
                {puedeGestionar && v.darAcceso ? <Button type="button" variant="secondary" onClick={() => setConfirmar({ tipo: "dar", contacto: c })}>Dar acceso</Button> : null}
                {puedeGestionar && v.suspender ? <Button type="button" variant="ghost" onClick={() => setConfirmar({ tipo: "suspender", contacto: c })}>Suspender</Button> : null}
                {puedeGestionar && v.revocar ? <Button type="button" variant="ghost" onClick={() => setConfirmar({ tipo: "revocar", contacto: c })}>Revocar</Button> : null}
              </span>
            </li>
          );
        })}
      </ul>
      <Dialog
        abierto={confirmar !== null}
        onCerrar={() => setConfirmar(null)}
        titulo={titulo}
        descripcion={
          confirmar?.tipo === "dar"
            ? `Se invitará a ${confirmar.contacto.email ?? "este contacto"}. No se habilitan instalaciones todavía.`
            : confirmar
              ? `${confirmar.contacto.nombre} dejará de entrar al portal${confirmar.tipo === "suspender" ? " hasta que lo reactives desde Accesos" : ""}.`
              : ""
        }
        acciones={
          <>
            <Button type="button" variant="secondary" onClick={() => setConfirmar(null)}>Cancelar</Button>
            <Button type="button" disabled={pendiente} onClick={() => void aplicar()}>{pendiente ? "Aplicando…" : "Confirmar"}</Button>
          </>
        }
      >
        {error ? <Alerta tono="danger" titulo={error} /> : null}
      </Dialog>
    </SeccionTarjeta>
  );
}
