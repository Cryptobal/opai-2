import { Badge, DetailScreen, type EstadoPantalla, Enlace, ParesGrid, SeccionTarjeta } from "@opai/ds";

import { LinkNext } from "@/app/_components/link-next";
import { telefono } from "@/lib/fechas";

import type { ContactoDetalle } from "./datos";

const ROL: Record<string, string> = {
  comercial: "Comercial",
  operacional: "Operacional",
  facturacion: "Facturación",
  cobranza: "Cobranza",
};

/** Ficha de un contacto (persona): datos de contacto, cuenta y roles. Sin pestañas en el PR 1. */
export function FichaContacto(p: { state: EstadoPantalla; contacto: ContactoDetalle | null }) {
  const c = p.contacto;
  return (
    <DetailScreen
      state={c ? p.state : p.state === "ready" ? "error" : p.state}
      titulo={c ? `${c.nombres} ${c.apellidos}`.trim() : "Contacto"}
      {...(c
        ? {
            estado: c.esPrincipal ? <Badge punto={false}>Principal</Badge> : undefined,
            subtitulo: c.cargo ?? undefined,
          }
        : {})}
    >
      {c ? (
        <SeccionTarjeta titulo="Datos de contacto">
          <ParesGrid
            items={[
              {
                etiqueta: "Cuenta",
                valor: (
                  <Enlace Link={LinkNext} href={`/cuentas/${c.cuentaId}`} className="underline">
                    Ver cuenta
                  </Enlace>
                ),
              },
              { etiqueta: "Cargo", valor: c.cargo },
              { etiqueta: "Correo", valor: c.email },
              { etiqueta: "Teléfono", valor: c.telefono ? telefono(c.telefono) : null },
              {
                etiqueta: "Roles",
                valor: c.roles.length ? c.roles.map((r) => ROL[r] ?? r).join(", ") : null,
                ancho: true,
              },
              ...(c.notas ? [{ etiqueta: "Notas", valor: c.notas, ancho: true }] : []),
            ]}
          />
        </SeccionTarjeta>
      ) : null}
    </DetailScreen>
  );
}
