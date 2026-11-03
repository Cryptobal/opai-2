"use client";

import { useState } from "react";

import { Alerta, Badge, Button, Campo, Input, Select } from "@opai/ds";

import { ETIQUETA_ROL } from "@/app/_components/portales";
import { useCapacidad } from "@/app/_components/use-capacidad";

import type { DetalleTenant } from "./tipos";

/** Owners y admins de la empresa, invitaciones pendientes e invitar uno nuevo. */
export function Administradores({ detalle }: { detalle: DetalleTenant }) {
  const { ejecutar, error } = useCapacidad("platform");
  const [email, setEmail] = useState("");
  const [rol, setRol] = useState("owner");
  const [enviada, setEnviada] = useState<string | null>(null);
  async function invitar() {
    setEnviada(null);
    const r = await ejecutar<{ email: string }>("platform.admins.invite", {
      tenantId: detalle.tenant.id,
      email,
      rol,
    });
    if (r) {
      setEnviada(r.email);
      setEmail("");
    }
  }
  return (
    <div className="flex flex-col gap-6">
      <ul className="divide-y divide-border">
        {[
          ...detalle.administradores.map((a) => ({
            id: a.membershipId,
            titulo: a.nombre,
            sub: a.email,
            rol: a.rol,
            pendiente: false,
          })),
          ...detalle.invitaciones.map((i) => ({
            id: i.id,
            titulo: i.email,
            sub: "Invitación pendiente",
            rol: i.rol,
            pendiente: true,
          })),
        ].map((a) => (
          <li key={a.id} className="flex min-h-14 items-center justify-between gap-3 py-2">
            <span className="min-w-0">
              <span className="block truncate text-base font-medium text-fg">{a.titulo}</span>
              <span className="t-caption block">{a.sub}</span>
            </span>
            <Badge tono={a.pendiente ? "info" : "neutro"}>{ETIQUETA_ROL[a.rol] ?? a.rol}</Badge>
          </li>
        ))}
      </ul>
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
