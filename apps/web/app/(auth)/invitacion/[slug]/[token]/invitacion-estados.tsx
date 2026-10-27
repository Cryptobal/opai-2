"use client";

import { SearchX, ShieldAlert } from "lucide-react";

import { AuthCard, EstadoIlustrado, estilosBoton } from "@opai/ds";

import { BotonReintentar } from "@/app/_components/boton-reintentar";
import { LinkNext } from "@/app/_components/link-next";

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

/** Tope del flujo de invitación (demasiados intentos desde la misma red): advertencia + reintentar. */
export function InvitacionLimitada() {
  return (
    <AuthCard Link={LinkNext} acciones={<BotonReintentar size="lg" block />}>
      <EstadoIlustrado
        icono={ShieldAlert}
        tono="warning"
        titulo="Demasiados intentos desde esta red"
      >
        Espera unos minutos y vuelve a abrir el enlace.
      </EstadoIlustrado>
    </AuthCard>
  );
}
