"use client";

import { useState } from "react";

import { Alerta, Badge, Button, Campo, Input, Select } from "@opai/ds";

import { ETIQUETA_ROL } from "@/app/_components/portales";
import { useCapacidad } from "@/app/_components/use-capacidad";

import { Invitaciones } from "./invitaciones-tab";

/** Lo que devuelve `platform.tenants.miembros` (CAR-323). */
export type Miembros = {
  miembros: { membershipId: string; nombre: string; email: string; rol: string; estado: string }[];
  invitaciones: { id: string; email: string; rol: string; venceEn: string }[];
};

/** Todos los miembros de la empresa, sus invitaciones pendientes e invitar a un owner o admin. */
export function Administradores({ tenantId, miembros }: { tenantId: string; miembros: Miembros }) {
  const { ejecutar, error } = useCapacidad("platform");
  const [email, setEmail] = useState("");
  const [rol, setRol] = useState("owner");
  const [enviada, setEnviada] = useState<string | null>(null);
  async function invitar() {
    setEnviada(null);
    const r = await ejecutar<{ email: string }>("platform.admins.invite", { tenantId, email, rol });
    if (r) {
      setEnviada(r.email);
      setEmail("");
    }
  }
  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-2">
        <h2 className="t-heading text-fg">Miembros ({miembros.miembros.length})</h2>
        {miembros.miembros.length ? (
          <ul className="divide-y divide-border">
            {miembros.miembros.map((m) => (
              <li
                key={m.membershipId}
                className="flex min-h-14 items-center justify-between gap-3 py-2"
              >
                <span className="min-w-0">
                  <span className="block truncate text-base font-medium text-fg">{m.nombre}</span>
                  <span className="t-caption block truncate">{m.email}</span>
                </span>
                <span className="flex shrink-0 items-center gap-2">
                  {m.estado !== "activa" ? <Badge tono="warning">Suspendido</Badge> : null}
                  <Badge>{ETIQUETA_ROL[m.rol] ?? m.rol}</Badge>
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="t-body-sm text-fg-muted">La empresa todavía no tiene miembros.</p>
        )}
      </section>
      <Invitaciones tenantId={tenantId} invitaciones={miembros.invitaciones} />
      {enviada ? (
        <Alerta tono="success" titulo="Invitación enviada">
          Enviamos el enlace a {enviada}. Vence en 72 horas y aparece arriba como invitación
          pendiente.
        </Alerta>
      ) : null}
      <div className="flex flex-col gap-3 rounded-lg border border-border p-4 md:flex-row md:items-end">
        <Campo
          etiqueta="Invitar administrador"
          htmlFor="adm-email"
          className="flex-1"
          {...(error ? { error } : {})}
        >
          <Input
            id="adm-email"
            type="email"
            placeholder="correo@empresa.cl"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </Campo>
        <Select
          aria-label="Rol"
          valor={rol}
          onCambiar={setRol}
          className="md:w-40"
          opciones={[
            { valor: "owner", etiqueta: "Propietario" },
            { valor: "admin", etiqueta: "Administrador" },
          ]}
        />
        <Button onClick={invitar} disabled={!email} className="h-11">
          Invitar
        </Button>
      </div>
    </div>
  );
}
