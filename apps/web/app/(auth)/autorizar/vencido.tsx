import { Clock } from "lucide-react";

import { AuthCard, EstadoIlustrado } from "@opai/ds";

import { LinkNext } from "@/app/_components/link-next";

/** La autorización tardó más de 10 minutos o el enlace no es de OPAI: se vuelve a conectar desde la app. */
export function AutorizacionVencida() {
  return (
    <AuthCard Link={LinkNext}>
      <EstadoIlustrado icono={Clock} tono="warning" titulo="Esta autorización ya no sirve">
        Pasaron más de 10 minutos o el enlace cambió. Vuelve a la app (por ejemplo, Claude) y
        conecta OPAI otra vez.
      </EstadoIlustrado>
    </AuthCard>
  );
}
