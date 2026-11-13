"use client";

import { useRouter } from "next/navigation";

import { Alerta, avisar, Badge, Button, Empty, SeccionTarjeta } from "@opai/ds";

import { useCapacidad } from "@/app/_components/use-capacidad";

import { MOTIVOS_SIN_VINCULO, type PersonaSlack } from "./tipos";

const ESTADO: Record<
  PersonaSlack["estado"],
  { tono: "success" | "warning" | "neutro"; texto: string }
> = {
  vinculado: { tono: "success", texto: "Vinculada" },
  sin_vincular: { tono: "warning", texto: "Sin vincular" },
  pendiente: { tono: "neutro", texto: "Por buscar" },
};

/**
 * Personas internas y su vínculo con Slack (CAR-292). Se vinculan solas por su correo al conectar, al
 * entrar a la empresa y una vez al día; «Buscar de nuevo» lo hace ahora. Los guardias no aparecen.
 */
export function SeccionPersonas({ personas }: { personas: PersonaSlack[] }) {
  const router = useRouter();
  const { ejecutar, pendiente, error } = useCapacidad("erp");
  const vinculadas = personas.filter((p) => p.estado === "vinculado").length;

  async function buscar() {
    const r = await ejecutar<{ vinculadas: number; sinVincular: number; quedan: number }>(
      "core.slack.vincular_usuarios",
      {},
    );
    if (!r) return;
    avisar.exito(
      r.quedan
        ? `Búsqueda lista. Quedan ${r.quedan} personas: se buscan en un minuto.`
        : "Búsqueda en Slack lista",
    );
    router.refresh();
  }

  return (
    <SeccionTarjeta titulo="Personas en Slack">
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="t-body-sm text-fg-muted">
            Quienes entran al ERP o al portal de supervisor quedan ligados a su usuario de Slack por
            su correo. Los guardias no usan Slack.
          </p>
          <Button
            type="button"
            variant="secondary"
            disabled={pendiente}
            onClick={() => void buscar()}
          >
            {pendiente ? "Buscando…" : "Buscar de nuevo"}
          </Button>
        </div>
        {error ? <Alerta tono="danger" titulo={error} /> : null}
        {personas.length ? (
          <>
            <p className="t-caption">
              {vinculadas} de {personas.length} vinculadas
            </p>
            <ul className="flex flex-col divide-y divide-border">
              {personas.map((p) => (
                <li
                  key={p.usuarioId}
                  className="flex min-h-11 flex-wrap items-center justify-between gap-2 py-2"
                >
                  <div className="flex min-w-0 flex-col">
                    <span className="t-body truncate text-fg">{p.nombre}</span>
                    <span className="t-caption truncate">
                      {p.estado === "sin_vincular" && p.motivo
                        ? MOTIVOS_SIN_VINCULO[p.motivo]
                        : p.email}
                    </span>
                  </div>
                  <Badge tono={ESTADO[p.estado].tono}>{ESTADO[p.estado].texto}</Badge>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <Empty
            titulo="Todavía no hay personas para vincular"
            descripcion="Cuando alguien con acceso al ERP o al portal de supervisor entre a la empresa, se buscará en Slack."
          />
        )}
      </div>
    </SeccionTarjeta>
  );
}
