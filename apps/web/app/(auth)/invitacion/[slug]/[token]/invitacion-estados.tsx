"use client";

import { SearchX } from "lucide-react";

import { AuthCard, EstadoIlustrado, estilosBoton } from "@opai/ds";

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
