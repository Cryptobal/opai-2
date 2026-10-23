"use client";

import { Badge, Button, Card, CardContent, CardHeader, CardTitle } from "@opai/ds";

import { ETIQUETA_ROL } from "@/app/_components/portales";
import { useCapacidad } from "@/app/_components/use-capacidad";
import { fechaHora } from "@/lib/formato";

import type { Invitacion } from "./usuarios-lista";

/** Invitaciones pendientes con opción de revocar. */
export function InvitacionesPendientes({ invitaciones }: { invitaciones: Invitacion[] }) {
  const { ejecutar, error } = useCapacidad("erp");
  return (
    <Card>
      <CardHeader>
        <CardTitle>Invitaciones pendientes</CardTitle>
        <Badge tono="info">{invitaciones.length}</Badge>
      </CardHeader>
      <CardContent>
        {error ? <p className="mb-2 text-sm font-medium text-danger-fg">{error}</p> : null}
        <ul className="divide-y divide-border">
          {invitaciones.map((i) => (
            <li key={i.id} className="flex min-h-14 items-center justify-between gap-3 py-2">
              <span className="min-w-0">
                <span className="block truncate text-base font-medium text-fg">{i.email}</span>
                <span className="t-caption block">
                  {ETIQUETA_ROL[i.rol] ?? i.rol} · vence {fechaHora(i.expiresAt)}
                </span>
              </span>
              <Button
                variant="ghost"
                onClick={() => void ejecutar("core.invitations.revoke", { invitationId: i.id })}
              >
                Revocar
              </Button>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
