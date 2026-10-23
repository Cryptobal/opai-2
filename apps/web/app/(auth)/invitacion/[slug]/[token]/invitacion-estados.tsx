"use client";

import { CircleCheck, Clock, SearchX } from "lucide-react";
import { useState } from "react";

import { AuthCard, Button, EstadoIlustrado, estilosBoton } from "@opai/ds";

import { LinkNext } from "@/app/_components/link-next";
import { fechaCorta } from "@/lib/formato";

import { pedirNuevaInvitacion } from "./acciones";
import type { DatosInvitacion } from "./invitacion";

/** "Paula Rojas, de la administración de Gard Security" o "la administración de Gard Security". */
const quien = (d: DatosInvitacion) =>
  d.invitadoPor
    ? `${d.invitadoPor}, de la administración de ${d.tenant}`
    : `la administración de ${d.tenant}`;

export function InvitacionInvalida() {
  return (
    <AuthCard
      Link={LinkNext}
      acciones={
        <LinkNext
          href="/login"
          className={estilosBoton({ variant: "secondary", size: "lg", block: true })}
        >
          Ir a iniciar sesión
        </LinkNext>
      }
    >
      <EstadoIlustrado icono={SearchX} tono="warning" titulo="No encontramos esta invitación">
        Revisa el enlace o pide una invitación nueva a la administración de tu empresa.
      </EstadoIlustrado>
    </AuthCard>
  );
}

/** Invitación vencida, revocada o ya usada (export-acceso 04). */
export function InvitacionNoVigente({
  slug,
  token,
  datos,
}: {
  slug: string;
  token: string;
  datos: DatosInvitacion;
}) {
  const [pedida, setPedida] = useState(false);
  if (datos.estado === "aceptada") {
    return (
      <AuthCard
        Link={LinkNext}
        acciones={
          <LinkNext href="/login" className={estilosBoton({ size: "lg", block: true })}>
            Iniciar sesión
          </LinkNext>
        }
      >
        <EstadoIlustrado icono={CircleCheck} tono="info" titulo="Esta invitación ya se usó">
          Se aceptó el {fechaCorta(datos.acceptedAt)}. Si fuiste tú, inicia sesión. Si no, avisa a{" "}
          {quien(datos)}.
        </EstadoIlustrado>
      </AuthCard>
    );
  }
  const vencida = datos.estado === "vencida";
  return (
    <AuthCard
      Link={LinkNext}
      acciones={
        <>
          <LinkNext
            href="/login"
            className={estilosBoton({ variant: "secondary", size: "lg", block: true })}
          >
            Ir a iniciar sesión
          </LinkNext>
          <Button
            variant="ghost"
            size="lg"
            disabled={pedida}
            onClick={async () => setPedida(await pedirNuevaInvitacion(slug, token))}
          >
            {pedida ? "Avisamos para que te envíen una nueva" : "Pedir nueva invitación"}
          </Button>
        </>
      }
    >
      <EstadoIlustrado
        icono={Clock}
        tono="warning"
        titulo={vencida ? "Esta invitación venció" : "Esta invitación fue revocada"}
      >
        {vencida ? `Venció el ${fechaCorta(datos.expiresAt)}. ` : ""}Pide a {quien(datos)}
        {datos.invitadoPor ? "," : ""} que te envíe una nueva.
      </EstadoIlustrado>
    </AuthCard>
  );
}
