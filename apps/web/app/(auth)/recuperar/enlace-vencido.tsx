import { Clock } from "lucide-react";

import { AuthCard, EstadoIlustrado, estilosBoton } from "@opai/ds";

import { LinkNext } from "@/app/_components/link-next";

/** Enlace de recuperación vencido o usado. */
export function EnlaceVencido() {
  return (
    <AuthCard
      volver="/login"
      Link={LinkNext}
      acciones={
        <>
          <LinkNext href="/recuperar" className={estilosBoton({ size: "lg", block: true })}>
            Pedir otro enlace
          </LinkNext>
          <LinkNext
            href="/login"
            className={estilosBoton({ variant: "ghost", size: "lg", block: true })}
          >
            Volver a iniciar sesión
          </LinkNext>
        </>
      }
    >
      <EstadoIlustrado icono={Clock} tono="warning" titulo="Este enlace ya no sirve">
        Venció o ya se usó. Pide uno nuevo y úsalo dentro de 30 minutos.
      </EstadoIlustrado>
    </AuthCard>
  );
}
