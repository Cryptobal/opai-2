import { Clock } from "lucide-react";

import { AuthCard, EstadoIlustrado, estilosBoton } from "@opai/ds";

import { LinkNext } from "@/app/_components/link-next";

/** Accesos de portales que llegan en la fase 3 (Trabajador, Cliente). */
export function Proximamente({ sufijo, texto }: { sufijo: string; texto: string }) {
  return (
    <AuthCard
      sufijo={sufijo}
      Link={LinkNext}
      acciones={
        <LinkNext
          href="/login"
          className={estilosBoton({ variant: "secondary", size: "lg", block: true })}
        >
          Volver a iniciar sesión
        </LinkNext>
      }
    >
      <EstadoIlustrado icono={Clock} tono="info" titulo="Disponible pronto">
        {texto}
      </EstadoIlustrado>
    </AuthCard>
  );
}
